import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { BookingRules } from '../../../shared/types';
import {
  bookingRulesError,
  collides,
  parseBookingRules,
  planSlots,
  slotProblem,
  type BusyWindow,
  type PlanInput,
} from './booking-rules';

/**
 * The rules TAPS actually works to (2026-09-28), used as the fixture because
 * the point of these tests is that his stated day comes out of them: 30
 * minutes' travel from an 8am start, an hour clear after every job, 8pm finish
 * — which yields exactly the "up to 6 small jobs on a Tuesday" he asked for
 * without a separate cap.
 */
const TAPS: BookingRules = {
  travelBeforeMins: 30,
  gapAfterMins: 60,
  sizes: {
    small:     { durationMins: 60,  days: [2, 3, 5], preferDays: [2] },
    medium:    { durationMins: 120, days: [2, 3, 5], preferDays: [3, 5] },
    large:     { fullDay: true, days: [3, 4, 5], minLeadDays: 21 },
    emergency: { durationMins: 60, anyTime: true },
  },
};

const TZ = 'Europe/London';
const HOURS = { openMins: 8 * 60, closeMins: 20 * 60 };
// Monday 5 October 2026, 09:00 BST.
const MONDAY_9AM = new Date('2026-10-05T08:00:00Z');

function plan(overrides: Partial<PlanInput> = {}): ReturnType<typeof planSlots> {
  return planSlots({
    rules: TAPS, size: 'small', busy: [], now: MONDAY_9AM, from: MONDAY_9AM,
    days: 14, hours: HOURS, timezone: TZ, maxSlots: 50, ...overrides,
  });
}

