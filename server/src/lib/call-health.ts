/**
 * Is the phone line actually answering? Pure: no I/O, so every rule is tested.
 *
 * On 2026-09-28 Retell's payment method lapsed and every call to every tenant
 * was rejected at once — the caller heard an engaged tone, Twilio logged
 * "Busy", and nothing told anyone. Retell *did* say why: each of those calls
 * ended with `disconnection_reason: 'no_valid_payment'`. The reason was in the
 * webhook the whole time; nobody read it.
 *
 * So the signal is Retell's own verdict on each real call, read two ways:
 * instantly in the webhook (one alert per reason per hour, so an outage is one
 * email, not one per caller) and in the morning report (the last 24 hours per
 * line). A synthetic "ring the line" probe was considered and not built: it
 * costs a call, lands in the tenant's call log and texts their phone, and the
 * reason on the first real failed call arrives sooner than a daily probe would.
 */
import type { AlertTone, OpsAlert } from '../services/alerts';
import type { CalendarSweepReport, CalendarSweepRow } from '../services/calendar';

export interface LineFault {
  tone:    Extract<AlertTone, 'warn' | 'bad'>;
  /** What happened, in words the owner can act on. */
  meaning: string;
  action:  string;
}

/**
 * Disconnection reasons that mean the platform, not the caller, ended the call.
 * Anything absent (user_hangup, agent_hangup, voicemail, inactivity, spam,
 * transfers) is a normal ending and never alerts.
 */
const FAULTS: Readonly<Record<string, LineFault>> = {
  no_valid_payment: {
    tone: 'bad',
    meaning: 'Retell has no valid payment method, so it is rejecting every call to every tenant.',
    action: 'Update the card in the Retell dashboard → Billing. Callers hear an engaged tone until you do.',
  },
  concurrency_limit_reached: {
    tone: 'bad',
    meaning: 'Retell refused the call because the account hit its limit on simultaneous calls.',
    action: 'Raise the concurrency limit in the Retell dashboard.',
  },
  sip_routing_error: {
    tone: 'bad',
    meaning: 'The call could not be routed between Twilio and Retell.',
    action: 'Check the number is on the SIP trunk and imported into Retell (run the tenant integrity check).',
  },
  telephony_provider_unavailable: {
    tone: 'bad',
    meaning: 'Twilio was unavailable for this call.',
    action: 'Check status.twilio.com and the Twilio debugger.',
  },
  telephony_provider_permission_denied: {
    tone: 'warn',
    meaning: 'Twilio refused a call Retell tried to place (usually a transfer).',
    action: 'Check Twilio → Monitor → Logs → Errors: 32202 means the trunk credentials, 32205 means geo permissions.',
  },
  error_retell: {
    tone: 'warn',
    meaning: 'Retell had an internal error and dropped the call.',
    action: 'Check status.retellai.com. If it repeats, contact Retell support with the call id.',
  },
  error_unknown: {
    tone: 'warn',
    meaning: 'The call ended on an unknown Retell error.',
    action: 'Open the call in Retell → Call History for detail.',
  },
  error_llm_websocket_open: {
    tone: 'warn',
    meaning: 'The receptionist\'s brain (the LLM) could not be reached, so the call dropped.',
    action: 'Check status.retellai.com and the agent\'s LLM settings.',
  },
  error_llm_websocket_lost_connection: {
    tone: 'warn',
    meaning: 'The receptionist lost its LLM connection mid-call.',
    action: 'Check status.retellai.com.',
  },
  error_llm_websocket_runtime: {
    tone: 'warn',
    meaning: 'The receptionist\'s LLM failed mid-call.',
    action: 'Check status.retellai.com and the agent\'s LLM settings.',
  },
  error_llm_websocket_corrupt_payload: {
    tone: 'warn',
    meaning: 'The receptionist\'s LLM sent Retell something it could not read.',
    action: 'Check the agent\'s tools and prompt were published cleanly (run Rebuild all receptionists).',
  },
};

/** The fault behind a disconnection reason, or null for a normal ending. */
export function classifyDisconnection(reason: string | null | undefined): LineFault | null {
  if (!reason) return null;
  return FAULTS[reason] ?? null;
}

/** One alert per reason per hour: an outage is one email, not one per caller. */
export const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

export function shouldAlert(
  reason: string,
  now: number,
  lastSent: Map<string, number>,
): boolean {
  const last = lastSent.get(reason);
  if (last !== undefined && now - last < ALERT_COOLDOWN_MS) return false;
  lastSent.set(reason, now);
  return true;
}

// ── Morning report ────────────────────────────────────────────────────────────

/** What the report needs off a Retell call. */
export interface CallSummaryInput {
  start_timestamp?:     number;
  disconnection_reason?: string | null;
}

