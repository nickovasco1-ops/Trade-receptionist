import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { authenticate, cleanupAccount, seedClient, type TestAccount } from './utils/fixtures';

test.describe.configure({ timeout: 120_000 });

async function expectNoCriticalAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const critical = results.violations.filter(violation => violation.impact === 'critical');
  expect(critical).toEqual([]);
}

async function expectMainStructure(page: Page) {
  const main = page.locator('main, [role="main"]').first();
  await expect(main).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function seedAccessibleAccount(options: { onboardingComplete?: boolean } = {}) {
  return seedClient(undefined, {
    onboardingComplete: options.onboardingComplete ?? true,
    retellAgentId: options.onboardingComplete === false ? null : undefined,
  });
}

async function signInAndOpen(page: Page, account: TestAccount, path: string) {
  await authenticate(page, account.email);
  await page.goto(path);
  await expectMainStructure(page);
}

test('login has no critical axe violations and supports labelled keyboard form access', async ({ page }) => {
  await page.goto('/login');

  await expectMainStructure(page);
  await expect(page.getByLabel(/email address/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /send magic link/i })).toBeDisabled();
  await expectNoCriticalAxeViolations(page);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/email address/i)).toBeFocused();
  await page.getByLabel(/email address/i).fill('accessibility@example.test');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /send magic link/i })).toBeFocused();
});

test('onboarding has no critical axe violations and exposes labelled core controls', async ({ page }) => {
  const account = await seedAccessibleAccount({ onboardingComplete: false });

  try {
    await signInAndOpen(page, account, '/onboarding');

    await expect(page.getByRole('progressbar', { name: /onboarding progress/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /friendly/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^continue$/i })).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  } finally {
    await cleanupAccount(account);
  }
});

test('dashboard has no critical axe violations and exposes app navigation landmarks', async ({ page }) => {
  const account = await seedAccessibleAccount({ onboardingComplete: true });

  try {
    await signInAndOpen(page, account, '/dashboard');

    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('link', { name: /calls/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i }).first()).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  } finally {
    await cleanupAccount(account);
  }
});

test('settings has no critical axe violations and supports keyboard form navigation', async ({ page }) => {
  const account = await seedAccessibleAccount({ onboardingComplete: true });

  try {
    await signInAndOpen(page, account, '/settings');

    await expect(page.getByLabel(/business name/i)).toBeVisible();
    await expect(page.getByLabel(/your mobile for sms alerts/i)).toBeVisible();
    await expect(page.getByTestId('settings-save-button')).toBeVisible();
    await expectNoCriticalAxeViolations(page);

    await page.getByLabel(/business name/i).focus();
    await expect(page.getByLabel(/business name/i)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/^your name$/i)).toBeFocused();
  } finally {
    await cleanupAccount(account);
  }
});

test('Stripe pricing modal exposes dialog semantics and traps keyboard focus', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /start free trial/i }).first().click();
  const dialog = page.getByRole('dialog', { name: /start your free trial/i });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: /close/i })).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('stripe-plan-agency')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /close/i })).toBeFocused();

  await expectNoCriticalAxeViolations(page);
});
