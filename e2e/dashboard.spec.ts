import { expect, test, type Page } from '@playwright/test';
import { authenticate, cleanupAccount, seedClient, type TestAccount } from './utils/fixtures';
import { restInsert, restPatch } from './utils/supabase-admin';
import { uniqueEmail, uniqueId } from './utils/env';

const primaryPhone = '+447700900301';
const bookedPhone = '+447700900302';
const spamPhone = '+447700900303';
const overflowPhone = '+447700900350';

test.beforeEach(() => {
  test.setTimeout(120_000);
});

async function seedCall(
  clientId: string,
  values: {
    phone: string;
    outcome: 'booked' | 'lead_captured' | 'spam' | 'enquiry';
    durationSecs: number;
    startedAt: string;
    emergency?: boolean;
    recording?: boolean;
  }
) {
  return restInsert<{ id: string }>('calls', {
    client_id: clientId,
    retell_call_id: uniqueId('dash_call'),
    caller_number: values.phone,
    direction: 'inbound',
    duration_secs: values.durationSecs,
    outcome: values.outcome,
    is_emergency: values.emergency ?? false,
    recording_url: values.recording ? `https://example.test/recordings/${uniqueId('recording')}.wav` : null,
    started_at: values.startedAt,
    ended_at: new Date(new Date(values.startedAt).getTime() + values.durationSecs * 1000).toISOString(),
  });
}

async function seedTranscript(callId: string, summary: string) {
  return restInsert<{ id: string }>('transcripts', {
    call_id: callId,
    full_text: `${summary} Full transcript for E2E dashboard coverage.`,
    summary,
    raw_json: { source: 'e2e', id: uniqueId('dash_transcript') },
  });
}

async function seedLead(
  clientId: string,
  callId: string,
  values: {
    name: string;
    phone: string;
    email: string;
    jobType: string;
    status: 'new' | 'booked';
    urgency: 'routine' | 'emergency';
    notes: string;
  }
) {
  return restInsert<{ id: string }>('leads', {
    client_id: clientId,
    call_id: callId,
    caller_name: values.name,
    caller_number: values.phone,
    caller_email: values.email,
    postcode: 'SW1A 1AA',
    job_type: values.jobType,
    urgency: values.urgency,
    notes: values.notes,
    status: values.status,
  });
}

async function seedDashboardAccount(options: { withActivity?: boolean; manyCalls?: boolean } = {}) {
  const account = await seedClient(undefined, {
    onboardingComplete: true,
    businessName: `Dashboard ${uniqueId('biz').slice(-8)} Plumbing`,
  });

  if (!options.withActivity && !options.manyCalls) return account;

  const leadCall = await seedCall(account.clientId!, {
    phone: primaryPhone,
    outcome: 'lead_captured',
    durationSecs: 142,
    startedAt: '2026-05-20T10:15:00.000Z',
    emergency: true,
    recording: true,
  });
  await seedTranscript(leadCall.id, 'Boiler repair enquiry in SW1A 1AA.');
  await seedLead(account.clientId!, leadCall.id, {
    name: 'Jane Dashboard',
    phone: primaryPhone,
    email: uniqueEmail('jane-dashboard'),
    jobType: 'Boiler repair',
    status: 'new',
    urgency: 'emergency',
    notes: 'Caller needs a boiler repair this week.',
  });

  const bookedCall = await seedCall(account.clientId!, {
    phone: bookedPhone,
    outcome: 'booked',
    durationSecs: 65,
    startedAt: '2026-05-19T09:00:00.000Z',
    recording: true,
  });
  await seedTranscript(bookedCall.id, 'Bathroom fitting booked for next week.');
  await seedLead(account.clientId!, bookedCall.id, {
    name: 'Ben Booked',
    phone: bookedPhone,
    email: uniqueEmail('ben-booked'),
    jobType: 'Bathroom fitting',
    status: 'booked',
    urgency: 'routine',
    notes: 'Booked job from dashboard fixture.',
  });

  await seedCall(account.clientId!, {
    phone: spamPhone,
    outcome: 'spam',
    durationSecs: 30,
    startedAt: '2026-05-18T08:30:00.000Z',
  });

  if (options.manyCalls) {
    await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        seedCall(account.clientId!, {
          phone: `${overflowPhone}${String(index).padStart(2, '0')}`,
          outcome: index % 2 === 0 ? 'enquiry' : 'lead_captured',
          durationSecs: 40 + index,
          startedAt: new Date(Date.UTC(2026, 4, 17, 8, index)).toISOString(),
        })
      )
    );
  }

  return account;
}

async function signInAndGo(page: Page, account: TestAccount, path: string) {
  await authenticate(page, account.email);
  await page.goto(path);
}

test('unauthenticated user cannot access dashboard pages', async ({ page }) => {
  for (const path of ['/dashboard', '/dashboard/calls', '/dashboard/leads']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  }
});

