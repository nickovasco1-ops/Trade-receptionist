/**
 * Connecting a tenant's diary.
 *
 * Three routes in, and they are deliberately not symmetrical because the
 * providers are not:
 *
 *   Google     OAuth. One tap.
 *   Microsoft  OAuth. One tap. Covers Outlook.com, Hotmail, Live and 365 from a
 *              single `common` app registration, consumer accounts included.
 *   CalDAV     Apple ID + app-specific password, then server discovery. Apple
 *              publishes no OAuth for calendar data, so this cannot be one tap
 *              by anyone, us or a paid vendor.
 *
 * Both OAuth callbacks write the generic calendar_* columns AND, for Google, the
 * legacy google_* pair — the dashboard, tenant-integrity checks and Notion sync
 * still read those, so dropping them here would have broken three things that
 * have nothing to do with this feature.
 */
import crypto from 'crypto';
import { supabase } from './supabase';
import { logEvent, errorMessage } from '../lib/observability';
import type { CalendarProvider } from '../../../shared/types';
import { extractHrefs, pickEventCalendar } from '../lib/caldav-xml';
import {
  CalendarAuthError,
  GOOGLE_SCOPES,
  ICLOUD_CALDAV_ROOT,
  MICROSOFT_SCOPES,
  encodeCaldavCredentials,
} from './calendar-providers';

// ── Env / redirect URIs ───────────────────────────────────────────────────────

function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, '') : null;
}

export function publicBackendBaseUrl(): string | null {
  const explicitBase = trimEnv(process.env.PUBLIC_API_BASE_URL);
  if (explicitBase) return explicitBase;

  const retellFunctionBase = trimEnv(process.env.RETELL_FUNCTION_BASE_URL);
  if (retellFunctionBase) return retellFunctionBase;

  const webhookUrl = trimEnv(process.env.RETELL_WEBHOOK_URL);
  if (!webhookUrl) return null;

  try {
    return new URL(webhookUrl).origin;
  } catch {
    return null;
  }
}

function redirectUriFor(provider: 'google' | 'microsoft'): string {
  const override = provider === 'google'
    ? trimEnv(process.env.GOOGLE_REDIRECT_URI)
    : trimEnv(process.env.MICROSOFT_REDIRECT_URI);

  const base = publicBackendBaseUrl();
  const derived = base ? `${base}/auth/${provider}/callback` : null;
  const redirectUri = derived ?? override;

  if (!redirectUri) {
    throw new Error(
      `Cannot derive the ${provider} redirect URI — set PUBLIC_API_BASE_URL or `
      + `${provider === 'google' ? 'GOOGLE' : 'MICROSOFT'}_REDIRECT_URI`,
    );
  }
  return redirectUri;
}

function googleOauthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret, redirectUri: redirectUriFor('google') };
}

function microsoftOauthConfig() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret, redirectUri: redirectUriFor('microsoft') };
}

// ── Signed OAuth state ────────────────────────────────────────────────────────

function oauthStateSecret(): string {
  return process.env.GOOGLE_OAUTH_STATE_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? '';
}

interface OAuthState {
  clientId: string;
  ownerEmail: string;
  issuedAt: number;
}

/** 15 minutes. A consent screen left open for longer is a replay risk, not a user. */
const STATE_TTL_MS = 15 * 60_000;

export function encodeOAuthState(state: OAuthState): string {
  const secret = oauthStateSecret();
  if (!secret) throw new Error('GOOGLE_OAUTH_STATE_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set');

  const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function decodeOAuthState(rawState: string): OAuthState {
  const secret = oauthStateSecret();
  if (!secret) throw new Error('GOOGLE_OAUTH_STATE_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set');

  const [payload, signature] = rawState.split('.');
  if (!payload || !signature) throw new Error('Invalid OAuth state');

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('OAuth state signature check failed');
  }

  const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;

  // The signature proves we issued it; the timestamp proves it is still current.
  // Without this a captured callback URL works forever.
  if (!Number.isFinite(state.issuedAt) || Date.now() - state.issuedAt > STATE_TTL_MS) {
    throw new Error('OAuth state has expired — start the connection again');
  }

  return state;
}

// ── Persisting a connection ───────────────────────────────────────────────────

interface PersistInput {
  clientId: string;
  ownerEmail: string;
  provider: CalendarProvider;
  calendarId: string;
  credentials: string;
}

