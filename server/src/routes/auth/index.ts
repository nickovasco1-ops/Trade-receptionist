import { Router, Request, Response } from 'express';
import { generateOAuthUrl, handleOAuthCallback } from '../../services/calendar';
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
 * GET /auth/google?clientId=<uuid>
 * Returns the Google consent URL for a specific client.
 * The frontend redirects the user's browser to this URL.
 */
router.get('/google', (req: Request, res: Response) => {
  (async () => {
    const { clientId } = req.query;
    if (!clientId || typeof clientId !== 'string') {
      res.status(400).json({ success: false, error: 'clientId query param required' } satisfies ApiResponse);
      return;
    }

    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ success: false, error: 'Missing authentication token' } satisfies ApiResponse);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const ownerEmail = authData.user?.email;
    if (authError || !ownerEmail) {
      res.status(401).json({ success: false, error: 'Invalid authentication token' } satisfies ApiResponse);
      return;
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('owner_email', ownerEmail)
      .maybeSingle();

    if (!client) {
      res.status(403).json({ success: false, error: 'You do not have access to this client' } satisfies ApiResponse);
      return;
    }

    try {
      const url = generateOAuthUrl(clientId, ownerEmail);
      logEvent('info', 'google.oauth.url_generated', { requestId: requestId(req), clientId });
      res.json({ success: true, data: { url } } satisfies ApiResponse<{ url: string }>);
    } catch (err: unknown) {
      logEvent('error', 'google.oauth.provider_failure', {
        requestId: requestId(req),
        clientId,
        provider: 'google',
        error: errorMessage(err),
      });
      res.status(500).json({
        success: false,
        error:   err instanceof Error ? err.message : 'Failed to generate OAuth URL',
      } satisfies ApiResponse);
    }
  })().catch((err: unknown) => {
    logEvent('error', 'google.oauth.handler_error', {
      requestId: requestId(req),
      error: errorMessage(err),
    });
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate OAuth URL',
    } satisfies ApiResponse);
  });
});

/**
 * GET /auth/google/callback?code=...&state=...
 * Google redirects here after the user approves calendar access.
 * Exchanges the code for tokens and saves them against the client.
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    res.status(400).send(`Google OAuth denied: ${oauthError}`);
    return;
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('Missing code or state parameter');
    return;
  }

  try {
    const clientId = await handleOAuthCallback(code, state);
    const [{ data: client }, { data: config }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('business_config').select('*').eq('client_id', clientId).maybeSingle(),
    ]);

    if (client && config) {
      await updateAgentConfiguration(client as Client, config as BusinessConfig).catch((err: unknown) =>
        logEvent('error', 'google.oauth.provider_failure', {
          requestId: requestId(req),
          clientId,
          provider: 'retell',
          error: errorMessage(err),
        })
      );
    }

    // Redirect to a success page or return JSON depending on the integration
    const successUrl = process.env.GOOGLE_OAUTH_SUCCESS_URL ?? '/';
    res.redirect(`${successUrl}?connected=google&clientId=${clientId}`);
  } catch (err: unknown) {
    logEvent('error', 'google.oauth.provider_failure', {
      requestId: requestId(req),
      provider: 'google',
      error: errorMessage(err),
    });
    res.status(500).send('Failed to complete Google Calendar connection. Please try again.');
  }
});

/**
 * POST /auth/google/save-calendar-token
 * Called automatically after a Google sign-in via Supabase OAuth.
 * Saves the provider refresh token and primary calendar ID against the client record.
 */
router.post('/google/save-calendar-token', async (req: Request, res: Response) => {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing authentication token' } satisfies ApiResponse);
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const authenticatedEmail = authData.user?.email;
  if (authError || !authenticatedEmail) {
    res.status(401).json({ success: false, error: 'Invalid authentication token' } satisfies ApiResponse);
    return;
  }

  const { email, providerToken, providerRefreshToken } = req.body as {
    email?: string;
    providerToken?: string;
    providerRefreshToken?: string;
  };

  if (!providerRefreshToken) {
    res.status(400).json({ success: false, error: 'providerRefreshToken required' } satisfies ApiResponse);
    return;
  }

  if (email && email !== authenticatedEmail) {
    res.status(403).json({ success: false, error: 'Authenticated user does not match requested email' } satisfies ApiResponse);
    return;
  }

  try {
    // Fetch primary calendar ID using the short-lived access token (if available)
    let calendarId = 'primary';
    if (providerToken) {
      const calRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
        { headers: { Authorization: `Bearer ${providerToken}` } }
      );
      if (calRes.ok) {
        calendarId = ((await calRes.json()) as { id: string }).id;
      }
    }

    const { data: updatedClient } = await supabase
      .from('clients')
      .update({
        google_refresh_token: providerRefreshToken,
        google_cal_id:        calendarId,
        updated_at:           new Date().toISOString(),
      })
      .eq('owner_email', authenticatedEmail)
      .select('*')
      .maybeSingle();

    if (updatedClient) {
      const { data: config } = await supabase
        .from('business_config')
        .select('*')
        .eq('client_id', updatedClient.id)
        .maybeSingle();

      if (config) {
        await updateAgentConfiguration(updatedClient as Client, config as BusinessConfig).catch((err: unknown) =>
          logEvent('error', 'google.oauth.provider_failure', {
            requestId: requestId(req),
            clientId: updatedClient.id,
            provider: 'retell',
            error: errorMessage(err),
          })
        );
      }
    } else {
      // No client row exists for this email yet (user signed in with Google before
      // completing onboarding). The token is valid but there's nowhere to store it yet.
      // Respond 202 so the frontend knows this is expected, not an error.
      res.status(202).json({
        success: false,
        error: 'No client account found for this email yet. Calendar will connect automatically once your account is set up.',
      } satisfies ApiResponse);
      return;
    }

    res.json({ success: true } satisfies ApiResponse);
  } catch (err: unknown) {
    logEvent('error', 'google.oauth.provider_failure', {
      requestId: requestId(req),
      provider: 'google',
      error: errorMessage(err),
    });
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save calendar token',
    } satisfies ApiResponse);
  }
});

export default router;
