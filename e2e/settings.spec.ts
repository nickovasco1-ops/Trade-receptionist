import { expect, test, type Page } from '@playwright/test';
import {
  authenticate,
  cleanupAccount,
  getBusinessConfig,
  getClientByEmail,
  hasAfterHoursMessageColumn,
  seedClient,
  type TestAccount,
} from './utils/fixtures';
import { testPhone, uniqueId } from './utils/env';
import { restPatch } from './utils/supabase-admin';

test.beforeEach(() => {
  test.setTimeout(120_000);
});

async function seedSettingsAccount(options: { googleCalendarId?: string | null } = {}) {
  return seedClient(undefined, {
    onboardingComplete: true,
    retellAgentId: null,
    googleCalendarId: options.googleCalendarId,
    businessName: `Settings ${uniqueId('biz').slice(-8)} Plumbing`,
  });
}

async function signInAndOpenSettings(page: Page, account: TestAccount) {
  await authenticate(page, account.email);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /aligned with how your business runs/i })).toBeVisible();
}

async function fillProfile(page: Page, values: { businessName: string; ownerName: string; mobile: string }) {
  await page.getByLabel(/business name/i).fill(values.businessName);
  await page.getByLabel(/^your name$/i).fill(values.ownerName);
  await page.getByLabel(/your mobile for sms alerts/i).fill(values.mobile);
}

async function saveSettings(page: Page) {
  await page.getByTestId('settings-save-button').click();
  await expect(page.getByTestId('settings-save-status')).toHaveText(/^Saved$/);
}

test('unauthenticated user visiting settings is redirected to login', async ({ page }) => {
  await page.goto('/settings');

  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fsettings$/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

test('authenticated client can access settings and business profile loads from Supabase', async ({ page }) => {
  const account = await seedSettingsAccount();

  try {
    await signInAndOpenSettings(page, account);

    const client = await getClientByEmail(account.email);
    await expect(page.getByLabel(/business name/i)).toHaveValue(String(client?.business_name));
    await expect(page.getByLabel(/^your name$/i)).toHaveValue(String(client?.owner_name));
    await expect(page.getByLabel(/email/i)).toHaveValue(account.email);
    await expect(page.getByLabel(/your mobile for sms alerts/i)).toHaveValue(testPhone);
    await expect(page.getByLabel(/ai receptionist number/i)).toHaveValue('+442045719023');
  } finally {
    await cleanupAccount(account);
  }
});

test('business profile fields save to Supabase and reload with saved values', async ({ page }) => {
  const account = await seedSettingsAccount();
  const values = {
    businessName: `Persisted ${uniqueId('settings').slice(-8)} Plumbing`,
    ownerName: 'Pat Persisted',
    mobile: '+447700900333',
  };

  try {
    await signInAndOpenSettings(page, account);
    await fillProfile(page, values);
    await saveSettings(page);

    await expect.poll(async () => getClientByEmail(account.email)).toMatchObject({
      business_name: values.businessName,
      owner_name: values.ownerName,
      owner_mobile: values.mobile,
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: /aligned with how your business runs/i })).toBeVisible();
    await expect(page.getByLabel(/business name/i)).toHaveValue(values.businessName);
    await expect(page.getByLabel(/^your name$/i)).toHaveValue(values.ownerName);
    await expect(page.getByLabel(/your mobile for sms alerts/i)).toHaveValue(values.mobile);
  } finally {
    await cleanupAccount(account);
  }
});

test('payment-failed subscription state is visible in settings', async ({ page }) => {
  const account = await seedSettingsAccount();

  try {
    await restPatch('clients', `id=eq.${account.clientId}`, {
      subscription_status: 'past_due',
      payment_status: 'failed',
      is_active: false,
    });

    await signInAndOpenSettings(page, account);

    const banner = page.getByTestId('subscription-status-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Payment needs attention');
    await expect(banner).toContainText('paused');
  } finally {
    await cleanupAccount(account);
  }
});

test('after-hours message saves when the Supabase schema supports it', async ({ page }) => {
  test.skip(
    !(await hasAfterHoursMessageColumn()),
    'Supabase test schema is missing business_config.after_hours_message; apply supabase/migrations/007_after_hours_message.sql.'
  );

  const account = await seedSettingsAccount();
  const message = 'We are closed, but your details have been captured.';

  try {
    await signInAndOpenSettings(page, account);
    await page.getByLabel(/custom message/i).fill(message);
    await saveSettings(page);

    await expect.poll(async () => getBusinessConfig(account.clientId!)).toMatchObject({
      after_hours_message: message,
    });
  } finally {
    await cleanupAccount(account);
  }
});

test('settings API errors show a user-facing error', async ({ page }) => {
  const account = await seedSettingsAccount();

  try {
    await signInAndOpenSettings(page, account);

    await page.route('**/api/clients/*/settings', async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'E2E forced settings failure' }),
      });
    });

    await fillProfile(page, {
      businessName: 'Failed Settings Plumbing',
      ownerName: 'Failure Case',
      mobile: '+447700900334',
    });
    await page.getByTestId('settings-save-button').click();

    await expect(page.getByRole('alert')).toContainText('E2E forced settings failure');
    await expect(page.getByTestId('settings-save-status')).toHaveText(/save changes/i);
  } finally {
    await cleanupAccount(account);
  }
});

test('Google Calendar connect button reaches the OAuth boundary', async ({ page }) => {
  const account = await seedSettingsAccount();
  let requestedClientId: string | null = null;
  let oauthUrl: URL | null = null;

  try {
    await page.route('**/api/auth/google?**', async (route) => {
      const requestUrl = new URL(route.request().url());
      requestedClientId = requestUrl.searchParams.get('clientId');
      oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', 'e2e-google-client.apps.googleusercontent.com');
      oauthUrl.searchParams.set('redirect_uri', 'http://localhost:3001/auth/google/callback');
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
      oauthUrl.searchParams.set('state', `e2e.${requestedClientId}.signed`);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { url: oauthUrl.toString() } }),
      });
    });

    await signInAndOpenSettings(page, account);

    const requestPromise = page.waitForRequest((request) =>
      request.url().includes('/api/auth/google') && request.method() === 'GET'
    );
    await page.getByRole('button', { name: /connect google calendar/i }).click();
    await requestPromise;

    expect(requestedClientId).toBe(account.clientId);
    expect(oauthUrl?.hostname).toBe('accounts.google.com');
    expect(oauthUrl?.searchParams.get('scope')).toContain('calendar');
    expect(oauthUrl?.searchParams.get('state')).toContain(account.clientId!);
  } finally {
    await cleanupAccount(account);
  }
});

test('disconnect calendar works if implemented', async () => {
  test.skip(true, 'Settings supports connect/re-connect only; no disconnect calendar control is implemented. Documented in e2e/BUGS.md.');
});

test('billing or customer portal entry point is visible if implemented', async () => {
  test.skip(true, 'Settings page has no billing/customer portal entry point. Documented in e2e/BUGS.md.');
});
