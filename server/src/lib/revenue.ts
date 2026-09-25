import type { Plan } from '../../../shared/types';
import { stripePlanForProduct } from './stripe-plans';

export interface StripeRevenueItem {
  quantity?: number | null;
  price?: {
    product?: string | { id?: string } | null;
    currency?: string | null;
    unit_amount?: number | null;
    unit_amount_decimal?: string | null;
    recurring?: {
      interval?: 'day' | 'week' | 'month' | 'year' | null;
      interval_count?: number | null;
      usage_type?: 'licensed' | 'metered' | null;
    } | null;
  } | null;
}

export interface StripeRevenueSubscription {
  id: string;
  status: string;
  created: number;
  canceled_at?: number | null;
  customer?: string | {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
  cancellation_details?: {
    comment?: string | null;
    feedback?: string | null;
    reason?: string | null;
  } | null;
  discounts?: unknown[] | null;
  discount?: unknown;
  items?: {
    data?: StripeRevenueItem[];
    has_more?: boolean;
  } | null;
}

export interface ChurnedSubscription {
  subscriptionId: string;
  date: string;
  customer: string;
  plan: Plan;
  mrrPence: number;
  reason: string;
}

export interface RevenueSnapshot {
  monthKey: string;
  monthLabel: string;
  currency: string;
  mrrPence: number;
  arrPence: number;
  activePayingClients: number;
  trialClients: number;
  pastDueClients: number;
  churnedClientsThisMonth: number;
  newMrrPence: number;
  churnedMrrPence: number;
  byPlan: Record<Plan, { clients: number; mrrPence: number }>;
  churnedSubscriptions: ChurnedSubscription[];
}

export interface MonthlyMovement {
  startingMrrPence: number;
  newMrrPence: number;
  expansionPence: number;
  churnedMrrPence: number;
  endingMrrPence: number;
  netChangePence: number;
  bootstrap: boolean;
}

const EMPTY_PLAN_BREAKDOWN = (): RevenueSnapshot['byPlan'] => ({
  starter: { clients: 0, mrrPence: 0 },
  pro: { clients: 0, mrrPence: 0 },
  business: { clients: 0, mrrPence: 0 },
  agency: { clients: 0, mrrPence: 0 },
});

function productId(item: StripeRevenueItem): string | null {
  const product = item.price?.product;
  if (typeof product === 'string') return product;
  return product?.id ?? null;
}

export function planForSubscription(subscription: StripeRevenueSubscription): Plan {
  const plans = new Set(
    (subscription.items?.data ?? [])
      .map((item) => stripePlanForProduct(productId(item)))
      .filter((plan): plan is Plan => Boolean(plan)),
  );
  if (plans.size !== 1) {
    throw new Error(`Stripe subscription ${subscription.id} has an unknown or mixed plan`);
  }
  return [...plans][0];
}

export function monthlyPenceForItem(item: StripeRevenueItem): number {
  const price = item.price;
  const recurring = price?.recurring;
  if (!price || !recurring?.interval) throw new Error('Stripe revenue item is not recurring');
  if (recurring.usage_type === 'metered') throw new Error('Metered Stripe prices are not supported');

  const rawAmount = price.unit_amount_decimal ?? (
    typeof price.unit_amount === 'number' ? String(price.unit_amount) : null
  );
  const amount = rawAmount === null ? Number.NaN : Number(rawAmount);
  if (!Number.isFinite(amount)) throw new Error('Stripe price has no fixed unit amount');

  const quantity = item.quantity ?? 1;
  const intervalCount = recurring.interval_count ?? 1;
  if (quantity < 0 || intervalCount <= 0) throw new Error('Stripe price has invalid quantity or interval');

  const billedPence = amount * quantity;
  const monthly = recurring.interval === 'month'
    ? billedPence / intervalCount
    : recurring.interval === 'year'
      ? billedPence / (12 * intervalCount)
      : recurring.interval === 'week'
        ? (billedPence * 52) / (12 * intervalCount)
        : (billedPence * 365) / (12 * intervalCount);
  return Math.round(monthly);
}

export function monthlyPenceForSubscription(subscription: StripeRevenueSubscription): number {
  if (subscription.items?.has_more) {
    throw new Error(`Stripe subscription ${subscription.id} has more than 20 items`);
  }
  if ((subscription.discounts?.length ?? 0) > 0 || subscription.discount) {
    throw new Error(`Stripe subscription ${subscription.id} has a discount that needs net-MRR support`);
  }
  return (subscription.items?.data ?? []).reduce(
    (total, item) => total + monthlyPenceForItem(item),
    0,
  );
}

export function revenueMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function revenueMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

function isWithinMonth(timestamp: number | null | undefined, now: Date): boolean {
  if (typeof timestamp !== 'number') return false;
  const date = new Date(timestamp * 1000);
  return date.getUTCFullYear() === now.getUTCFullYear()
    && date.getUTCMonth() === now.getUTCMonth();
}

function currencyFor(subscription: StripeRevenueSubscription): string | null {
  const currencies = new Set(
    (subscription.items?.data ?? [])
      .map((item) => item.price?.currency?.toLowerCase())
      .filter((currency): currency is string => Boolean(currency)),
  );
  if (currencies.size > 1) {
    throw new Error(`Stripe subscription ${subscription.id} mixes currencies`);
  }
  return [...currencies][0] ?? null;
}

function customerLabel(subscription: StripeRevenueSubscription): string {
  const customer = subscription.customer;
  if (typeof customer === 'string') return customer;
  return customer?.name?.trim() || customer?.email?.trim() || customer?.id || 'Unknown customer';
}

function churnReason(subscription: StripeRevenueSubscription): string {
  const details = subscription.cancellation_details;
  return details?.comment?.trim()
    || details?.feedback?.trim()
    || details?.reason?.trim()
    || 'Not supplied';
}

/** Build a conservative Stripe snapshot: only status=active contributes MRR. */
export function buildRevenueSnapshot(
  subscriptions: StripeRevenueSubscription[],
  now = new Date(),
): RevenueSnapshot {
  const byPlan = EMPTY_PLAN_BREAKDOWN();
  const currencies = new Set<string>();
  const churnedSubscriptions: ChurnedSubscription[] = [];
  let mrrPence = 0;
  let activePayingClients = 0;
  let trialClients = 0;
  let pastDueClients = 0;
  let newMrrPence = 0;
  let churnedMrrPence = 0;

  for (const subscription of subscriptions) {
    const currency = currencyFor(subscription);
    if (currency) currencies.add(currency);
    const monthlyPence = monthlyPenceForSubscription(subscription);
    const plan = planForSubscription(subscription);

    if (subscription.status === 'active') {
      mrrPence += monthlyPence;
      activePayingClients += 1;
      byPlan[plan].clients += 1;
      byPlan[plan].mrrPence += monthlyPence;
      if (isWithinMonth(subscription.created, now)) newMrrPence += monthlyPence;
    } else if (subscription.status === 'trialing') {
      trialClients += 1;
    } else if (subscription.status === 'past_due') {
      pastDueClients += 1;
    }

    if (subscription.status === 'canceled' && typeof subscription.canceled_at === 'number') {
      if (isWithinMonth(subscription.canceled_at, now)) churnedMrrPence += monthlyPence;
      churnedSubscriptions.push({
        subscriptionId: subscription.id,
        date: new Date((subscription.canceled_at as number) * 1000).toISOString().slice(0, 10),
        customer: customerLabel(subscription),
        plan,
        mrrPence: monthlyPence,
        reason: churnReason(subscription),
      });
    }
  }

  if (currencies.size > 1) throw new Error('Revenue Tracker cannot combine multiple currencies');
  const currency = [...currencies][0] ?? 'gbp';
  if (currency !== 'gbp') throw new Error(`Revenue Tracker expects GBP, received ${currency.toUpperCase()}`);

  return {
    monthKey: revenueMonthKey(now),
    monthLabel: revenueMonthLabel(now),
    currency,
    mrrPence,
    arrPence: mrrPence * 12,
    activePayingClients,
    trialClients,
    pastDueClients,
    churnedClientsThisMonth: churnedSubscriptions.filter((subscription) => {
      const date = new Date(`${subscription.date}T00:00:00.000Z`);
      return date.getUTCFullYear() === now.getUTCFullYear()
        && date.getUTCMonth() === now.getUTCMonth();
    }).length,
    newMrrPence,
    churnedMrrPence,
    byPlan,
    churnedSubscriptions: churnedSubscriptions.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * The first automated month has no trustworthy opening balance. Derive a
 * neutral baseline and mark it; later months use the prior closing snapshot.
 */
export function deriveMonthlyMovement(
  snapshot: RevenueSnapshot,
  startingMrrPence: number | null,
  forceBootstrap = false,
): MonthlyMovement {
  const bootstrap = startingMrrPence === null || forceBootstrap;
  const starting = startingMrrPence === null
    ? Math.max(0, snapshot.mrrPence - snapshot.newMrrPence + snapshot.churnedMrrPence)
    : Math.max(0, startingMrrPence);
  return {
    startingMrrPence: starting,
    newMrrPence: snapshot.newMrrPence,
    expansionPence: bootstrap
      ? 0
      : snapshot.mrrPence - starting - snapshot.newMrrPence + snapshot.churnedMrrPence,
    churnedMrrPence: snapshot.churnedMrrPence,
    endingMrrPence: snapshot.mrrPence,
    netChangePence: snapshot.mrrPence - starting,
    bootstrap,
  };
}

export function formatGbp(pence: number): string {
  const sign = pence < 0 ? '-' : '';
  const absolute = Math.abs(pence);
  const pounds = absolute / 100;
  return `${sign}£${Number.isInteger(pounds) ? pounds.toFixed(0) : pounds.toFixed(2)}`;
}

export function parseGbp(value: string): number | null {
  const normalised = value.replace(/[£,\s]/g, '');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * 100);
}
