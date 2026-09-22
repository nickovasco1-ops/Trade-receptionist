// Calendar availability and bookings — provider-independent.
//
// Working hours, DST handling, slot generation and overlap detection are the
// same whether the diary is Google, Outlook or Apple. Only free/busy, create
// and delete differ, and those live behind CalendarAdapter in
// services/calendar-providers.ts. The OAuth and CalDAV connect flows live in
// services/calendar-connect.ts.
//
// This file used to be Google-only, with (calendarId, refreshToken) threaded
// through every signature. That shape is why "is the diary connected?" was
// spelled `!!client.google_cal_id` in about thirty places.

import { supabase } from './supabase';
import { logEvent, errorMessage } from '../lib/observability';
import {
  CalendarAuthError,
  adapterFor,
  type BusyWindow,
  type CalendarConnection,
  type CalendarEventInput,
} from './calendar-providers';

export type { CalendarConnection, CalendarEventInput, CalendarColumns } from './calendar-providers';
export {
  CalendarAuthError,
  calendarConnection,
  calendarIsConnected,
  providerLabel,
} from './calendar-providers';

// ── Connection resolution ─────────────────────────────────────────────────────
//
// calendarConnection() and calendarIsConnected() live in calendar-providers.ts
// so they stay unit-testable — this module imports the Supabase client, which
// throws at import time without credentials. Re-exported here so callers have
// one obvious place to import calendar behaviour from.

/**
 * Record that a provider has rejected the stored credential.
 *
 * The point is that a dead diary becomes *visible*. Before this, a revoked
 * token threw mid-call, the LLM smoothly talked around the missing tool, and
 * nothing was logged at error level — so a customer could go weeks with a
 * receptionist that quietly could not book anything.
 */