/** Local "Ddd HH:MM" for readable assertions. */
function label(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

describe('small jobs', () => {
  test('a Tuesday fills with exactly six small jobs, two hours apart', () => {
    // Book the first offered Tuesday slot, add it to the diary, repeat until
    // Tuesday is full. Six is not a configured cap — it is what the travel,
    // gap and hours produce, which is how he described his day.
    const busy: BusyWindow[] = [];
    const booked: string[] = [];
    for (;;) {
      const next = plan({ busy, days: 2 }).find((s) => label(s.start).startsWith('Tue'));
      if (!next) break;
      busy.push(next);
      booked.push(label(next.start));
    }
    assert.deepEqual(booked, [
      'Tue 08:30', 'Tue 10:30', 'Tue 12:30', 'Tue 14:30', 'Tue 16:30', 'Tue 18:30',
    ]);
  });

  test('never offered on Monday, Thursday or the weekend', () => {
    const days = new Set(plan().map((s) => label(s.start).slice(0, 3)));
    assert.deepEqual([...days].sort(), ['Fri', 'Tue', 'Wed']);
  });

  test('Tuesday is offered first even when another day is sooner', () => {
    // Tuesday 9pm: Wednesday and Friday come before next Tuesday by date.
    const tuesdayNight = new Date('2026-10-06T20:00:00Z');
    const slots = plan({ now: tuesdayNight, from: tuesdayNight });
    assert.ok(label(slots[0].start).startsWith('Tue'));
  });

  test('the first job leaves time to travel from an 8am start', () => {
    assert.equal(label(plan()[0].start), 'Tue 08:30');
  });
});

describe('the gap after a job', () => {
  const smallAt830: BusyWindow = {
    start: new Date('2026-10-06T07:30:00Z'), // Tue 08:30 BST
    end:   new Date('2026-10-06T08:30:00Z'),
  };

  test('the next job starts an hour after the last one ends', () => {
    const slot = plan({ size: 'medium', busy: [smallAt830], days: 2 })[0];
    assert.equal(label(slot.start), 'Tue 10:30');
  });

  test('collides() allows exactly the gap and no less', () => {
    const at1030 = new Date('2026-10-06T09:30:00Z');
    const at1000 = new Date('2026-10-06T09:00:00Z');
    const hour = 3_600_000;
    assert.equal(collides([smallAt830], at1030, new Date(at1030.getTime() + hour), 60), false);
    assert.equal(collides([smallAt830], at1000, new Date(at1000.getTime() + hour), 60), true);
  });

  test('a medium job has to finish by closing time', () => {
    // Medium is 2h: the last possible start is 18:00.
    const busy: BusyWindow[] = [];
    let last = '';
    for (;;) {
      const next = plan({ size: 'medium', busy, days: 2 }).find((s) => label(s.start).startsWith('Tue'));
      if (!next) break;
      busy.push(next);
      last = label(next.start);
      assert.ok(label(next.end).slice(4) <= '20:00', `${last} runs past 8pm`);
    }
    // 08:30, 11:30, 14:30, 17:30 (ends 19:30) — a fifth would end after 8pm.
    assert.equal(last, 'Tue 17:30');
  });
});

describe('big jobs', () => {
  test('nothing is offered inside three weeks, even when asked for tomorrow', () => {
    const slots = plan({ size: 'large', days: 14 });
    assert.ok(slots.length > 0, 'the search should jump to the first allowed day, not come back empty');
    for (const s of slots) {
      assert.ok(s.start.getTime() >= MONDAY_9AM.getTime() + 20 * 86_400_000);
    }
  });

  test('offered as a whole working day, three weeks out, Wed/Thu/Fri only', () => {
    const slots = plan({ size: 'large', days: 35 });
    assert.ok(slots.length > 0);
    const first = slots[0];
    assert.ok(first.start.getTime() >= MONDAY_9AM.getTime() + 21 * 86_400_000 - 86_400_000);
    assert.match(label(first.start), /^(Wed|Thu|Fri) 08:00$/);
    assert.match(label(first.end), /20:00$/);
  });

  test('a Thursday with anything already in it is skipped', () => {
    // Thu 29 Oct 2026 (GMT) has one short entry.
    const thursday: BusyWindow = {
      start: new Date('2026-10-29T14:00:00Z'), end: new Date('2026-10-29T15:00:00Z'),
    };
    const from = new Date('2026-10-28T12:00:00Z');
    const slots = plan({ size: 'large', busy: [thursday], from, days: 3, maxSlots: 10 });
    const days = slots.map((s) => label(s.start).slice(0, 3));
    assert.ok(!days.includes('Thu'));
    assert.ok(days.includes('Wed') && days.includes('Fri'));
  });
});

describe('emergencies', () => {
  test('bookable in the middle of a Sunday night', () => {
    const sunday2am = new Date('2026-10-11T01:00:00Z'); // Sun 02:00 BST
    const slot = plan({ size: 'emergency', now: sunday2am, from: sunday2am, days: 2 })[0];
    assert.equal(label(slot.start), 'Sun 02:30');
  });

  test('still respects what is already in the diary', () => {
    const sunday2am = new Date('2026-10-11T01:00:00Z');
    const busy: BusyWindow[] = [{
      start: new Date('2026-10-11T01:30:00Z'), end: new Date('2026-10-11T02:30:00Z'),
    }];
    const slot = plan({ size: 'emergency', busy, now: sunday2am, from: sunday2am, days: 2 })[0];
    assert.equal(label(slot.start), 'Sun 04:30');
  });
});

describe('slotProblem', () => {
  const base = { rules: TAPS, busy: [], now: MONDAY_9AM, hours: HOURS, timezone: TZ };

  test('accepts a valid slot', () => {
    assert.equal(slotProblem({ ...base, size: 'small', start: new Date('2026-10-06T07:30:00Z') }), null);
  });

  test('refuses a small job on a Monday', () => {
    const problem = slotProblem({ ...base, size: 'small', start: new Date('2026-10-12T07:30:00Z') });
    assert.match(problem ?? '', /not available/);
  });

  test('refuses 8am, which leaves no time to travel', () => {
    const problem = slotProblem({ ...base, size: 'small', start: new Date('2026-10-06T07:00:00Z') });
    assert.match(problem ?? '', /working hours/);
  });

  test('refuses a big job ten days out', () => {
    const problem = slotProblem({ ...base, size: 'large', start: new Date('2026-10-14T07:00:00Z') });
    assert.match(problem ?? '', /21 days ahead/);
  });

  test('refuses a slot that breaks the gap after an existing job', () => {
    const busy: BusyWindow[] = [{
      start: new Date('2026-10-06T07:30:00Z'), end: new Date('2026-10-06T08:30:00Z'),
    }];
    const problem = slotProblem({ ...base, busy, size: 'small', start: new Date('2026-10-06T09:00:00Z') });
    assert.match(problem ?? '', /already taken/);
  });

  test('a size the tenant has no rule for is refused, not guessed', () => {
    const rules: BookingRules = { ...TAPS, sizes: { small: TAPS.sizes.small } };
    const problem = slotProblem({ ...base, rules, size: 'large', start: new Date('2026-11-04T08:00:00Z') });
    assert.match(problem ?? '', /does not take large jobs/);
  });
});

describe('parseBookingRules', () => {
  test('accepts the TAPS rules', () => {
    assert.deepEqual(parseBookingRules(TAPS), TAPS);
  });

  test('absent rules mean the plain engine', () => {
    assert.equal(parseBookingRules(null), null);
    assert.equal(bookingRulesError(undefined), null);
  });

  test('malformed rules are rejected with a reason, not half-applied', () => {
    const bad = { travelBeforeMins: 30, gapAfterMins: 60, sizes: { small: { days: [2] } } };
    assert.equal(parseBookingRules(bad), null);
    assert.match(bookingRulesError(bad) ?? '', /durationMins/);
  });
});
