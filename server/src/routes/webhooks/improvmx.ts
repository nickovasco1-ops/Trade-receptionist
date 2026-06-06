/**
 * ImprovMX inbound email webhook
 * Fires when someone emails hello@tradereceptionist.com
 *
 * 1. Detects the category from subject + body
 * 2. Sends a branded, category-specific auto-reply via Resend
 * 3. Logs the event so support team can follow up
 *
 * ImprovMX webhook payload:
 *   { from, to, subject, text, html, headers }
 */

import { Router, Request, Response } from 'express';
import { sendEmail } from '../../services/resend';
import { logEvent, requestId } from '../../lib/observability';

const router = Router();

// ── Category detection ────────────────────────────────────────────────────────

type SupportCategory =
  | 'divert'
  | 'calendar'
  | 'billing'
  | 'missing_summary'
  | 'setup'
  | 'general';

function detectCategory(subject: string, text: string): SupportCategory {
  const h = `${subject} ${text}`.toLowerCase();

  if (/divert|forward|004|call forward|diverts|activate|activation code|phone.*set/.test(h)) return 'divert';
  if (/calendar|booking|diary|slot|schedul|google cal|appointment/.test(h))                   return 'calendar';
  if (/bill|payment|cancel|invoice|plan|subscri|charge|refund|price|cost/.test(h))            return 'billing';
  if (/summary|sms|whatsapp|notification|email.*miss|not.*receiv|no.*email|missing.*call/.test(h)) return 'missing_summary';
  if (/setup|set up|start|get.*started|onboard|install|new account|sign.*up/.test(h))         return 'setup';
  return 'general';
}

// Skip automated senders — no point auto-replying to robots
const AUTOMATED_SENDER_PATTERN =
  /noreply|no-reply|mailer-daemon|postmaster|bounce|auto.*reply|donotreply/i;

// ── Email templates ───────────────────────────────────────────────────────────

const BRAND_HEADER = `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:sans-serif">
  <tr>
    <td style="background:#020D18;padding:20px 28px">
      <p style="margin:0;font-size:18px;font-weight:700;color:#F0F4F8;letter-spacing:-0.02em">Trade Receptionist</p>
      <p style="margin:4px 0 0;font-size:12px;color:rgba(240,244,248,0.45)">Support team</p>
    </td>
  </tr>`;

const BRAND_FOOTER = `
  <tr>
    <td style="padding:24px 28px;border-top:1px solid #F3F4F6">
      <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6">
        Trade Receptionist — <a href="https://tradereceptionist.com" style="color:#FF6B2B;text-decoration:none">tradereceptionist.com</a><br>
        Our team will follow up personally within 1 business day (usually faster).<br>
        <span style="color:#D1D5DB">You can reply directly to this email.</span>
      </p>
    </td>
  </tr>
</table>`;

function bodyWrap(content: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 0;background:#F3F4F6">
${BRAND_HEADER}
${content}
${BRAND_FOOTER}
</body></html>`;
}

function cardRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#6B7280;font-size:13px;width:130px;vertical-align:top">
      ${label}
    </td>
    <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500">
      ${value}
    </td>
  </tr>`;
}

// ── Template: Call divert setup ───────────────────────────────────────────────
function divertTemplate(toName: string): string {
  return bodyWrap(`
  <tr><td style="padding:28px 28px 0">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#FF8C55;letter-spacing:0.12em;text-transform:uppercase">
      Call Forwarding
    </p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em">
      Getting your calls diverted 📞
    </h1>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151">
      Hi ${toName}, thanks for getting in touch. Here's exactly how to set up call diverting so your receptionist starts answering straight away.
    </p>
  </td></tr>

  <tr><td style="padding:20px 28px 0">
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase">
        How to divert your number
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${cardRow('Step 1', 'Open your Phone app and go to the keypad')}
        ${cardRow('Step 2', 'Dial <strong>**004*[YOUR TRADE RECEPTIONIST NUMBER]#</strong> and press call')}
        ${cardRow('Step 3', 'You\'ll hear a confirmation tone — divert is active')}
        ${cardRow('Turn off', 'Dial <strong>##004#</strong> to deactivate anytime')}
      </table>
    </div>
  </td></tr>

  <tr><td style="padding:16px 28px 0">
    <div style="background:#FFF7ED;border-radius:12px;padding:16px 20px;border-left:3px solid #FF6B2B">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#92400E">
        <strong>Your receptionist number</strong> is shown in your
        <a href="https://tradereceptionist.com/dashboard/settings" style="color:#FF6B2B">Settings page</a>
        under "Phone & SMS routing". If you haven't set this up yet, reply here and we'll walk you through it.
      </p>
    </div>
  </td></tr>

  <tr><td style="padding:16px 28px 0">
    <p style="margin:0;font-size:14px;line-height:1.65;color:#374151">
      Most networks activate within 30 seconds. If you're on a business contract or have a special number type,
      reply to this email and we'll sort it for you directly.
    </p>
  </td></tr>`);
}

