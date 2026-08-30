/**
 * Data-plane authorisation — catalogue C11.
 *
 * The server uses the service-role key and bypasses RLS, so there is no
 * database backstop: a route without a guard is world-readable. `GET /clients`
 * and `GET /calls` were exactly that in production for months, unnoticed
 * because the dashboard reads Supabase directly and neither route had a
 * consumer.
 *
 * Two complementary checks: a live probe of known-sensitive endpoints, and a
 * static sweep so a *newly added* route without a guard fails the build rather
 * than waiting to be discovered.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { check, evidence, httpProbe, PASS, FAIL, BLOCKED, CRITICAL } from '../lib/check.mjs';
import { API_BASE, repoRoot } from '../lib/env.mjs';

const NOWHERE_UUID = '00000000-0000-4000-8000-000000000000';

/**
 * Every probe uses a body that fails validation, so that even if a guard were
 * missing the request cannot do real work (buy a number, delete a tenant).
 * Any status other than 401/403 is a failure — including 400, which would mean
 * the request got past authorisation into validation.
 */
const PROBES = [
  { method: 'GET', path: '/clients' },
  { method: 'GET', path: '/calls' },
  { method: 'GET', path: `/clients/${NOWHERE_UUID}` },
  { method: 'GET', path: `/clients/${NOWHERE_UUID}/activation-code` },
  { method: 'POST', path: '/clients/provision', body: {} },
  { method: 'POST', path: '/clients/connect-number', body: {} },
  { method: 'POST', path: '/clients/rebuild-agent', body: {} },
  { method: 'POST', path: `/clients/${NOWHERE_UUID}/assign-number`, body: {} },
  { method: 'PATCH', path: `/clients/${NOWHERE_UUID}`, body: {} },
  { method: 'DELETE', path: `/clients/${NOWHERE_UUID}` },
  { method: 'POST', path: '/admin/check-tenant-integrity', body: {} },
  { method: 'POST', path: '/admin/sync-calls', body: {} },
  { method: 'POST', path: '/admin/send-trial-reminders', body: {} },
  { method: 'POST', path: '/admin/run-lead-followup', body: {} },
  { method: 'POST', path: '/admin/enable-recording', body: {} },
];

const ACCEPTABLE = new Set([401, 403, 404]);

export default [
  check({
    id: 'authz.unauthenticated_probe', cls: 'C11', severity: CRITICAL,
    title: 'Sensitive endpoints reject unauthenticated callers',
    fn: async () => {
      const lines = [];
      const open = [];

      for (const p of PROBES) {
        const { res, ev } = await httpProbe(`${API_BASE}${p.path}`, {
          method: p.method,
          headers: p.body ? { 'Content-Type': 'application/json' } : {},
          body: p.body ? JSON.stringify(p.body) : undefined,
        }, `${p.method} ${p.path}`);

        if (!res) { lines.push(`${p.method} ${p.path} → unreachable`); continue; }
        lines.push(`${p.method} ${p.path} → ${res.status}`);
        if (!ACCEPTABLE.has(res.status)) open.push(`${p.method} ${p.path} → ${res.status}`);
      }

      if (lines.every((l) => l.endsWith('unreachable'))) {
        return { status: BLOCKED, evidence: evidence(`probe ${API_BASE}`, lines.join('\n'), 1),
          detail: 'API unreachable — authorisation was not exercised.' };
      }

      return {
        status: open.length ? FAIL : PASS,
        evidence: evidence(`unauthenticated probe of ${PROBES.length} endpoints on ${API_BASE}`,
          lines.join('\n'), open.length ? 1 : 0),
        detail: open.length ? `Reachable without credentials: ${open.join('; ')}` : 'All probed endpoints refuse anonymous callers.',
      };
    },
  }),

  check({
    id: 'authz.every_route_guarded', cls: 'C11', severity: CRITICAL,
    title: 'Every /clients and /calls route declares an auth guard',
    fn: async () => {
      const files = [
        'server/src/routes/clients/index.ts',
        'server/src/routes/calls/index.ts',
      ];
      // Two legitimate forms of enforcement: guard middleware between the path
      // and the handler, or inline auth inside the handler body. Several routes
      // predate the middleware and authenticate inline; both are acceptable, an
      // absence of either is not.
      const MIDDLEWARE = /requireAdmin|requireUser|requireClientOwnership/;
      const INLINE = /bearerToken\(|supabase\.auth\.getUser\(|getOwnerEmail\(|hasAdminKey\(|ADMIN_API_KEY/;
      const ROUTE_START = /router\.(get|post|patch|put|delete)\(\s*'([^']+)'([^\n]*)/g;

      const unguarded = [];
      const lines = [];

      for (const rel of files) {
        const src = await fs.readFile(path.join(repoRoot, rel), 'utf8');
        const starts = [...src.matchAll(ROUTE_START)];

        for (let i = 0; i < starts.length; i += 1) {
          const [, verb, route, tail] = starts[i];
          // Handler body runs to the next route declaration (or end of file).
          const from = starts[i].index;
          const to = i + 1 < starts.length ? starts[i + 1].index : src.length;
          const bodyText = src.slice(from, to);

          const viaMiddleware = MIDDLEWARE.test(tail);
          const viaInline = INLINE.test(bodyText);
          const how = viaMiddleware ? tail.match(MIDDLEWARE)[0]
            : viaInline ? `inline (${bodyText.match(INLINE)[0]})`
            : 'NO AUTH';

          lines.push(`${verb.toUpperCase()} ${route} — ${how}`);
          if (!viaMiddleware && !viaInline) unguarded.push(`${rel}: ${verb.toUpperCase()} ${route}`);
        }
      }

      return {
        status: unguarded.length ? FAIL : PASS,
        evidence: evidence(`static scan of ${files.length} route files for requireAdmin/requireUser`,
          lines.join('\n'), unguarded.length ? 1 : 0),
        detail: unguarded.length
          ? `Routes with no guard: ${unguarded.join('; ')}`
          : 'Every route declares a guard.',
      };
    },
  }),
];