/**
 * Save a connection against the tenant, matching on owner_email as well as id.
 *
 * The server uses the service-role key and bypasses RLS entirely (§8.4), so the
 * owner_email predicate is the whole tenant boundary here — not a belt-and-braces
 * extra. Without it a forged state could attach a calendar to someone else's row.
 */
async function persistConnection(input: PersistInput): Promise<void> {
  const now = new Date().toISOString();

  const update: Record<string, unknown> = {
    calendar_provider: input.provider,
    calendar_id: input.calendarId,
    calendar_credentials: input.credentials,
    calendar_status: 'connected',
    calendar_last_error: null,
    calendar_connected_at: now,
    calendar_checked_at: now,
    updated_at: now,
  };

  // Keep the legacy Google columns in step. Several things still read them and
  // they are not this change's to break.
  if (input.provider === 'google') {
    update['google_cal_id'] = input.calendarId;
    update['google_refresh_token'] = input.credentials;
  }

  const { data: updated, error } = await supabase
    .from('clients')
    .update(update)
    .eq('id', input.clientId)
    .eq('owner_email', input.ownerEmail)
    .select('id')
    .maybeSingle();

  if (error || !updated) {
    throw new Error('Calendar connection could not be matched to a valid client owner');
  }

  logEvent('info', 'calendar.connected', {
    clientId: input.clientId,
    provider: input.provider,
  });
}

/** Remove a connection, so the tenant can start again cleanly. */
export async function disconnectCalendar(clientId: string, ownerEmail: string): Promise<void> {
  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('clients')
    .update({
      calendar_provider: null,
      calendar_id: null,
      calendar_credentials: null,
      calendar_status: 'none',
      calendar_last_error: null,
      calendar_connected_at: null,
      google_cal_id: null,
      google_refresh_token: null,
      updated_at: now,
    })
    .eq('id', clientId)
    .eq('owner_email', ownerEmail)
    .select('id')
    .maybeSingle();

  if (error || !updated) throw new Error('Could not match a valid client owner');
  logEvent('info', 'calendar.disconnected', { clientId });
}

// ── Google ────────────────────────────────────────────────────────────────────

