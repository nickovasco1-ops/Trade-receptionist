/**
 * Connecting a tenant's diary.
 *
 * Google and Microsoft are OAuth and share everything but their URLs, so they
 * are built from the same two factories rather than copied — the previous
 * Google-only version was ~70 lines of consent handling and ~40 of callback
 * handling, and duplicating that per provider is how they drift.
 *
 * CalDAV (Apple iCloud) is a POST instead, because there is no consent screen to
 * redirect to: Apple offers no OAuth for calendar data, so the tenant supplies
 * an app-specific password and we verify it by doing the discovery walk.
 */
import { Router, Request, Response } from 'express';
import {
  connectCaldav,
  disconnectCalendar,
  generateMicrosoftOAuthUrl,
  generateOAuthUrl,
  handleMicrosoftCallback,
  handleOAuthCallback,
} from '../../services/calendar-connect';
import { CalendarAuthError } from '../../services/calendar-providers';
import { updateAgentConfiguration } from '../../services/retell';
import { supabase } from '../../services/supabase';
import { errorMessage, logEvent, requestId } from '../../lib/observability';
import type { ApiResponse, BusinessConfig, Client } from '../../../../shared/types';

const router = Router();

function bearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim() || null;
}

/**
 * Resolve the caller's email from their Supabase JWT.
 *
 * The server uses the service-role key and bypasses RLS, so this — plus the
 * owner_email predicate on every write — is the entire tenant boundary on these
 * routes. See §8.4a.
 */
async function resolveOwnerEmail(req: Request, res: Response): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing authentication token' } satisfies ApiResponse);
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  const ownerEmail = data.user?.email;
  if (error || !ownerEmail) {
    res.status(401).json({ success: false, error: 'Invalid authentication token' } satisfies ApiResponse);
    return null;
  }
  return ownerEmail;
}

async function ownsClient(clientId: string, ownerEmail: string): Promise<boolean> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('owner_email', ownerEmail)
    .maybeSingle();
  return !!data;
}

/**
 * Rebuild the agent so the booking tools appear.
 *
 * This is the step that actually makes a connected diary useful:
 * buildRetellTools() only attaches check-availability and create-booking when
 * the tenant has a calendar, so without this the connection is stored and the
 * agent still cannot book anything.
 */
async function refreshAgentAfterConnect(clientId: string, req: Request): Promise<void> {
  const [{ data: client }, { data: config }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
    supabase.from('business_config').select('*').eq('client_id', clientId).maybeSingle(),
  ]);

  if (!client || !config) return;

  await updateAgentConfiguration(client as Client, config as BusinessConfig).catch((err: unknown) =>
    logEvent('error', 'calendar.agent_refresh_failed', {
      requestId: requestId(req),
      clientId,
      provider: 'retell',
      error: errorMessage(err),
    }));
}

// ── OAuth consent + callback, built once per provider ─────────────────────────

type OAuthProvider = 'google' | 'microsoft';

function registerConsentRoute(
  provider: OAuthProvider,
  buildUrl: (clientId: string, ownerEmail: string) => string,
): void {
  router.get(`/${provider}`, (req: Request, res: Response) => {
    (async () => {
      const { clientId } = req.query;
      if (!clientId || typeof clientId !== 'string') {
        res.status(400).json({ success: false, error: 'clientId query param required' } satisfies ApiResponse);
        return;
      }

      const ownerEmail = await resolveOwnerEmail(req, res);
      if (!ownerEmail) return;

      if (!(await ownsClient(clientId, ownerEmail))) {
        res.status(403).json({ success: false, error: 'You do not have access to this client' } satisfies ApiResponse);
        return;
      }

      const url = buildUrl(clientId, ownerEmail);
      logEvent('info', 'calendar.oauth.url_generated', { requestId: requestId(req), clientId, provider });
      res.json({ success: true, data: { url } } satisfies ApiResponse<{ url: string }>);
    })().catch((err: unknown) => {
      logEvent('error', 'calendar.oauth.url_failed', {
        requestId: requestId(req), provider, error: errorMessage(err),
      });
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to generate OAuth URL',
      } satisfies ApiResponse);
    });
  });
}

function registerCallbackRoute(
  provider: OAuthProvider,
  handle: (code: string, state: string) => Promise<string>,
): void {
  router.get(`/${provider}/callback`, (req: Request, res: Response) => {
    (async () => {
      const { code, state, error: oauthError } = req.query;

      if (oauthError) {
        res.status(400).send(`Calendar connection denied: ${String(oauthError)}`);
        return;
      }
      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).send('Missing code or state parameter');
        return;
      }

      const clientId = await handle(code, state);
      await refreshAgentAfterConnect(clientId, req);

      const successUrl = process.env.CALENDAR_OAUTH_SUCCESS_URL
        ?? process.env.GOOGLE_OAUTH_SUCCESS_URL
        ?? '/dashboard/settings';
      res.redirect(`${successUrl}?connected=${provider}&clientId=${clientId}`);
    })().catch((err: unknown) => {
      logEvent('error', 'calendar.oauth.callback_failed', {
        requestId: requestId(req), provider, error: errorMessage(err),
      });
      res.status(500).send('Failed to complete the calendar connection. Please try again.');
    });
  });
}

registerConsentRoute('google', generateOAuthUrl);
registerCallbackRoute('google', handleOAuthCallback);
registerConsentRoute('microsoft', generateMicrosoftOAuthUrl);
registerCallbackRoute('microsoft', handleMicrosoftCallback);

// ── Apple iCloud / CalDAV ─────────────────────────────────────────────────────

