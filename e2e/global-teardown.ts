/**
 * global-teardown.ts — runs ONCE after every test in every project completes.
 *
 * Cleanup lives here rather than between tests because running it between
 * retries deleted the test user mid-run and invalidated auth sessions.
 *
 * **Why this is a sweep, not a targeted delete.** It used to remove only
 * `TEST_EMAIL`, but every `seedClient()` mints a unique address
 * (`client+<runId>-<rand>@tradereceptionist.test`) and those were cleaned only
 * by per-test `finally` blocks. A `finally` does not run when Playwright times
 * a test out or a worker dies, so every failed run left tenants behind. Five
 * were found stranded in production across three separate cleanups, briefly
 * reporting as broken customers in the health checks.
 *
 * Per-test cleanup still runs — it keeps the database small during a long run.
 * This is the backstop for everything it misses.
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const SUPABASE_URL     = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Every e2e identity lives under this domain. */
const TEST_DOMAIN = '@tradereceptionist.test';

/**
 * Health-suite seed tenants are a subdomain of the e2e domain and are owned by
 * the health runner, which creates and destroys them within a single check. A
 * concurrent health run must not have its tenants deleted underneath it.
 */
const HEALTH_DOMAIN = '@health.tradereceptionist.test';

/**
 * Only sweep identities older than this.
 *
 * Two CI runs can overlap — a push to two branches, or a re-run alongside a
 * fresh one. Without an age floor, one run's teardown would delete the other
 * run's tenants mid-test and fail it for no reason. The e2e job times out at 20
 * minutes, so nothing still in use is ever two hours old; anything that is, is
 * a leak from a previous run.
 *
 * The trade-off is deliberate: this run's own leaks are cleaned by the *next*
 * run rather than immediately. Per-test cleanup already handles the normal case.
 */
const MIN_AGE_MS = 2 * 60 * 60 * 1000;

function isStale(createdAt: string | undefined | null): boolean {
  const t = Date.parse(createdAt ?? '');
  return Number.isFinite(t) && Date.now() - t > MIN_AGE_MS;
}

/**
 * The one safety rule: this file may only ever delete an automated-test
 * identity. Anything else is a real customer.
 */
function isDeletable(email: string | undefined | null): boolean {
  const e = (email ?? '').toLowerCase();
  return e.endsWith(TEST_DOMAIN) && !e.endsWith(HEALTH_DOMAIN);
}

const headers = {
  apikey:        SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

async function sweepAuthUsers(): Promise<number> {
  let deleted = 0;

  // The admin list is paginated; a long run can create more than one page.
  for (let page = 1; page <= 20; page += 1) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers },
    );
    if (!res.ok) break;

    const body = await res.json() as { users?: Array<{ id: string; email: string; created_at?: string }> };
    const users = body.users ?? [];
    if (users.length === 0) break;

    for (const u of users) {
      if (!isDeletable(u.email) || !isStale(u.created_at)) continue;
      const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
        method: 'DELETE',
        headers,
      });
      if (del.ok) deleted += 1;
    }

    if (users.length < 200) break;
  }

  return deleted;
}

async function sweepClients(): Promise<number> {
  // PostgREST `like` with a wildcard. Child rows cascade on delete.
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?owner_email=like.*${encodeURIComponent(TEST_DOMAIN)}&select=id,owner_email,created_at`,
    { headers },
  );
  if (!res.ok) return 0;

  const rows = await res.json() as Array<{ id: string; owner_email: string; created_at?: string }>;
  const targets = rows.filter((r) => isDeletable(r.owner_email) && isStale(r.created_at));
  let deleted = 0;

  for (const r of targets) {
    const del = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${r.id}`, {
      method: 'DELETE',
      headers: { ...headers, Prefer: 'return=minimal' },
    });
    if (del.ok) deleted += 1;
  }

  return deleted;
}

export default async function globalTeardown() {
  console.log('\n── Global Teardown ──────────────────────────────────────');

  try {
    const clients = await sweepClients();
    const users   = await sweepAuthUsers();

    console.log(`[teardown] Swept ${clients} stale client row(s) and ${users} auth user(s) under ${TEST_DOMAIN}`);
    if (clients === 0 && users === 0) {
      console.log('[teardown] Nothing stale left behind — per-test cleanup did its job');
    }
  } catch (err) {
    // Never fail the run on teardown, but say so loudly: a silent teardown
    // failure is how the leak went unnoticed in the first place.
    console.error('[teardown] SWEEP FAILED — test tenants may be stranded in the database:', err);
  }

  console.log('[teardown] Stripe: 14-day trial — no charge to reverse');
  console.log('[teardown] Test cleanup complete\n');
}
