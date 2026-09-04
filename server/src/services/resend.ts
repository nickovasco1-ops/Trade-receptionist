import { isE2ETestMode } from '../config/e2e';
import { forwardingInstructionsHtml } from '../lib/forwarding-email';
import { logEvent } from '../lib/observability';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL ?? 'hello@tradereceptionist.com';

// ── Core send ─────────────────────────────────────────────────────────────────

export interface EmailPayload {
  to:       string;
  subject:  string;
  html:     string;
  replyTo?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<string> {
  if (isE2ETestMode()) {
    return `email_e2e_${Buffer.from(`${payload.to}:${payload.subject}`).toString('hex').slice(0, 24)}`;
  }

  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:                  FROM_EMAIL,
      to:                    payload.to,
      subject:               payload.subject,
      html:                  payload.html,
      ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
    }),
  });

  if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

// ── Post-call email ───────────────────────────────────────────────────────────

export interface CallEmailData {
  businessName:  string;
  outcome:       string;
  callerNumber:  string;
  callerName?:   string | null;
  jobType?:      string | null;
  postcode?:     string | null;
  urgency?:      string | null;
  summary:       string;
  transcript?:   string | null;
  recordingUrl?: string | null;
  durationSecs?: number | null;
}

export interface BookingConfirmationEmailData {
  businessName: string;
  ownerName: string;
  scheduledAt: string;
  timezone: string;
  customerName?: string | null;
  jobType?: string | null;
  address?: string | null;
}

const OUTCOME_LABELS: Record<string, string> = {
  booked:        'Job booked',
  lead_captured: 'New lead captured',
  enquiry:       'New enquiry',
  spam:          'Spam call blocked',
  voicemail:     'Voicemail left',
  transferred:   'Call transferred',
  emergency:     'EMERGENCY call',
  no_answer:     'Missed call',
};

const OUTCOME_COLOURS: Record<string, string> = {
  booked:        '#16A34A',
  lead_captured: '#2563EB',
  enquiry:       '#6B7280',
  spam:          '#9CA3AF',
  voicemail:     '#7C3AED',
  transferred:   '#0891B2',
  emergency:     '#DC2626',
  no_answer:     '#9CA3AF',
};

const URGENCY_COLOURS: Record<string, string> = {
  emergency: '#DC2626',
  urgent:    '#FF6B2B',
  routine:   '#6B7280',
};

