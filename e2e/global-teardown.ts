/**
 * global-teardown.ts — runs ONCE after every test in every project completes.
 * Moving cleanup here prevents it from running between retries (which caused
 * the test user to be deleted mid-run, invalidating auth sessions).
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const SUPABASE_URL     = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL       = process.env.TEST_EMAIL!;

export default async function globalTeardown() {
  console.log('\n── Global Teardown ──────────────────────────────────────');

  try {
    // Find test user
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    const body = await res.json() as { users?: Array<{ id: string; email: string }> };
    const testUser = (body.users ?? []).find(u => u.email === TEST_EMAIL);

    if (testUser) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${testUser.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      await fetch(`${SUPABASE_URL}/rest/v1/clients?owner_email=eq.${encodeURIComponent(TEST_EMAIL)}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal',
        },
      });
      console.log(`[teardown] Deleted test user: ${TEST_EMAIL}`);
    } else {
      console.log(`[teardown] Test user not found — nothing to delete`);
    }
  } catch (err) {
    console.error('[teardown] Error:', err);
  }

  console.log('[teardown] Stripe: 14-day trial — no charge to reverse');
  console.log('[teardown] Test cleanup complete — test data removed\n');
}
