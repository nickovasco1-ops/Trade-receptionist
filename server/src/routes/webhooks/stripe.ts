import { Router, Request, Response } from 'express';
import { supabase } from '../../services/supabase';
import { sendEmail } from '../../services/resend';
import { buildSystemPrompt, buildBeginMessage } from '../../lib/prompt-builder';
import { createRetellAgent, importTwilioNumber } from '../../services/retell';
import { searchUkNumbers, buyUkNumber, attachNumberToTrunk } from '../../services/twilio';
import { logSubscriber } from '../../services/notion';
import { errorMessage, logEvent, requestId } from '../../lib/observability';
import { verifyStripeSignature } from './stripe-signature';
import { forwardingInstructionsHtml } from '../../lib/forwarding-email';
import type { Client, BusinessConfig, Plan } from '../../../../shared/types';
import { fireOpsAlert } from '../../services/alerts';

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

/** Mirrors src/lib/plans.ts — for alert copy only, never for billing. */
const PLAN_PRICE: Record<string, number> = {
  starter: 49, pro: 89, business: 159, agency: 249,
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
  const email = typeof invoice['customer_email'] === 'string' ? invoice['customer_email'] : null;
  fireOpsAlert({
    tone:     'warn',
    subject:  `Payment failed — ${email ?? 'unknown customer'}`,
    headline: 'A subscription payment did not go through',
    facts: [
      ['Customer', email ?? '—'],
      ['Amount',   typeof invoice['amount_due'] === 'number' ? `£${(invoice['amount_due'] as number) / 100}` : '—'],
      ['Invoice',  String(invoice['id'] ?? '—')],
    ],
    action: 'Stripe will retry automatically. The account is gated until it clears, '
          + 'so the receptionist stops answering — worth a message before they notice.',
  });

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
  const details = subscription['cancellation_details'] as Record<string, unknown> | null;
  const comment = typeof details?.['comment'] === 'string' ? details['comment'] : null;
  const reason  = typeof details?.['feedback'] === 'string' ? details['feedback'] : null;

  fireOpsAlert({
    tone:     'bad',
    subject:  `Cancellation — ${String(subscription['id'] ?? '')}`,
    headline: 'A customer cancelled',
    facts: [
      ['Subscription', String(subscription['id'] ?? '—')],
      ['Customer',     String(stripeId(subscription['customer']) ?? '—')],
      ['Reason given', comment ? `"${comment}"` : (reason ?? 'none given')],
    ],
    action: comment
      ? 'They told you why in their own words. Three of the last cancellations said the '
        + 'product did not work, and in every case the fault was at our end.'
      : 'No reason given. Worth one email asking what went wrong.',
  });

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
 * Someone opened checkout and did not finish.
 *
 * Stripe expires an abandoned session after 24 hours. There is nothing to fix
 * in the product here — it is a sales signal, not a fault — but it is the only
 * visibility you get into people who tried and did not complete.
 */
function handleCheckoutExpired(session: StripeObject): void {
  const details = session['customer_details'] as Record<string, unknown> | null;
  const email = typeof details?.['email'] === 'string' ? details['email'] : null;

  logEvent('info', 'stripe.webhook.checkout_expired', { hasEmail: Boolean(email) });

  fireOpsAlert({
    tone:     'warn',
    subject:  `Abandoned checkout — ${email ?? 'no email captured'}`,
    headline: 'Someone started signing up and did not finish',
    facts: [
      ['Email',   email ?? 'not captured'],
      ['Name',    typeof details?.['name'] === 'string' ? details['name'] as string : '—'],
      ['Plan',    String((session['metadata'] as Record<string, string> | null)?.['plan'] ?? '—')],
      ['Session', String(session['id'] ?? '—')],
    ],
    action: email
      ? 'They got as far as the payment page. One short email asking whether anything '
        + 'was unclear is the cheapest lead you will get this week.'
      : 'No email was captured, so there is nobody to follow up — worth noting if this becomes frequent.',
  });
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

// ── Welcome email ─────────────────────────────────────────────────────────────

/**
 * Exported so the welcome email can be re-sent out-of-band for a tenant whose
 * provisioning failed part-way (see the `provisionClient()` landmine in §10) —
 * replaying the Stripe event hits the idempotency path and will not re-send it.
 */
export function welcomeHtml(opts: {
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
          <tr><td style="padding:20px 26px;font-size:14px;line-height:1.55;color:rgba(240,244,248,0.62);font-family:${MN};">We&rsquo;re finishing your setup by hand and a real person is on it. You&rsquo;ll get your number and forwarding instructions as soon as it&rsquo;s ready — if you&rsquo;d rather chase it, just reply to this email.</td></tr>
        </table>
      </td></tr>`;

  // Forwarding instructions live in lib/forwarding-email.ts so the welcome
  // email and the "your number is ready" email cannot drift apart.
  const divertBlock = opts.phoneNumber
    ? `<tr><td style="padding:18px 44px 4px;">${forwardingInstructionsHtml(opts.phoneNumber)}</td></tr>`
    : '';

  const step2 = opts.phoneNumber
    ? 'Forward your calls using the steps above'
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
            <tr><td align="center" style="padding:14px 18px;font-size:12.5px;color:rgba(240,244,248,0.55);line-height:1.5;font-family:${MN};">14-day free trial &nbsp;·&nbsp; No charge today &nbsp;·&nbsp; Cancel anytime</td></tr>
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
      plan,
      boostedKeywords: [ownerName].filter(Boolean),
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
      // Two attempts. Number purchase failing is usually transient — an account
      // hiccup or a number taken between search and buy — and a single failure
      // used to cost the whole customer.
      let available = await searchUkNumbers(5);
      if (!available.length) {
        logEvent('warn', 'stripe.webhook.twilio_search_retry', {
          eventType: 'checkout.session.completed', clientId: client.id,
        });
        await new Promise((r) => setTimeout(r, 1500));
        available = await searchUkNumbers(5);
      }

      if (!available.length) {
        logEvent('error', 'stripe.webhook.provider_failure', {
          eventType: 'checkout.session.completed',
          clientId: client.id,
          provider: 'twilio',
          error: 'no UK numbers available after retry',
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

  // In new-number mode the Twilio number IS the customer's business number, so
  // finishing without one means they have paid for nothing. This used to pass
  // silently: the customer got a welcome email, no number, and no way to know.
  // Three cancelled inside a fortnight, one of them writing "is not working
  // cause not had my divert number".
  //
  // It cannot be repaired here — buying a number is what just failed — so the
  // job is to make sure a human finds out the same day.
  if (!phoneNumber && !client.own_number) {
    logEvent('error', 'stripe.webhook.provisioned_without_number', {
      eventType:   'checkout.session.completed',
      clientId:    client.id,
      ownerEmail:  ownerEmail,
      action:      'customer has no number and no product — assign one via POST /clients/:id/assign-number',
    });

    // The end-of-provisioning summary alert carries the email; no second one.
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

  let welcomeSent = true;

  // ── 6. Welcome email ──────────────────────────────────────────────────────────

  try {
    await sendEmail({
      to:      ownerEmail,
      subject: `Your Trade Receptionist is live — ${phoneNumber ?? 'number provisioning'}`,
      html:    welcomeHtml({ firstName, plan: plan.charAt(0).toUpperCase() + plan.slice(1), phoneNumber, loginUrl }),
    });
  } catch (err: unknown) {
    welcomeSent = false;
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

  // ── One email per signup, whatever happened ─────────────────────────────
  // Success or failure, the owner hears about every signup once. Partial
  // provisioning is the dangerous case: the customer is charged, gets a
  // welcome email, and has no working product. Three customers churned that
  // way before anyone noticed.
  const tick = (ok: boolean) => (ok ? '✅' : '❌');
  const needsNumber = !phoneNumber && !client.own_number;
  const broken = [
    !agentId ? 'no receptionist agent' : null,
    needsNumber ? 'no phone number' : null,
    !welcomeSent ? 'welcome email failed' : null,
  ].filter(Boolean) as string[];

  fireOpsAlert({
    tone:     broken.length ? 'bad' : 'good',
    subject:  broken.length
      ? `⚠ Signup incomplete — ${ownerName} (${plan})`
      : `New signup — ${ownerName} (${plan})`,
    headline: broken.length
      ? `${ownerName} signed up but the setup did not finish`
      : `${ownerName} just signed up`,
    facts: [
      ['Business', ownerName],
      ['Email',    ownerEmail],
      ['Plan',     `${plan} · £${PLAN_PRICE[plan] ?? '—'}/month`],
      ['Mobile',   ownerMobile ?? '—'],
      ['Receptionist agent', tick(Boolean(agentId))],
      ['Phone number',       phoneNumber ? `${tick(true)} ${phoneNumber}` : (client.own_number ? '— (keeping own number)' : `${tick(false)} none`)],
      ['Welcome email',      tick(welcomeSent)],
    ],
    action: broken.length
      ? `This customer cannot use the product: ${broken.join(', ')}. `
        + (needsNumber
            ? `Fix the number with <code>POST /clients/${client.id}/assign-number</code> — it buys the number, wires it up and emails them the forwarding instructions. `
            : '')
        + 'Do it today: a signup that goes quiet in the first week churns without telling you why.'
      : undefined,
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

  // Fail closed. No configuration state and no absent header waves a request
  // through — this endpoint provisions tenants and spends money on Twilio
  // numbers, so an unverified caller must never reach the switch below.
  if (!secret) {
    // Error-level: this is a deployment fault that silently stops all billing
    // events (signups, renewals, cancellations) from being processed.
    logEvent('error', 'stripe.webhook.secret_missing', {
      requestId: reqId,
      action: 'set STRIPE_WEBHOOK_SECRET — all Stripe webhooks are being rejected',
    });
    return;
  }

  if (!sigHeader || !verifyStripeSignature(rawBody, sigHeader, secret)) {
    logEvent('warn', 'stripe.webhook.invalid_signature', {
      requestId: reqId,
      hasSignature: Boolean(sigHeader),
    });
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
        case 'checkout.session.expired':
          handleCheckoutExpired(object);
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
