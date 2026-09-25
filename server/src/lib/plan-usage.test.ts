import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { callLimitFor, resolveUsagePeriod, summariseUsage } from './plan-usage';

describe('plan usage periods', () => {
  it('uses the Stripe-aligned monthly window', () => {
    const period = resolveUsagePeriod({
      subscriptionStatus: 'active',
      createdAt: '2026-01-01T10:00:00.000Z',
      currentPeriodStart: '2026-08-15T10:00:00.000Z',
      currentPeriodEnd: '2026-09-15T10:00:00.000Z',
      now: new Date('2026-09-02T12:00:00.000Z'),
    });
    assert.deepEqual(period, {
      start: '2026-08-15T10:00:00.000Z',
      end: '2026-09-15T10:00:00.000Z',
    });
  });

  it('keeps a 31st billing anchor after February', () => {
    const period = resolveUsagePeriod({
      subscriptionStatus: 'active',
      createdAt: '2026-01-31T09:30:00.000Z',
      currentPeriodStart: '2026-01-31T09:30:00.000Z',
      currentPeriodEnd: '2027-01-31T09:30:00.000Z',
      now: new Date('2026-03-15T12:00:00.000Z'),
    });
    assert.deepEqual(period, {
      start: '2026-02-28T09:30:00.000Z',
      end: '2026-03-31T09:30:00.000Z',
    });
  });

  it('uses the whole 14-day trial when Stripe has not supplied dates', () => {
    const period = resolveUsagePeriod({
      subscriptionStatus: 'trialing',
      createdAt: '2026-09-01T08:00:00.000Z',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      now: new Date('2026-09-05T12:00:00.000Z'),
    });
    assert.deepEqual(period, {
      start: '2026-09-01T08:00:00.000Z',
      end: '2026-09-15T08:00:00.000Z',
    });
  });

  it('derives a monthly window from the stored period end during backfill', () => {
    const period = resolveUsagePeriod({
      subscriptionStatus: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      currentPeriodStart: null,
      currentPeriodEnd: '2026-10-20T11:15:00.000Z',
      now: new Date('2026-09-25T12:00:00.000Z'),
    });
    assert.deepEqual(period, {
      start: '2026-09-20T11:15:00.000Z',
      end: '2026-10-20T11:15:00.000Z',
    });
  });
});

describe('plan usage summary', () => {
  it('shares the live plan limits', () => {
    assert.equal(callLimitFor('starter'), 50);
    assert.equal(callLimitFor('pro'), 150);
    assert.equal(callLimitFor('business'), 350);
    assert.equal(callLimitFor('agency'), 600);
  });

  it('marks 80% usage as approaching the limit', () => {
    assert.deepEqual(summariseUsage('starter', 40, []), {
      calls: 40,
      limit: 50,
      remaining: 10,
      usagePercent: 80,
      status: 'Approaching limit',
      overageCalls: 0,
      overLimitAt: null,
      reachedThresholds: [80],
    });
  });

  it('marks the allowance itself as reached', () => {
    const usage = summariseUsage('starter', 50, []);
    assert.equal(usage.status, 'Limit reached');
    assert.deepEqual(usage.reachedThresholds, [100]);
  });

  it('records the exact first call beyond the allowance', () => {
    const starts = Array.from({ length: 51 }, (_, i) =>
      new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString());
    const usage = summariseUsage('starter', 51, starts);
    assert.equal(usage.status, 'Over limit');
    assert.equal(usage.overageCalls, 1);
    assert.equal(usage.remaining, 0);
    assert.equal(usage.overLimitAt, starts[50]);
  });
});
