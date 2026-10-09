/**
 * The current time, as a Retell placeholder the platform fills in when each
 * call starts.
 *
 * Retell does not tell the model the time unless the prompt contains one of
 * its time variables, and ours never did. So every "if it's outside working
 * hours" decision every receptionist made was a guess. Found 2026-10-09, when
 * Orrell Park's call-out price came to depend on the time of day. The
 * timezone-qualified form is used so that Retell's own default timezone
 * (America/Los_Angeles) can never apply.
 */
const IANA_ZONE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/;

export function currentTimePlaceholder(timezone: string | null | undefined): string {
  const tz = timezone && IANA_ZONE.test(timezone) ? timezone : 'Europe/London';
  return `{{current_time_${tz}}}`;
}