function badge(label: string, colour: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${colour};color:#fff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">${label}</span>`;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:6px 0;color:#6B7280;font-size:13px;width:110px;vertical-align:top;font-family:sans-serif">${label}</td>
      <td style="padding:6px 0;color:#111827;font-size:13px;font-family:sans-serif;font-weight:500">${value}</td>
    </tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function callSummaryHtml(data: CallEmailData): string {
  const outcomeLabel  = OUTCOME_LABELS[data.outcome]  ?? data.outcome;
  const outcomeColour = OUTCOME_COLOURS[data.outcome] ?? '#6B7280';
  const urgencyLabel  = data.urgency ?? 'routine';
  const urgencyColour = URGENCY_COLOURS[urgencyLabel] ?? '#6B7280';

  // Escape caller number before embedding in HTML to prevent injection
  const safeCallerNumber = escapeHtml(data.callerNumber);

  const isMissed = data.outcome === 'no_answer' || data.outcome === 'voicemail';

  const callBackBlock = isMissed && data.callerNumber && data.callerNumber !== 'Unknown number'
    ? `<div style="margin:20px 0">
        <a href="tel:${safeCallerNumber}"
           style="display:inline-block;padding:10px 20px;background:#FF6B2B;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;font-family:sans-serif;margin-right:12px">
          &#128222; Call Back ${safeCallerNumber}
        </a>
      </div>`
    : '';

  const recordingBlock = data.recordingUrl
    ? `<div style="margin:24px 0">
        <a href="${data.recordingUrl}"
           style="display:inline-block;padding:10px 20px;background:#FF6B2B;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;font-family:sans-serif">
          &#9654; Listen to Recording
        </a>
      </div>`
    : '';

  const transcriptBlock = data.transcript
    ? `<div style="margin-top:24px">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">Transcript</p>
        <pre style="margin:0;padding:16px;background:#F9FAFB;border-radius:8px;font-size:12px;line-height:1.7;white-space:pre-wrap;word-wrap:break-word;color:#374151;font-family:monospace;max-height:320px;overflow:auto">${data.transcript.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr>
      <td style="background:#020D18;padding:20px 24px">
        <p style="margin:0;font-size:18px;font-weight:700;color:#F0F4F8;font-family:sans-serif;letter-spacing:-0.02em">
          Trade Receptionist
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(240,244,248,0.5);font-family:sans-serif">
          ${data.businessName}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 24px 0">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              ${badge(outcomeLabel, outcomeColour)}
              ${badge(urgencyLabel.toUpperCase(), urgencyColour)}
            </td>
            ${data.durationSecs ? `<td style="text-align:right;font-size:12px;color:#6B7280;font-family:sans-serif">${formatDuration(data.durationSecs)}</td>` : ''}
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:20px 24px 0">
        <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">Call Summary</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#111827;font-family:sans-serif">${data.summary || 'No summary available.'}</p>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 24px 0">
        <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">Lead Details</p>
          <table cellpadding="0" cellspacing="0" width="100%">
            ${row('Caller',   data.callerName)}
            ${row('Number',   safeCallerNumber)}
            ${row('Job',      data.jobType)}
            ${row('Postcode', data.postcode)}
            ${row('Urgency',  urgencyLabel.charAt(0).toUpperCase() + urgencyLabel.slice(1))}
          </table>
        </div>
      </td>
    </tr>

    ${callBackBlock ? `<tr><td style="padding:0 24px">${callBackBlock}</td></tr>` : ''}
    ${recordingBlock ? `<tr><td style="padding:0 24px">${recordingBlock}</td></tr>` : ''}

    ${transcriptBlock ? `<tr><td style="padding:0 24px 0">${transcriptBlock}</td></tr>` : ''}

    <tr>
      <td style="padding:24px;text-align:center">
        <p style="margin:0;font-size:12px;color:#9CA3AF;font-family:sans-serif">
          Trade Receptionist &mdash; <a href="https://tradereceptionist.com" style="color:#FF6B2B;text-decoration:none">tradereceptionist.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Convenience wrapper used by postCallWorkflow. */
export async function sendPostCallEmail(
  to:   string,
  data: CallEmailData
): Promise<void> {
  const outcomeLabel = OUTCOME_LABELS[data.outcome] ?? data.outcome;
  const subject      = `${outcomeLabel} — call from ${data.callerNumber}`;
  await sendEmail({ to, subject, html: callSummaryHtml(data) });
}

function bookingConfirmationHtml(data: BookingConfirmationEmailData): string {
  const bookingTime = new Date(data.scheduledAt).toLocaleString('en-GB', {
    timeZone: data.timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr>
      <td style="background:#020D18;padding:20px 24px">
        <p style="margin:0;font-size:18px;font-weight:700;color:#F0F4F8;font-family:sans-serif;letter-spacing:-0.02em">
          ${data.businessName}
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(240,244,248,0.5);font-family:sans-serif">
          Booking confirmation
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px">
        <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#111827;font-family:sans-serif">
            ${data.customerName ? `Hi ${data.customerName},` : 'Hello,'}
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#111827;font-family:sans-serif">
            Your booking with <strong>${data.businessName}</strong> has been confirmed for <strong>${bookingTime}</strong>.
          </p>
          ${data.jobType ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#111827;font-family:sans-serif"><strong>Job:</strong> ${data.jobType}</p>` : ''}
          ${data.address ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#111827;font-family:sans-serif"><strong>Address:</strong> ${data.address}</p>` : ''}
          <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#374151;font-family:sans-serif">
            If anything changes, ${data.ownerName} will contact you directly.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendBookingConfirmationEmail(
  to: string,
  data: BookingConfirmationEmailData
): Promise<void> {
  await sendEmail({
    to,
    subject: `${data.businessName} booking confirmed`,
    html: bookingConfirmationHtml(data),
  });
}

// ── Trial reminder email (day 8–10) ──────────────────────────────────────────

export interface TrialReminderEmailData {
  ownerName:    string;
  businessName: string;
  daysLeft:     number;
  dashboardUrl: string;
}

function trialReminderHtml(data: TrialReminderEmailData): string {
  const safeOwnerName    = escapeHtml(data.ownerName);
  const safeBusinessName = escapeHtml(data.businessName);
  const safeDashboardUrl = escapeHtml(data.dashboardUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr>
      <td style="background:#020D18;padding:20px 24px">
        <p style="margin:0;font-size:18px;font-weight:700;color:#F0F4F8;font-family:sans-serif;letter-spacing:-0.02em">
          Trade Receptionist
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(240,244,248,0.5);font-family:sans-serif">
          ${safeBusinessName}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 24px 0">
        <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;font-family:sans-serif">
          Hi ${safeOwnerName},
        </p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;font-family:sans-serif">
          Your 14-day free trial ends in <strong>${data.daysLeft} day${data.daysLeft !== 1 ? 's' : ''}</strong>.
          Trade Receptionist has been answering your calls — don't let a missed payment cut that off.
        </p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;font-family:sans-serif">
          Add your card now and you won't lose a single call. No charge until your trial ends.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:8px 24px 0">
        <a href="${safeDashboardUrl}/settings?tab=billing"
           style="display:inline-block;padding:14px 28px;background:#FF6B2B;color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;font-family:sans-serif">
          Add card and continue →
        </a>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 24px 0">
        <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">What you keep</p>
          <ul style="margin:0;padding-left:0;list-style:none">
            ${['Every call answered, 24/7 — not missed', 'Job details texted straight to your phone', 'Spam and time-wasters filtered automatically', 'No new number needed — works with your existing line'].map(item =>
              `<li style="padding:6px 0;font-size:14px;color:#374151;font-family:sans-serif">✓ &nbsp;${item}</li>`
            ).join('')}
          </ul>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:24px;text-align:center">
        <p style="margin:0;font-size:12px;color:#9CA3AF;font-family:sans-serif">
          Trade Receptionist &mdash;
          <a href="${safeDashboardUrl}" style="color:#FF6B2B;text-decoration:none">tradereceptionist.com</a>
          &nbsp;&middot;&nbsp;
          <a href="${safeDashboardUrl}/settings?tab=billing" style="color:#9CA3AF;text-decoration:none">Manage subscription</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendTrialReminderEmail(
  to:   string,
  data: TrialReminderEmailData
): Promise<void> {
  await sendEmail({
    to,
    subject: `Your free trial ends in ${data.daysLeft} day${data.daysLeft !== 1 ? 's' : ''} — add your card to keep going`,
    html: trialReminderHtml(data),
  });
}

// ── "Your number is ready" ────────────────────────────────────────────────────

/**
 * Sent when a number is assigned to a tenant who signed up without one.
 *
 * This email is the one that did not exist. When a Twilio purchase failed at
 * signup, provisioning carried on and the welcome email told the customer their
 * number was "being provisioned" with a follow-up coming "within a few
 * minutes". Nothing in the codebase sent it. Three customers waited, got
 * nothing, and cancelled — one of them naming it exactly: "is not working cause
 * not had my divert number".
 */
export function numberReadyHtml(opts: {
  firstName:   string;
  phoneNumber: string;
}): string {
  const SG = "'Space Grotesk','Helvetica Neue',Arial,sans-serif";
  const MN = "'Manrope','Helvetica Neue',Arial,sans-serif";
  const e164 = opts.phoneNumber.replace(/[^\d+]/g, '');
  const display = /^\+?44(7\d{3})(\d{6})$/.test(e164)
    ? e164.replace(/^\+?44(7\d{3})(\d{6})$/, '+44 $1 $2')
    : opts.phoneNumber;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#020D18;">
<span style="display:none;font-size:1px;color:#020D18;opacity:0;">Your number is live — here's how to send your calls to it.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020D18;background-image:radial-gradient(ellipse at 20% 0%,rgba(255,107,43,0.10),transparent 55%);padding:40px 16px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
    <tr><td align="center" style="padding:8px 0 28px;">
      <img src="https://tradereceptionist.com/assets/logo.png" width="190" alt="Trade Receptionist" style="display:block;width:190px;height:auto;border:0;">
    </td></tr>
    <tr><td style="background:#0A1A2E;background-image:linear-gradient(180deg,#0C1F38,#081626);border-radius:24px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:40px 44px 8px;">
          <p style="margin:0 0 18px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ffb59a;font-family:${MN};">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#FF6B2B;vertical-align:middle;margin-right:8px;"></span>Your number is ready
          </p>
          <h1 style="margin:0 0 14px;font-size:34px;line-height:1.08;font-weight:700;letter-spacing:-0.03em;color:#F0F4F8;font-family:${SG};">Here's your number, ${opts.firstName}.</h1>
          <p style="margin:0;font-size:16px;line-height:1.65;color:rgba(240,244,248,0.62);max-width:430px;font-family:${MN};">Sorry it took longer than it should have. Your receptionist is live on the number below — send your calls to it and it'll start answering.</p>
        </td></tr>
      </table>
      <tr><td style="padding:28px 44px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#161313;background-image:linear-gradient(180deg,rgba(255,107,43,0.10),rgba(255,107,43,0.04));border:1px solid rgba(255,107,43,0.28);border-radius:18px;">
          <tr><td style="padding:22px 26px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#FF8C55;font-family:${MN};">Your number</p>
            <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:-0.01em;color:#FFFFFF;font-family:${SG};">${display}</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:18px 44px 4px;">${forwardingInstructionsHtml(opts.phoneNumber)}</td></tr>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:26px 44px 36px;font-size:13px;line-height:1.6;color:rgba(240,244,248,0.55);font-family:${MN};">
          Once that's done, ring your number from another phone and you'll hear it answer. Anything not right, just reply to this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

/** Send the "your number is ready" follow-up. Never throws. */
export async function sendNumberReadyEmail(opts: {
  to:          string;
  firstName:   string;
  phoneNumber: string;
}): Promise<boolean> {
  try {
    await sendEmail({
      to:      opts.to,
      subject: `Your Trade Receptionist number is ready — ${opts.phoneNumber}`,
      html:    numberReadyHtml({ firstName: opts.firstName, phoneNumber: opts.phoneNumber }),
    });
    logEvent('info', 'number_ready_email.sent', { to: opts.to });
    return true;
  } catch (err: unknown) {
    logEvent('error', 'number_ready_email.failed', {
      to: opts.to, error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
