import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../../services/supabase';
import { sendEmail } from '../../services/resend';
import { buildSystemPrompt, buildBeginMessage } from '../../lib/prompt-builder';
import { createRetellAgent, importTwilioNumber } from '../../services/retell';
import { searchUkNumbers, buyUkNumber, attachNumberToTrunk } from '../../services/twilio';
import { logSubscriber } from '../../services/notion';
import { errorMessage, logEvent, requestId } from '../../lib/observability';
import type { Client, BusinessConfig, Plan } from '../../../../shared/types';

const router = Router();

// ── Plan detection ────────────────────────────────────────────────────────────

const PRODUCT_TO_PLAN: Record<string, Plan> = {
  // Live-mode products — get IDs from Stripe dashboard → Products
  'prod_UOE4uHDjaA2p2A': 'starter',  // £49/mo
  'prod_UOE4eMY23okJjd': 'pro',      // £89/mo
  'prod_UehtOIroOuNd9l': 'business', // £159/mo
  'prod_UOE5UUmEp0cXnD': 'agency',   // £249/mo
  // Test-mode products
  'prod_UQeX2QnK9ev3bK': 'starter',
  'prod_UQeX0UFytNZhFH': 'pro',
  'prod_UQeXswCVtfNvZq': 'agency',
};

type StripeObject = Record<string, unknown>;

function asRecord(value: unknown): StripeObject | null {
  return value && typeof value === 'object' ? value as StripeObject : null;
}

function stripeId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  const record = asRecord(value);
  const id = record?.['id'];
  return typeof id === 'string' && id.trim() ? id : null;
}

function unixSecondsToIso(value: unknown): string | null {
  return typeof value === 'number' ? new Date(value * 1000).toISOString() : null;
}

function invoiceSubscriptionId(invoice: StripeObject): string | null {
  const direct = stripeId(invoice['subscription']);
  if (direct) return direct;

  const parent = asRecord(invoice['parent']);
  const subscriptionDetails = asRecord(parent?.['subscription_details']);
  return stripeId(subscriptionDetails?.['subscription']);
}

function invoiceCurrentPeriodEnd(invoice: StripeObject): string | null {
  const lines = asRecord(invoice['lines']);
  const data = Array.isArray(lines?.['data']) ? lines['data'] as unknown[] : [];
  const firstLine = asRecord(data[0]);
  const period = asRecord(firstLine?.['period']);
  return unixSecondsToIso(period?.['end']) ?? unixSecondsToIso(invoice['period_end']);
}

async function findClientForStripe(opts: {
  customerId?: string | null;
  subscriptionId?: string | null;
  email?: string | null;
}): Promise<StripeObject | null> {
  const select = 'id,owner_email,stripe_customer_id,stripe_subscription_id';

  if (opts.subscriptionId) {
    const { data } = await supabase
      .from('clients')
      .select(select)
      .eq('stripe_subscription_id', opts.subscriptionId)
      .maybeSingle();
    if (data) return data as StripeObject;
  }

  if (opts.customerId) {
    const { data } = await supabase
      .from('clients')
      .select(select)
      .eq('stripe_customer_id', opts.customerId)
      .maybeSingle();
    if (data) return data as StripeObject;
  }

  if (opts.email) {
    const { data } = await supabase
      .from('clients')
      .select(select)
      .eq('owner_email', opts.email)
      .maybeSingle();
    if (data) return data as StripeObject;
  }

  return null;
}

async function updateClientStripeState(
  eventType: string,
  identifiers: { customerId?: string | null; subscriptionId?: string | null; email?: string | null },
  values: StripeObject,
): Promise<void> {
  const client = await findClientForStripe(identifiers);
  if (!client?.['id']) {
    logEvent('warn', 'stripe.webhook.client_not_found', {
      eventType,
      hasCustomerId: Boolean(identifiers.customerId),
      hasSubscriptionId: Boolean(identifiers.subscriptionId),
      hasEmail: Boolean(identifiers.email),
    });
    return;
  }

  const patch: StripeObject = {
    ...values,
    updated_at: new Date().toISOString(),
  };

  if (identifiers.customerId) patch.stripe_customer_id = identifiers.customerId;
  if (identifiers.subscriptionId) patch.stripe_subscription_id = identifiers.subscriptionId;

  const { error } = await supabase
    .from('clients')
    .update(patch)
    .eq('id', client['id']);

  if (error) {
    logEvent('error', 'stripe.webhook.db_persistence_failed', {
      eventType,
      clientId: String(client['id']),
      error: error.message,
    });
    return;
  }

  logEvent('info', 'stripe.webhook.lifecycle_updated', {
    eventType,
    clientId: String(client['id']),
  });
}