export function generateOAuthUrl(clientId: string, ownerEmail: string): string {
  const { clientId: gClientId, redirectUri } = googleOauthConfig();

  const params = new URLSearchParams({
    client_id: gClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',  // always returns a refresh_token
    state: encodeOAuthState({ clientId, ownerEmail, issuedAt: Date.now() }),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeGoogleCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { clientId, clientSecret, redirectUri } = googleOauthConfig();

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);

  const data = (await res.json()) as { access_token: string; refresh_token?: string };
  if (!data.refresh_token) {
    // Without a refresh token the connection dies in an hour. Fail loudly now
    // rather than let the tenant believe they are set up.
    throw new Error('Google did not return a refresh token — consent must use access_type=offline');
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function handleOAuthCallback(code: string, state: string): Promise<string> {
  const { clientId, ownerEmail } = decodeOAuthState(state);
  const { accessToken, refreshToken } = await exchangeGoogleCode(code);

  // Resolve the primary calendar so the tenant is never asked which one.
  const calRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const calendarId = calRes.ok
    ? ((await calRes.json()) as { id: string }).id
    : 'primary';

  await persistConnection({
    clientId, ownerEmail, provider: 'google', calendarId, credentials: refreshToken,
  });
  return clientId;
}

// ── Microsoft ─────────────────────────────────────────────────────────────────

export function generateMicrosoftOAuthUrl(clientId: string, ownerEmail: string): string {
  const { clientId: msClientId, redirectUri } = microsoftOauthConfig();

  const params = new URLSearchParams({
    client_id: msClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: MICROSOFT_SCOPES,
    response_mode: 'query',
    prompt: 'consent',
    state: encodeOAuthState({ clientId, ownerEmail, issuedAt: Date.now() }),
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

async function exchangeMicrosoftCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { clientId, clientSecret, redirectUri } = microsoftOauthConfig();

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: MICROSOFT_SCOPES,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${await res.text()}`);

  const data = (await res.json()) as { access_token: string; refresh_token?: string };
  if (!data.refresh_token) {
    throw new Error('Microsoft did not return a refresh token — offline_access must be in the scope list');
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function handleMicrosoftCallback(code: string, state: string): Promise<string> {
  const { clientId, ownerEmail } = decodeOAuthState(state);
  const { accessToken, refreshToken } = await exchangeMicrosoftCode(code);

  // /me/calendar is the default calendar; its id is what calendarView needs.
  const calRes = await fetch('https://graph.microsoft.com/v1.0/me/calendar?$select=id,name', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!calRes.ok) {
    throw new Error(`Microsoft could not resolve the default calendar: ${await calRes.text()}`);
  }
  const calendarId = ((await calRes.json()) as { id: string }).id;

  await persistConnection({
    clientId, ownerEmail, provider: 'microsoft', calendarId, credentials: refreshToken,
  });
  return clientId;
}

// ── CalDAV (Apple iCloud) ─────────────────────────────────────────────────────

function absolute(root: string, href: string): string {
  return href.startsWith('http') ? href : new URL(href, root).toString();
}

async function propfind(
  url: string,
  authHeader: string,
  depth: '0' | '1',
  body: string,
): Promise<string> {
  const res = await fetch(url, {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: depth,
    },
    body,
  });

  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new CalendarAuthError(
      'caldav',
      'Apple rejected that Apple ID and app-specific password. Check the password was copied in full.',
    );
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`CalDAV PROPFIND ${url} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return text;
}

/**
 * Walk iCloud's CalDAV discovery chain to the tenant's default event calendar.
 *
 * root → current-user-principal → calendar-home-set → the first collection that
 * accepts VEVENT. There is no "default calendar" property in CalDAV, so first
 * VEVENT-capable collection is the best available answer; iCloud lists the
 * user's own calendars before shared ones.
 */
export async function discoverCaldavCalendar(
  appleId: string,
  appPassword: string,
  root = ICLOUD_CALDAV_ROOT,
): Promise<{ calendarUrl: string; displayName: string | null }> {
  const authHeader = `Basic ${Buffer.from(`${appleId}:${appPassword}`).toString('base64')}`;

  const principalXml = await propfind(root, authHeader, '0',
    `<?xml version="1.0" encoding="utf-8"?>`
    + `<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`);

  const principalHref = extractHrefs(principalXml)[0];
  if (!principalHref) throw new Error('CalDAV: no principal returned for that Apple ID');

  const homeXml = await propfind(absolute(root, principalHref), authHeader, '0',
    `<?xml version="1.0" encoding="utf-8"?>`
    + `<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">`
    + `<d:prop><c:calendar-home-set/></d:prop></d:propfind>`);

  const homeHref = extractHrefs(homeXml).find((href) => href !== principalHref) ?? extractHrefs(homeXml)[0];
  if (!homeHref) throw new Error('CalDAV: no calendar home returned for that Apple ID');

  const listXml = await propfind(absolute(root, homeHref), authHeader, '1',
    `<?xml version="1.0" encoding="utf-8"?>`
    + `<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">`
    + `<d:prop><d:resourcetype/><d:displayname/>`
    + `<c:supported-calendar-component-set/></d:prop></d:propfind>`);

  const chosen = pickEventCalendar(listXml);
  if (!chosen) throw new Error('CalDAV: that account has no calendar that accepts events');

  return {
    calendarUrl: absolute(root, chosen.href),
    displayName: chosen.displayName,
  };
}

export interface CaldavConnectInput {
  clientId: string;
  ownerEmail: string;
  appleId: string;
  appPassword: string;
}

/**
 * Verify an Apple ID + app-specific password, then store the connection.
 *
 * Discovery doubles as the check that the credentials work — there is no cheaper
 * probe, and storing an unverified password would reproduce exactly the failure
 * this whole change exists to remove.
 */
export async function connectCaldav(input: CaldavConnectInput): Promise<{ displayName: string | null }> {
  // Apple app-specific passwords are 16 lower-case letters in four groups. Users
  // paste them with the dashes; strip nothing else, since a real password may
  // legitimately differ in future.
  const appPassword = input.appPassword.trim();
  if (appPassword.length < 8) {
    throw new CalendarAuthError('caldav', 'That does not look like an app-specific password');
  }

  let discovered: { calendarUrl: string; displayName: string | null };
  try {
    discovered = await discoverCaldavCalendar(input.appleId.trim(), appPassword);
  } catch (error: unknown) {
    logEvent('warn', 'calendar.caldav_connect_failed', {
      clientId: input.clientId,
      error: errorMessage(error),
    });
    throw error;
  }

  await persistConnection({
    clientId: input.clientId,
    ownerEmail: input.ownerEmail,
    provider: 'caldav',
    calendarId: discovered.calendarUrl,
    credentials: encodeCaldavCredentials(input.appleId.trim(), appPassword),
  });

  return { displayName: discovered.displayName };
}
