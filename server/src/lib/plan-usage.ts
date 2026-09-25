import { PLAN_CALL_LIMITS } from '../../../shared/plan-limits';
import type { Plan } from '../../../shared/types';

export type UsageStatus = 'OK' | 'Approaching limit' | 'Limit reached' | 'Over limit';
export type UsageThreshold = 80 | 100;

export interface UsagePeriodInput {
  subscriptionStatus: string | null;
  createdAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  now?: Date;
}

export interface UsagePeriod {
  start: string;
  end: string;
}

export interface UsageSnapshot {
  calls: number;
  limit: number;
  remaining: number;
  usagePercent: number;
  status: UsageStatus;
  overageCalls: number;
  overLimitAt: string | null;
  reachedThresholds: UsageThreshold[];
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Return a month boundary without letting dates drift after a short month.
 * 31 January + 1 month is 28/29 February; +2 is 31 March, not 28 March.
 */
function monthBoundary(anchor: Date, offset: number): Date {
  const first = new Date(Date.UTC(
    anchor.getUTCFullYear(),
    anchor.getUTCMonth() + offset,
    1,
    anchor.getUTCHours(),
    anchor.getUTCMinutes(),
    anchor.getUTCSeconds(),
    anchor.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(
    first.getUTCFullYear(),
    first.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  first.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
  return first;
}

function monthlyWindowFromStart(anchor: Date, now: Date): { start: Date; end: Date } {
  let offset = Math.max(0,
    ((now.getUTCFullYear() - anchor.getUTCFullYear()) * 12)
      + now.getUTCMonth() - anchor.getUTCMonth());
  let start = monthBoundary(anchor, offset);
  if (start > now && offset > 0) {
    offset -= 1;
    start = monthBoundary(anchor, offset);
  }
  let end = monthBoundary(anchor, offset + 1);
  while (now >= end) {
    offset += 1;
    start = end;
    end = monthBoundary(anchor, offset + 1);
  }
  return { start, end };
}

function monthlyWindowFromEnd(anchor: Date, now: Date): { start: Date; end: Date } {
  let offset = 0;
  let end = monthBoundary(anchor, offset);
  while (now >= end) {
    offset += 1;
    end = monthBoundary(anchor, offset);
  }
  let start = monthBoundary(anchor, offset - 1);
  while (now < start) {
    offset -= 1;
    end = start;
    start = monthBoundary(anchor, offset - 1);
  }
  return { start, end };
}

/** Resolve the exact monthly allowance window, aligned to Stripe's period. */
export function resolveUsagePeriod(input: UsagePeriodInput): UsagePeriod {
  const now = input.now ?? new Date();
  const createdAt = validDate(input.createdAt) ?? now;
  const periodStart = validDate(input.currentPeriodStart);
  const periodEnd = validDate(input.currentPeriodEnd);

  // The trial's 50-call allowance covers the trial itself, not a rolling month.
  if (input.subscriptionStatus === 'trialing') {
    const start = periodStart ?? createdAt;
    const end = periodEnd ?? new Date(start.getTime() + (14 * 24 * 60 * 60 * 1000));
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (periodStart) {
    const window = monthlyWindowFromStart(periodStart, now);
    return { start: window.start.toISOString(), end: window.end.toISOString() };
  }

  if (periodEnd) {
    const window = monthlyWindowFromEnd(periodEnd, now);
    return { start: window.start.toISOString(), end: window.end.toISOString() };
  }

  const window = monthlyWindowFromStart(createdAt, now);
  return { start: window.start.toISOString(), end: window.end.toISOString() };
}

export function callLimitFor(plan: string): number {
  return PLAN_CALL_LIMITS[plan as Plan] ?? PLAN_CALL_LIMITS.starter;
}

/** Convert authoritative call rows into the values written to Notion and alerts. */
export function summariseUsage(
  plan: string,
  callCount: number,
  orderedCallStarts: string[],
): UsageSnapshot {
  const limit = callLimitFor(plan);
  const calls = Math.max(0, callCount);
  const usagePercent = Math.round((calls / limit) * 1000) / 10;
  const overageCalls = Math.max(0, calls - limit);
  const status: UsageStatus = calls > limit
    ? 'Over limit'
    : calls >= limit
      ? 'Limit reached'
      : calls >= Math.ceil(limit * 0.8)
        ? 'Approaching limit'
        : 'OK';

  return {
    calls,
    limit,
    remaining: Math.max(0, limit - calls),
    usagePercent,
    status,
    overageCalls,
    // Zero-based index `limit` is the first call beyond the allowance.
    overLimitAt: overageCalls > 0 ? orderedCallStarts[limit] ?? null : null,
    // Only the highest newly-observable threshold matters. If monitoring is
    // first enabled after a tenant is already at 100%, two emails at once are
    // noise; tenants seen earlier still get 80% and then 100% on later runs.
    reachedThresholds: calls >= limit
      ? [100]
      : calls >= Math.ceil(limit * 0.8)
        ? [80]
        : [],
  };
}
