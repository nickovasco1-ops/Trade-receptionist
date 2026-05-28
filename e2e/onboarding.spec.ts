import { expect, type Page, test } from '@playwright/test';
import {
  authenticate,
  cleanupAccount,
  getBusinessConfig,
  getClientByEmail,
  seedClient,
  type TestAccount,
} from './utils/fixtures';
import { testPhone, uniqueId } from './utils/env';

const stepOrder = ['receptionist', 'business', 'services', 'hours', 'contact', 'ready'] as const;

test.describe.configure({ timeout: 120_000 });

async function expectStep(page: Page, step: typeof stepOrder[number], index: number) {
  await expect(page.getByTestId(`onboarding-step-${step}`)).toBeVisible();
  await expect(page.getByRole('progressbar', { name: /onboarding progress/i })).toHaveAttribute(
    'aria-valuenow',
    String(index + 1)
  );
}

async function seedOnboardingAccount(): Promise<TestAccount> {
  return seedClient(undefined, {
    onboardingComplete: false,
    retellAgentId: null,
    businessName: `Seeded ${uniqueId('onb').slice(-8)} Plumbing`,
  });
}

async function openOnboarding(page: Page, account: TestAccount) {
  await authenticate(page, account.email);
  await page.goto('/onboarding');
  await expectStep(page, 'receptionist', 0);
}

async function fillBusinessStep(page: Page, businessName: string) {
  const businessNameInput = page.getByLabel(/business name/i);
  await expect(businessNameInput).toBeVisible();
  await expect.poll(async () => businessNameInput.inputValue()).not.toBe('');
  await businessNameInput.fill(businessName);
  await page.getByLabel(/trade type/i).selectOption('Plumber');
  await page.getByLabel(/city \/ area/i).fill('South London');
  await expect(businessNameInput).toHaveValue(businessName);
}

async function fillServicesStep(page: Page) {
  await page.getByRole('button', { name: /^boiler repair$/i }).click();
  await page.getByLabel(/add a custom service/i).fill('Kitchen tap repair');
  await page.getByRole('button', { name: /add service/i }).click();
}

async function fillHoursStep(page: Page) {
  await page.getByLabel(/start time/i).fill('07:30');
  await page.getByLabel(/end time/i).fill('17:30');
}

async function fillContactStep(page: Page) {
  await page.getByLabel(/^your name$/i).fill('Launch Owner');
  await page.getByLabel(/mobile for summaries/i).fill(testPhone);
}

async function completeToReadyStep(page: Page, businessName: string) {
  await page.getByRole('button', { name: /^continue$/i }).click();
  await expectStep(page, 'business', 1);
  await fillBusinessStep(page, businessName);
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expectStep(page, 'services', 2);
  await fillServicesStep(page);
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expectStep(page, 'hours', 3);
  await fillHoursStep(page);
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expectStep(page, 'contact', 4);
  await fillContactStep(page);
  await page.getByRole('button', { name: /review setup/i }).click();

  await expectStep(page, 'ready', 5);
  await expect(page.getByText(/trade receptionist is ready to go live/i)).toBeVisible();
}

