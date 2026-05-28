import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  authenticate,
  cleanupAccount,
  seedCallAndLead,
  seedClient,
  type TestAccount,
} from './utils/fixtures';
import { testPhone, uniqueId } from './utils/env';
import { interceptProviderSideEffects } from './utils/providers';

test.describe.configure({ timeout: 120_000 });

const mobileSteps = ['receptionist', 'business', 'services', 'hours', 'contact', 'ready'] as const;

async function expectNoCriticalHorizontalOverflow(page: Page) {
  await expect.poll(async () =>
    page.evaluate(() => {
      const allowedOverflowPx = 2;
      return document.documentElement.scrollWidth - window.innerWidth <= allowedOverflowPx;
    })
  ).toBe(true);
}

async function expectTapTarget(locator: Locator, label: string) {
  const target = locator.filter({ visible: true }).first();
  await expect(target).toBeVisible();
  await expect.poll(async () => target.boundingBox(), {
    message: `${label} should have a measurable hit area`,
  }).not.toBeNull();
  const box = await target.boundingBox();
  expect(box, `${label} should have a measurable hit area`).not.toBeNull();
  expect(box!.width, `${label} should be at least 44px wide`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} should be at least 44px tall`).toBeGreaterThanOrEqual(44);
}

async function signInMobile(page: Page, account: TestAccount, path: string) {
  await authenticate(page, account.email);
  await page.goto(path);
  await expectNoCriticalHorizontalOverflow(page);
}

async function openMobileMenu(page: Page) {
  const openMenu = page.getByRole('button', { name: /open menu/i });
  const drawer = page.getByRole('dialog', { name: /main navigation/i });
  if (await openMenu.getAttribute('aria-expanded') !== 'true') {
    await expectTapTarget(openMenu, 'mobile open menu button');
    await openMenu.click();
  }
  await expect(page.getByRole('dialog', { name: /main navigation/i })).toBeVisible();
  await expect.poll(async () => drawer.evaluate((el) => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(-1);
  return drawer;
}

async function expectMobileStep(page: Page, step: typeof mobileSteps[number]) {
  await expect(page.getByTestId(`onboarding-step-${step}`)).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
}

async function seedMobileOnboardingAccount() {
  return seedClient(undefined, {
    onboardingComplete: false,
    retellAgentId: null,
    businessName: `Mobile ${uniqueId('biz').slice(-8)} Plumbing`,
  });
}

async function completeMobileOnboarding(page: Page) {
  await expectMobileStep(page, 'receptionist');
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expectMobileStep(page, 'business');
  await page.getByLabel(/business name/i).fill(`Mobile Ready ${uniqueId('biz').slice(-8)} Plumbing`);
  await page.getByLabel(/trade type/i).selectOption('Plumber');
  await page.getByLabel(/city \/ area/i).fill('South London');
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expectMobileStep(page, 'services');
  await page.getByRole('button', { name: /^boiler repair$/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expectMobileStep(page, 'hours');
  await page.getByLabel(/start time/i).fill('08:00');
  await page.getByLabel(/end time/i).fill('18:00');
  await page.getByRole('button', { name: /^continue$/i }).click();

  await expectMobileStep(page, 'contact');
  await page.getByLabel(/^your name$/i).fill('Mobile Owner');
  await page.getByLabel(/mobile for summaries/i).fill(testPhone);
  await page.getByRole('button', { name: /review setup/i }).click();

  await expectMobileStep(page, 'ready');
  await page.getByRole('button', { name: /activate trade receptionist/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectNoCriticalHorizontalOverflow(page);
}

test('login is usable on mobile without critical horizontal overflow', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page.getByLabel(/email address/i)).toBeVisible();
  await expectTapTarget(page.getByRole('button', { name: /send magic link/i }), 'send magic link button');
  await expectNoCriticalHorizontalOverflow(page);
});

test('onboarding core path is usable on mobile', async ({ page }) => {
  const account = await seedMobileOnboardingAccount();

  try {
    await interceptProviderSideEffects(page);
    await signInMobile(page, account, '/onboarding');
    await completeMobileOnboarding(page);
  } finally {
    await cleanupAccount(account);
  }
});

test('dashboard mobile navigation reaches calls, leads, and settings', async ({ page }) => {
  const account = await seedClient(undefined, { onboardingComplete: true });

  try {
    await signInMobile(page, account, '/dashboard');
    await expect(page.getByRole('heading', { name: /covering the phones/i })).toBeVisible();

    let drawer = await openMobileMenu(page);
    await drawer.getByRole('link', { name: /calls/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/calls$/);
    await expect(page.getByRole('heading', { name: /every conversation/i })).toBeVisible();
    await expectNoCriticalHorizontalOverflow(page);

    drawer = await openMobileMenu(page);
    await drawer.getByRole('link', { name: /leads/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/leads$/);
    await expect(page.getByRole('heading', { name: /captured work/i })).toBeVisible();
    await expectNoCriticalHorizontalOverflow(page);

    drawer = await openMobileMenu(page);
    await drawer.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: /keep your receptionist aligned/i })).toBeVisible();
    await expectNoCriticalHorizontalOverflow(page);
  } finally {
    await cleanupAccount(account);
  }
});

test('mobile call log adapts into cards instead of requiring a desktop table', async ({ page }) => {
  const account = await seedClient(undefined, { onboardingComplete: true });

  try {
    await seedCallAndLead(account.clientId!);
    await signInMobile(page, account, '/dashboard/calls');

    await expect(page.getByRole('heading', { name: /every conversation/i })).toBeVisible();
    await expect(page.getByText('+447700900222').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByLabel(/filter by outcome/i)).toBeVisible();
    await expect(page.getByText(/recording/i).filter({ visible: true }).first()).toBeVisible();
    await expectNoCriticalHorizontalOverflow(page);

    const desktopHeader = page.getByText(/^Caller$/).filter({ visible: true });
    await expect(desktopHeader).toHaveCount(0);
  } finally {
    await cleanupAccount(account);
  }
});

test('primary mobile tap targets are reasonably usable', async ({ page }) => {
  const account = await seedClient(undefined, { onboardingComplete: true });

  try {
    await signInMobile(page, account, '/dashboard');
    const drawer = await openMobileMenu(page);
    await expectTapTarget(drawer.getByRole('button', { name: /close menu/i }), 'mobile close menu button');
    await expectTapTarget(drawer.getByRole('link', { name: /overview/i }), 'overview navigation link');
    await drawer.getByRole('link', { name: /settings/i }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expectTapTarget(page.getByRole('button', { name: /open menu/i }), 'settings open menu button');
    await expectTapTarget(page.getByTestId('settings-save-button'), 'settings save button');
  } finally {
    await cleanupAccount(account);
  }
});
