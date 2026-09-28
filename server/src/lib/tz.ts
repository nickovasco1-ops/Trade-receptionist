/**
 * Local-time helpers for diary maths. Pure and dependency-free.
 *
 * Moved out of services/calendar.ts, which imports the Supabase client and so
 * cannot be loaded by a unit test. The booking-rules planner needs exactly
 * these conversions, and a planner that cannot be tested is how a diary rule
 * ships wrong.
 */

/**
 * Convert an ISO-like local time string (no Z suffix) to a UTC Date for a given
 * IANA timezone. Works correctly across DST transitions.
 *
 * Example: localToUtc("2024-06-15T08:00:00", "Europe/London") → Date at 07:00 UTC
 */
export function localToUtc(isoLocal: string, tz: string): Date {
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

/** 0 = Sunday … 6 = Saturday, in the given timezone. */
export function dayOfWeekInTz(date: Date, tz: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/** YYYY-MM-DD in the given timezone. */
export function dateStringInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
}

/** Minutes since local midnight in the given timezone. */
export function localMinutesInTz(date: Date, tz: string): number {
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

/** UTC instant for a local wall-clock time (minutes since midnight) on a local date. */
export function localDateTimeToUtc(dateStr: string, minutes: number, tz: string): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return localToUtc(`${dateStr}T${hh}:${mm}:00`, tz);
}