test('unauthenticated user visiting onboarding is redirected to login', async ({ page }) => {
  await page.goto('/onboarding');

  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fonboarding$/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

test('authenticated user can access onboarding', async ({ page }) => {
  const account = await seedOnboardingAccount();

  try {
    await openOnboarding(page, account);
    await expect(page.getByRole('heading', { name: /shape how every caller/i })).toBeVisible();
  } finally {
    await cleanupAccount(account);
  }
});

test('current onboarding steps render in the correct order', async ({ page }) => {
  const account = await seedOnboardingAccount();

  try {
    await openOnboarding(page, account);

    for (let index = 0; index < stepOrder.length; index += 1) {
      const step = stepOrder[index];
      await expectStep(page, step, index);

      if (step === 'business') {
        await fillBusinessStep(page, `Ordered ${uniqueId('biz').slice(-8)} Plumbing`);
      } else if (step === 'services') {
        await fillServicesStep(page);
      } else if (step === 'hours') {
        await fillHoursStep(page);
      } else if (step === 'contact') {
        await fillContactStep(page);
      }

      if (step === 'ready') break;
      const nextButton = page.getByRole('button', { name: step === 'contact' ? /review setup/i : /^continue$/i });
      await expect(nextButton).toBeEnabled();
      await nextButton.click();
    }
  } finally {
    await cleanupAccount(account);
  }
});

test('required fields prevent advancement on gated steps', async ({ page }) => {
  const account = await seedOnboardingAccount();

  try {
    await openOnboarding(page, account);

    await page.getByRole('button', { name: /^continue$/i }).click();
    await expectStep(page, 'business', 1);

    const businessNameInput = page.getByLabel(/business name/i);
    await expect.poll(async () => businessNameInput.inputValue()).not.toBe('');
    await businessNameInput.fill('');
    await expect(page.getByRole('button', { name: /^continue$/i })).toBeDisabled();
    await businessNameInput.fill('Required Fields Plumbing');
    await expect(page.getByRole('button', { name: /^continue$/i })).toBeDisabled();
    await page.getByLabel(/trade type/i).selectOption('Plumber');
    await expect(page.getByRole('button', { name: /^continue$/i })).toBeEnabled();
    await page.getByLabel(/city \/ area/i).fill('South London');
    await page.getByRole('button', { name: /^continue$/i }).click();

    await expectStep(page, 'services', 2);
    await expect(page.getByRole('button', { name: /^continue$/i })).toBeEnabled();
    await fillServicesStep(page);
    await page.getByRole('button', { name: /^continue$/i }).click();

    await expectStep(page, 'hours', 3);
    await expect(page.getByRole('button', { name: /^continue$/i })).toBeEnabled();
    await fillHoursStep(page);
    await page.getByRole('button', { name: /^continue$/i }).click();

    await expectStep(page, 'contact', 4);
    await page.getByLabel(/^your name$/i).fill('');
    await page.getByLabel(/mobile for summaries/i).fill('');
    await expect(page.getByRole('button', { name: /review setup/i })).toBeDisabled();
    await page.getByLabel(/^your name$/i).fill('Launch Owner');
    await expect(page.getByRole('button', { name: /review setup/i })).toBeDisabled();
    await page.getByLabel(/mobile for summaries/i).fill(testPhone);
    await expect(page.getByRole('button', { name: /review setup/i })).toBeEnabled();
  } finally {
    await cleanupAccount(account);
  }
});

test('form data persists when navigating back and forward inside onboarding', async ({ page }) => {
  const account = await seedOnboardingAccount();
  const businessName = `Back Forward ${uniqueId('biz').slice(-8)} Plumbing`;

  try {
    await openOnboarding(page, account);

    await page.getByRole('button', { name: /^continue$/i }).click();
    await fillBusinessStep(page, businessName);
    await page.getByRole('button', { name: /^continue$/i }).click();

    await fillServicesStep(page);
    await page.getByRole('button', { name: /^continue$/i }).click();

    await fillHoursStep(page);
    await page.getByRole('button', { name: /^continue$/i }).click();

    await fillContactStep(page);

    await page.getByRole('button', { name: /^back$/i }).click();
    await expectStep(page, 'hours', 3);
    await expect(page.getByLabel(/start time/i)).toHaveValue('07:30');
    await expect(page.getByLabel(/end time/i)).toHaveValue('17:30');

    await page.getByRole('button', { name: /^back$/i }).click();
    await expectStep(page, 'services', 2);
    await expect(page.getByTestId('onboarding-step-services').getByText('Kitchen tap repair')).toBeVisible();

    await page.getByRole('button', { name: /^back$/i }).click();
    await expectStep(page, 'business', 1);
    await expect(page.getByLabel(/business name/i)).toHaveValue(businessName);
    await expect(page.getByLabel(/trade type/i)).toHaveValue('Plumber');
    await expect(page.getByLabel(/city \/ area/i)).toHaveValue('South London');

    await page.getByRole('button', { name: /^continue$/i }).click();
    await expectStep(page, 'services', 2);
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expectStep(page, 'hours', 3);
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expectStep(page, 'contact', 4);
    await expect(page.getByLabel(/^your name$/i)).toHaveValue('Launch Owner');
    await expect(page.getByLabel(/mobile for summaries/i)).toHaveValue(testPhone);
  } finally {
    await cleanupAccount(account);
  }
});

test('receptionist, business, services, hours, contact, and ready steps can be completed', async ({ page }) => {
  const account = await seedOnboardingAccount();
  const businessName = `Complete ${uniqueId('biz').slice(-8)} Plumbing`;
  let rebuildBody: unknown;

  try {
    await page.route('**/api/clients/rebuild-agent', async (route) => {
      rebuildBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { skipped: true, reason: 'e2e provider mock' } }),
      });
    });

    await openOnboarding(page, account);
    await completeToReadyStep(page, businessName);

    const rebuildRequest = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url().includes('/api/clients/rebuild-agent')
    );
    await page.getByRole('button', { name: /activate trade receptionist/i }).click();
    await rebuildRequest;
    await expect(page).toHaveURL(/\/dashboard$/);

    expect(rebuildBody).toMatchObject({ clientId: account.clientId });

    await expect.poll(async () => getClientByEmail(account.email)).toMatchObject({
      business_name: businessName,
      owner_name: 'Launch Owner',
      owner_mobile: testPhone,
      onboarding_complete: true,
    });

    await expect.poll(async () => getBusinessConfig(account.clientId!)).toMatchObject({
      receptionist_name: 'Trade Receptionist',
      receptionist_tone: 'friendly',
      service_areas: ['South London'],
      business_hours_start: '07:30:00',
      business_hours_end: '17:30:00',
      working_days: [1, 2, 3, 4, 5],
    });

    const config = await getBusinessConfig(account.clientId!);
    expect(config?.services).toEqual(expect.arrayContaining(['Boiler repair', 'Kitchen tap repair']));
  } finally {
    await cleanupAccount(account);
  }
});

