import { expect, test } from '@playwright/test';
import { apiBaseURL, uniqueEmail, uniqueId } from './utils/env';
import { cleanupTestUserAndData } from './utils/cleanup';
import { cleanupAccount, getBusinessConfig, getClientByEmail, seedClient, type TestAccount } from './utils/fixtures';
import { restPatch } from './utils/supabase-admin';
import { postJsonWebhook, stripeSignature, eventually } from './utils/webhooks';

async function postRawStripeWebhook(raw: string, signature = stripeSignature(raw)) {
  return fetch(`${apiBaseURL}/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
    body: raw,
  });
}

function checkoutSessionCompleted(email: string, plan = 'pro') {
  return {
    id: uniqueId('evt_stripe_checkout'),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: uniqueId('cs_test'),
        customer: uniqueId('cus_checkout'),
        subscription: uniqueId('sub_checkout'),
        customer_details: {
          email,
          name: 'Stripe Fixture Customer',
          phone: '+447700900777',
        },
        metadata: { plan },
      },
    },
  };
}

async function seedStripeSubscriber(): Promise<TestAccount & { customerId: string; subscriptionId: string }> {
  const account = await seedClient(uniqueEmail('stripe-lifecycle'), {
    onboardingComplete: true,
  });
  const customerId = uniqueId('cus_lifecycle');
  const subscriptionId = uniqueId('sub_lifecycle');

  await restPatch('clients', `id=eq.${account.clientId}`, {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: 'active',
    payment_status: 'current',
    is_active: true,
    current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return { ...account, customerId, subscriptionId };
}

function invoiceEvent(
  type: 'invoice.payment_succeeded' | 'invoice.payment_failed',
  account: { customerId: string; subscriptionId: string; email: string },
) {
  const created = Math.floor(Date.now() / 1000);
  const periodEnd = created + 30 * 24 * 60 * 60;

  return {
    id: uniqueId(type === 'invoice.payment_succeeded' ? 'evt_invoice_paid' : 'evt_invoice_failed'),
    type,
    data: {
      object: {
        id: uniqueId('in_test'),
        customer: account.customerId,
        subscription: account.subscriptionId,
        customer_email: account.email,
        created,
        lines: {
          data: [
            {
              period: {
                end: periodEnd,
              },
            },
          ],
        },
      },
    },
  };
}

function subscriptionDeletedEvent(account: { customerId: string; subscriptionId: string }) {
  return {
    id: uniqueId('evt_sub_deleted'),
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: account.subscriptionId,
        customer: account.customerId,
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000),
      },
    },
  };
}

async function postStripeEvent(event: Record<string, unknown>) {
  const raw = JSON.stringify(event);
  const response = await postJsonWebhook('/webhooks/stripe', event, {
    'stripe-signature': stripeSignature(raw),
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ received: true });
}

test.describe('Stripe webhooks', () => {
  test('malformed signed webhook is acknowledged without a 500', async () => {
    const response = await postRawStripeWebhook('{"type":"payment_intent.created",');

    expect(response.status).not.toBe(500);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true });
  });

  test('invalid signature is rejected internally without a 500', async () => {
    const event = {
      id: uniqueId('evt_invalid_sig'),
      type: 'payment_intent.created',
      data: { object: { id: uniqueId('pi_invalid_sig') } },
    };
    const response = await postJsonWebhook('/webhooks/stripe', event, {
      'stripe-signature': 't=1,v1=invalid',
    });

    expect(response.status).not.toBe(500);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true });
  });

  test('signed harmless event is acknowledged without provisioning side effects', async () => {
    const event = {
      id: uniqueId('evt_harmless'),
      type: 'payment_intent.created',
      data: { object: { id: uniqueId('pi_harmless') } },
    };
    const raw = JSON.stringify(event);
    const response = await postJsonWebhook('/webhooks/stripe', event, {
      'stripe-signature': stripeSignature(raw),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true });
  });

  test('checkout.session.completed provisions a client with E2E provider stubs', async () => {
    const email = uniqueEmail('stripe-checkout');
    const event = checkoutSessionCompleted(email, 'pro');
    const raw = JSON.stringify(event);

    try {
      const response = await postJsonWebhook('/webhooks/stripe', event, {
        'stripe-signature': stripeSignature(raw),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ received: true });

      const client = await eventually(
        () => getClientByEmail(email),
        (row) => row?.plan === 'pro' && row?.retell_agent_id && row?.twilio_number,
        'checkout provisioned client'
      );
      expect(client).toMatchObject({
        business_name: 'Stripe Fixture Customer',
        owner_name: 'Stripe Fixture Customer',
        owner_email: email,
        owner_mobile: '+447700900777',
        plan: 'pro',
        is_active: true,
        subscription_status: 'trialing',
        payment_status: 'current',
      });
      expect(String(client?.retell_agent_id)).toMatch(/^agent_e2e_/);
      expect(String(client?.twilio_number)).toMatch(/^\+4420457190/);
      expect(String(client?.stripe_customer_id)).toMatch(/^cus_checkout_/);
      expect(String(client?.stripe_subscription_id)).toMatch(/^sub_checkout_/);

      await expect.poll(async () => getBusinessConfig(String(client?.id))).toMatchObject({
        receptionist_name: 'Trade Receptionist',
        timezone: 'Europe/London',
      });
    } finally {
      await cleanupTestUserAndData(email);
    }
  });

  test('invoice.payment_succeeded subscription update is implemented', async () => {
    const account = await seedStripeSubscriber();
    const event = invoiceEvent('invoice.payment_succeeded', account);

    try {
      await postStripeEvent(event);
      await postStripeEvent(event);

      await eventually(
        () => getClientByEmail(account.email),
        (client) => client?.subscription_status === 'active'
          && client?.payment_status === 'current'
          && client?.is_active === true
          && Boolean(client?.last_payment_at)
          && Boolean(client?.current_period_end),
        'invoice payment succeeded lifecycle update'
      );
    } finally {
      await cleanupAccount(account);
    }
  });

  test('invoice.payment_failed persists failed payment state and gates the client', async () => {
    const account = await seedStripeSubscriber();
    const event = invoiceEvent('invoice.payment_failed', account);

    try {
      await postStripeEvent(event);
      await postStripeEvent(event);

      await eventually(
        () => getClientByEmail(account.email),
        (client) => client?.subscription_status === 'past_due'
          && client?.payment_status === 'failed'
          && client?.is_active === false
          && Boolean(client?.last_payment_failed_at),
        'invoice payment failed lifecycle update'
      );
    } finally {
      await cleanupAccount(account);
    }
  });

  test('customer.subscription.deleted downgrades or gates account if implemented', async () => {
    const account = await seedStripeSubscriber();
    const event = subscriptionDeletedEvent(account);

    try {
      await postStripeEvent(event);
      await postStripeEvent(event);

      await eventually(
        () => getClientByEmail(account.email),
        (client) => client?.subscription_status === 'canceled'
          && client?.payment_status === 'canceled'
          && client?.is_active === false,
        'subscription deleted lifecycle update'
      );
    } finally {
      await cleanupAccount(account);
    }
  });
});
