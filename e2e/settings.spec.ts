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
  await page.goto('/dashboard/settings');
  await expect(page.getByRole('heading', { name: /keep your receptionist aligned with your business/i })).toBeVisible();
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
  // /settings is a redirect to the canonical /dashboard/settings, so the
  // preserved destination is the canonical path, not the one requested.
  await page.goto('/settings');

  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard%2Fsettings$/);
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
    await expect(page.getByRole('heading', { name: /keep your receptionist aligned with your business/i })).toBeVisible();
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

/**
 * The Settings diary block is now DiaryConnect, shared with the onboarding
 * wizard, so the button is the provider itself ("Google Calendar") rather than
 * an instruction ("Connect Google Calendar"). The old selector is what made
 * this test time out for two minutes rather than fail in two seconds.
 */
async function stubConsentUrl(page: Page, provider: 'google' | 'microsoft') {
  const captured: { clientId: string | null; url: URL | null } = { clientId: null, url: null };

  await page.route(`**/api/auth/${provider}?**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    captured.clientId = requestUrl.searchParams.get('clientId');

    const consent = new URL(provider === 'google'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    consent.searchParams.set('client_id', `e2e-${provider}-client`);
    consent.searchParams.set('response_type', 'code');
    consent.searchParams.set('scope', provider === 'google'
      ? 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy'
      : 'offline_access https://graph.microsoft.com/Calendars.ReadWrite');
    consent.searchParams.set('state', `e2e.${captured.clientId}.signed`);
    captured.url = consent;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { url: consent.toString() } }),
    });
  });

  return captured;
}

test('the diary block reaches the Google OAuth boundary', async ({ page }) => {
  const account = await seedSettingsAccount();

  try {
    const captured = await stubConsentUrl(page, 'google');
    await signInAndOpenSettings(page, account);

    const requestPromise = page.waitForRequest((request) =>
      request.url().includes('/api/auth/google') && request.method() === 'GET'
    );
    await page.getByRole('button', { name: /google calendar/i }).click();
    await requestPromise;

    expect(captured.clientId).toBe(account.clientId);
    expect(captured.url?.hostname).toBe('accounts.google.com');
    // freebusy is not covered by calendar.events, so both must be requested or
    // every availability check fails while everything still compiles.
    expect(captured.url?.searchParams.get('scope')).toContain('calendar.events');
    expect(captured.url?.searchParams.get('scope')).toContain('calendar.freebusy');
    expect(captured.url?.searchParams.get('state')).toContain(account.clientId!);
  } finally {
    await cleanupAccount(account);
  }
});

test('the diary block reaches the Microsoft OAuth boundary', async ({ page }) => {
  // Outlook, Hotmail and Live customers had no way in at all before migration
  // 019, and Microsoft is the one provider that needs no review — so it is the
  // cheapest path to a working diary and worth proving end to end.
  const account = await seedSettingsAccount();

  try {
    const captured = await stubConsentUrl(page, 'microsoft');
    await signInAndOpenSettings(page, account);

    const requestPromise = page.waitForRequest((request) =>
      request.url().includes('/api/auth/microsoft') && request.method() === 'GET'
    );
    await page.getByRole('button', { name: /outlook or hotmail/i }).click();
    await requestPromise;

    expect(captured.clientId).toBe(account.clientId);
    expect(captured.url?.hostname).toBe('login.microsoftonline.com');
    // Without offline_access there is no refresh token and the connection dies
    // in an hour.
    expect(captured.url?.searchParams.get('scope')).toContain('offline_access');
  } finally {
    await cleanupAccount(account);
  }
});

test('the iPhone answer asks which account backs the diary', async ({ page }) => {
  // An iPhone is not a calendar service. Both paying customers keep their diary
  // in Google *through* the iOS Calendar app, so this branch is what routes the
  // common case to one tap instead of an app-specific password.
  const account = await seedSettingsAccount();

  try {
    await signInAndOpenSettings(page, account);
    await page.getByRole('button', { name: /my iphone/i }).click();

    await expect(page.getByRole('heading', { name: /which email is on your iphone/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /gmail/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /icloud/i })).toBeVisible();
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
