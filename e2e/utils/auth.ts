import type { Browser, BrowserContext, Page } from '@playwright/test';
import { baseURL } from './env';
import { magicLinkFor } from './supabase-admin';
import { createConfirmedTestUser, type TestUser } from './test-users';

export interface AuthenticatedAccount extends TestUser {
  context?: BrowserContext;
}

async function waitForSupabaseSession(page: Page) {
  await page.waitForFunction(() =>
    Object.keys(localStorage).some((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
  );
}

export async function authenticatePage(page: Page, email?: string): Promise<TestUser> {
  const user = await createConfirmedTestUser(email);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(await magicLinkFor(user.email, `${baseURL}/dashboard`), { waitUntil: 'load' });
  await page.waitForURL(/\/(dashboard|onboarding|login)/);
  await waitForSupabaseSession(page);
  return user;
}

export async function authenticatedContext(browser: Browser, email?: string): Promise<AuthenticatedAccount> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const user = await authenticatePage(page, email);
  await page.close();
  return { ...user, context };
}
