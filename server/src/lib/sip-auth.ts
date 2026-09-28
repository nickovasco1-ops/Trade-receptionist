/**
 * Credentials Retell presents to our Twilio elastic SIP trunk when it dials out.
 *
 * Inbound calls (Twilio → Retell) need none, which is why every receptionist
 * answered. Outbound calls — a transfer to the tradesperson — go Retell →
 * Twilio, and the trunk's Termination side only accepts an INVITE that
 * authenticates against its Credential List. Numbers were registered with the
 * termination URI and no credentials, so Twilio refused every transfer before
 * it became a call: the first ever attempt (2026-09-28) left no row in the
 * Twilio call log, and the agent told the caller it "couldn't get through".
 *
 * Both values, or neither. One without the other is a misconfiguration that
 * would still fail every transfer, so it is reported rather than half-applied.
 */
export interface SipAuth {
  username: string;
  password: string;
}

export type SipAuthResult =
  | { ok: true; auth: SipAuth }
  | { ok: false; reason: 'unset' | 'partial' };

export function sipAuthFromEnv(env: Readonly<Record<string, string | undefined>>): SipAuthResult {
  const username = env.RETELL_SIP_AUTH_USERNAME?.trim() ?? '';
  const password = env.RETELL_SIP_AUTH_PASSWORD ?? '';
  if (!username && !password) return { ok: false, reason: 'unset' };
  if (!username || !password) return { ok: false, reason: 'partial' };
  return { ok: true, auth: { username, password } };
}
