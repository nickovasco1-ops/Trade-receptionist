/**
 * Per-tenant diary rules by job size. Pure: no I/O, so every rule is tested.
 *
 * working_days + business hours cannot say what a tradesperson actually works
 * to. The first tenant to spell it out (TAPS, 2026-09-28) needed: small jobs
 * on Tuesday, bigger ones mid-week, big jobs only three weeks out and only on a
 * day with nothing else in it, 30 minutes' travel before the first job and an
 * hour clear after each one, and emergencies any day at any hour. Written as
 * prompt text those are wishes the model may or may not keep; enforced here,
 * the tool simply never offers or accepts a slot that breaks them.
 *
 * A tenant with no rules keeps the plain behaviour in services/calendar.ts.
 */
import { z } from 'zod';
import type { BookingRules, JobSize, JobSizeRule } from '../../../shared/types';
import { dateStringInTz, dayOfWeekInTz, localDateTimeToUtc, localMinutesInTz } from './tz';

export interface BusyWindow {
  start: Date;
  end: Date;
}

export interface WorkingHours {
  /** Opening time, minutes since local midnight. */
  openMins: number;
  /** Closing time, minutes since local midnight. */
  closeMins: number;
}

export const JOB_SIZES: readonly JobSize[] = ['small', 'medium', 'large', 'emergency'];

/** Candidate starts are tried on this grid. */
const STEP_MINS = 30;
/** Never offer a slot starting sooner than this — same look-ahead the plain engine uses. */
const MIN_NOTICE_MINS = 30;
/** Slots returned per day, so one open Tuesday does not crowd out every other day. */
const MAX_PER_DAY = 2;

const dayList = z.array(z.number().int().min(0).max(6));

const sizeRuleSchema = z.object({
  durationMins: z.number().int().min(15).max(24 * 60).optional(),
  days:         dayList.optional(),
  preferDays:   dayList.optional(),
  fullDay:      z.boolean().optional(),
  minLeadDays:  z.number().int().min(0).max(365).optional(),
  anyTime:      z.boolean().optional(),
}).refine((r) => r.fullDay || r.durationMins !== undefined, {
  message: 'durationMins is required unless fullDay is set',
});

export const bookingRulesSchema = z.object({
  travelBeforeMins: z.number().int().min(0).max(240),
  gapAfterMins:     z.number().int().min(0).max(240),
  sizes: z.object({
    small:     sizeRuleSchema.optional(),
    medium:    sizeRuleSchema.optional(),
    large:     sizeRuleSchema.optional(),
    emergency: sizeRuleSchema.optional(),
  }),
});

