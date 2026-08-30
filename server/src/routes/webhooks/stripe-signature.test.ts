/**
 * Stripe webhook signature verification.
 *
 * These are the tests that would have caught the two defects fixed on
 * 2026-08-30 (failure catalogue C2a):
 *
 *   1. `unsignedRequestIsRejected` — the route guarded with
 *      `secret && sigHeader && !verify(...)`, so omitting the header skipped
 *      verification entirely. That path reached provisionClient(), which spends
 *      money buying a Twilio number and creates a Supabase auth user for an
 *      attacker-chosen email. Setting STRIPE_WEBHOOK_SECRET did not close it.
 *   2. `replayedSignatureIsRejected` — there was no timestamp check, so a
 *      captured genuine webhook replayed indefinitely.
 *
 * The route-level half of this lives in e2e/webhooks.stripe.spec.ts; these
 * cover the branches that cannot be reached over HTTP without waiting out the
 * replay window.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyStripeSignature } from './stripe-signature';

const SECRET = 'whsec_test_only_never_a_real_key';
const BODY = Buffer.from(JSON.stringify({ type: 'checkout.session.completed' }), 'utf8');
const NOW = 1_756_000_000; // fixed clock so the tolerance window is deterministic

function signedHeader(
  body: Buffer = BODY,
  secret: string = SECRET,
  timestamp: number = NOW,
): string {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body.toString('utf8')}`)
    .digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

describe('verifyStripeSignature', () => {
  test('accepts a correctly signed payload', () => {
    assert.equal(verifyStripeSignature(BODY, signedHeader(), SECRET, NOW), true);
  });

  // ── C2a defect 1: the unsigned bypass ──────────────────────────────────────

  test('rejects an empty signature header (the forgery path)', () => {
    assert.equal(verifyStripeSignature(BODY, '', SECRET, NOW), false);
  });

  test('rejects when the secret is unset, even with a well-formed header', () => {
    assert.equal(verifyStripeSignature(BODY, signedHeader(), '', NOW), false);
  });

  test('rejects a signature produced with the wrong secret', () => {
    const forged = signedHeader(BODY, 'whsec_attacker_guess');
    assert.equal(verifyStripeSignature(BODY, forged, SECRET, NOW), false);
  });

  test('rejects a valid signature applied to a tampered body', () => {
    const header = signedHeader();
    const tampered = Buffer.from(JSON.stringify({ type: 'customer.subscription.deleted' }), 'utf8');
    assert.equal(verifyStripeSignature(tampered, header, SECRET, NOW), false);
  });

  // ── C2a defect 2: the missing replay window ────────────────────────────────

  test('rejects a signature older than the 300s tolerance', () => {
    const stale = signedHeader(BODY, SECRET, NOW - 301);
    assert.equal(verifyStripeSignature(BODY, stale, SECRET, NOW), false);
  });

  test('accepts a signature just inside the tolerance', () => {
    const recent = signedHeader(BODY, SECRET, NOW - 299);
    assert.equal(verifyStripeSignature(BODY, recent, SECRET, NOW), true);
  });

  test('rejects a far-future timestamp', () => {
    const future = signedHeader(BODY, SECRET, NOW + 301);
    assert.equal(verifyStripeSignature(BODY, future, SECRET, NOW), false);
  });

  test('rejects a non-numeric timestamp', () => {
    const digest = crypto
      .createHmac('sha256', SECRET)
      .update(`not-a-number.${BODY.toString('utf8')}`)
      .digest('hex');
    assert.equal(
      verifyStripeSignature(BODY, `t=not-a-number,v1=${digest}`, SECRET, NOW),
      false,
    );
  });

  // ── Malformed headers must return false, never throw ───────────────────────

  test('rejects malformed headers without throwing', () => {
    const malformed = [
      'garbage',
      't=',
      `t=${NOW}`,                       // no v1
      'v1=abc',                         // no timestamp
      `t=${NOW},v1=`,                   // empty digest
      `t=${NOW},v1=tooshort`,           // wrong length — timingSafeEqual would throw
      `t=${NOW},v1=${'z'.repeat(64)}`,  // right length, not hex
    ];

    for (const header of malformed) {
      assert.equal(
        verifyStripeSignature(BODY, header, SECRET, NOW),
        false,
        `expected rejection for header: ${header}`,
      );
    }
  });

  test('tolerates whitespace around header parts', () => {
    const header = signedHeader().split(',').map((p) => ` ${p} `).join(',');
    assert.equal(verifyStripeSignature(BODY, header, SECRET, NOW), true);
  });
});
