import { createHmac } from 'crypto';
import { apiBaseURL } from './env';
import { pollUntil } from './polling';

export function retellSignature(body: string, secret = process.env.RETELL_API_KEY || '') {
  return createHmac('sha256', secret).update(Buffer.from(body)).digest('hex');
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
