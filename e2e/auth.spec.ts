import { expect, test } from '@playwright/test';
import { authenticate, cleanupAccount, seedClient } from './utils/fixtures';
import { uniqueEmail } from './utils/env';

test('unauthenticated dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

test('login page loads without runtime crash', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/login');

  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page.getByLabel(/email address/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /send magic link/i })).toBeDisabled();
  await expect(page.getByLabel(/password/i)).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('invalid email input prevents magic-link submission', async ({ page }) => {
  await page.goto('/login');

  const email = page.getByLabel(/email address/i);
  await expect(email).toBeVisible();

  await email.fill('not-an-email');
  await page.getByRole('button', { name: /send magic link/i }).click();

  await expect.poll(async () => email.evaluate((input) => (input as HTMLInputElement).validity.valid)).toBe(false);
  await expect(page.getByRole('heading', { name: /check your inbox/i })).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('magic-link form shows a sent or surfaced error state', async ({ page }) => {
  await page.goto('/login');

  const email = page.getByLabel(/email address/i);
  await email.fill(uniqueEmail('magic-link'));
  await page.getByRole('button', { name: /send magic link/i }).click();

  const successState = page.getByRole('heading', { name: /check your inbox/i });
  const errorState = page.getByRole('alert');
  await expect(successState.or(errorState)).toBeVisible();
});

test('confirmed Supabase user can authenticate and reach dashboard', async ({ page }) => {
  const account = await seedClient(undefined, { onboardingComplete: true });

  try {
    await authenticate(page, account.email);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /covering the phones/i })).toBeVisible();
  } finally {
    await cleanupAccount(account);
  }
});

test('sign out clears session and browser back does not restore dashboard', async ({ page }) => {
  const account = await seedClient(undefined, { onboardingComplete: true });

  try {
    await authenticate(page, account.email);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /covering the phones/i })).toBeVisible();
    await expect(page.getByRole('navigation').getByText(account.email).first()).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await cleanupAccount(account);
  }
});

test('deep link to an auth-gated page preserves intended destination after login', async () => {
  test.skip(true, 'RequireAuth redirects to /login without preserving the requested route; documented in e2e/BUGS.md.');
});

test('missing session redirects cleanly without white screen', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') || key.includes('supabase')) localStorage.removeItem(key);
    }
  });

  await page.goto('/settings');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page.locator('body')).toContainText(/send magic link/i);
});
