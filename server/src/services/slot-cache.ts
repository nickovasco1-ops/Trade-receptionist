import { getAvailableSlots } from './calendar';
import { logEvent, errorMessage } from '../lib/observability';
import type { Client, BusinessConfig } from '../../../shared/types';

const MAX_SLOTS = 3;

/**
 * Postgres TIME columns return 'HH:MM:SS'. Normalise to 'HH:MM' and treat
 * '00:00' (unset sentinel) as null so the defaults kick in.
 */
function normaliseHour(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const hhmm = raw.slice(0, 5); // 'HH:MM'
  return hhmm === '00:00' ? null : hhmm;
}

function spokenSlot(date: Date, timezone: string): string {
  return date.toLocaleString('en-GB', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Returns up to 3 available slot strings in spoken British English,
 * e.g. ["Thursday, 5 June at 09:00", "Thursday, 5 June at 10:00", "Friday, 6 June at 14:00"].
 * Returns an empty array if no calendar is connected or slots can't be fetched.
 */
export async function getNextAvailableSlots(
  client: Client,
  config: BusinessConfig
): Promise<string[]> {
  if (!client.google_cal_id || !client.google_refresh_token) return [];

  const timezone = config.timezone ?? 'Europe/London';

  try {
    const slots = await getAvailableSlots({
      calendarId:    client.google_cal_id,
      refreshToken:  client.google_refresh_token,
      days:          7,
      durationMins:  60,
      startHour:     normaliseHour(config.business_hours_start) ?? '08:00',
      endHour:       normaliseHour(config.business_hours_end)   ?? '18:00',
      workingDays:   config.working_days.length ? config.working_days : [1, 2, 3, 4, 5],
      timezone,
      maxSlots:      MAX_SLOTS,
    });

    return slots.map((d) => spokenSlot(d, timezone));
  } catch (err: unknown) {
    logEvent('warn', 'slot_cache.fetch_failed', { clientId: client.id, error: errorMessage(err) });
    return [];
  }
}