/**
 * POST /auth/caldav  { clientId, appleId, appPassword }
 *
 * Verifies the credentials by walking iCloud's discovery chain, then stores them.
 * A 401 here means Apple rejected the app-specific password, which is worth
 * saying plainly — it is the single most common way this connection fails, and
 * the tenant usually pasted their normal Apple password by mistake.
 */
router.post('/caldav', (req: Request, res: Response) => {
  (async () => {
    const { clientId, appleId, appPassword } = req.body as {
      clientId?: string; appleId?: string; appPassword?: string;
    };

    if (!clientId || !appleId || !appPassword) {
      res.status(400).json({
        success: false,
        error: 'clientId, appleId and appPassword are required',
      } satisfies ApiResponse);
      return;
    }

    const ownerEmail = await resolveOwnerEmail(req, res);
    if (!ownerEmail) return;

    if (!(await ownsClient(clientId, ownerEmail))) {
      res.status(403).json({ success: false, error: 'You do not have access to this client' } satisfies ApiResponse);
      return;
    }

    try {
      const { displayName } = await connectCaldav({ clientId, ownerEmail, appleId, appPassword });
      await refreshAgentAfterConnect(clientId, req);
      res.json({
        success: true,
        data: { provider: 'caldav', calendarName: displayName },
      } satisfies ApiResponse<{ provider: string; calendarName: string | null }>);
    } catch (err: unknown) {
      if (err instanceof CalendarAuthError) {
        res.status(401).json({ success: false, error: err.message } satisfies ApiResponse);
        return;
      }
      throw err;
    }
  })().catch((err: unknown) => {
    logEvent('error', 'calendar.caldav.connect_failed', {
      requestId: requestId(req), error: errorMessage(err),
    });
    res.status(502).json({
      success: false,
      error: 'Could not reach Apple to verify that calendar. Please try again.',
    } satisfies ApiResponse);
  });
});

// ── Disconnect ────────────────────────────────────────────────────────────────

/** POST /auth/calendar/disconnect { clientId } */
router.post('/calendar/disconnect', (req: Request, res: Response) => {
  (async () => {
    const { clientId } = req.body as { clientId?: string };
    if (!clientId) {
      res.status(400).json({ success: false, error: 'clientId is required' } satisfies ApiResponse);
      return;
    }

    const ownerEmail = await resolveOwnerEmail(req, res);
    if (!ownerEmail) return;

    await disconnectCalendar(clientId, ownerEmail);
    // Rebuild so the booking tools come off the agent too, rather than leaving
    // it advertising a diary it can no longer reach.
    await refreshAgentAfterConnect(clientId, req);
    res.json({ success: true } satisfies ApiResponse);
  })().catch((err: unknown) => {
    logEvent('error', 'calendar.disconnect_failed', {
      requestId: requestId(req), error: errorMessage(err),
    });
    res.status(500).json({ success: false, error: 'Could not disconnect that calendar' } satisfies ApiResponse);
  });
});

// ── Google sign-in passthrough ────────────────────────────────────────────────

/**
 * POST /auth/google/save-calendar-token
 *
 * Used when the tenant signed in *with* Google via Supabase: the session already
 * carries a provider refresh token, so the diary can be connected without a
 * second consent screen. This is the cheapest possible connection — no extra tap
 * at all — and is why offering Google sign-in at signup matters more than any
 * other change to this flow.
 */
router.post('/google/save-calendar-token', (req: Request, res: Response) => {
  (async () => {
    const ownerEmail = await resolveOwnerEmail(req, res);
    if (!ownerEmail) return;

    const { email, providerToken, providerRefreshToken } = req.body as {
      email?: string;
      providerToken?: string;
      providerRefreshToken?: string;
    };

    if (!providerRefreshToken) {
      res.status(400).json({ success: false, error: 'providerRefreshToken required' } satisfies ApiResponse);
      return;
    }

    if (email && email !== ownerEmail) {
      res.status(403).json({
        success: false,
        error: 'Authenticated user does not match requested email',
      } satisfies ApiResponse);
      return;
    }

    let calendarId = 'primary';
    if (providerToken) {
      const calRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
        { headers: { Authorization: `Bearer ${providerToken}` } },
      );
      if (calRes.ok) calendarId = ((await calRes.json()) as { id: string }).id;
    }

    const now = new Date().toISOString();
    const { data: updatedClient } = await supabase
      .from('clients')
      .update({
        google_refresh_token:  providerRefreshToken,
        google_cal_id:         calendarId,
        // Write the provider-neutral columns too, or a tenant connected this way
        // reads as "no diary" to everything that now goes through
        // calendarConnection()'s preferred path.
        calendar_provider:     'google',
        calendar_id:           calendarId,
        calendar_credentials:  providerRefreshToken,
        calendar_status:       'connected',
        calendar_last_error:   null,
        calendar_connected_at: now,
        calendar_checked_at:   now,
        updated_at:            now,
      })
      .eq('owner_email', ownerEmail)
      .select('id')
      .maybeSingle();

    if (!updatedClient) {
      // Signed in with Google before the tenant row exists. The token is fine;
      // there is simply nowhere to put it yet. 202 so the frontend can tell this
      // apart from a failure.
      res.status(202).json({
        success: false,
        error: 'No client account found for this email yet. Your diary will connect once your account is set up.',
      } satisfies ApiResponse);
      return;
    }

    await refreshAgentAfterConnect(updatedClient.id as string, req);
    res.json({ success: true } satisfies ApiResponse);
  })().catch((err: unknown) => {
    logEvent('error', 'calendar.google_token_save_failed', {
      requestId: requestId(req), error: errorMessage(err),
    });
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save calendar token',
    } satisfies ApiResponse);
  });
});

export default router;
