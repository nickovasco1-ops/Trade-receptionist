import { expect, test, type Page } from '@playwright/test';
import { blockStripeNavigation } from './utils/providers';

const livePaymentLinkIds = [
  '7sY3cwaXI6pl7jAd5k6wE00',
  'dRmdRa4zk5lh33ke9o6wE01',
  '00w3cwd5QeVRfQ66GW6wE02',
];

test.beforeEach(() => {
  test.setTimeout(120_000);
});

async function openPricingModal(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const cta = page.getByRole('button', { name: /start free trial/i }).first();
  await expect(cta).toBeVisible();
  await cta.click({ force: true });
  await expect(page.getByRole('heading', { name: /start your free trial/i })).toBeVisible();
}

async function choosePlan(page: Page, testId: string) {
  const planButton = page.getByTestId(testId);
  await expect(planButton).toBeVisible();
  await planButton.click({ force: true });
  await expect(page.getByTestId('stripe-checkout-cta')).toBeVisible();
}

async function switchPlan(page: Page) {
  const switchButton = page.getByRole('button', { name: /switch plan/i });
  await expect(switchButton).toBeVisible();
  await switchButton.click({ force: true });
  await expect(page.getByRole('heading', { name: /start your free trial/i })).toBeVisible();
}

// Prices are asserted against src/lib/plans.ts, the single source of truth
// (§14). This previously encoded the dead three-tier £29/£59/£119 scheme and
// had no Business tier at all — the same tier whose DB constraint was missing.
test('pricing CTA opens modal and shows all four plan choices', async ({ page }) => {
  await openPricingModal(page);

  await expect(page.getByTestId('stripe-plan-starter')).toContainText('Starter');
  await expect(page.getByTestId('stripe-plan-starter')).toContainText('£49');
  await expect(page.getByTestId('stripe-plan-pro')).toContainText('Pro');
  await expect(page.getByTestId('stripe-plan-pro')).toContainText('£89');
  await expect(page.getByTestId('stripe-plan-business')).toContainText('Business');
  await expect(page.getByTestId('stripe-plan-business')).toContainText('£159');
  await expect(page.getByTestId('stripe-plan-agency')).toContainText('Agency');
  await expect(page.getByTestId('stripe-plan-agency')).toContainText('£249');
});

test('E2E billing modal uses only Stripe test Payment Links for all plans', async ({ page }) => {
  await openPricingModal(page);

  for (const planId of ['stripe-plan-starter', 'stripe-plan-pro', 'stripe-plan-business', 'stripe-plan-agency']) {
    await choosePlan(page, planId);
    const href = await page.getByTestId('stripe-checkout-cta').getAttribute('href');

    expect(href).toMatch(/^https:\/\/buy\.stripe\.com\/test_/);
    for (const liveId of livePaymentLinkIds) {
      expect(href).not.toContain(liveId);
    }

    if (planId !== 'stripe-plan-agency') await switchPlan(page);
  }
});

test('checkout click reaches the Stripe boundary without completing hosted Stripe', async ({ page }) => {
  await blockStripeNavigation(page);
  await openPricingModal(page);
  await choosePlan(page, 'stripe-plan-pro');

  const checkout = page.getByTestId('stripe-checkout-cta');
  await expect(checkout).toHaveAttribute('href', /buy\.stripe\.com\/test_/);

  const popupPromise = page.waitForEvent('popup');
  await checkout.click();
  const stripePage = await popupPromise;

  await expect(stripePage).toHaveURL(/buy\.stripe\.com\/test_/);
  await expect(stripePage.getByRole('heading', { name: /stripe test checkout intercepted/i })).toBeVisible();
  await stripePage.close();
});
