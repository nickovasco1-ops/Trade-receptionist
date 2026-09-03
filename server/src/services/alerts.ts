/**
 * Operational alerts — the email that tells a human a customer needs them.
 *
 * Everything expensive this product has got wrong shared one shape: it failed
 * correctly, logged politely, and told nobody. A Business-tier checkout failed
 * for weeks before a customer complained. Three signups completed with no phone
 * number and cancelled inside a fortnight. In every case the information
 * existed in a log nobody was reading.
 *
 * These alerts are deliberately loud and deliberately few. One email per signup,
 * one per payment failure, one per cancellation, one per abandoned checkout.
 * Anything more frequent than that becomes noise, and noise is how the previous
 * notification cron ended up ignored.
 */
import { sendEmail } from './resend';
import { errorMessage, logEvent } from '../lib/observability';

/** Where operational alerts go. Falls back to the integrity address. */
function alertAddress(): string | null {
  return process.env.ALERT_EMAIL?.trim()
    || process.env.INTEGRITY_ALERT_EMAIL?.trim()
    || null;
}

export type AlertTone = 'good' | 'warn' | 'bad';

const TONE = {
  good: { accent: '#6ee7b7', label: 'OK' },
  warn: { accent: '#f7c948', label: 'Needs attention' },
  bad:  { accent: '#ff7a6b', label: 'Action required' },
} as const;

export interface OpsAlert {
  tone:      AlertTone;
  subject:   string;
  headline:  string;
  /** Short lines of context — label / value pairs. */
  facts:     Array<[string, string]>;
  /** What the reader should actually do. Omit when nothing is needed. */
  action?:   string;
}

function html(alert: OpsAlert): string {
  const MN = "'Manrope','Helvetica Neue',Arial,sans-serif";
  const SG = "'Space Grotesk','Helvetica Neue',Arial,sans-serif";
  const { accent, label } = TONE[alert.tone];

  const rows = alert.facts.map(([k, v]) => `
    <tr>
      <td style="padding:7px 0;font-size:13px;color:rgba(240,244,248,0.52);font-family:${MN};white-space:nowrap;vertical-align:top;">${k}</td>
      <td style="padding:7px 0 7px 18px;font-size:14px;color:#F0F4F8;font-family:${MN};">${v}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#020D18;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020D18;padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#0A1A2E;border-radius:20px;border:1px solid rgba(255,255,255,0.08);">
    <tr><td style="padding:30px 34px 6px;">
      <p style="margin:0 0 14px;font-size:10.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${accent};font-family:${MN};">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${accent};vertical-align:middle;margin-right:8px;"></span>${label}
      </p>
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#F0F4F8;font-family:${SG};">${alert.headline}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>
    ${alert.action ? `<tr><td style="padding:20px 34px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,107,43,0.10);border:1px solid rgba(255,107,43,0.24);border-radius:14px;">
        <tr><td style="padding:16px 20px;font-size:14px;line-height:1.6;color:#F0F4F8;font-family:${MN};">${alert.action}</td></tr>
      </table>
    </td></tr>` : '<tr><td style="padding:0 34px 30px;"></td></tr>'}
  </table>
  <p style="margin:16px 0 0;font-size:11px;color:rgba(240,244,248,0.32);font-family:${MN};">Trade Receptionist · operational alert</p>
</td></tr></table></body></html>`;
}

/**
 * Send an operational alert. Never throws and never blocks the caller — an
 * alert that can break a signup is worse than no alert.
 */
export async function sendOpsAlert(alert: OpsAlert): Promise<boolean> {
  const to = alertAddress();
  if (!to) {
    logEvent('error', 'alert.no_address', {
      subject: alert.subject,
      action:  'set ALERT_EMAIL — operational alerts are being dropped',
    });
    return false;
  }

  try {
    await sendEmail({ to, subject: alert.subject, html: html(alert) });
    logEvent('info', 'alert.sent', { subject: alert.subject, tone: alert.tone });
    return true;
  } catch (err: unknown) {
    logEvent('error', 'alert.failed', { subject: alert.subject, error: errorMessage(err) });
    return false;
  }
}

/** Fire-and-forget wrapper for call sites that must not await. */
export function fireOpsAlert(alert: OpsAlert): void {
  void sendOpsAlert(alert);
}
