import { expect, test } from '@playwright/test';
import { createHmac } from 'crypto';
import { apiBaseURL } from './utils/env';
import { retellSignature } from './utils/webhooks';

/**
 * Retell custom-function endpoints (`check_calendar_availability` /
 * `create_calendar_booking`) — the tools the agent calls mid-call to read the
 * diary and book a job.
 *
 * Failure catalogue C2b. These verified with a plain `HMAC-SHA256(body)` and
 * compared it against the raw `X-Retell-Signature` header. Retell actually
 * sends `v={unix_ms},d={HMAC-SHA256(body + timestamp)}` — the same scheme as
 * webhooks, which BUG-002a fixed in the webhook route on 2026-06-10 and never
 * here. A real header is 82 characters against our 64-character digest, so the
 * length guard rejected every request before comparing anything.
 *
 * Result: every mid-call availability check and booking returned 401 from
 * 2026-05-21 until 2026-08-30. The agent could never read a diary or book a
 * job on any real call — the product's headline feature. Confirmed against
 * production by signing a probe with the SDK, and corroborated by the database:
 * the only call-linked booking in the entire history is a synthetic
 * `auto_test_*` row.
 *
 * These tests sign with the SDK, so the server and Retell agree by
 * construction and stay agreeing across SDK upgrades.
 */

const TOOL_PATHS = ['/retell-tools/check-availability', '/retell-tools/create-booking'] as const;

function body(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    call: { call_id: 'e2e_tool_call', from_number: '+447700900123' },
    args: {},
    ...overrides,
  });
}

async function postTool(path: string, raw: string, signature?: string) {
  return fetch(`${apiBaseURL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature === undefined ? {} : { 'X-Retell-Signature': signature }),
    },
    body: raw,
  });
}

test.describe('Retell custom-function auth', () => {
  for (const path of TOOL_PATHS) {
    test(`${path} accepts a correctly Retell-signed request`, async () => {
      const raw = body();
      const response = await postTool(path, raw, await retellSignature(raw));

      // The signature gate runs before any validation, so getting past it is
      // the whole assertion. The handler then refuses on its own terms —
      // check-availability on the missing agent_id, create-booking on its
      // required args — which is expected and not what this test is about.
      expect(response.status).not.toBe(401);
      expect(response.status).toBe(200);

      const payload = await response.json() as { success: boolean; error?: string };
      expect(payload.success).toBe(false);
      expect(payload.error).not.toContain('Invalid Retell signature');
    });

    test(`${path} rejects the legacy plain-HMAC signature`, async () => {
      // Exactly what the server used to compute and expect. If this is ever
      // accepted again, the hand-rolled scheme has come back.
      const raw = body();
      const legacy = createHmac('sha256', process.env.RETELL_API_KEY || '')
        .update(raw)
        .digest('hex');

      const response = await postTool(path, raw, legacy);
      expect(response.status).toBe(401);
    });

    test(`${path} rejects a request with no signature header`, async () => {
      const response = await postTool(path, body());
      expect(response.status).toBe(401);
    });

    test(`${path} rejects a valid signature applied to a tampered body`, async () => {
      const signed = body();
      const tampered = body({ args: { duration_mins: 240 } });

      const response = await postTool(path, tampered, await retellSignature(signed));
      expect(response.status).toBe(401);
    });
  }
});
