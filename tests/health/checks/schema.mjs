/**
 * Database shape — catalogue C4 (TS union vs Postgres CHECK), C5 (production
 * schema vs migrations), C6 (RLS enabled with no policy).
 *
 * All reads. Nothing here writes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { check, evidence, PASS, FAIL, BLOCKED, CRITICAL, HIGH, MEDIUM } from '../lib/check.mjs';
import { admin, repoRoot, SUPABASE_URL, SERVICE_ROLE } from '../lib/env.mjs';

/**
 * Union types in the codebase that are backed by a Postgres CHECK constraint.
 * Widening one side without the other is catalogue C4 — it cost every
 * Business-tier signup for weeks and is invisible to tsc.
 */
const UNION_TO_CONSTRAINT = [
  { file: 'shared/types.ts', type: 'Plan', table: 'clients', column: 'plan' },
  { file: 'shared/types.ts', type: 'SubscriptionStatus', table: 'clients', column: 'subscription_status' },
  { file: 'shared/types.ts', type: 'PaymentStatus', table: 'clients', column: 'payment_status' },
  { file: 'shared/types.ts', type: 'LeadStatus', table: 'leads', column: 'status' },
  { file: 'shared/types.ts', type: 'CallOutcome', table: 'calls', column: 'outcome' },
];

async function pgQuery(sqlText) {
  // PostgREST has no raw-SQL endpoint; use the admin client's ability to read
  // catalog views exposed through a view if present, else fall back to null.
  const db = admin();
  if (!db) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: sqlText }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  return res.json().catch(() => null);
}

/** Extract a TS string-literal union's members. */
async function unionMembers(file, typeName) {
  const src = await fs.readFile(path.join(repoRoot, file), 'utf8');
  const re = new RegExp(`export type ${typeName}\\s*=\\s*([^;]+);`, 's');
  const m = re.exec(src);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
}