// ── Template: Calendar / booking issues ──────────────────────────────────────
function calendarTemplate(toName: string): string {
  return bodyWrap(`
  <tr><td style="padding:28px 28px 0">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#FF8C55;letter-spacing:0.12em;text-transform:uppercase">
      Calendar & Bookings
    </p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em">
      Sorting your diary connection 📅
    </h1>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151">
      Hi ${toName}, thanks for reaching out. Here's how to get your Google Calendar connected and jobs booking automatically.
    </p>
  </td></tr>

  <tr><td style="padding:20px 28px 0">
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase">
        Connect Google Calendar
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${cardRow('Step 1', 'Go to <a href="https://tradereceptionist.com/dashboard/settings" style="color:#FF6B2B">Settings → Diary connection</a>')}
        ${cardRow('Step 2', 'Click "Connect Google Calendar" and sign in with the Google account that holds your work diary')}
        ${cardRow('Step 3', 'Allow the permissions — your receptionist can now check your availability and book jobs in')}
      </table>
    </div>
  </td></tr>

  <tr><td style="padding:16px 28px 0">
    <div style="background:#EFF6FF;border-radius:12px;padding:16px 20px;border-left:3px solid #3B82F6">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#1E40AF">
        <strong>Already connected but bookings aren't appearing?</strong> Check that your business hours are set correctly in Settings.
        If it still isn't working after that, reply to this email and we'll check the connection on our end.
      </p>
    </div>
  </td></tr>`);
}

// ── Template: Billing / payment ───────────────────────────────────────────────
function billingTemplate(toName: string): string {
  return bodyWrap(`
  <tr><td style="padding:28px 28px 0">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#FF8C55;letter-spacing:0.12em;text-transform:uppercase">
      Billing & Payments
    </p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em">
      We've got your billing question 💳
    </h1>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151">
      Hi ${toName}, thanks for getting in touch about your account. A member of the team will review your query and reply personally within 1 business day.
    </p>
  </td></tr>

  <tr><td style="padding:20px 28px 0">
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase">
        While you wait — common billing answers
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${cardRow('Cancel anytime?', 'Yes — no contracts, no exit fees. You can cancel from your Settings page.')}
        ${cardRow('Refunds?', 'We offer pro-rata refunds if you cancel mid-cycle. Reply here to request one.')}
        ${cardRow('Change plan?', 'Upgrade or downgrade anytime from Settings → Billing.')}
        ${cardRow('Invoice needed?', 'VAT invoices are emailed automatically each billing cycle and available in your dashboard.')}
      </table>
    </div>
  </td></tr>

  <tr><td style="padding:16px 28px 0">
    <p style="margin:0;font-size:14px;line-height:1.65;color:#374151">
      If you have a specific billing dispute or payment issue, our team will review your account and respond directly.
      Please include your registered email address so we can locate your account quickly.
    </p>
  </td></tr>`);
}

// ── Template: Missing call summaries / notifications ─────────────────────────
function missingSummaryTemplate(toName: string): string {
  return bodyWrap(`
  <tr><td style="padding:28px 28px 0">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#FF8C55;letter-spacing:0.12em;text-transform:uppercase">
      Notifications & Summaries
    </p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em">
      Not receiving your call summaries? 📬
    </h1>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151">
      Hi ${toName}, sorry to hear your summaries aren't coming through — let's fix that now.
      Work through the checklist below and reply with what you find.
    </p>
  </td></tr>

  <tr><td style="padding:20px 28px 0">
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase">
        Troubleshooting checklist
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${cardRow('1. Spam folder', 'Check your spam/junk folder. Emails come from hello@tradereceptionist.com — mark it "Not spam" to fix future delivery.')}
        ${cardRow('2. Correct email', 'In Settings, confirm the notification email address matches what you\'re checking.')}
        ${cardRow('3. Call received?', 'Check your <a href="https://tradereceptionist.com/dashboard/calls" style="color:#FF6B2B">Calls dashboard</a> — if the call is logged there but no email arrived, that\'s a delivery issue we can trace.')}
        ${cardRow('4. Divert active?', 'If calls are going to your voicemail instead of the receptionist, the divert code may have been reset. See divert setup instructions.')}
      </table>
    </div>
  </td></tr>

  <tr><td style="padding:16px 28px 0">
    <div style="background:#F0FDF4;border-radius:12px;padding:16px 20px;border-left:3px solid #16A34A">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#166534">
        Reply to this email with your registered email address and the date/time of a call you didn't get a summary for.
        We'll trace it in our logs and fix it same day.
      </p>
    </div>
  </td></tr>`);
}

