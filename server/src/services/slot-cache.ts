import { getAvailableSlots } from './calendar';
import { logEvent, errorMessage } from '../lib/observability';
import { normaliseHour } from '../lib/time';
import type { Client, BusinessConfig } from '../../../shared/types';

const MAX_SLOTS = 3;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT_MS = 5_000;

interface CacheEntry {
  slots: string[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

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
 * Results are cached for 5 minutes per client. Returns [] on timeout or error.
 */
export async function getNextAvailableSlots(
  client: Client,
  config: BusinessConfig
): Promise<string[]> {
  if (!client.google_cal_id || !client.google_refresh_token) return [];

  const cached = cache.get(client.id);
  if (cached && cached.expiresAt > Date.now()) return cached.slots;

  const timezone = config.timezone ?? 'Europe/London';

  try {
    const fetchPromise = getAvailableSlots({
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

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('slot fetch timeout')), FETCH_TIMEOUT_MS)
    );

    const slots = await Promise.race([fetchPromise, timeoutPromise]);
    const spoken = slots.map((d) => spokenSlot(d, timezone));

    cache.set(client.id, { slots: spoken, expiresAt: Date.now() + CACHE_TTL_MS });
    return spoken;
  } catch (err: unknown) {
    logEvent('error', 'slot_cache.fetch_failed', { clientId: client.id, error: errorMessage(err) });
    return cached?.slots ?? [];
  }
}
