/**
 * Calendar providers — the only provider-specific code in the booking path.
 *
 * A tradesperson's diary lives in one of exactly three places, whatever app
 * they open it in. "iPhone calendar" and "Android calendar" are apps, not
 * services: the data behind them is Google, Microsoft or Apple iCloud. Both
 * paying customers keep theirs in Google *through* the iOS Calendar app, which
 * is precisely why "we support Google Calendar" never meant they could connect.
 *
 * Everything else about availability — working hours, DST, slot generation,
 * overlap — is provider-independent and stays in services/calendar.ts. Only
 * three operations differ per provider, so only three are behind this interface.
 *
 * Connecting, by provider:
 *
 *   google     one tap (OAuth). Needs Google's sensitive-scope verification
 *              before it works for more than 100 users without a warning screen.
 *   microsoft  one tap (OAuth). Covers Outlook.com, Hotmail, Live and Microsoft
 *              365. Calendars.ReadWrite is available to consumer accounts with
 *              no admin consent and no review, making this the cheapest win.
 *   caldav     NOT one tap, and cannot be. Apple publishes no OAuth for calendar
 *              data; the only way in is CalDAV with an app-specific password the
 *              tenant generates at appleid.apple.com. Cronofy, Nylas and OneCal
 *              all do exactly this underneath.
 */
import { randomUUID } from 'crypto';
import {
  buildICalEvent,
  parseCalendarDataTimes,
  parseFreeBusyPeriods,
  toICalDate,
} from '../lib/caldav-xml';
import type { CalendarProvider, Client } from '../../../shared/types';

// ── Shared shapes ─────────────────────────────────────────────────────────────

export interface BusyWindow {
  start: Date;
  end: Date;
}

export interface CalendarConnection {
  provider: CalendarProvider;
  /** Google calendarId, Microsoft calendar id, or a CalDAV collection URL. */
  calendarId: string;
  /** Refresh token, or `user<US>app-password` for CalDAV. */
  credentials: string;
  /**
   * Which tenant this belongs to. Adapters ignore it; it is here so that the
   * wrappers in services/calendar.ts can mark the right row needs_reconnect
   * when a provider rejects the credential, without every caller having to
   * remember to pass the id alongside the connection.
   */
  clientId?: string;
}

export interface CalendarEventInput {
  title: string;
  startTime: string;   // ISO 8601
  endTime?: string;    // ISO 8601
  customerName?: string;
  callerNumber?: string;
  address?: string;
  notes?: string;
  timezone?: string;
}

/**
 * The stored credential is no longer usable and a human must reconnect.
 *
 * Distinguished from a transient failure on purpose. Previously every calendar
 * failure threw the same shape, so a permanently dead token was retried forever
 * and the tenant was never told — the agent simply talked around the missing
 * tool mid-call and nothing logged at error level.
 */
export class CalendarAuthError extends Error {
  readonly provider: CalendarProvider;

  constructor(provider: CalendarProvider, message: string) {
    super(message);
    this.name = 'CalendarAuthError';
    this.provider = provider;
  }
}

export interface CalendarAdapter {
  readonly provider: CalendarProvider;
  getBusyWindows(conn: CalendarConnection, timeMin: string, timeMax: string): Promise<BusyWindow[]>;
  createEvent(conn: CalendarConnection, event: CalendarEventInput): Promise<string>;
  deleteEvent(conn: CalendarConnection, eventId: string): Promise<void>;
}

/** Separator inside the CalDAV credential blob. Not valid in a username. */
export const CALDAV_SEPARATOR = '\u001f';

export function encodeCaldavCredentials(username: string, appPassword: string): string {
  return `${username}${CALDAV_SEPARATOR}${appPassword}`;
}

export function decodeCaldavCredentials(blob: string): { username: string; appPassword: string } {
  const [username, appPassword] = blob.split(CALDAV_SEPARATOR);
  if (!username || !appPassword) {
    throw new CalendarAuthError('caldav', 'Stored CalDAV credentials are malformed');
  }
  return { username, appPassword };
}

/** Shared description block, so a booking reads the same in any calendar app. */
export function eventDescription(event: CalendarEventInput): string {
  return [
    event.customerName ? `Customer: ${event.customerName}` : null,
    event.callerNumber ? `Phone: ${event.callerNumber}` : null,
    event.address ? `Address: ${event.address}` : null,
    event.notes ? `Notes: ${event.notes}` : null,
    '',
    'Booked via Trade Receptionist',
  ].filter((line) => line !== null).join('\n');
}