test('refresh mid-onboarding preserves progress', async ({ page }) => {
  const account = await seedOnboardingAccount();
  const businessName = `Refresh ${uniqueId('biz').slice(-8)} Plumbing`;

  try {
    await openOnboarding(page, account);

    await page.getByRole('button', { name: /^continue$/i }).click();
    await fillBusinessStep(page, businessName);
    await page.getByRole('button', { name: /^continue$/i }).click();

    await fillServicesStep(page);
    await page.getByRole('button', { name: /^continue$/i }).click();

    await expectStep(page, 'hours', 3);
    await fillHoursStep(page);
    await expect(page.getByLabel(/start time/i)).toHaveValue('07:30');

    await expect.poll(async () =>
      page.evaluate((clientId) => {
        const raw = window.localStorage.getItem(`trade-receptionist:onboarding-draft:${clientId}`);
        return raw ? JSON.parse(raw).step : null;
      }, account.clientId)
    ).toBe('hours');

    await page.reload();

    await expectStep(page, 'hours', 3);
    await expect(page.getByLabel(/start time/i)).toHaveValue('07:30');
    await expect(page.getByLabel(/end time/i)).toHaveValue('17:30');

    await page.getByRole('button', { name: /^back$/i }).click();
    await expectStep(page, 'services', 2);
    await expect(page.getByTestId('onboarding-step-services').getByText('Kitchen tap repair')).toBeVisible();

    await page.getByRole('button', { name: /^back$/i }).click();
    await expectStep(page, 'business', 1);
    await expect(page.getByLabel(/business name/i)).toHaveValue(businessName);
    await expect(page.getByLabel(/trade type/i)).toHaveValue('Plumber');
    await expect(page.getByLabel(/city \/ area/i)).toHaveValue('South London');
  } finally {
    await cleanupAccount(account);
  }
});

test('provider failure during rebuild-agent shows a user-facing error and retry path', async ({ page }) => {
  const account = await seedOnboardingAccount();
  const businessName = `Retry ${uniqueId('biz').slice(-8)} Plumbing`;
  let attempts = 0;

  try {
    await page.route('**/api/clients/rebuild-agent', async (route) => {
      attempts += 1;
      await route.fulfill({
        status: attempts === 1 ? 500 : 200,
        contentType: 'application/json',
        body: JSON.stringify(
          attempts === 1
            ? { success: false, error: 'Retell update failed in E2E' }
            : { success: true, data: { skipped: true, reason: 'e2e provider mock' } }
        ),
      });
    });

    await openOnboarding(page, account);
    await completeToReadyStep(page, businessName);

    await page.getByRole('button', { name: /activate trade receptionist/i }).click();
    await expect(page.getByRole('alert')).toContainText(/retell update failed in e2e/i);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('button', { name: /activate trade receptionist/i })).toBeEnabled();

    await expect.poll(async () => getClientByEmail(account.email)).toMatchObject({
      onboarding_complete: false,
    });

    await page.getByRole('button', { name: /activate trade receptionist/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(attempts).toBe(2);

    await expect.poll(async () => getClientByEmail(account.email)).toMatchObject({
      onboarding_complete: true,
    });
  } finally {
    await cleanupAccount(account);
  }
});
