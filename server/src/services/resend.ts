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

export function callSummaryHtml(data: CallEmailData): string {
  const outcomeLabel  = OUTCOME_LABELS[data.outcome]  ?? data.outcome;
  const outcomeColour = OUTCOME_COLOURS[data.outcome] ?? '#6B7280';
  const urgencyLabel  = data.urgency ?? 'routine';
  const urgencyColour = URGENCY_COLOURS[urgencyLabel] ?? '#6B7280';

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
            ${row('Number',   data.callerNumber)}
            ${row('Job',      data.jobType)}
            ${row('Postcode', data.postcode)}
            ${row('Urgency',  urgencyLabel.charAt(0).toUpperCase() + urgencyLabel.slice(1))}
          </table>
        </div>
      </td>
    </tr>

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