/**
 * Whether a provider's rejection means "reconnect" rather than "retry".
 *
 * 400 with invalid_grant is how both Google and Microsoft report a refresh token
 * that has been revoked, has expired, or — the case that bites an unverified
 * Google app — has passed the 7-day lifetime that applies while the OAuth
 * consent screen is still in Testing mode.
 */
export function isAuthRejection(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true;
  return status === 400 && /invalid_grant|invalid_client|unauthorized_client/i.test(body);
}

// ── Connection resolution ─────────────────────────────────────────────────────

/**
 * The columns needed to work out where a tenant's diary is. Narrow on purpose so
 * callers can pass a partial row from a `select` that names its columns.
 */
export type CalendarColumns = Pick<
  Client,
  'id' | 'calendar_provider' | 'calendar_id' | 'calendar_credentials'
  | 'google_cal_id' | 'google_refresh_token'
>;

/**
 * The tenant's calendar connection, or null if they have not connected one.
 *
 * Lives here rather than in services/calendar.ts so it can be unit-tested:
 * that module imports the Supabase client, which throws at import time without
 * credentials. Same reason stripe-signature.ts was extracted (see §10) — a rule
 * this project learned the hard way, after a test suite "passed" by never
 * running.
 *
 * Reads the provider-neutral columns first and falls back to the legacy Google
 * pair, so a tenant who connected before migration 019 keeps working with no
 * reconnect. Every caller must come through here: spelling the check as
 * `!!client.google_cal_id` in thirty places is what kept this Google-only.
 */
export function calendarConnection(client: CalendarColumns): CalendarConnection | null {
  if (client.calendar_provider && client.calendar_id && client.calendar_credentials) {
    return {
      provider: client.calendar_provider,
      calendarId: client.calendar_id,
      credentials: client.calendar_credentials,
      clientId: client.id,
    };
  }

  if (client.google_cal_id && client.google_refresh_token) {
    return {
      provider: 'google',
      calendarId: client.google_cal_id,
      credentials: client.google_refresh_token,
      clientId: client.id,
    };
  }

  return null;
}

/**
 * Whether the agent can book a job for this tenant.
 *
 * `onboarding_complete` does not answer this — it means "walked the wizard".
 * A tenant with no diary has an agent that can take a message and nothing more.
 */
export function calendarIsConnected(client: CalendarColumns): boolean {
  return calendarConnection(client) !== null;
}

// ── Google ────────────────────────────────────────────────────────────────────

/**
 * Scopes requested at consent.
 *
 * Narrowed from the single `auth/calendar` scope, which grants full read and
 * write over every calendar the user owns. Google classes both of these as
 * sensitive either way, so verification is still required — but the consent
 * screen a sceptical tradesperson reads is far narrower, and Google's own
 * guidance is to request the minimum, which the reviewer checks.
 *
 * freebusy is listed separately because the freeBusy endpoint is not covered by
 * calendar.events. Dropping it would have broken every availability check while
 * still type-checking and still passing every existing test.
 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ');

function googleOauthConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret };
}

async function googleAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = googleOauthConfig();

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    if (isAuthRejection(res.status, body)) {
      throw new CalendarAuthError('google', 'Google has revoked or expired this calendar connection');
    }
    throw new Error(`Google token refresh failed: ${body}`);
  }

  return ((await res.json()) as { access_token: string }).access_token;
}

export const googleAdapter: CalendarAdapter = {
  provider: 'google',

  async getBusyWindows(conn, timeMin, timeMax) {
    const token = await googleAccessToken(conn.credentials);

    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin, timeMax, items: [{ id: conn.calendarId }] }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (isAuthRejection(res.status, body)) {
        throw new CalendarAuthError('google', 'Google rejected the stored calendar access');
      }
      throw new Error(`Google freeBusy failed: ${body}`);
    }

    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
    };

    return (data.calendars?.[conn.calendarId]?.busy ?? []).map((window) => ({
      start: new Date(window.start),
      end: new Date(window.end),
    }));
  },

  async createEvent(conn, event) {
    const token = await googleAccessToken(conn.credentials);
    const tz = event.timezone ?? 'Europe/London';

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendarId)}/events`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: event.title,
          description: eventDescription(event),
          start: { dateTime: event.startTime, timeZone: tz },
          end: { dateTime: event.endTime ?? event.startTime, timeZone: tz },
          reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }] },
        }),
      },
    );
    if (!res.ok) throw new Error(`Google createEvent failed: ${await res.text()}`);
    return ((await res.json()) as { id: string }).id;
  },

  async deleteEvent(conn, eventId) {
    const token = await googleAccessToken(conn.credentials);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendarId)}`
      + `/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`Google deleteEvent failed: ${await res.text()}`);
    }
  },
};

// ── Microsoft (Outlook.com, Hotmail, Live, Microsoft 365) ─────────────────────

/**
 * `common` covers both consumer and work/school accounts from one app
 * registration, which is what makes a Hotmail customer and a 365 customer the
 * same code path.
 */
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_GRAPH = 'https://graph.microsoft.com/v1.0';