export async function markCalendarNeedsReconnect(
  clientId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .update({
      calendar_status: 'needs_reconnect',
      calendar_last_error: message.slice(0, 500),
      calendar_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  // error level on purpose: this reaches Sentry and the daily health report.
  logEvent('error', 'calendar.needs_reconnect', {
    clientId,
    reason: message.slice(0, 200),
    ...(error ? { persistError: error.message } : {}),
  });
}

/** Clear the flag once a provider answers successfully again. */
async function markCalendarHealthy(clientId: string): Promise<void> {
  await supabase
    .from('clients')
    .update({
      calendar_status: 'connected',
      calendar_last_error: null,
      calendar_checked_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('calendar_status', 'needs_reconnect');
}

/**
 * Run a provider operation, flagging the tenant if the credential is dead.
 *
 * Only CalendarAuthError flips the flag. A timeout or a 500 from the provider is
 * not a reason to tell a customer to reconnect a perfectly good diary.
 */
async function withCredentialWatch<T>(
  conn: CalendarConnection,
  operation: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    const result = await run();
    if (conn.clientId) {
      await markCalendarHealthy(conn.clientId).catch(() => { /* best effort */ });
    }
    return result;
  } catch (error: unknown) {
    if (error instanceof CalendarAuthError && conn.clientId) {
      await markCalendarNeedsReconnect(conn.clientId, error.message).catch(() => { /* best effort */ });
    } else {
      logEvent('error', 'calendar.operation_failed', {
        clientId: conn.clientId ?? null,
        provider: conn.provider,
        operation,
        error: errorMessage(error),
      });
    }
    throw error;
  }
}

// ── Timezone utilities ────────────────────────────────────────────────────────

/**
 * Convert an ISO-like local time string (no Z suffix) to a UTC Date for a given
 * IANA timezone. Works correctly across DST transitions.
 *
 * Example: localToUtc("2024-06-15T08:00:00", "Europe/London") → Date at 07:00 UTC
 */
function localToUtc(isoLocal: string, tz: string): Date {
  // Treat isoLocal as UTC first to get an approximate timestamp
  const approx = new Date(`${isoLocal}Z`);

  // Find what local time corresponds to that UTC instant
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const localStr = fmt.format(approx).replace(', ', 'T');
  const localDate = new Date(`${localStr}Z`);

  // offset = how far approx is ahead of localDate
  const offsetMs = approx.getTime() - localDate.getTime();
  return new Date(approx.getTime() + offsetMs);
}

function dayOfWeekInTz(date: Date, tz: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

function dateStringInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date); // YYYY-MM-DD
}

function localMinutesInTz(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

  return (hour * 60) + minute;
}

export function busyWindowsOverlap(
  busy: BusyWindow[],
  slotStart: Date,
  slotEnd: Date
): boolean {
  return busy.some((window) => slotStart < window.end && slotEnd > window.start);
}

async function getBusyWindows(
  conn: CalendarConnection,
  timeMin: string,
  timeMax: string
): Promise<BusyWindow[]> {
  return withCredentialWatch(conn, 'get_busy_windows', () =>
    adapterFor(conn.provider).getBusyWindows(conn, timeMin, timeMax));
}

/**
 * Check a connection end to end and report what the provider said.
 *
 * Used by the admin diagnostic. Goes through withCredentialWatch, so simply
 * running the diagnostic also updates calendar_status — a tenant whose diary has
 * gone stale is flagged by the act of checking, and one that has recovered is
 * un-flagged.
 */
export async function probeCalendar(
  connection: CalendarConnection,
  hours = 24,
): Promise<{ provider: string; calendarId: string; busy: BusyWindow[] }> {
  const now = new Date();
  const until = new Date(now.getTime() + hours * 3_600_000);
  const busy = await getBusyWindows(connection, now.toISOString(), until.toISOString());
  return { provider: connection.provider, calendarId: connection.calendarId, busy };
}

// ── Availability ──────────────────────────────────────────────────────────────

export interface SlotOptions {
  connection:   CalendarConnection;
  fromDate?:    Date;           // default: now
  days?:        number;         // default: 7
  durationMins?: number;        // default: 60
  startHour?:   string;         // "HH:MM", default: "08:00"
  endHour?:     string;         // "HH:MM", default: "18:00"
  workingDays?: number[];       // 0=Sun…6=Sat, default: [1,2,3,4,5]
  timezone?:    string;         // default: "Europe/London"
  maxSlots?:    number;         // default: 20
}

/**
 * Return available start times for the next N days, respecting the client's
 * working hours and existing calendar events.
 */
export async function getAvailableSlots(opts: SlotOptions): Promise<Date[]> {
  const {
    connection,
    fromDate    = new Date(),
    days        = 7,
    durationMins = 60,
    startHour   = '08:00',
    endHour     = '18:00',
    workingDays = [1, 2, 3, 4, 5],
    timezone    = 'Europe/London',
    maxSlots    = 20,
  } = opts;

  const timeMin  = fromDate.toISOString();
  const timeMax  = new Date(fromDate.getTime() + days * 86_400_000).toISOString();
  const busy = await getBusyWindows(connection, timeMin, timeMax);

  const now    = new Date();
  const buffer = 30 * 60_000; // 30-min look-ahead buffer
  const slots: Date[] = [];

  const [sh, sm] = startHour.split(':').map(Number);
  const [eh, em] = endHour.split(':').map(Number);
  // Treat "00:00" (or any end <= start) as midnight / end-of-day, so businesses that
  // close at or after midnight still produce slots instead of an empty window.
  let endMinutes = eh * 60 + em;
  if (endMinutes <= sh * 60 + sm) endMinutes = 24 * 60;

  for (let d = 0; d < days && slots.length < maxSlots; d++) {
    const dayUtc = new Date(fromDate.getTime() + d * 86_400_000);

    if (!workingDays.includes(dayOfWeekInTz(dayUtc, timezone))) continue;

    const dateStr = dateStringInTz(dayUtc, timezone);

    for (
      let m = sh * 60 + sm;
      m + durationMins <= endMinutes && slots.length < maxSlots;
      m += durationMins
    ) {
      const hh  = String(Math.floor(m / 60)).padStart(2, '0');
      const mm  = String(m % 60).padStart(2, '0');
      const slotStart = localToUtc(`${dateStr}T${hh}:${mm}:00`, timezone);
      const slotEnd   = new Date(slotStart.getTime() + durationMins * 60_000);

      if (slotStart.getTime() < now.getTime() + buffer) continue;
      if (busyWindowsOverlap(busy, slotStart, slotEnd)) continue;

      slots.push(slotStart);
    }
  }

  return slots;
}

export interface SlotAvailabilityOptions extends Omit<SlotOptions, 'fromDate' | 'days' | 'maxSlots'> {
  startTime: Date;
}

export async function isSlotAvailable(opts: SlotAvailabilityOptions): Promise<boolean> {
  const {
    connection,
    startTime,
    durationMins = 60,
    startHour = '08:00',
    endHour = '18:00',
    workingDays = [1, 2, 3, 4, 5],
    timezone = 'Europe/London',
  } = opts;

  const slotEnd = new Date(startTime.getTime() + durationMins * 60_000);
  const now = new Date();
  const buffer = 30 * 60_000;

  if (startTime.getTime() < now.getTime() + buffer) return false;
  if (!workingDays.includes(dayOfWeekInTz(startTime, timezone))) return false;

  const [sh, sm] = startHour.split(':').map(Number);
  const [eh, em] = endHour.split(':').map(Number);
  const slotStartMinutes = localMinutesInTz(startTime, timezone);
  const slotEndMinutes = localMinutesInTz(slotEnd, timezone);
  const startWindowMinutes = (sh * 60) + sm;
  // Treat "00:00" (or any end <= start) as midnight / end-of-day (matches getAvailableSlots).
  let endWindowMinutes = (eh * 60) + em;
  if (endWindowMinutes <= startWindowMinutes) endWindowMinutes = 24 * 60;

  if (slotStartMinutes < startWindowMinutes || slotEndMinutes > endWindowMinutes) {
    return false;
  }

  const busy = await getBusyWindows(
    connection,
    startTime.toISOString(),
    slotEnd.toISOString()
  );

  return !busyWindowsOverlap(busy, startTime, slotEnd);
}

// ── Event creation ────────────────────────────────────────────────────────────

/**
 * Create the job on the tenant's calendar.
 * Returns the provider's event id (stored in bookings.google_event_id, which
 * keeps its name for compatibility but now holds an id from any provider).
 */
export async function createCalendarEvent(
  connection: CalendarConnection,
  event: CalendarEventInput,
): Promise<string> {
  return withCredentialWatch(connection, 'create_event', () =>
    adapterFor(connection.provider).createEvent(connection, event));
}

export async function deleteCalendarEvent(
  connection: CalendarConnection,
  eventId: string,
): Promise<void> {
  return withCredentialWatch(connection, 'delete_event', () =>
    adapterFor(connection.provider).deleteEvent(connection, eventId));
}