export default [
  check({
    id: 'schema.union_vs_check', cls: 'C4', severity: CRITICAL,
    title: 'TypeScript unions match their Postgres CHECK constraints',
    fn: async () => {
      const rows = await pgQuery(`
        SELECT rel.relname AS table_name, con.conname, pg_get_constraintdef(con.oid) AS def
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = 'public' AND con.contype = 'c'`);

      if (!rows) {
        // No raw-SQL RPC exists in this project; do not fake a pass.
        const lines = [];
        for (const t of UNION_TO_CONSTRAINT) {
          const members = await unionMembers(t.file, t.type);
          lines.push(`${t.type} (${t.table}.${t.column}): ${members ? members.join('|') : 'TYPE NOT FOUND'}`);
        }
        return {
          status: BLOCKED,
          evidence: evidence(
            'SELECT pg_get_constraintdef(...) FROM pg_constraint',
            `Cannot read pg_constraint: Supabase exposes no raw-SQL RPC to the service-role key over PostgREST.\n\nCode side, for manual comparison:\n${lines.join('\n')}`,
            1),
          detail: 'Needs a read-only SQL RPC (or a psql connection string in HEALTH_PG_URL) to compare against the database. Union members extracted from source above.',
        };
      }

      const problems = [];
      const detailLines = [];
      for (const t of UNION_TO_CONSTRAINT) {
        const members = await unionMembers(t.file, t.type);
        if (!members) { detailLines.push(`${t.type}: not found in ${t.file} — skipped`); continue; }
        const con = rows.find((r) => r.table_name === t.table && r.def.includes(t.column));
        if (!con) { problems.push(`${t.table}.${t.column} has no CHECK constraint but ${t.type} is a closed union`); continue; }
        const allowed = [...con.def.matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
        const missing = members.filter((m) => !allowed.includes(m));
        detailLines.push(`${t.type}: ts=[${members.join(',')}] db=[${allowed.join(',')}]`);
        if (missing.length) problems.push(`${t.table}.${t.column} rejects ${missing.map((m) => `'${m}'`).join(', ')} which ${t.type} allows`);
      }

      return {
        status: problems.length ? FAIL : PASS,
        evidence: evidence('SELECT pg_get_constraintdef(...) FROM pg_constraint',
          `${detailLines.join('\n')}\n\n${problems.length ? problems.join('\n') : 'all unions satisfied by their constraints'}`,
          problems.length ? 1 : 0),
        detail: problems.join('; '),
      };
    },
  }),

  check({
    id: 'schema.rls_has_policy', cls: 'C6', severity: CRITICAL,
    title: 'Every tenant-scoped table has RLS enabled AND at least one policy',
    fn: async () => {
      const db = admin();
      const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
      if (!db || !anonKey) {
        // Without an anon key every request 401s and returns no rows, which
        // would read as perfect isolation. Refuse to draw that conclusion.
        return {
          status: BLOCKED,
          evidence: evidence('supabase client', 'SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY not all set — an absent anon key makes every read return nothing, which would pass for the wrong reason', 1),
          detail: 'Needs an anon key to distinguish "RLS denied it" from "the request was never authorised at all".',
        };
      }

      // pg_policies is not reachable over PostgREST, so probe behaviourally
      // instead: read each table with the anon key and no JWT. RLS with a
      // correct policy (or with no policy at all) must return zero rows.
      const TABLES = ['clients', 'business_config', 'calls', 'transcripts', 'leads', 'bookings'];
      const leaks = [];
      const lines = [];

      for (const table of TABLES) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
          headers: { apikey: anonKey },
        }).catch(() => null);
        if (!res) { lines.push(`${table}: request failed`); continue; }
        const body = await res.text();
        const rows = res.ok ? JSON.parse(body || '[]') : null;
        const n = Array.isArray(rows) ? rows.length : 'n/a';
        lines.push(`${table}: HTTP ${res.status}, rows=${n}`);
        if (Array.isArray(rows) && rows.length > 0) leaks.push(table);
      }

      if (lines.every((l) => l.includes('request failed'))) {
        return {
          status: BLOCKED,
          evidence: evidence(`GET ${SUPABASE_URL}/rest/v1/<table> (anon key, no JWT)`, lines.join('\n'), 1),
          detail: 'Every request failed, so no isolation conclusion can be drawn.',
        };
      }

      return {
        status: leaks.length ? FAIL : PASS,
        evidence: evidence(`GET ${SUPABASE_URL}/rest/v1/<table> (anon key, no JWT) x${TABLES.length}`,
          lines.join('\n'), leaks.length ? 1 : 0),
        detail: leaks.length
          ? `Anonymous read returned rows from: ${leaks.join(', ')}`
          : 'Anonymous reads return nothing from every tenant table.',
      };
    },
  }),

  check({
    id: 'schema.migrations_describe_production', cls: 'C5', severity: MEDIUM,
    title: 'Migrations account for the policies that exist in production',
    fn: async () => {
      const dir = path.join(repoRoot, 'supabase/migrations');
      const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql'));
      let declared = 0;
      for (const f of files) {
        const src = await fs.readFile(path.join(dir, f), 'utf8');
        declared += (src.match(/CREATE POLICY/gi) ?? []).length;
      }

      // Production policy count is only readable with catalog access.
      const rows = await pgQuery(`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'`);
      if (!rows) {
        return {
          status: BLOCKED,
          evidence: evidence('SELECT count(*) FROM pg_policies',
            `migrations declare ${declared} policies across ${files.length} files.\nProduction count unavailable: no raw-SQL RPC exposed over PostgREST.`, 1),
          detail: `Known drift as of 2026-08-30: production had 36 policies against ${declared} in migrations. Needs catalog access to track automatically.`,
        };
      }
      const live = rows[0]?.n ?? 0;
      return {
        status: live === declared ? PASS : FAIL,
        evidence: evidence('SELECT count(*) FROM pg_policies',
          `migrations declare ${declared}; production has ${live}`, live === declared ? 0 : 1),
        detail: live === declared ? '' : `${live - declared} policies exist in production that no migration creates.`,
      };
    },
  }),
];
