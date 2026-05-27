import { expect, test } from '@playwright/test';
import { apiBaseURL, validateE2EEnv } from './utils/env';
import { createConfirmedTestUser } from './utils/test-users';
import { cleanupTestUserAndData } from './utils/cleanup';

test('E2E infrastructure preflight is usable', async ({ page }) => {
  validateE2EEnv();

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  const health = await fetch(`${apiBaseURL}/health`);
  expect(health.status).toBe(200);

  const user = await createConfirmedTestUser();
  await cleanupTestUserAndData(user.email);
});
