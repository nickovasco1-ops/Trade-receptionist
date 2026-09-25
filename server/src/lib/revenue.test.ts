import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRevenueSnapshot,
  deriveMonthlyMovement,
  formatGbp,
  monthlyPenceForItem,
  parseGbp,
  type StripeRevenueSubscription,
} from './revenue';

function subscription(overrides: Partial<StripeRevenueSubscription> = {}): StripeRevenueSubscription {
  return {
    id: 'sub_1',
    status: 'active',
    created: Date.UTC(2026, 8, 10) / 1000,
    customer: { id: 'cus_1', name: 'Example Trade' },
    items: {
      data: [{
        quantity: 1,
        price: {
          product: 'prod_UOE4uHDjaA2p2A',
          currency: 'gbp',
          unit_amount: 4_900,
          recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
        },
      }],
    },
    ...overrides,
  };
}

describe('Stripe monthly recurring value', () => {
  it('uses monthly fixed pricing and quantity', () => {
    assert.equal(monthlyPenceForItem({
      quantity: 2,
      price: {
        unit_amount: 4_900,
        recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
      },
    }), 9_800);
  });

  it('normalises annual and quarterly prices to a month', () => {
    assert.equal(monthlyPenceForItem({
      price: {
        unit_amount: 49_000,
        recurring: { interval: 'year', interval_count: 1, usage_type: 'licensed' },
      },
    }), 4_083);
    assert.equal(monthlyPenceForItem({
      price: {
        unit_amount: 26_700,
        recurring: { interval: 'month', interval_count: 3, usage_type: 'licensed' },
      },
    }), 8_900);
  });

  it('rejects metered and discounted shapes instead of understating revenue', () => {
    assert.throws(() => monthlyPenceForItem({
      price: {
        unit_amount: 100,
        recurring: { interval: 'month', interval_count: 1, usage_type: 'metered' },
      },
    }), /Metered/);
    assert.throws(() => buildRevenueSnapshot([
      subscription({ discounts: ['di_1'] }),
    ], new Date('2026-09-25T12:00:00Z')), /discount/);
  });
});

describe('revenue snapshot', () => {
  it('counts active MRR, trials, new MRR and plan totals', () => {
    const snapshot = buildRevenueSnapshot([
      subscription(),
      subscription({ id: 'sub_trial', status: 'trialing' }),
    ], new Date('2026-09-25T12:00:00Z'));
    assert.equal(snapshot.mrrPence, 4_900);
    assert.equal(snapshot.arrPence, 58_800);
    assert.equal(snapshot.activePayingClients, 1);
    assert.equal(snapshot.trialClients, 1);
    assert.equal(snapshot.newMrrPence, 4_900);
    assert.deepEqual(snapshot.byPlan.starter, { clients: 1, mrrPence: 4_900 });
  });

  it('excludes past-due subscriptions from MRR and reports them separately', () => {
    const snapshot = buildRevenueSnapshot([
      subscription({ status: 'past_due' }),
    ], new Date('2026-09-25T12:00:00Z'));
    assert.equal(snapshot.mrrPence, 0);
    assert.equal(snapshot.pastDueClients, 1);
  });

  it('records monthly churn with the customer, plan, value and reason', () => {
    const snapshot = buildRevenueSnapshot([
      subscription({
        status: 'canceled',
        canceled_at: Date.UTC(2026, 8, 20) / 1000,
        cancellation_details: { feedback: 'too_expensive' },
      }),
    ], new Date('2026-09-25T12:00:00Z'));
    assert.equal(snapshot.churnedClientsThisMonth, 1);
    assert.equal(snapshot.churnedMrrPence, 4_900);
    assert.deepEqual(snapshot.churnedSubscriptions[0], {
      subscriptionId: 'sub_1',
      date: '2026-09-20',
      customer: 'Example Trade',
      plan: 'starter',
      mrrPence: 4_900,
      reason: 'too_expensive',
    });
  });

  it('rejects mixed currencies and unknown products', () => {
    const eur = subscription();
    eur.items!.data![0].price!.currency = 'eur';
    assert.throws(() => buildRevenueSnapshot([subscription(), eur]), /multiple currencies/);

    const unknown = subscription();
    unknown.items!.data![0].price!.product = 'prod_unknown';
    assert.throws(() => buildRevenueSnapshot([unknown]), /unknown or mixed plan/);
  });
});

describe('monthly revenue movement', () => {
  it('marks the first automated month as a neutral bootstrap', () => {
    const snapshot = buildRevenueSnapshot([subscription()], new Date('2026-09-25T12:00:00Z'));
    assert.deepEqual(deriveMonthlyMovement(snapshot, null), {
      startingMrrPence: 0,
      newMrrPence: 4_900,
      expansionPence: 0,
      churnedMrrPence: 0,
      endingMrrPence: 4_900,
      netChangePence: 4_900,
      bootstrap: true,
    });
  });

  it('derives expansion or contraction from the prior closing balance', () => {
    const snapshot = buildRevenueSnapshot([subscription()], new Date('2026-10-25T12:00:00Z'));
    assert.equal(deriveMonthlyMovement(snapshot, 8_900).expansionPence, -4_000);
  });

  it('preserves the bootstrap marker when the first month is re-synchronised', () => {
    const snapshot = buildRevenueSnapshot([subscription()], new Date('2026-09-25T12:00:00Z'));
    assert.deepEqual(deriveMonthlyMovement(snapshot, 0, true), {
      startingMrrPence: 0,
      newMrrPence: 4_900,
      expansionPence: 0,
      churnedMrrPence: 0,
      endingMrrPence: 4_900,
      netChangePence: 4_900,
      bootstrap: true,
    });
  });
});

describe('GBP formatting', () => {
  it('round-trips pounds, pence and negative movement', () => {
    assert.equal(formatGbp(4_900), '£49');
    assert.equal(formatGbp(4_999), '£49.99');
    assert.equal(formatGbp(-4_000), '-£40');
    assert.equal(parseGbp('£1,249.50'), 124_950);
    assert.equal(parseGbp('—'), null);
  });
});
