/**
 * Stripe webhook signature verification.
 *
 * Deliberately its own module with no imports beyond node:crypto. Living inside
 * `stripe.ts` made it untestable: that module pulls in the Supabase client,
 * which throws at import time without SUPABASE_URL, so a pure-crypto function
 * could not be exercised without real infrastructure credentials.
 */
import crypto from 'crypto';

/**
 * How far a signature timestamp may be from now before we treat it as a replay.
 * Matches Stripe's own default tolerance.
 */
const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Verify a Stripe webhook signature. **Fails closed on every path.**
 *
 * Exported for the unit tests in `stripe-signature.test.ts` — the timestamp
 * window in particular cannot be exercised through the route without waiting
 * five minutes.
 *
 * Two defects lived here until 2026-08-30:
 *
 *   1. The caller guarded with `secret && sigHeader && !verify(...)`, so a
 *      request that simply omitted the `stripe-signature` header skipped
 *      verification entirely — regardless of whether the secret was configured.
 *      Setting STRIPE_WEBHOOK_SECRET did not close it. A forged
 *      `checkout.session.completed` reached provisionClient(), which buys a
 *      Twilio number and creates a Supabase auth user; a forged
 *      `customer.subscription.deleted` could deactivate a real paying tenant.
 *   2. There was no timestamp check at all, so any captured genuine webhook
 *      could be replayed forever.
 *
 * `nowSeconds` is injectable so the replay window is testable.
 */
export function verifyStripeSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !signature) return false;

  const parts: Record<string, string> = {};
  for (const part of signature.split(',')) {
    const idx = part.indexOf('=');
    if (idx > 0) parts[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }

  const { t: timestamp, v1 } = parts;
  if (!timestamp || !v1) return false;

  // Reject replays. Both directions — a far-future timestamp is equally bogus.
  const signedAt = Number(timestamp);
  if (!Number.isFinite(signedAt)) return false;
  if (Math.abs(nowSeconds - signedAt) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const payload  = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // timingSafeEqual throws on length mismatch — check first so a wrong-length
  // signature returns false rather than being swallowed by a catch.
  const provided    = Buffer.from(v1, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (provided.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(provided, expectedBuf);
}
