import { Router, Request, Response } from 'express';
import { generateOAuthUrl, handleOAuthCallback } from '../../services/calendar';
import { supabase } from '../../services/supabase';
import type { ApiResponse } from '../../../../shared/types';

const router = Router();

/**
 * GET /auth/google?clientId=<uuid>
 * Returns the Google consent URL for a specific client.
 * The frontend redirects the user's browser to this URL.
 */
router.get('/google', (req: Request, res: Response) => {
  const { clientId } = req.query;
  if (!clientId || typeof clientId !== 'string') {
    res.status(400).json({ success: false, error: 'clientId query param required' } satisfies ApiResponse);
    return;
  }

  try {
    const url = generateOAuthUrl(clientId);
    res.json({ success: true, data: { url } } satisfies ApiResponse<{ url: string }>);
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error:   err instanceof Error ? err.message : 'Failed to generate OAuth URL',
    } satisfies ApiResponse);
  }
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
    // Redirect to a success page or return JSON depending on the integration
    const successUrl = process.env.GOOGLE_OAUTH_SUCCESS_URL ?? '/';
    res.redirect(`${successUrl}?connected=google&clientId=${clientId}`);
  } catch (err: unknown) {
    console.error('[auth] Google OAuth callback failed', err);
    res.status(500).send('Failed to complete Google Calendar connection. Please try again.');
  }
});

/**
 * POST /auth/google/save-calendar-token
 * Called automatically after a Google sign-in via Supabase OAuth.
 * Saves the provider refresh token and primary calendar ID against the client record.
 */
router.post('/google/save-calendar-token', async (req: Request, res: Response) => {
  const { email, providerToken, providerRefreshToken } = req.body as {
    email?: string;
    providerToken?: string;
    providerRefreshToken?: string;
  };

  if (!email || !providerRefreshToken) {
    res.status(400).json({ success: false, error: 'email and providerRefreshToken required' } satisfies ApiResponse);
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

    await supabase
      .from('clients')
      .update({
        google_refresh_token: providerRefreshToken,
        google_cal_id:        calendarId,
        updated_at:           new Date().toISOString(),
      })
      .eq('owner_email', email);

    res.json({ success: true } satisfies ApiResponse);
  } catch (err: unknown) {
    console.error('[auth] save-calendar-token failed', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save calendar token',
    } satisfies ApiResponse);
  }
});

export default router;