// ── Template: General setup / getting started ─────────────────────────────────
function setupTemplate(toName: string): string {
  return bodyWrap(`
  <tr><td style="padding:28px 28px 0">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#FF8C55;letter-spacing:0.12em;text-transform:uppercase">
      Getting Started
    </p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em">
      Let's get your receptionist live 🚀
    </h1>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151">
      Hi ${toName}, great to hear from you — you're a few minutes away from never missing a job call again.
      Here's the fast-track setup path.
    </p>
  </td></tr>

  <tr><td style="padding:20px 28px 0">
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase">
        Setup in 3 steps (~14 minutes)
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${cardRow('Step 1 — Account', 'Sign up at <a href="https://tradereceptionist.com" style="color:#FF6B2B">tradereceptionist.com</a> and complete the onboarding. Takes about 5 minutes. Tell us your trade, business name, and working hours.')}
        ${cardRow('Step 2 — Divert', 'Dial **004*[your receptionist number]# from your mobile to forward unanswered calls. Your receptionist number is shown in Settings after you sign up.')}
        ${cardRow('Step 3 — Test', 'Call yourself from another phone. Your receptionist will answer, take a message, and WhatsApp you a summary. That\'s it — you\'re live.')}
      </table>
    </div>
  </td></tr>

  <tr><td style="padding:16px 28px 0">
    <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#374151">
      <strong>Already signed up?</strong> Check your Settings page to confirm your business details are saved and your divert code is shown.
    </p>
    <a href="https://tradereceptionist.com"
       style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#FF6B2B,#FF8C55);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">
      Get started now →
    </a>
  </td></tr>`);
}

// ── Template: General support ─────────────────────────────────────────────────
function generalTemplate(toName: string): string {
  return bodyWrap(`
  <tr><td style="padding:28px 28px 0">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#FF8C55;letter-spacing:0.12em;text-transform:uppercase">
      Support
    </p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em">
      We've got your message 👍
    </h1>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151">
      Hi ${toName}, thanks for getting in touch with Trade Receptionist.
      We've received your message and the team will reply within 1 business day — usually much sooner.
    </p>
  </td></tr>

  <tr><td style="padding:20px 28px 0">
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase">
        Quick answers while you wait
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${cardRow('Call divert', 'Dial **004*[your number]# to activate. Turn off with ##004#.')}
        ${cardRow('Dashboard', '<a href="https://tradereceptionist.com/dashboard" style="color:#FF6B2B">tradereceptionist.com/dashboard</a> — view calls, leads, and settings.')}
        ${cardRow('Settings', 'Update your business name, hours, or calendar at <a href="https://tradereceptionist.com/dashboard/settings" style="color:#FF6B2B">Settings</a>.')}
      </table>
    </div>
  </td></tr>`);
}

// ── Route templates by category ───────────────────────────────────────────────

const SUBJECTS: Record<SupportCategory, string> = {
  divert:          'How to set up your call divert — Trade Receptionist',
  calendar:        'Connecting your diary to Trade Receptionist',
  billing:         'Your billing question — Trade Receptionist',
  missing_summary: 'Not receiving call summaries — let\'s fix that',
  setup:           'Getting your receptionist live — 3 steps',
  general:         'We\'ve received your message — Trade Receptionist',
};

function buildReply(category: SupportCategory, toName: string): string {
  switch (category) {
    case 'divert':          return divertTemplate(toName);
    case 'calendar':        return calendarTemplate(toName);
    case 'billing':         return billingTemplate(toName);
    case 'missing_summary': return missingSummaryTemplate(toName);
    case 'setup':           return setupTemplate(toName);
    default:                return generalTemplate(toName);
  }
}

// ── Webhook handler ───────────────────────────────────────────────────────────

interface ImprovMxPayload {
  from?:    string;
  to?:      string;
  subject?: string;
  text?:    string;
  html?:    string;
}

function extractName(from: string): string {
  // "John Smith <john@example.com>" → "John"
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) {
    const parts = match[1].trim().split(/\s+/);
    return parts[0] ?? 'there';
  }
  return 'there';
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  return from.toLowerCase().trim();
}

router.post('/', async (req: Request, res: Response) => {
  // ImprovMX expects a fast 2xx response to acknowledge receipt
  res.sendStatus(200);

  const payload = req.body as ImprovMxPayload;
  const from    = payload.from ?? '';
  const subject = payload.subject ?? '';
  const text    = payload.text ?? '';

  logEvent('info', 'improvmx.inbound', {
    requestId: requestId(req),
    from,
    subject,
  });

  // Skip automated senders
  if (!from || AUTOMATED_SENDER_PATTERN.test(from)) {
    logEvent('info', 'improvmx.skipped_automated_sender', { requestId: requestId(req), from });
    return;
  }

  const senderEmail = extractEmail(from);
  const senderName  = extractName(from);

  // Don't auto-reply to our own domain (internal forwarding loops)
  if (senderEmail.endsWith('@tradereceptionist.com')) return;

  const category = detectCategory(subject, text);

  logEvent('info', 'improvmx.category_detected', {
    requestId: requestId(req),
    from:      senderEmail,
    category,
    subject,
  });

  try {
    await sendEmail({
      to:      senderEmail,
      subject: SUBJECTS[category],
      html:    buildReply(category, senderName),
      replyTo: 'hello@tradereceptionist.com',
    });

    logEvent('info', 'improvmx.auto_reply_sent', {
      requestId: requestId(req),
      to:        senderEmail,
      category,
    });
  } catch (err: unknown) {
    logEvent('error', 'improvmx.auto_reply_failed', {
      requestId: requestId(req),
      to:        senderEmail,
      error:     err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
