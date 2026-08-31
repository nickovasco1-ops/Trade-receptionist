/**
 * Environment + client access for health checks.
 *
 * Read-only by contract. The service-role client bypasses RLS, so it is used
 * only for *reading* state and for seeding/cleaning the two designated health
 * tenants — never for touching real tenant rows.
 */
import * as dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '../../..');

// .env.test first (CI writes it), then .env as a local fallback. Neither
// overrides a value already in the environment.
dotenv.config({ path: path.join(repoRoot, '.env.test') });
dotenv.config({ path: path.join(repoRoot, '.env') });

export const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
export const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
export const API_BASE = (process.env.HEALTH_API_BASE_URL
  ?? process.env.PUBLIC_API_BASE_URL
  ?? 'https://trade-receptionist-production.up.railway.app').replace(/\/$/, '');

/**
 * The only tenants any health check may write to. Enforced by
 * `assertSeedTenant()` — every mutating helper goes through it.
 */
export const SEED_DOMAIN = '@health.tradereceptionist.test';
export const SEED_A = `health-tenant-a${SEED_DOMAIN}`;
export const SEED_B = `health-tenant-b${SEED_DOMAIN}`;

/**
 * Accounts that belong to us, not to customers. Vasco's Plumbing is the owner's
 * own test tenant: real Stripe subscription, real number, real agent — and so
 * indistinguishable from a customer to every check.
 *
 * Excluded from customer-health checks, never from security checks. The
 * exclusion is listed in every report by name, because a filter you cannot see
 * is how a system goes blind.
 */
export const INTERNAL_ACCOUNTS = (process.env.HEALTH_INTERNAL_ACCOUNTS
  ?? 'nickosuji21@gmail.com')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export const TEST_DOMAIN = 'tradereceptionist.test';

/** True for anything that is ours: automated tests or an internal account. */
export function isOurs(email) {
  const e = (email ?? '').toLowerCase();
  return e.endsWith(TEST_DOMAIN) || INTERNAL_ACCOUNTS.includes(e);
}

export function assertSeedTenant(email) {
  if (typeof email !== 'string' || !email.endsWith(SEED_DOMAIN)) {
    throw new Error(
      `refusing to write to "${email}" — health checks may only mutate ${SEED_DOMAIN} tenants`,
    );
  }
  return email;
}

let _admin = null;
export function admin() {
  if (!SUPABASE_URL || !SERVICE_ROLE) return null;
  _admin ??= createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/** A browser-equivalent client: anon key, optionally carrying a user JWT. */
export function asUser(accessToken) {
  if (!SUPABASE_URL || !ANON_KEY) return null;
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}

/** Run raw SQL through PostgREST's RPC if available, else return null. */
export async function sql(query) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/health_sql`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  return res.json();
}

export function missing(...names) {
  return names.filter((n) => !process.env[n] || !String(process.env[n]).trim());
}
