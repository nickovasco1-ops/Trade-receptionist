import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../../services/supabase';
import { sendEmail } from '../../services/resend';
import { buildSystemPrompt } from '../../lib/prompt-builder';
import { createRetellAgent, importTwilioNumber } from '../../services/retell';
import { searchUkNumbers, buyUkNumber } from '../../services/twilio';
import type { Client, BusinessConfig, Plan } from '../../../../shared/types';

const router = Router();

// ── Signature verification ────────────────────────────────────────────────────

function verifyStripeSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const parts: Record<string, string> = {};
  for (const part of signature.split(',')) {
    const idx = part.indexOf('=');
    if (idx > 0) parts[part.slice(0, idx)] = part.slice(idx + 1);
  }

  const { t: timestamp, v1 } = parts;
  if (!timestamp || !v1) return false;

  const payload  = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Welcome email ─────────────────────────────────────────────────────────────

function welcomeHtml(opts: {
  firstName:   string;
  plan:        string;
  phoneNumber: string | null;
  loginUrl:    string;
}): string {
  const numberBlock = opts.phoneNumber
    ? `<div style="background:#FFF7F0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#FF6B2B;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">Your new number</p>
        <p style="margin:0;font-size:26px;font-weight:700;color:#111827;font-family:sans-serif;letter-spacing:-0.02em">${opts.phoneNumber}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#6B7280;font-family:sans-serif">Forward your mobile's unanswered calls to this number and Sarah will handle the rest.</p>
      </div>`
    : `<div style="background:#F9FAFB;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;color:#6B7280;font-family:sans-serif">Your dedicated number is being provisioned — you'll receive a follow-up email within a few minutes.</p>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto">
  <tr>
    <td style="background:#020D18;padding:24px 28px;border-radius:12px 12px 0 0">
      <p style="margin:0;font-size:20px;font-weight:700;color:#F0F4F8;font-family:sans-serif;letter-spacing:-0.02em">Trade Receptionist</p>
      <p style="margin:4px 0 0;font-size:12px;color:rgba(240,244,248,0.45);font-family:sans-serif">Your AI receptionist is live</p>
    </td>
  </tr>
  <tr>
    <td style="background:#fff;padding:32px 28px">
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#111827;font-family:sans-serif;letter-spacing:-0.02em">Welcome, ${opts.firstName}!</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.6;font-family:sans-serif">
        Your 14-day free trial has started. Sarah is ready to answer calls 24/7 — no more missed jobs.
      </p>

      ${numberBlock}

      <div style="margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">Get started in 3 steps</p>
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;font-family:sans-serif">
              <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#FF6B2B;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;vertical-align:middle">1</span>
              <span style="font-size:14px;color:#374151;vertical-align:middle">Complete your business profile in the dashboard</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;font-family:sans-serif">
              <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#FF6B2B;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;vertical-align:middle">2</span>
              <span style="font-size:14px;color:#374151;vertical-align:middle">Divert unanswered calls from your mobile to your new number</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-family:sans-serif">
              <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#FF6B2B;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;vertical-align:middle">3</span>
              <span style="font-size:14px;color:#374151;vertical-align:middle">Call your new number and hear Sarah in action</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:28px">
        <a href="${opts.loginUrl}"
           style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#FF6B2B,#FF8C55);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;font-family:sans-serif;letter-spacing:-0.01em">
          Set Up My Profile →
        </a>
        <p style="margin:10px 0 0;font-size:12px;color:#9CA3AF;font-family:sans-serif">One-click login — no password needed</p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="background:#F9FAFB;padding:16px 28px;border-radius:0 0 12px 12px;text-align:center">
      <p style="margin:0;font-size:12px;color:#9CA3AF;font-family:sans-serif">
        Plan: <strong style="color:#6B7280">${opts.plan}</strong> &nbsp;·&nbsp;
        Questions? Reply to this email &nbsp;·&nbsp;
        <a href="https://tradereceptionist.com" style="color:#FF6B2B;text-decoration:none">tradereceptionist.com</a>
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ── Core provisioning ─────────────────────────────────────────────────────────

async function provisionClient(session: Record<string, unknown>): Promise<void> {
  const details  = session['customer_details'] as Record<string, string | null> | null;
  const metadata = session['metadata']         as Record<string, string>        | null;

  const ownerEmail  = details?.['email'];
  const ownerName   = details?.['name'] ?? 'New Customer';
  const ownerMobile = details?.['phone'] ?? null;
  const plan        = ((metadata?.['plan'] ?? 'starter') as Plan);
  const firstName   = ownerName.split(' ')[0] ?? ownerName;

  if (!ownerEmail) {
    console.error('[stripe] checkout.session.completed missing customer email — cannot provision');
    return;
  }

  // Idempotency — skip if already provisioned
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('owner_email', ownerEmail)
    .maybeSingle();

  if (existing) {
    console.log(`[stripe] ${ownerEmail} already provisioned — skipping`);
    return;
  }

  // ── 1. Client row ────────────────────────────────────────────────────────────

  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .insert({ business_name: ownerName, owner_name: ownerName, owner_email: ownerEmail, owner_mobile: ownerMobile, plan })
    .select()
    .single();

  if (clientErr || !clientRow) {
    console.error('[stripe] client insert failed', clientErr);
    return;
  }

  const client = clientRow as Client;

  // ── 2. Business config (sensible defaults) ────────────────────────────────────

  const { data: configRow, error: configErr } = await supabase
    .from('business_config')
    .insert({
      client_id:            client.id,
      receptionist_name:    'Sarah',
      services:             [],
      service_areas:        [],
      emergency_keywords:   ['gas leak', 'flood', 'no power', 'no heating', 'burst pipe'],
      business_hours_start: '08:00',
      business_hours_end:   '18:00',
      working_days:         [1, 2, 3, 4, 5],
      timezone:             'Europe/London',
    })
    .select()
    .single();

  if (configErr || !configRow) {
    console.error('[stripe] business_config insert failed', configErr);
    // Non-fatal — continue
  }

  // ── 3. Retell agent ───────────────────────────────────────────────────────────

  let agentId: string | null = null;

  try {
    const prompt = buildSystemPrompt(client, configRow as BusinessConfig);
    const ids    = await createRetellAgent({
      agentName:    `Sarah — ${ownerName}`,
      prompt,
      ownerNumber:  ownerMobile,
      beginMessage: undefined,
    });
    agentId = ids.agentId;

    await supabase
      .from('clients')
      .update({ retell_agent_id: agentId, updated_at: new Date().toISOString() })
      .eq('id', client.id);
  } catch (err: unknown) {
    console.error('[stripe] Retell agent creation failed', err);
  }

  // ── 4. Twilio number ──────────────────────────────────────────────────────────

  let phoneNumber: string | null = null;

  if (agentId) {
    try {
      const available = await searchUkNumbers(5);
      if (available.length) {
        const purchased = await buyUkNumber(available[0].phoneNumber);
        phoneNumber     = purchased.phoneNumber;
        await importTwilioNumber(phoneNumber, agentId);
        await supabase
          .from('clients')
          .update({ twilio_number: phoneNumber, updated_at: new Date().toISOString() })
          .eq('id', client.id);
      }
    } catch (err: unknown) {
      console.warn('[stripe] phone number purchase skipped', err instanceof Error ? err.message : err);
    }
  }

  // ── 5. Supabase auth user + magic link ────────────────────────────────────────

  let loginUrl = 'https://tradereceptionist.com/login';

  try {
    await supabase.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type:  'magiclink',
      email: ownerEmail,
    });
    const actionLink = (linkData as { properties?: { action_link?: string } } | null)
      ?.properties?.action_link;
    if (actionLink) loginUrl = actionLink;
  } catch (err: unknown) {
    console.warn('[stripe] Supabase auth setup failed', err instanceof Error ? err.message : err);
  }

  // ── 6. Welcome email ──────────────────────────────────────────────────────────

  try {
    await sendEmail({
      to:      ownerEmail,
      subject: `Your Trade Receptionist is live — ${phoneNumber ?? 'number provisioning'}`,
      html:    welcomeHtml({ firstName, plan: plan.charAt(0).toUpperCase() + plan.slice(1), phoneNumber, loginUrl }),
    });
  } catch (err: unknown) {
    console.error('[stripe] welcome email failed', err instanceof Error ? err.message : err);
  }

  console.log(`[stripe] provisioned ${ownerEmail} | plan=${plan} | number=${phoneNumber ?? 'pending'} | agent=${agentId ?? 'failed'}`);
}

// ── POST handler ──────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const rawBody  = req.body as Buffer;
  const sigHeader = req.headers['stripe-signature'] as string | undefined;
  const secret    = process.env.STRIPE_WEBHOOK_SECRET;

  // Always ack Stripe first — they retry on non-2xx
  res.status(200).json({ received: true });

  if (secret && sigHeader && !verifyStripeSignature(rawBody, sigHeader, secret)) {
    console.warn('[stripe] rejected webhook — invalid signature');
    return;
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
  } catch {
    console.error('[stripe] body parse error');
    return;
  }

  if (event['type'] !== 'checkout.session.completed') return;

  const session = (event['data'] as Record<string, unknown>)['object'] as Record<string, unknown>;

  (async () => {
    try {
      await provisionClient(session);
    } catch (err: unknown) {
      console.error('[stripe] unhandled error in provisionClient', err);
    }
  })();
});

export default router;
