/**
 * auth.setup.ts
 *
 * Runs once before all tests (via `dependencies: ['setup']` in playwright.config.ts).
 * Creates/confirms the test user via Supabase admin API, generates a magic link,
 * navigates to it so the browser captures the session, then saves the storage state.
 *
 * Why magic link injection and not a password?
 * The app uses Supabase OTP (magic link) as its ONLY auth method — there is no
 * password field in LoginPage.tsx. Attempting to call signInWithPassword() would
 * fail because the test user has no password set.
 */

import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SUPABASE_URL       = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL         = process.env.TEST_EMAIL!;
const BASE_URL           = process.env.TEST_BASE_URL || 'http://localhost:3000';
const AUTH_FILE          = path.join(__dirname, '.auth/user.json');

async function supabaseAdmin(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function supabaseAdminGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    headers: {
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  return res.json();
}

setup('authenticate test user', async ({ page }) => {
  // ── 1. Ensure the test user exists and is confirmed ───────────────────────
  // Try to create — if it already exists the API returns an error we ignore.
  await supabaseAdmin('users', {
    email:          TEST_EMAIL,
    email_confirm:  true,
    // No password — this app uses magic link only.
  });

  // ── 2. Generate a magic link via admin API ────────────────────────────────
  // The response has action_link at the top level (not under .properties).
  // Supabase only allows redirect_to URLs whitelisted in the dashboard, so we
  // patch the redirect_to in the verify URL after generation.
  const linkRes = await supabaseAdmin('generate_link', {
    type:  'magiclink',
    email: TEST_EMAIL,
  });

  const rawActionLink: string | undefined = linkRes?.action_link as string | undefined;
  if (!rawActionLink) {
    throw new Error(`[auth.setup] Failed to generate magic link: ${JSON.stringify(linkRes)}`);
  }

  // Patch redirect_to to point at localhost (Supabase redirects to whatever is in the URL)
  const verifyUrl = new URL(rawActionLink);
  verifyUrl.searchParams.set('redirect_to', `${BASE_URL}/dashboard`);
  const actionLink = verifyUrl.toString();

  // ── 3. Navigate to the magic link — Supabase sets the session in storage ─
  // The verify URL redirects to localhost/dashboard with #access_token=... in the hash.
  // The Supabase client picks up the hash tokens and writes them to localStorage async.
  await page.goto(actionLink, { waitUntil: 'load', timeout: 30_000 });

  // Wait for the redirect to reach our app (dashboard or onboarding)
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });

  // Wait for Supabase to write the session to localStorage — it processes the URL
  // hash asynchronously, so we must not save storageState until the key exists.
  await page.waitForFunction(() => {
    return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  }, { timeout: 10_000 });

  // ── 4. Save storage state (cookies + localStorage) for all tests ──────────
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  console.log(`[auth.setup] Session saved for ${TEST_EMAIL} → ${AUTH_FILE}`);
});
