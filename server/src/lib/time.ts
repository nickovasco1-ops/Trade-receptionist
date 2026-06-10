/**
 * Strips Postgres HH:MM:SS seconds and treats '00:00' (unset sentinel) as null.
 * Used by both prompt-builder and slot-cache — single source of truth.
 */
export function normaliseHour(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const hhmm = raw.slice(0, 5);
  return hhmm === '00:00' ? null : hhmm;
}
