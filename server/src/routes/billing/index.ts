import { Router, Request, Response } from 'express';
import { supabase } from '../../services/supabase';
import type { ApiResponse } from '../../../../shared/types';

const router = Router();

function bearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim() || null;
}

/**
 * POST /billing/portal-session
 *
 * Creates a Stripe Customer Portal session and returns the URL.
 * The frontend redirects the user to this URL for self-serve billing:
 * upgrade/downgrade, invoice history, card update, cancellation.
 *
 * Requires: Bearer auth token, client must have a stripe_customer_id.
 *
 * Note: The Stripe Customer Portal must be configured in the Stripe dashboard
 * (Products → Customer portal) before this endpoint returns valid sessions.
 */
router.post('/portal-session', async (req: Request, res: Response) => {
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

  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('id, stripe_customer_id')
    .eq('owner_email', ownerEmail)
    .maybeSingle();

  if (clientError || !clientRow) {
    res.status(404).json({ success: false, error: 'Client not found' } satisfies ApiResponse);
    return;
  }

  const stripeCustomerId: string | null = clientRow.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    res.status(400).json({
      success: false,
      error: 'No billing account found. Your subscription may still be activating — please try again in a moment or contact support.',
    } satisfies ApiResponse);
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(503).json({ success: false, error: 'Billing service is temporarily unavailable.' } satisfies ApiResponse);
    return;
  }

  // Derive return URL from request origin; fall back to the production app URL.
  const origin = typeof req.headers.origin === 'string' && req.headers.origin
    ? req.headers.origin
    : 'https://app.tradereceptionist.com';
  const returnUrl = `${origin}/dashboard/settings`;

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: stripeCustomerId,
        return_url: returnUrl,
      }).toString(),
    });

    if (!stripeRes.ok) {
      const errBody = await stripeRes.json().catch(() => ({})) as Record<string, unknown>;
      const errMsg = (errBody.error as { message?: string } | undefined)?.message
        ?? `Stripe error ${stripeRes.status}`;
      res.status(502).json({ success: false, error: errMsg } satisfies ApiResponse);
      return;
    }

    const session = await stripeRes.json() as { url?: string };
    if (!session.url) {
      res.status(502).json({ success: false, error: 'Stripe did not return a portal URL.' } satisfies ApiResponse);
      return;
    }

    res.json({ success: true, data: { url: session.url } } satisfies ApiResponse<{ url: string }>);
  } catch (err: unknown) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : 'Could not reach Stripe.',
    } satisfies ApiResponse);
  }
});

export default router;