async function handleInvoicePaymentSucceeded(invoice: StripeObject): Promise<void> {
  await updateClientStripeState(
    'invoice.payment_succeeded',
    {
      customerId: stripeId(invoice['customer']),
      subscriptionId: invoiceSubscriptionId(invoice),
      email: typeof invoice['customer_email'] === 'string' ? invoice['customer_email'] : null,
    },
    {
      subscription_status: 'active',
      payment_status: 'current',
      is_active: true,
      current_period_end: invoiceCurrentPeriodEnd(invoice),
      last_payment_at: unixSecondsToIso(invoice['created']) ?? new Date().toISOString(),
      last_payment_failed_at: null,
    },
  );
}

async function handleInvoicePaymentFailed(invoice: StripeObject): Promise<void> {
  await updateClientStripeState(
    'invoice.payment_failed',
    {
      customerId: stripeId(invoice['customer']),
      subscriptionId: invoiceSubscriptionId(invoice),
      email: typeof invoice['customer_email'] === 'string' ? invoice['customer_email'] : null,
    },
    {
      subscription_status: 'past_due',
      payment_status: 'failed',
      is_active: false,
      current_period_end: invoiceCurrentPeriodEnd(invoice),
      last_payment_failed_at: unixSecondsToIso(invoice['created']) ?? new Date().toISOString(),
    },
  );
}

async function handleSubscriptionDeleted(subscription: StripeObject): Promise<void> {
  await updateClientStripeState(
    'customer.subscription.deleted',
    {
      customerId: stripeId(subscription['customer']),
      subscriptionId: stripeId(subscription['id']),
    },
    {
      subscription_status: 'canceled',
      payment_status: 'canceled',
      is_active: false,
      current_period_end: unixSecondsToIso(subscription['current_period_end']),
    },
  );
}

/**
 * Resolve plan by calling Stripe's line-items API.
 * Used as a fallback when the Payment Link has no metadata.plan set.
 */
