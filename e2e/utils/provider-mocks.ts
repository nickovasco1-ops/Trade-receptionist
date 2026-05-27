import type { Page } from '@playwright/test';

export async function mockRetellRebuildAgent(page: Page) {
  await page.route('**/api/clients/rebuild-agent', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { skipped: true, reason: 'e2e provider mock' } }),
    });
  });
}

export async function mockGoogleOAuth(page: Page) {
  await page.route('**/api/auth/google?**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const clientId = requestUrl.searchParams.get('clientId') ?? 'missing-client';
    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || 'e2e-google-client.apps.googleusercontent.com');
    oauthUrl.searchParams.set('redirect_uri', 'http://localhost:3001/auth/google/callback');
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    oauthUrl.searchParams.set('state', `e2e.${clientId}.signed`);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { url: oauthUrl.toString() } }),
    });
  });
}

export async function mockStripeCheckout(page: Page) {
  await page.context().route('https://buy.stripe.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Stripe test checkout intercepted</title><h1>Stripe test checkout intercepted</h1>',
    });
  });
}

export async function mockTwilioProvisioning(page: Page) {
  await page.route('**/api/clients/provision', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { twilioNumber: '+442045719099', skipped: true, reason: 'e2e provider mock' },
      }),
    });
  });
}

export async function mockBrowserProviderBoundaries(page: Page) {
  await Promise.all([
    mockRetellRebuildAgent(page),
    mockGoogleOAuth(page),
    mockStripeCheckout(page),
    mockTwilioProvisioning(page),
  ]);
}

export const e2eProviderSideEffects = {
  resend: 'No-op in API when E2E_TEST_MODE=true',
  notion: 'No-op in API when E2E_TEST_MODE=true',
  retell: 'Stubbed in API when E2E_TEST_MODE=true',
  twilio: 'Stubbed in API when E2E_TEST_MODE=true',
};