test('authenticated subscriber can access dashboard and see seeded client data', async ({ page }) => {
  const account = await seedDashboardAccount({ withActivity: true });

  try {
    await signInAndGo(page, account, '/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /covering the phones/i })).toBeVisible();
    await expect(page.getByRole('navigation').getByText(account.email).first()).toBeVisible();
    await expect(page.getByText(/review recent calls/i)).toBeVisible();
    await expect(page.getByText(/act on captured leads/i)).toBeVisible();
  } finally {
    await cleanupAccount(account);
  }
});

test('dashboard KPI cards and recent calls reflect seeded records', async ({ page }) => {
  const account = await seedDashboardAccount({ withActivity: true });

  try {
    await signInAndGo(page, account, '/dashboard');

    await expect(page.getByTestId('dashboard-stat-total-calls')).toContainText('Total calls');
    await expect(page.getByTestId('dashboard-stat-total-calls')).toContainText('3');
    await expect(page.getByTestId('dashboard-stat-total-leads')).toContainText('Leads captured');
    await expect(page.getByTestId('dashboard-stat-total-leads')).toContainText('2');
    await expect(page.getByText('Jobs booked').locator('..')).toContainText('1');
    await expect(page.getByText('Emergencies').locator('..')).toContainText('1');

    const recentCalls = page.getByTestId('dashboard-recent-calls');
    await expect(recentCalls).toContainText(primaryPhone);
    await expect(recentCalls).toContainText(bookedPhone);
    await expect(recentCalls).toContainText(spamPhone);
    await expect(recentCalls).toContainText('Lead');
    await expect(recentCalls).toContainText('Booked');
    await expect(recentCalls).toContainText('Spam');
  } finally {
    await cleanupAccount(account);
  }
});

test('canceled subscription state is visible in dashboard', async ({ page }) => {
  const account = await seedDashboardAccount({ withActivity: true });

  try {
    await restPatch('clients', `id=eq.${account.clientId}`, {
      subscription_status: 'canceled',
      payment_status: 'canceled',
      is_active: false,
    });

    await signInAndGo(page, account, '/dashboard');

    const banner = page.getByTestId('subscription-status-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Subscription canceled');
    await expect(banner).toContainText('paused');
  } finally {
    await cleanupAccount(account);
  }
});

test('/dashboard/calls renders seeded call fields and outcome filter works', async ({ page }) => {
  const account = await seedDashboardAccount({ withActivity: true });

  try {
    await signInAndGo(page, account, '/dashboard/calls');

    await expect(page.getByRole('heading', { name: /every conversation/i })).toBeVisible();
    await expect(page.getByText(primaryPhone).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('20 May 2026').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('2m 22s').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Lead').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /play/i }).first()).toHaveAttribute('href', /recordings/);

    await page.getByLabel(/filter by outcome/i).selectOption('lead_captured');
    await expect(page.getByText(primaryPhone).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(bookedPhone).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByText(spamPhone).filter({ visible: true })).toHaveCount(0);

    await page.getByLabel(/filter by outcome/i).selectOption('booked');
    await expect(page.getByText(bookedPhone).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(primaryPhone).filter({ visible: true })).toHaveCount(0);
  } finally {
    await cleanupAccount(account);
  }
});

test('/dashboard/calls empty state appears for a client with zero calls', async ({ page }) => {
  const account = await seedDashboardAccount();

  try {
    await signInAndGo(page, account, '/dashboard/calls');

    await expect(page.getByText(/no calls yet/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /review settings/i })).toBeVisible();
  } finally {
    await cleanupAccount(account);
  }
});

test('/dashboard/leads renders seeded leads', async ({ page }) => {
  const account = await seedDashboardAccount({ withActivity: true });

  try {
    await signInAndGo(page, account, '/dashboard/leads');

    await expect(page.getByRole('heading', { name: /captured work/i })).toBeVisible();
    await expect(page.getByText('Jane Dashboard')).toBeVisible();
    await expect(page.getByText(primaryPhone)).toBeVisible();
    await expect(page.getByText('Boiler repair', { exact: true })).toBeVisible();
    await expect(page.getByText(/caller needs a boiler repair/i)).toBeVisible();
    await expect(page.getByLabel(/update status for jane dashboard/i)).toHaveValue('new');

    await expect(page.getByText('Ben Booked')).toBeVisible();
    await expect(page.getByText('Bathroom fitting', { exact: true })).toBeVisible();
    await expect(page.getByLabel(/update status for ben booked/i)).toHaveValue('booked');
  } finally {
    await cleanupAccount(account);
  }
});

test('50 plus calls render in the calls page loaded dataset', async ({ page }) => {
  const account = await seedDashboardAccount({ manyCalls: true });

  try {
    await signInAndGo(page, account, '/dashboard/calls');

    await expect(page.getByRole('main')).toContainText('53 in view');
    await expect(page.getByText(`${overflowPhone}49`).filter({ visible: true }).first()).toBeVisible();
  } finally {
    await cleanupAccount(account);
  }
});

test('date filter works if implemented', async () => {
  test.skip(true, 'Dashboard calls page has outcome filtering only; no date filter UI is implemented. Documented in e2e/BUGS.md.');
});

test('call detail opens transcript and details if implemented', async () => {
  test.skip(true, 'Dashboard calls page has no call-detail view and does not render transcript summaries. Documented in e2e/BUGS.md.');
});

test('pagination or load-more works with 50 plus records if implemented', async () => {
  test.skip(true, 'Calls and leads pages load up to 200 records directly and expose no pagination/load-more controls. Documented in e2e/BUGS.md.');
});