/**
 * offline_access is what returns a refresh token at all; without it the
 * connection works for an hour and then silently stops.
 */
export const MICROSOFT_SCOPES = [
  'offline_access',
  'https://graph.microsoft.com/Calendars.ReadWrite',
].join(' ');

function microsoftOauthConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret };
}

async function microsoftAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = microsoftOauthConfig();

  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: MICROSOFT_SCOPES,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    if (isAuthRejection(res.status, body)) {
      throw new CalendarAuthError('microsoft', 'Microsoft has revoked or expired this calendar connection');
    }
    throw new Error(`Microsoft token refresh failed: ${body}`);
  }

  return ((await res.json()) as { access_token: string }).access_token;
}

async function graph(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${MS_GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    if (isAuthRejection(res.status, body)) {
      throw new CalendarAuthError('microsoft', 'Microsoft rejected the stored calendar access');
    }
    throw new Error(`Microsoft Graph ${path} failed (${res.status}): ${body}`);
  }
  return res;
}

export const microsoftAdapter: CalendarAdapter = {
  provider: 'microsoft',

  /**
   * calendarView rather than getSchedule.
   *
   * getSchedule returns free/busy directly and would be the obvious choice, but
   * it is a work/school feature — on a personal Outlook.com or Hotmail account
   * it is not available, which is most of this audience. calendarView works on
   * both and expands recurring events server-side, so a weekly job shows as
   * busy every week without us implementing RRULE.
   */
  async getBusyWindows(conn, timeMin, timeMax) {
    const token = await microsoftAccessToken(conn.credentials);
    const query = new URLSearchParams({
      startDateTime: timeMin,
      endDateTime: timeMax,
      $select: 'start,end,showAs,isCancelled',
      $top: '200',
    });

    const res = await graph(
      token,
      `/me/calendars/${encodeURIComponent(conn.calendarId)}/calendarView?${query}`,
      { headers: { Prefer: 'outlook.timezone="UTC"' } },
    );

    const data = (await res.json()) as {
      value?: Array<{
        start?: { dateTime?: string };
        end?: { dateTime?: string };
        showAs?: string;
        isCancelled?: boolean;
      }>;
    };

    return (data.value ?? [])
      // An event the tenant marked "free", or one that is cancelled, is not a
      // reason to refuse a caller a slot.
      .filter((e) => !e.isCancelled && e.showAs !== 'free' && e.start?.dateTime && e.end?.dateTime)
      .map((e) => ({
        // Graph returns naive local datetimes; Prefer: outlook.timezone="UTC"
        // makes them UTC, but they still arrive without a Z suffix.
        start: parseGraphDateTime(e.start?.dateTime as string),
        end: parseGraphDateTime(e.end?.dateTime as string),
      }));
  },

  async createEvent(conn, event) {
    const token = await microsoftAccessToken(conn.credentials);
    const tz = event.timezone ?? 'Europe/London';

    const res = await graph(
      token,
      `/me/calendars/${encodeURIComponent(conn.calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify({
          subject: event.title,
          body: { contentType: 'text', content: eventDescription(event) },
          start: { dateTime: stripZone(event.startTime), timeZone: tz },
          end: { dateTime: stripZone(event.endTime ?? event.startTime), timeZone: tz },
          ...(event.address ? { location: { displayName: event.address } } : {}),
          reminderMinutesBeforeStart: 60,
          isReminderOn: true,
        }),
      },
    );

    return ((await res.json()) as { id: string }).id;
  },

  async deleteEvent(conn, eventId) {
    const token = await microsoftAccessToken(conn.credentials);
    const res = await fetch(`${MS_GRAPH}/me/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Microsoft deleteEvent failed: ${await res.text()}`);
    }
  },
};

/** Graph omits the Z even when the payload is UTC; assume UTC when unmarked. */
export function parseGraphDateTime(value: string): Date {
  const normalised = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  return new Date(normalised);
}

/**
 * Graph rejects a dateTime carrying an offset when timeZone is also supplied,
 * so send the wall-clock part and let timeZone say what it means.
 */
export function stripZone(iso: string): string {
  return iso.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '').replace(/\.\d+$/, '');
}

// ── CalDAV (Apple iCloud, and any other CalDAV server) ────────────────────────

export const ICLOUD_CALDAV_ROOT = 'https://caldav.icloud.com';

function caldavAuthHeader(blob: string): string {
  const { username, appPassword } = decodeCaldavCredentials(blob);
  return `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`;
}

async function caldavRequest(
  conn: CalendarConnection,
  method: string,
  body: string | null,
  extraHeaders: Record<string, string> = {},
  url = conn.calendarId,
): Promise<{ status: number; text: string }> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: caldavAuthHeader(conn.credentials),
      'Content-Type': 'application/xml; charset=utf-8',
      ...extraHeaders,
    },
    ...(body ? { body } : {}),
  });

  const text = await res.text();
  if (isAuthRejection(res.status, text)) {
    throw new CalendarAuthError(
      'caldav',
      'Apple rejected the stored app-specific password. It may have been revoked in the Apple ID settings.',
    );
  }
  return { status: res.status, text };
}

export const caldavAdapter: CalendarAdapter = {
  provider: 'caldav',

  async getBusyWindows(conn, timeMin, timeMax) {
    const start = toICalDate(new Date(timeMin));
    const end = toICalDate(new Date(timeMax));

    const freeBusyBody = `<?xml version="1.0" encoding="utf-8" ?>`
      + `<C:free-busy-query xmlns:C="urn:ietf:params:xml:ns:caldav">`
      + `<C:time-range start="${start}" end="${end}"/>`
      + `</C:free-busy-query>`;

    const fb = await caldavRequest(conn, 'REPORT', freeBusyBody, { Depth: '1' });
    if (fb.status >= 200 && fb.status < 300) {
      const windows = parseFreeBusyPeriods(fb.text);
      // A 2xx with no FREEBUSY lines legitimately means "nothing booked", so it
      // is only worth falling back when the server refused the report outright.
      if (windows.length > 0 || /VFREEBUSY/i.test(fb.text)) return windows;
    }

    const queryBody = `<?xml version="1.0" encoding="utf-8" ?>`
      + `<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">`
      + `<D:prop><C:calendar-data/></D:prop>`
      + `<C:filter><C:comp-filter name="VCALENDAR">`
      + `<C:comp-filter name="VEVENT">`
      + `<C:time-range start="${start}" end="${end}"/>`
      + `</C:comp-filter></C:comp-filter></C:filter>`
      + `</C:calendar-query>`;

    const query = await caldavRequest(conn, 'REPORT', queryBody, { Depth: '1' });
    if (query.status < 200 || query.status >= 300) {
      throw new Error(`CalDAV calendar-query failed (${query.status})`);
    }
    return parseCalendarDataTimes(query.text);
  },

  async createEvent(conn, event) {
    // The UID is ours to choose, and CalDAV addresses the resource by filename.
    // Using the UID as the filename is what makes deleteEvent possible later
    // without a second round trip to find the href.
    const uid = `tr-${randomUUID()}`;
    const url = `${conn.calendarId.replace(/\/$/, '')}/${uid}.ics`;

    const res = await caldavRequest(
      conn,
      'PUT',
      buildICalEvent(uid, event, eventDescription(event)),
      { 'Content-Type': 'text/calendar; charset=utf-8', 'If-None-Match': '*' },
      url,
    );

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`CalDAV PUT failed (${res.status}): ${res.text.slice(0, 200)}`);
    }
    return uid;
  },

  async deleteEvent(conn, eventId) {
    const url = `${conn.calendarId.replace(/\/$/, '')}/${eventId}.ics`;
    const res = await caldavRequest(conn, 'DELETE', null, {}, url);
    if (res.status !== 404 && (res.status < 200 || res.status >= 300)) {
      throw new Error(`CalDAV DELETE failed (${res.status})`);
    }
  },
};

export {
  buildICalEvent,
  parseCalendarDataTimes,
  parseFreeBusyPeriods,
  parseICalDate,
  parseIsoDuration,
  toICalDate,
} from '../lib/caldav-xml';

// ── Dispatch ──────────────────────────────────────────────────────────────────

const ADAPTERS: Record<CalendarProvider, CalendarAdapter> = {
  google: googleAdapter,
  microsoft: microsoftAdapter,
  caldav: caldavAdapter,
};

export function adapterFor(provider: CalendarProvider): CalendarAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`No calendar adapter for provider "${provider}"`);
  return adapter;
}

/** Human-readable provider name for tenant-facing copy. */
export function providerLabel(provider: CalendarProvider): string {
  return provider === 'google' ? 'Google Calendar'
    : provider === 'microsoft' ? 'Outlook Calendar'
      : 'Apple Calendar';
}