/** The tenant's rules, or null if unset or malformed (callers fall back to the plain engine). */
export function parseBookingRules(raw: unknown): BookingRules | null {
  if (raw === null || raw === undefined) return null;
  const parsed = bookingRulesSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Why a stored rules value was rejected, for logging. Null when it is valid or absent. */
export function bookingRulesError(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const parsed = bookingRulesSchema.safeParse(raw);
  return parsed.success ? null : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}

/**
 * Whether a candidate job collides with the diary.
 *
 * Every existing entry keeps `gap` clear after it, and the new job needs the
 * same after itself. The gap covers travel to the next job, which is why
 * back-to-back small jobs land exactly two hours apart (1h job + 1h clear).
 */
export function collides(busy: BusyWindow[], start: Date, end: Date, gapAfterMins: number): boolean {
  const gap = gapAfterMins * 60_000;
  return busy.some((w) =>
    start.getTime() < w.end.getTime() + gap && end.getTime() + gap > w.start.getTime());
}

function earliestDate(now: Date, rule: JobSizeRule, tz: string): string {
  const lead = rule.minLeadDays ?? 0;
  return dateStringInTz(new Date(now.getTime() + lead * 86_400_000), tz);
}

function durationOf(rule: JobSizeRule, hours: WorkingHours): number {
  return rule.fullDay ? hours.closeMins - hours.openMins : (rule.durationMins ?? 60);
}

export interface PlanInput {
  rules: BookingRules;
  size: JobSize;
  busy: BusyWindow[];
  now: Date;
  /** Search starts on this local day. */
  from: Date;
  days: number;
  hours: WorkingHours;
  timezone: string;
  maxSlots: number;
}

export interface PlannedSlot {
  start: Date;
  end: Date;
}

/** Emergencies: the next free hour, any day, any time. */
function planAnyTime(input: PlanInput, rule: JobSizeRule): PlannedSlot[] {
  const { rules, busy, now, maxSlots } = input;
  const duration = rule.durationMins ?? 60;
  const stepMs = STEP_MINS * 60_000;
  const notice = Math.max(MIN_NOTICE_MINS, rules.travelBeforeMins) * 60_000;
  const limit = now.getTime() + input.days * 86_400_000;

  let t = Math.ceil((now.getTime() + notice) / stepMs) * stepMs;
  const out: PlannedSlot[] = [];
  while (t + duration * 60_000 <= limit && out.length < maxSlots) {
    const start = new Date(t);
    const end = new Date(t + duration * 60_000);
    if (!collides(busy, start, end, rules.gapAfterMins)) {
      out.push({ start, end });
      t += (duration + rules.gapAfterMins) * 60_000;
    } else {
      t += stepMs;
    }
  }
  return out;
}

/** Feasible slots on one local day, packed from the first possible start. */
function planDay(input: PlanInput, rule: JobSizeRule, dateStr: string): PlannedSlot[] {
  const { rules, busy, now, hours, timezone } = input;
  const notBefore = now.getTime() + MIN_NOTICE_MINS * 60_000;

  if (rule.fullDay) {
    const start = localDateTimeToUtc(dateStr, hours.openMins, timezone);
    const end = localDateTimeToUtc(dateStr, hours.closeMins, timezone);
    // The whole day must be empty: no gap arithmetic, nothing may overlap it.
    if (start.getTime() < notBefore || collides(busy, start, end, 0)) return [];
    return [{ start, end }];
  }

  const duration = durationOf(rule, hours);
  const out: PlannedSlot[] = [];
  let m = hours.openMins + rules.travelBeforeMins;
  while (m + duration <= hours.closeMins) {
    const start = localDateTimeToUtc(dateStr, m, timezone);
    const end = new Date(start.getTime() + duration * 60_000);
    if (start.getTime() >= notBefore && !collides(busy, start, end, rules.gapAfterMins)) {
      out.push({ start, end });
      m += duration + rules.gapAfterMins;
    } else {
      m += STEP_MINS;
    }
  }
  return out;
}

/**
 * Bookable slots for a job size.
 *
 * Preferred days come first (in the order listed), then the rest by date, at
 * most MAX_PER_DAY per day. An unknown size, or a size the tenant has no rule
 * for, yields nothing rather than guessing.
 */
export function planSlots(input: PlanInput): PlannedSlot[] {
  const rule = input.rules.sizes[input.size];
  if (!rule) return [];
  if (rule.anyTime) return planAnyTime(input, rule);

  const allowed = rule.days ?? [];
  const minDate = earliestDate(input.now, rule, input.timezone);
  const byDay: Array<{ dow: number; slots: PlannedSlot[] }> = [];
  const seen = new Set<string>();
  // A size with a lead time searches from its earliest day, so "big jobs three
  // weeks out" finds three weeks out instead of an empty first fortnight.
  const leadStart = new Date(input.now.getTime() + (rule.minLeadDays ?? 0) * 86_400_000);
  const from = input.from.getTime() > leadStart.getTime() ? input.from : leadStart;
  // Step from local midday, so a 23- or 25-hour DST day can never skip a date.
  const base = localDateTimeToUtc(dateStringInTz(from, input.timezone), 12 * 60, input.timezone);

  for (let d = 0; d < input.days; d++) {
    const probe = new Date(base.getTime() + d * 86_400_000);
    const dateStr = dateStringInTz(probe, input.timezone);
    if (seen.has(dateStr)) continue;
    seen.add(dateStr);
    const dow = dayOfWeekInTz(probe, input.timezone);
    if (!allowed.includes(dow) || dateStr < minDate) continue;
    const slots = planDay(input, rule, dateStr).slice(0, MAX_PER_DAY);
    if (slots.length) byDay.push({ dow, slots });
  }

  const prefer = rule.preferDays ?? [];
  const rank = (dow: number): number => {
    const i = prefer.indexOf(dow);
    return i === -1 ? prefer.length : i;
  };
  // Stable sort: preferred days first, chronological within each rank.
  const ordered = byDay
    .map((day, i) => ({ ...day, i }))
    .sort((a, b) => rank(a.dow) - rank(b.dow) || a.i - b.i);

  return ordered.flatMap((d) => d.slots).slice(0, input.maxSlots);
}

export interface CheckInput extends Omit<PlanInput, 'from' | 'days' | 'maxSlots'> {
  start: Date;
}

/** The diary entry a job of this size occupies if it starts at `start`. */
export function slotFor(
  rules: BookingRules, size: JobSize, start: Date, hours: WorkingHours, tz: string,
): PlannedSlot | null {
  const rule = rules.sizes[size];
  if (!rule) return null;
  if (rule.fullDay) {
    const dateStr = dateStringInTz(start, tz);
    return {
      start: localDateTimeToUtc(dateStr, hours.openMins, tz),
      end: localDateTimeToUtc(dateStr, hours.closeMins, tz),
    };
  }
  return { start, end: new Date(start.getTime() + (rule.durationMins ?? 60) * 60_000) };
}

/**
 * Why a specific start is not bookable for this size, or null if it is.
 * Worded to be read back to the caller by the agent.
 */
export function slotProblem(input: CheckInput): string | null {
  const { rules, size, busy, now, hours, timezone, start } = input;
  const rule = rules.sizes[size];
  if (!rule) return `This business does not take ${size} jobs through the diary.`;

  const slot = slotFor(rules, size, start, hours, timezone);
  if (!slot) return 'That job type cannot be booked.';

  if (rule.anyTime) {
    const notice = Math.max(MIN_NOTICE_MINS, rules.travelBeforeMins) * 60_000;
    if (slot.start.getTime() < now.getTime() + notice) return 'That time is too soon for the engineer to get there.';
    return collides(busy, slot.start, slot.end, rules.gapAfterMins) ? 'That time is already taken.' : null;
  }

  if (!(rule.days ?? []).includes(dayOfWeekInTz(start, timezone))) {
    return 'That day is not available for this kind of job.';
  }
  if (dateStringInTz(start, timezone) < earliestDate(now, rule, timezone)) {
    return `This kind of job has to be booked at least ${rule.minLeadDays} days ahead.`;
  }
  if (slot.start.getTime() < now.getTime() + MIN_NOTICE_MINS * 60_000) return 'That time has already passed.';

  if (rule.fullDay) {
    return collides(busy, slot.start, slot.end, 0) ? 'That day already has something booked in.' : null;
  }

  const m = localMinutesInTz(start, timezone);
  if (m < hours.openMins + rules.travelBeforeMins || m + durationOf(rule, hours) > hours.closeMins) {
    return 'That time is outside working hours.';
  }
  return collides(busy, slot.start, slot.end, rules.gapAfterMins) ? 'That time is already taken.' : null;
}

/** Busy-window range to fetch so every rule above can see what it needs. */
export function busyRangeFor(from: Date, to: Date, rules: BookingRules): { from: Date; to: Date } {
  const pad = Math.max(rules.gapAfterMins, rules.travelBeforeMins, 60) * 60_000;
  return { from: new Date(from.getTime() - pad), to: new Date(to.getTime() + pad) };
}
