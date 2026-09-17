/**
 * Capture the onboarding-walkthrough screens from the repository's own public
 * preview routes (`/onboarding-preview`, `/dashboard-preview/*`) plus the real
 * `/login`, `/welcome` and marketing pricing surfaces.
 *
 * These are captures of the running application. Nothing here draws, retouches,
 * recolours or invents product UI.
 *
 * The one alteration made is `normalisePreviewChrome()`: preview-only scaffolding
 * (the "Preview mode" pills, the "safe dummy walkthrough" notice, the preview
 * account footer) is either hidden or replaced with the string the SAME slot
 * renders in production — every substitution is sourced from app code and listed
 * in ASSET-MANIFEST.md. A paying customer never sees the preview strings, so
 * leaving them in would make the film less faithful, not more.
 *
 * Usage:  node onboarding-walkthrough/capture/capture-screens.mjs [baseUrl]
 *   env   CHROMIUM_PATH  path to a Chromium binary (defaults to Playwright's)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../remotion/public/screens');
mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const SCALE = 2; // supersample; Remotion presents at 1920x1080

/**
 * Replace preview-only scaffolding with the copy production renders in the same
 * slot, per page kind. Every substitution below cites the app source it comes
 * from; none of it changes layout, colour or controls.
 */
async function normalisePreviewChrome(page, kind, { hideAccountBox = false } = {}) {
  await page.evaluate(({ kind, hideAccountBox }) => {
    const hide = (el) => { if (el) el.style.display = 'none'; };
    const exact = (sel, text) =>
      Array.from(document.querySelectorAll(sel)).filter((el) => el.textContent?.trim() === text);
    const startsWith = (sel, text) =>
      Array.from(document.querySelectorAll(sel)).filter((el) => el.textContent?.trim().startsWith(text));
    /** Rewrite an element's own text, leaving any icon children alone. */
    const setLabel = (el, value) => {
      if (!el) return;
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) { node.nodeValue = value; return; }
      }
      el.textContent = value;
    };

    // Third-party floats that overlay the marketing page — App.tsx:1693 / CrispChat.tsx
    hide(document.querySelector('a[aria-label="Chat with us on WhatsApp"]'));
    hide(document.querySelector('#crisp-chatbox'));

    if (kind === 'onboarding') {
      // Header pill: preview renders "Preview mode", production "About 3 minutes"
      // — OnboardingPage.tsx:961
      exact('div', 'Preview mode').forEach((el) => setLabel(el, 'About 3 minutes'));
      // Preview-only notice production never renders — OnboardingPage.tsx:1006-1014
      hide(startsWith('p', 'This is a safe dummy walkthrough')[0]?.parentElement);
    }

    if (kind === 'dashboard') {
      // Hero eyebrow "Preview" -> "Overview"      — DashboardPage.tsx:435
      exact('p', 'Preview').forEach((el) => setLabel(el, 'Overview'));
      // Hero subline                              — DashboardPage.tsx:440
      startsWith('p', 'Sample data — inspect the full UI without signing in.')
        .forEach((el) => setLabel(el, 'What was handled, what was captured, and what needs you next.'));
      // Hero pill has no production counterpart   — DashboardPreviewPage.tsx:363
      exact('div', 'Preview mode').forEach(hide);
      // Shell account box                         — DashboardShell.tsx:197,207
      exact('nav p', 'Preview mode').forEach((el) => setLabel(el, 'Signed in'));
      exact('nav button', 'Exit preview').forEach((el) => setLabel(el, 'Sign out'));
      startsWith('nav p', 'preview@').forEach((el) => setLabel(el, 'dave@hendricksplumbing.co.uk'));
      // Settings preview-only aside               — DashboardPreviewPage.tsx:1018
      hide(startsWith('p', 'This is shown in preview so you can inspect')[0]);
      // The account box is sticky inside an overflow-hidden ancestor, so on a
      // scrolled page it detaches and floats alone in the gutter. Omit it there.
      // On a deeply scrolled page the whole nav panel has travelled off the top,
      // leaving an empty glass shell in the gutter. Omit it rather than show it.
      if (hideAccountBox) hide(document.querySelector('nav')?.parentElement);
    }
  }, { kind, hideAccountBox });
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(650);
}

