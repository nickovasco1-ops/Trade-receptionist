import { createHmac } from 'crypto';
import { sign as retellSign } from 'retell-sdk';
import { apiBaseURL } from './env';
import { pollUntil } from './polling';

/**
 * Retell's signature is NOT a plain HMAC of the body — it carries a timestamp
 * and is checked against a replay window inside retell-sdk's verify(). Signing
 * by hand here produced a valid-looking header the server always rejected, so
 * every signed-webhook test was asserting against `invalid_signature` rather
 * than the handler. Use the SDK's own sign() so the test and the server agree
 * by construction, and stay agreeing across SDK upgrades.
 */
export function retellSignature(body: string, secret = process.env.RETELL_API_KEY || '') {
  return retellSign(body, secret);
}

export function stripeSignature(body: string, secret = process.env.STRIPE_WEBHOOK_SECRET || '') {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

export async function postJsonWebhook(path: string, body: Record<string, unknown>, headers: Record<string, string>) {
  const raw = JSON.stringify(body);
  return fetch(`${apiBaseURL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: raw,
  });
}

export const eventually = pollUntil;
