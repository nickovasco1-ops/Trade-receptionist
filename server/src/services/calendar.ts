// Google Calendar integration — per-client OAuth 2.0 flow.
// Each client authorises once; we store their refresh_token in Supabase.
//
// Required env vars:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REDIRECT_URI  e.g. https://api.tradereceptionist.com/auth/google/callback

import { supabase } from './supabase';

// ── Env ───────────────────────────────────────────────────────────────────────

function oauthConfig() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI must be set');
  }
  return { clientId, clientSecret, redirectUri };
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

/**
 * Build the Google consent URL for a specific client.
 * Embed clientId in the `state` param so the callback knows which client
 * to save the refresh_token against.
 */
export function generateOAuthUrl(clientId: string): string {
  const { clientId: gClientId, redirectUri } = oauthConfig();
  const state = Buffer.from(clientId).toString('base64url');

  const params = new URLSearchParams({
    client_id:     gClientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar',
    access_type:   'offline',
    prompt:        'consent',  // always returns a refresh_token
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Exchange an authorisation code for access + refresh tokens. */
export async function exchangeOAuthCode(
  code: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const { clientId, clientSecret, redirectUri } = oauthConfig();

  const params = new URLSearchParams({
    code,
    client_id:     clientId,
    client_secret: clientSecret,
    redirect_uri:  redirectUri,
    grant_type:    'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);

  const data = (await res.json()) as {
    access_token:  string;
    refresh_token: string;
  };
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

/**
 * Use a stored refresh_token to obtain a short-lived access_token.
 * Called before every Calendar API request.
 */
async function getAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = oauthConfig();

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id:     clientId,
    client_secret: clientSecret,
    grant_type:    'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);

  return ((await res.json()) as { access_token: string }).access_token;
}

/**
 * Handle the OAuth callback: exchange the code, persist the refresh_token,
 * and save the user's primary calendar ID against the client record.
 * Call from GET /auth/google/callback.
 */
export async function handleOAuthCallback(code: string, state: string): Promise<string> {
  const clientId = Buffer.from(state, 'base64url').toString('utf8');
  const { accessToken, refreshToken } = await exchangeOAuthCode(code);

  // Fetch the user's primary calendar ID so we don't have to ask for it
  const calRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const calendarId = calRes.ok
    ? ((await calRes.json()) as { id: string }).id
    : 'primary';

  await supabase
    .from('clients')
    .update({
      google_refresh_token: refreshToken,
      google_cal_id:        calendarId,
      updated_at:           new Date().toISOString(),
    })
    .eq('id', clientId);

  return clientId;
}

// ── Timezone utility ──────────────────────────────────────────────────────────

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

function dayOfWeekInTz(date: Date, tz: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

function dateStringInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date); // YYYY-MM-DD
}

// ── Availability ──────────────────────────────────────────────────────────────

export interface SlotOptions {
  calendarId:   string;
  refreshToken: string;
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
    calendarId,
    refreshToken,
    fromDate    = new Date(),
    days        = 7,
    durationMins = 60,
    startHour   = '08:00',
    endHour     = '18:00',
    workingDays = [1, 2, 3, 4, 5],
    timezone    = 'Europe/London',
    maxSlots    = 20,
  } = opts;

  const token    = await getAccessToken(refreshToken);
  const timeMin  = fromDate.toISOString();
  const timeMax  = new Date(fromDate.getTime() + days * 86_400_000).toISOString();

  // Fetch busy intervals
  const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ timeMin, timeMax, items: [{ id: calendarId }] }),
  });
  if (!fbRes.ok) throw new Error(`Google freeBusy failed: ${await fbRes.text()}`);

  const fbData = (await fbRes.json()) as {
    calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
  };

  const busy = (fbData.calendars[calendarId]?.busy ?? []).map((b) => ({
    start: new Date(b.start),
    end:   new Date(b.end),
  }));

  const now    = new Date();
  const buffer = 30 * 60_000; // 30-min look-ahead buffer
  const slots: Date[] = [];

  const [sh, sm] = startHour.split(':').map(Number);
  const [eh, em] = endHour.split(':').map(Number);
  const endMinutes = eh * 60 + em;

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
      if (busy.some((b) => slotStart < b.end && slotEnd > b.start)) continue;

      slots.push(slotStart);
    }
  }

  return slots;
}

// ── Event creation ────────────────────────────────────────────────────────────

export interface CreateEventInput {
  title:         string;
  startTime:     string;   // ISO 8601
  endTime?:      string;   // ISO 8601
  customerName?: string;
  callerNumber?: string;
  address?:      string;
  notes?:        string;
  timezone?:     string;
}

/**
 * Create a calendar event on the client's calendar.
 * Returns the Google event ID (store in bookings.google_event_id).
 */
export async function createCalendarEvent(
  calendarId:   string,
  refreshToken: string,
  event:        CreateEventInput
): Promise<string> {
  const token = await getAccessToken(refreshToken);
  const tz    = event.timezone ?? 'Europe/London';

  const description = [
    event.customerName  ? `Customer: ${event.customerName}` : null,
    event.callerNumber  ? `Phone: ${event.callerNumber}`    : null,
    event.address       ? `Address: ${event.address}`       : null,
    event.notes         ? `Notes: ${event.notes}`           : null,
    '',
    'Booked via Trade Receptionist',
  ].filter((l) => l !== null).join('\n');

  const body = {
    summary:     event.title,
    description,
    start:       { dateTime: event.startTime, timeZone: tz },
    end:         { dateTime: event.endTime ?? event.startTime, timeZone: tz },
    reminders:   { useDefault: false, overrides: [{ method: 'email', minutes: 60 }] },
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Google Calendar createEvent failed: ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}