/** Put `locator` `topOffset` px below the top of whichever ancestor actually scrolls. */
async function frameOn(page, locator, topOffset = 150) {
  await locator.first().scrollIntoViewIfNeeded();
  await locator.first().evaluate((el, off) => {
    let sc = el.parentElement;
    while (sc && sc !== document.body) {
      const s = getComputedStyle(sc);
      if (/(auto|scroll)/.test(s.overflowY) && sc.scrollHeight > sc.clientHeight + 4) break;
      sc = sc.parentElement;
    }
    const target = sc && sc !== document.body ? sc : document.scrollingElement;
    const base = sc && sc !== document.body ? sc.getBoundingClientRect().top : 0;
    target.scrollTop += el.getBoundingClientRect().top - base - off;
  }, topOffset);
  await page.waitForTimeout(450);
}

async function shot(page, name, kind = 'plain', opts) {
  await normalisePreviewChrome(page, kind, opts);
  await settle(page);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y: 0, ...VIEWPORT } });
  console.log(`  ✓ ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars'],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    reducedMotion: 'reduce', // app honours prefers-reduced-motion: final states only
    colorScheme: 'dark',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.warn('  ! pageerror:', e.message));

  // ── 01 Free trial ────────────────────────────────────────────────────────
  console.log('01 free trial');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(page);
  await frameOn(page, page.locator('#pricing'), 0);
  await shot(page, '01-free-trial', 'marketing');

  await page.getByRole('button', { name: /start free trial/i }).first().click();
  await page.waitForTimeout(900);
  await shot(page, '01b-free-trial-checkout', 'marketing');

  // ── 02 Passwordless sign-in ──────────────────────────────────────────────
  console.log('02 passwordless sign-in');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await shot(page, '02-passwordless-signin');

  // ── 03-07 Onboarding wizard ──────────────────────────────────────────────
  console.log('03-07 onboarding wizard');
  await page.goto(`${BASE}/onboarding-preview`, { waitUntil: 'networkidle' });
  await shot(page, '03-receptionist-tone', 'onboarding');

  const advance = async (label, name) => {
    await page.getByRole('button', { name: label }).first().click();
    await page.waitForTimeout(600);
    await shot(page, name, 'onboarding');
  };
  await advance(/^continue$/i, '04-business-details');
  await advance(/^continue$/i, '05-services');
  await advance(/^continue$/i, '06-working-hours');
  await advance(/^continue$/i, '06b-contact-alerts');
  await page.getByRole('button', { name: /^review setup$/i }).first().click();
  await page.waitForTimeout(600);
  await frameOn(page, page.getByRole('button', { name: /activate trade receptionist/i }), 740);
  await shot(page, '07-setup-review', 'onboarding');

  // ── 08 Receptionist live ─────────────────────────────────────────────────
  console.log('08 receptionist live');
  await page.goto(`${BASE}/welcome`, { waitUntil: 'networkidle' });
  await shot(page, '08-receptionist-live');

  // ── 09 Dashboard ─────────────────────────────────────────────────────────
  console.log('09 dashboard');
  await page.goto(`${BASE}/dashboard-preview`, { waitUntil: 'networkidle' });
  await shot(page, '09-dashboard', 'dashboard');

  // ── 10 Recent calls ──────────────────────────────────────────────────────
  console.log('10 recent calls');
  await page.goto(`${BASE}/dashboard-preview/calls`, { waitUntil: 'networkidle' });
  await shot(page, '10-recent-calls', 'dashboard');

  // ── 11 Settings / call diversion ─────────────────────────────────────────
  console.log('11 settings / diversion');
  await page.goto(`${BASE}/dashboard-preview/settings`, { waitUntil: 'networkidle' });
  await shot(page, '11-settings-diversion', 'dashboard');
  await frameOn(page, page.getByText(/divert activation code/i), 560);
  await shot(page, '11b-settings-divert-code', 'dashboard', { hideAccountBox: true });

  // ── 12 Connected calendar ────────────────────────────────────────────────
  console.log('12 connected calendar');
  await frameOn(page, page.getByText(/^google calendar$/i), 300);
  await shot(page, '12-connected-calendar', 'dashboard', { hideAccountBox: true });

  // Spare: leads board
  await page.goto(`${BASE}/dashboard-preview/leads`, { waitUntil: 'networkidle' });
  await shot(page, 'x-leads', 'dashboard');

  await browser.close();
  console.log(`\nWrote screens to ${OUT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