async function planFromStripeSession(sessionId: string): Promise<Plan> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return 'starter';

  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?expand[]=data.price.product`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    if (!res.ok) return 'starter';

    const body = (await res.json()) as {
      data: Array<{ price?: { product?: string | { id: string } } }>;
    };
    const raw = body.data[0]?.price?.product;
    const productId = typeof raw === 'string' ? raw : raw?.id;
    return PRODUCT_TO_PLAN[productId ?? ''] ?? 'starter';
  } catch {
    return 'starter';
  }
}

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
  const LOGO_LOCKUP = 'https://tradereceptionist.com/assets/logo.png';
  const LOGO_MARK   = 'https://tradereceptionist.com/assets/logo-mark.png';
  const SG = "'Space Grotesk','Helvetica Neue',Arial,sans-serif";
  const MN = "'Manrope','Helvetica Neue',Arial,sans-serif";

  const e164 = opts.phoneNumber ? opts.phoneNumber.replace(/[^\d+]/g, '') : '';
  const displayNumber = /^\+?44(7\d{3})(\d{6})$/.test(e164)
    ? e164.replace(/^\+?44(7\d{3})(\d{6})$/, '+44 $1 $2')
    : (opts.phoneNumber ?? '');
  const dialNumber = e164;

  const numberBlock = opts.phoneNumber
    ? `<tr><td style="padding:28px 44px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#161313;background-image:linear-gradient(180deg,rgba(255,107,43,0.10),rgba(255,107,43,0.04));border:1px solid rgba(255,107,43,0.28);border-radius:18px;">
          <tr><td style="padding:22px 26px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#FF8C55;font-family:${MN};">Your new number</p>
            <p style="margin:0 0 8px;font-size:32px;font-weight:700;letter-spacing:-0.01em;color:#FFFFFF;font-family:${SG};">${displayNumber}</p>
            <p style="margin:0;font-size:13px;line-height:1.55;color:rgba(240,244,248,0.50);font-family:${MN};">Divert your mobile's unanswered calls to this number and your receptionist takes it from there.</p>
          </td></tr>
        </table>
      </td></tr>`
    : `<tr><td style="padding:28px 44px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A1A2E;border:1px solid rgba(255,255,255,0.10);border-radius:18px;">
          <tr><td style="padding:20px 26px;font-size:14px;line-height:1.55;color:rgba(240,244,248,0.62);font-family:${MN};">Your dedicated number is being provisioned — you'll get a follow-up email within a few minutes with your number and divert code.</td></tr>
        </table>
      </td></tr>`;

  const divertBlock = opts.phoneNumber
    ? `<tr><td style="padding:18px 44px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F2C24;background-image:linear-gradient(180deg,#10322A,#0C2620);border:1px solid rgba(110,231,183,0.22);border-radius:18px;">
          <tr><td style="padding:22px 26px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6ee7b7;font-family:${MN};">Send your calls over — 30 seconds</p>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:rgba(240,244,248,0.66);font-family:${MN};">On the mobile you want covered, open the keypad and dial this exactly, then press call:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020D18;border:1px solid rgba(255,255,255,0.10);border-radius:12px;">
              <tr><td align="center" style="padding:16px 14px;font-family:'SF Mono','Courier New',monospace;font-size:23px;font-weight:700;letter-spacing:0.02em;color:#ffffff;">**004*${dialNumber}#</td></tr>
            </table>
            <p style="margin:14px 0 0;font-size:13px;line-height:1.55;color:rgba(240,244,248,0.55);font-family:${MN};">That's it — every call you don't pick up now rings your receptionist instead. Works on EE, O2, Vodafone &amp; Three. To switch it off any time, dial <span style="color:rgba(240,244,248,0.80);font-weight:600;">##004#</span>.</p>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const step2 = opts.phoneNumber
    ? 'Dial the divert code above to forward your unanswered calls'
    : 'Divert your unanswered calls to your new number once it arrives';

  const stepRow = (n: string, text: string) =>
    `<tr><td style="padding:0 0 14px;" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="top" width="40"><div style="width:30px;height:30px;border-radius:50%;background:#FF6B2B;background-image:linear-gradient(135deg,#FF6B2B,#FF8C55);color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:30px;font-family:${SG};">${n}</div></td>
        <td valign="middle" style="font-size:15px;color:rgba(240,244,248,0.82);line-height:1.4;font-family:${MN};">${text}</td>
      </tr></table>
    </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#020D18;">
<span style="display:none;font-size:1px;color:#020D18;opacity:0;">Your AI receptionist is live — here's your number and how to divert your calls in 30 seconds.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020D18;background-image:radial-gradient(ellipse at 20% 0%,rgba(255,107,43,0.10),transparent 55%),radial-gradient(ellipse at 90% 10%,rgba(153,203,255,0.06),transparent 50%);padding:40px 16px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
    <tr><td align="center" style="padding:8px 0 28px;">
      <img src="${LOGO_LOCKUP}" width="190" alt="Trade Receptionist" style="display:block;width:190px;height:auto;border:0;">
    </td></tr>
    <tr><td style="background:#0A1A2E;background-image:linear-gradient(180deg,#0C1F38,#081626);border-radius:24px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:40px 44px 8px;">
          <p style="margin:0 0 18px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ffb59a;font-family:${MN};">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#FF6B2B;vertical-align:middle;margin-right:8px;"></span>Your AI receptionist is live
          </p>
          <h1 style="margin:0 0 14px;font-size:38px;line-height:1.05;font-weight:700;letter-spacing:-0.03em;color:#F0F4F8;font-family:${SG};">Welcome, ${opts.firstName}.</h1>
          <p style="margin:0;font-size:16px;line-height:1.65;color:rgba(240,244,248,0.62);max-width:430px;font-family:${MN};">Your 14-day free trial has started. Trade Receptionist now answers every call, 24/7 — so you never lose another job while you're on the tools.</p>
        </td></tr>
      </table>
      ${numberBlock}
      ${divertBlock}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:26px 44px 6px;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(240,244,248,0.40);font-family:${MN};">Get set up in three steps</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${stepRow('1', 'Complete your business profile in the dashboard')}
            ${stepRow('2', step2)}
            ${stepRow('3', 'Ring your new number and hear Trade Receptionist in action')}
          </table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:30px 44px 10px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="border-radius:14px;background:#FF6B2B;background-image:linear-gradient(135deg,#FF6B2B,#FF8C55);box-shadow:0 10px 28px rgba(255,107,43,0.32);">
              <a href="${opts.loginUrl}" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;font-family:${MN};">Set up my profile&nbsp;&nbsp;→</a>
            </td>
          </tr></table>
          <p style="margin:14px 0 0;font-size:12px;color:rgba(240,244,248,0.40);font-family:${MN};">One-click login — no password needed</p>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:24px 44px 36px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:14px;">
            <tr><td align="center" style="padding:14px 18px;font-size:12.5px;color:rgba(240,244,248,0.55);line-height:1.5;font-family:${MN};">14-day free trial &nbsp;·&nbsp; No card on file &nbsp;·&nbsp; Cancel anytime</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:26px 24px 8px;">
      <img src="${LOGO_MARK}" width="26" alt="" style="display:block;width:26px;height:auto;border:0;opacity:0.7;margin:0 auto 12px;">
      <p style="margin:0 0 6px;font-size:12px;color:rgba(240,244,248,0.40);font-family:${MN};">Plan: <span style="color:rgba(240,244,248,0.70);font-weight:600;">${opts.plan}</span> &nbsp;·&nbsp; Questions? Just reply to this email</p>
      <p style="margin:0;font-size:12px;color:rgba(240,244,248,0.30);font-family:${MN};"><a href="https://tradereceptionist.com" style="color:#99cbff;text-decoration:none;">tradereceptionist.com</a> &nbsp;·&nbsp; AI receptionist for UK tradespeople</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Core provisioning ─────────────────────────────────────────────────────────

async function provisionClient(session: Record<string, unknown>): Promise<void> {
  const details  = session['customer_details'] as Record<string, string | null> | null;
  const metadata = session['metadata']         as Record<string, string>        | null;
  const customerId = stripeId(session['customer']);
  const subscriptionId = stripeId(session['subscription']);

  // Normalise email to lowercase: Supabase/GoTrue stores the auth email lowercased,
  // and the clients RLS policy matches owner_email against the JWT email verbatim.
  // Storing the raw (possibly capitalised) checkout email would lock the owner out of
  // their own row. Lowercasing here also keeps the idempotency lookup below consistent.
  const ownerEmailRaw = details?.['email'];
  const ownerEmail  = typeof ownerEmailRaw === 'string' ? ownerEmailRaw.trim().toLowerCase() : ownerEmailRaw;
  const ownerName   = details?.['name'] ?? 'New Customer';
  const ownerMobile = details?.['phone'] ?? null;
  const firstName   = ownerName.split(' ')[0] ?? ownerName;

  // Prefer metadata.plan (set on Stripe Payment Link); fall back to product-ID lookup
  const metaPlan = metadata?.['plan'] as string | undefined;
  const plan: Plan = (metaPlan && metaPlan in Object.fromEntries(
    Object.values(PRODUCT_TO_PLAN).map((p) => [p, true])
  ))
    ? (metaPlan as Plan)
    : await planFromStripeSession(session['id'] as string);

  if (!ownerEmail) {
    logEvent('error', 'stripe.webhook.malformed_payload', {
      eventType: 'checkout.session.completed',
      error: 'missing customer email',
    });
    return;
  }

  // Idempotency — skip if already provisioned
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('owner_email', ownerEmail)
    .maybeSingle();

  if (existing) {
    await updateClientStripeState(
      'checkout.session.completed',
      { customerId, subscriptionId, email: ownerEmail },
      {
        subscription_status: 'trialing',
        payment_status: 'current',
        is_active: true,
      },
    );
    logEvent('info', 'stripe.webhook.duplicate_event_idempotent', {
      eventType: 'checkout.session.completed',
      clientId: String(existing.id),
    });
    return;
  }

  // ── 1. Client row ────────────────────────────────────────────────────────────

  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .insert({
      business_name: ownerName,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_mobile: ownerMobile,
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'trialing',
      payment_status: 'current',
      is_active: true,
    })
    .select()
    .single();

  if (clientErr || !clientRow) {
    logEvent('error', 'stripe.webhook.db_persistence_failed', {
      eventType: 'checkout.session.completed',
      error: clientErr?.message ?? 'client insert returned no row',
    });
    return;
  }

  const client = clientRow as Client;

  // ── 2. Business config (sensible defaults) ────────────────────────────────────

  const { data: configRow, error: configErr } = await supabase
    .from('business_config')
    .insert({
      client_id:            client.id,
      receptionist_name:    'Trade Receptionist',
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
    logEvent('error', 'stripe.webhook.db_persistence_failed', {
      eventType: 'checkout.session.completed',
      clientId: client.id,
      error: configErr?.message ?? 'business_config insert returned no row',
    });
    // Non-fatal — continue
  }

  // ── 3. Retell agent ───────────────────────────────────────────────────────────

  let agentId: string | null = null;

  try {
    const prompt = buildSystemPrompt(client, configRow as BusinessConfig);
    const ids    = await createRetellAgent({
      agentName:    `Trade Receptionist — ${ownerName}`,
      prompt,
      ownerNumber:  ownerMobile,
      calendarBookingEnabled: !!client.google_cal_id,
      beginMessage: buildBeginMessage(client, configRow as BusinessConfig),
    });
    agentId = ids.agentId;

    const { error: updateErr } = await supabase
      .from('clients')
      .update({ retell_agent_id: agentId, updated_at: new Date().toISOString() })
      .eq('id', client.id);
    if (updateErr) {
      logEvent('error', 'stripe.webhook.db_persistence_failed', {
        eventType: 'checkout.session.completed',
        clientId: client.id,
        error: updateErr.message,
      });
    }
  } catch (err: unknown) {
    logEvent('error', 'stripe.webhook.provider_failure', {
      eventType: 'checkout.session.completed',
      clientId: client.id,
      provider: 'retell',
      error: errorMessage(err),
    });
  }

  // ── 4. Twilio number ──────────────────────────────────────────────────────────

  let phoneNumber: string | null = null;

  if (agentId) {
    try {
      const available = await searchUkNumbers(5);
      if (!available.length) {
        logEvent('warn', 'stripe.webhook.provider_failure', {
          eventType: 'checkout.session.completed',
          clientId: client.id,
          provider: 'twilio',
          error: 'no UK numbers available',
        });
      } else {
        const purchased = await buyUkNumber(available[0].phoneNumber);
        phoneNumber     = purchased.phoneNumber;
        logEvent('info', 'stripe.webhook.twilio_number_purchased', {
          eventType: 'checkout.session.completed',
          clientId: client.id,
          provider: 'twilio',
        });

        try {
          // Attach the number to the SIP trunk (inbound routing) before telling
          // Retell about it (agent binding + outbound). Both are required for the
          // number to actually answer calls.
          await attachNumberToTrunk(purchased.sid);
          await importTwilioNumber(phoneNumber, agentId);
          logEvent('info', 'stripe.webhook.retell_number_imported', {
            eventType: 'checkout.session.completed',
            clientId: client.id,
            provider: 'retell',
          });
        } catch (importErr: unknown) {
          logEvent('error', 'stripe.webhook.provider_failure', {
            eventType: 'checkout.session.completed',
            clientId: client.id,
            provider: 'retell',
            error: errorMessage(importErr),
          });
        }

        const { error: twilioUpdateErr } = await supabase
          .from('clients')
          .update({ twilio_number: phoneNumber, updated_at: new Date().toISOString() })
          .eq('id', client.id);
        if (twilioUpdateErr) {
          logEvent('error', 'stripe.webhook.db_persistence_failed', {
            eventType: 'checkout.session.completed',
            clientId: client.id,
            error: twilioUpdateErr.message,
          });
        }
      }
    } catch (err: unknown) {
      logEvent('error', 'stripe.webhook.provider_failure', {
        eventType: 'checkout.session.completed',
        clientId: client.id,
        provider: 'twilio',
        error: errorMessage(err),
      });
    }
  }

  // ── 5. Supabase auth user + magic link ────────────────────────────────────────

  const siteUrl = process.env.SITE_URL ?? 'https://tradereceptionist.com';
  let loginUrl = `${siteUrl}/onboarding`;

  try {
    await supabase.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type:    'magiclink',
      email:   ownerEmail,
      options: { redirectTo: `${siteUrl}/onboarding` },
    });
    const actionLink = (linkData as { properties?: { action_link?: string } } | null)
      ?.properties?.action_link;
    if (actionLink) loginUrl = actionLink;
  } catch (err: unknown) {
    logEvent('error', 'stripe.webhook.provider_failure', {
      eventType: 'checkout.session.completed',
      clientId: client.id,
      provider: 'supabase_auth',
      error: errorMessage(err),
    });
  }

  // ── 6. Welcome email ──────────────────────────────────────────────────────────

  try {
    await sendEmail({
      to:      ownerEmail,
      subject: `Your Trade Receptionist is live — ${phoneNumber ?? 'number provisioning'}`,
      html:    welcomeHtml({ firstName, plan: plan.charAt(0).toUpperCase() + plan.slice(1), phoneNumber, loginUrl }),
    });
  } catch (err: unknown) {
    logEvent('error', 'stripe.webhook.provider_failure', {
      eventType: 'checkout.session.completed',
      clientId: client.id,
      provider: 'resend',
      error: errorMessage(err),
    });
  }

  void logSubscriber({
    businessName: ownerName,
    email:        ownerEmail,
    plan,
    signupDate:   new Date().toISOString(),
  });

  logEvent('info', 'stripe.webhook.checkout_provisioned', {
    eventType: 'checkout.session.completed',
    clientId: client.id,
    plan,
    hasPhoneNumber: Boolean(phoneNumber),
    hasAgent: Boolean(agentId),
  });
}

// ── POST handler ──────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const rawBody  = req.body as Buffer;
  const sigHeader = req.headers['stripe-signature'] as string | undefined;
  const secret    = process.env.STRIPE_WEBHOOK_SECRET;
  const reqId = requestId(req);

  // Always ack Stripe first — they retry on non-2xx
  res.status(200).json({ received: true });

  if (secret && sigHeader && !verifyStripeSignature(rawBody, sigHeader, secret)) {
    logEvent('warn', 'stripe.webhook.invalid_signature', { requestId: reqId, hasSignature: true });
    return;
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
  } catch {
    logEvent('error', 'stripe.webhook.malformed_payload', { requestId: reqId });
    return;
  }

  const eventType = event['type'];
  const data = asRecord(event['data']);
  const object = asRecord(data?.['object']);
  if (!object || typeof eventType !== 'string') {
    logEvent('warn', 'stripe.webhook.malformed_payload', { requestId: reqId });
    return;
  }

  logEvent('info', 'stripe.webhook.received', { requestId: reqId, eventType });

  (async () => {
    try {
      switch (eventType) {
        case 'checkout.session.completed':
          await provisionClient(object);
          break;
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(object);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(object);
          break;
        default:
          logEvent('info', 'stripe.webhook.ignored_event', { requestId: reqId, eventType });
          break;
      }
    } catch (err: unknown) {
      logEvent('error', 'stripe.webhook.handler_error', {
        requestId: reqId,
        eventType,
        error: errorMessage(err),
      });
    }
  })();
});

export default router;