export interface LineSummary {
  businessName: string;
  calls:        number;
  /** Calls the platform ended, keyed by disconnection reason. */
  faults:       Record<string, number>;
  /** Set when Retell could not be asked at all. */
  error?:       string;
}

export function summariseLine(
  businessName: string,
  calls: readonly CallSummaryInput[],
  sinceMs: number,
): LineSummary {
  const recent = calls.filter((c) => (c.start_timestamp ?? 0) >= sinceMs);
  const faults: Record<string, number> = {};
  for (const c of recent) {
    if (c.disconnection_reason && classifyDisconnection(c.disconnection_reason)) {
      faults[c.disconnection_reason] = (faults[c.disconnection_reason] ?? 0) + 1;
    }
  }
  return { businessName, calls: recent.length, faults };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PROVIDER: Readonly<Record<string, string>> = {
  google: 'Google', microsoft: 'Outlook', apple: 'iCloud', none: '—',
};

function diaryText(row: CalendarSweepRow | undefined): string {
  if (!row) return 'unknown';
  const provider = PROVIDER[row.provider] ?? row.provider;
  switch (row.status) {
    case 'ok':              return `${provider} — working`;
    case 'needs_reconnect': return `${provider} — <strong>DEAD, needs reconnecting</strong>`;
    case 'provider_error':  return `${provider} — provider error (not the customer's fault; will retry)`;
    case 'not_connected':   return 'not connected — cannot book jobs';
  }
}

function lineText(line: LineSummary | undefined): string {
  if (!line) return 'no agent';
  if (line.error) return `<strong>could not check</strong> (${escapeHtml(line.error.slice(0, 120))})`;
  const failed = Object.values(line.faults).reduce((n, v) => n + v, 0);
  const base = `${line.calls} call${line.calls === 1 ? '' : 's'} in 24h`;
  if (!failed) return base;
  const detail = Object.entries(line.faults).map(([r, n]) => `${r} ×${n}`).join(', ');
  return `${base}, <strong>${failed} failed</strong> (${escapeHtml(detail)})`;
}

/**
 * The morning email. Always sent — "everything is working" is information too,
 * and a report that only arrives when something is wrong cannot be told apart
 * from a report that stopped arriving.
 */
export function buildDailyReport(
  calendars: CalendarSweepReport,
  lines: readonly LineSummary[],
  date: string,
): OpsAlert {
  const lineByName = new Map(lines.map((l) => [l.businessName, l]));
  const names = [...new Set([...calendars.rows.map((r) => r.businessName), ...lines.map((l) => l.businessName)])];

  const failedCalls = lines.reduce((n, l) => n + Object.values(l.faults).reduce((a, b) => a + b, 0), 0);
  const unchecked = lines.filter((l) => l.error).length;
  const deadDiaries = calendars.needsReconnect;

  const problems: string[] = [];
  if (failedCalls) problems.push(`${failedCalls} call${failedCalls === 1 ? '' : 's'} failed`);
  if (deadDiaries) problems.push(`${deadDiaries} diar${deadDiaries === 1 ? 'y' : 'ies'} dead`);
  if (unchecked) problems.push(`${unchecked} line${unchecked === 1 ? '' : 's'} not checked`);

  const tone: AlertTone = failedCalls || deadDiaries ? 'bad'
    : unchecked || calendars.notConnected || calendars.providerErrors ? 'warn'
    : 'good';

  const facts: Array<[string, string]> = names.map((name) => [
    escapeHtml(name),
    `Line: ${lineText(lineByName.get(name))}<br>Diary: ${diaryText(calendars.rows.find((r) => r.businessName === name))}`,
  ]);

  const actions: string[] = [];
  if (failedCalls) {
    const reasons = new Set(lines.flatMap((l) => Object.keys(l.faults)));
    for (const r of reasons) {
      const f = classifyDisconnection(r);
      if (f) actions.push(`<strong>${escapeHtml(r)}</strong>: ${escapeHtml(f.meaning)} ${escapeHtml(f.action)}`);
    }
  }
  if (deadDiaries) actions.push('A dead diary needs the customer to reconnect it from Settings → Diary connection.');
  if (calendars.notConnected) actions.push(`${calendars.notConnected} tenant(s) have no diary connected, so their receptionist can only take messages.`);

  return {
    tone,
    subject: problems.length
      ? `[Trade Receptionist] Daily report ${date}: ${problems.join(', ')}`
      : `[Trade Receptionist] Daily report ${date}: all lines and diaries working`,
    headline: problems.length ? `Needs attention: ${problems.join(', ')}` : 'All lines answering, all connected diaries working',
    facts,
    action: actions.length ? actions.join('<br><br>') : undefined,
  };
}
