import { expect, test, type Page } from '@playwright/test';

const baseURL = (process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const apiBaseURL = (process.env.TEST_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const publicRoutes = ['/', '/login', '/terms', '/privacy', '/welcome'];

async function expectNoRuntimeCrash(page: Page, route: string) {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response?.ok(), `${route} should return a successful document response`).toBe(true);
  await expect(page.locator('#root')).toBeVisible();
  await expect.poll(async () => (await page.locator('#root').innerText()).trim().length).toBeGreaterThan(20);
  expect(pageErrors, `${route} should not throw browser runtime errors`).toEqual([]);
}

test('frontend document loads', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Trade Receptionist/i);
  await expect(page.locator('#root')).toBeVisible();
});

test('login page loads', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

test('API health endpoint responds', async () => {
  const response = await fetch(`${apiBaseURL}/health`);
  expect(response.status).toBe(200);

  const body = await response.json() as { ok?: boolean; timestamp?: string };
  expect(body.ok).toBe(true);
  expect(body.timestamp).toEqual(expect.any(String));
});

test('protected dashboard redirects unauthenticated users to login', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  const loginURL = new URL('/login', baseURL);
  loginURL.searchParams.set('redirectTo', '/dashboard');
  await expect(page).toHaveURL(loginURL.toString());
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

test('public routes do not crash', async ({ page }) => {
  for (const route of publicRoutes) {
    await test.step(route, async () => {
      await expectNoRuntimeCrash(page, route);
    });
  }
});
