/**
 * Provider reality — catalogue C1 (Retell contract drift), C3 (silent partial
 * provisioning), C9 (credentials that expire quietly), C16 (Stripe lifecycle
 * drift).
 *
 * The heavy lifting already exists in `server/src/services/tenant-integrity.ts`,
 * which diffs Stripe ↔ Supabase ↔ Retell ↔ Twilio. This drives it and turns its
 * findings into pass/fail, which is the piece that was missing: the endpoint
 * was built but nothing ran it on a schedule.
 */
import { check, evidence, httpProbe, PASS, FAIL, BLOCKED, CRITICAL, HIGH, MEDIUM } from '../lib/check.mjs';
import { API_BASE } from '../lib/env.mjs';

const ADMIN_KEY = process.env.ADMIN_API_KEY ?? '';

/** Findings that mean a paying tenant's product does not work at all. */
const PRODUCT_BROKEN = new Set([
  'missing_agent', 'agent_not_found_at_retell', 'missing_number', 'number_not_owned',
  'number_not_on_trunk', 'number_not_imported_to_retell', 'number_bound_to_wrong_agent',
  'missing_business_config',
]);

async function integrityReport() {
  if (!ADMIN_KEY) return { blocked: 'ADMIN_API_KEY not set' };
  const { res, body, ev } = await httpProbe(`${API_BASE}/admin/check-tenant-integrity`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
    body: '{}',
    timeoutMs: 120_000,
  }, 'POST /admin/check-tenant-integrity');
  if (!res || !res.ok) return { blocked: `endpoint returned ${res?.status ?? 'nothing'}`, ev };
  try {
    const json = JSON.parse(body);
    // The endpoint answers { success, data: report }. Reading `json.report`
    // fell through to the envelope itself, so `findings` was undefined, `?? []`
    // made it empty, and three checks passed vacuously while a real
    // billing_drift finding sat in the response. Never infer a shape — assert it.
    const report = json.data ?? json.report ?? json;
    if (typeof report?.tenantsChecked !== 'number' || !Array.isArray(report?.findings)) {
      return {
        blocked: 'response did not match the IntegrityReport shape '
          + `(tenantsChecked=${typeof report?.tenantsChecked}, findings=${Array.isArray(report?.findings) ? 'array' : typeof report?.findings})`,
        ev,
      };
    }
    return { report, ev };
  } catch (err) {
    return { blocked: `unparseable response: ${err.message}`, ev };
  }
}

let cached;
async function report() {
  cached ??= await integrityReport();
  return cached;
}

export default [
  check({
    id: 'provisioning.tenants_have_working_product', cls: 'C3', severity: CRITICAL,
    title: 'Every serviceable tenant has an agent, a number, a trunk and a config',
    fn: async () => {
      const r = await report();
      if (r.blocked) return { status: BLOCKED, evidence: r.ev ?? evidence('integrity check', r.blocked, 1), detail: r.blocked };

      const broken = r.report.findings.filter((f) => PRODUCT_BROKEN.has(f.code));
      const lines = [
        `tenants checked: ${r.report.tenantsChecked}`,
        `findings: ${r.report.findings.length}`,
        ...r.report.findings.map((f) => `${f.severity.toUpperCase()} ${f.code} — ${f.businessName}: ${f.detail}`),
      ];

      return {
        status: broken.length ? FAIL : PASS,
        evidence: evidence('POST /admin/check-tenant-integrity', lines.join('\n'), broken.length ? 1 : 0),
        detail: broken.length
          ? `${broken.length} tenant(s) are paying for a product that does not work: ${broken.map((f) => `${f.businessName} (${f.code})`).join(', ')}`
          : `${r.report.tenantsChecked} tenants verified end to end.`,
      };
    },
  }),

  check({
    id: 'provisioning.retell_number_routing', cls: 'C1', severity: CRITICAL,
    title: 'No tenant number is missing from Retell or bound to the wrong agent',
    fn: async () => {
      const r = await report();
      if (r.blocked) return { status: BLOCKED, evidence: r.ev ?? evidence('integrity check', r.blocked, 1), detail: r.blocked };

      const ROUTING = new Set(['number_not_imported_to_retell', 'number_bound_to_wrong_agent', 'number_not_on_trunk']);
      const bad = r.report.findings.filter((f) => ROUTING.has(f.code));

      return {
        status: bad.length ? FAIL : PASS,
        evidence: evidence('POST /admin/check-tenant-integrity (routing findings)',
          bad.length ? bad.map((f) => `${f.code} — ${f.businessName}: ${f.detail}`).join('\n')
                     : 'every tenant number is on the trunk, imported into Retell, and bound to its own agent',
          bad.length ? 1 : 0),
        detail: bad.length ? 'Calls to these numbers do not reach an agent.' : '',
      };
    },
  }),

  check({
    id: 'billing.lifecycle_matches_stripe', cls: 'C16', severity: HIGH,
    title: 'Local subscription state agrees with Stripe',
    fn: async () => {
      const r = await report();
      if (r.blocked) return { status: BLOCKED, evidence: r.ev ?? evidence('integrity check', r.blocked, 1), detail: r.blocked };

      const BILLING = new Set(['billing_drift', 'churned_still_active']);
      const drift = r.report.findings.filter((f) => BILLING.has(f.code));

      return {
        status: drift.length ? FAIL : PASS,
        evidence: evidence('POST /admin/check-tenant-integrity (billing findings)',
          drift.length ? drift.map((f) => `${f.code} — ${f.businessName}: ${f.detail}`).join('\n')
                       : 'no billing drift',
          drift.length ? 1 : 0),
        detail: drift.length
          ? 'Churned tenants may still be served, or a payer is mislabelled. clients.subscription_status is not self-healing.'
          : '',
      };
    },
  }),

  check({
    id: 'providers.credentials_live', cls: 'C9', severity: HIGH,
    title: 'Provider credentials are configured and accepted',
    fn: async () => {
      const { res, body, ev } = await httpProbe(`${API_BASE}/health/integrations`, {}, 'GET /health/integrations');
      if (!res || !res.ok) return { status: BLOCKED, evidence: ev, detail: 'API unreachable.' };

      const live = JSON.parse(body);
      const flat = [];
      for (const [group, vals] of Object.entries(live)) {
        for (const [name, set] of Object.entries(vals)) flat.push([`${group}.${name}`, set]);
      }
      const unset = flat.filter(([, v]) => !v).map(([k]) => k);

      // Presence is not liveness. A Resend key was present and 401ing for 11
      // weeks (143 Sentry events), so exercise it if we hold one.
      let resendLine = 'resend liveness: not checked (no RESEND_API_KEY available here)';
      let resendDead = false;
      let resendUnverified = !process.env.RESEND_API_KEY;
      if (process.env.RESEND_API_KEY) {
        const probe = await httpProbe('https://api.resend.com/domains', {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        }, 'GET api.resend.com/domains');
        const ok = probe.res?.ok ?? false;
        resendDead = !ok;
        resendLine = `resend liveness: HTTP ${probe.res?.status ?? 'unreachable'}`;
      }

      const out = [...flat.map(([k, v]) => `${k}: ${v ? 'set' : 'UNSET'}`), resendLine].join('\n');
      const bad = unset.length > 0 || resendDead;

      if (bad) {
        return {
          status: FAIL,
          evidence: evidence('GET /health/integrations + provider liveness probe', out, 1),
          detail: [unset.length ? `unset: ${unset.join(', ')}` : '', resendDead ? 'Resend key rejected' : ''].filter(Boolean).join('; '),
        };
      }

      // Presence is not liveness. A Resend key sat present-and-401ing for 11
      // weeks (143 Sentry events); reporting "configured" as PASS would repeat
      // exactly that blind spot.
      return {
        status: resendUnverified ? BLOCKED : PASS,
        evidence: evidence('GET /health/integrations + provider liveness probe', out, resendUnverified ? 1 : 0),
        detail: resendUnverified
          ? 'All credentials are configured, but none was exercised: no RESEND_API_KEY here to prove a key is still accepted. Configured is not the same as working.'
          : 'All integration credentials configured; Resend accepted our key.',
      };
    },
  }),

  check({
    id: 'providers.api_liveness', cls: 'C8', severity: CRITICAL,
    title: 'Production API is up',
    fn: async () => {
      const { res, ev } = await httpProbe(`${API_BASE}/health`, {}, 'GET /health');
      return {
        status: res?.ok ? PASS : FAIL,
        evidence: ev,
        detail: res?.ok ? '' : 'The backend is not responding to its health check.',
      };
    },
  }),

  check({
    id: 'providers.retell_path_contract', cls: 'C1', severity: HIGH,
    title: 'Every hand-written Retell path we call is a path the current SDK serves',
    fn: async () => {
      // The list-endpoint deprecation was caught. The assumption made while
      // fixing it — "agent and LLM lifecycle calls are stable" — was not
      // checked, and two hand-written paths were already wrong:
      //
      //   /get-call/{id}      →  Retell serves /v2/get-call/{id}
      //   /publish-agent/{id} →  Retell serves /publish-agent-version/{id}
      //
      // Neither failed loudly. getCall() returned null for a non-2xx, which
      // the backfill route reported as "Call not found in Retell"; the publish
      // response was never read at all, so an agent that never published was
      // reported as successfully tiered.
      //
      // This runs offline and on every PR. The installed retell-sdk is the
      // oracle: it ships the vendor's current paths, so any path of ours that
      // is absent from it is either wrong today or deprecated and about to be.
      const { readFileSync, readdirSync, statSync } = await import('node:fs');
      const { join } = await import('node:path');

      const walk = (dir, out = []) => {
        let entries;
        try { entries = readdirSync(dir); } catch { return out; }
        for (const e of entries) {
          const full = join(dir, e);
          let st;
          try { st = statSync(full); } catch { continue; }
          if (st.isDirectory()) walk(full, out);
          else if (/\.(ts|mjs|js)$/.test(e)) out.push(full);
        }
        return out;
      };

      const sdkDir = 'server/node_modules/retell-sdk/resources';
      const sdkFiles = walk(sdkDir).filter((f) => f.endsWith('.js'));
      if (!sdkFiles.length) {
        return {
          status: BLOCKED,
          evidence: evidence('read retell-sdk resources', `no .js files under ${sdkDir}`, 1),
          detail: 'Install server deps (npm ci --prefix server) so the SDK can be read.',
        };
      }

      // Paths the SDK actually calls: `_client.get('/x')` and `_client.post(path`/x/${id}`)`.
      const served = new Set();
      for (const f of sdkFiles) {
        const src = readFileSync(f, 'utf8');
        for (const m of src.matchAll(/_client\.(?:get|post|patch|delete|put)\([^'"`]*['"`](\/[A-Za-z0-9/_-]+)/g)) {
          served.add(m[1].replace(/\/+$/, ''));
        }
      }

      // Paths we hand-write: `${BASE_URL}/x` or a literal api.retellai.com/x.
      const ourFiles = walk('server/src').filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
      const ours = new Map(); // path -> "file:line"
      for (const f of ourFiles) {
        const lines = readFileSync(f, 'utf8').split('\n');
        lines.forEach((line, i) => {
          for (const m of line.matchAll(/(?:\$\{BASE_URL\}|https:\/\/api\.retellai\.com)(\/[A-Za-z0-9/_-]+)/g)) {
            // Keep only the static prefix, up to the first interpolated segment.
            const path = m[1].replace(/\/+$/, '');
            if (!ours.has(path)) ours.set(path, `${f}:${i + 1}`);
          }
        });
      }

      if (!ours.size) {
        return {
          status: BLOCKED,
          evidence: evidence('scan server/src for Retell paths', 'found none — the scanner is broken, not the code', 1),
          detail: 'Expected at least one hand-written Retell path. Fix the scanner before trusting a pass.',
        };
      }

      const unknown = [...ours.entries()].filter(([path]) => !served.has(path));
      const lines = [
        `retell-sdk paths read: ${served.size}`,
        `hand-written paths found: ${ours.size}`,
        ...unknown.map(([path, where]) => `UNKNOWN ${path}  (${where})`),
      ];

      return {
        status: unknown.length ? FAIL : PASS,
        evidence: evidence(
          'compare server/src Retell paths against retell-sdk',
          lines.join('\n'),
          unknown.length ? 1 : 0,
        ),
        detail: unknown.length
          ? `${unknown.length} Retell path(s) we call are not paths the installed SDK serves. `
            + 'Either the endpoint was renamed/versioned under us, or it never existed. '
            + 'Check the SDK resource for the right path and use the SDK method rather than a literal.'
          : '',
      };
    },
  }),

  check({
    id: 'providers.retell_list_contract', cls: 'C1', severity: HIGH,
    title: 'The Retell list endpoints we depend on still exist and answer the shape we parse',
    fn: async () => {
      // Retell deprecated /v2/list-calls and /list-phone-numbers in Sept 2026 —
      // the second dated deprecation to break this integration with no change
      // on our side. Both replacements answer `{ items }` where the originals
      // answered a bare array, so a version drift does not error: it returns
      // nothing, and every caller reads that as "no calls, no numbers".
      //
      // This check exists so the next one is caught by a red build rather than
      // by noticing the backfill has quietly recovered nothing for a month.
      const key = process.env.RETELL_API_KEY ?? '';
      if (!key) {
        return {
          status: BLOCKED,
          evidence: evidence('retell list endpoints', 'RETELL_API_KEY not set', 1),
          detail: 'Needs the Retell key. Never assume the contract held.',
        };
      }

      const lines = [];
      let bad = 0;

      const calls = await fetch('https://api.retellai.com/v3/list-calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1 }),
      }).catch(() => null);

      if (!calls?.ok) {
        lines.push(`POST /v3/list-calls -> HTTP ${calls?.status ?? 'unreachable'}`);
        bad += 1;
      } else {
        const body = await calls.json().catch(() => null);
        const ok = body && typeof body === 'object' && Array.isArray(body.items);
        lines.push(`POST /v3/list-calls -> 200, items array: ${ok}`);
        if (!ok) bad += 1;
      }

      const numbers = await fetch('https://api.retellai.com/v2/list-phone-numbers', {
        headers: { Authorization: `Bearer ${key}` },
      }).catch(() => null);

      if (!numbers?.ok) {
        lines.push(`GET /v2/list-phone-numbers -> HTTP ${numbers?.status ?? 'unreachable'}`);
        bad += 1;
      } else {
        const body = await numbers.json().catch(() => null);
        const ok = body && typeof body === 'object' && Array.isArray(body.items);
        lines.push(`GET /v2/list-phone-numbers -> 200, items array: ${ok}`);
        if (!ok) bad += 1;
      }

      return {
        status: bad ? FAIL : PASS,
        evidence: evidence('retell list endpoints (live)', lines.join('\n'), bad ? 1 : 0),
        detail: bad
          ? 'A Retell list endpoint moved or changed shape. listCallsForAgent() and '
            + 'listRetellPhoneNumbers() in server/src/services/retell.ts read `items` — '
            + 'until they are updated, call backfill and number-routing checks recover nothing.'
          : '',
      };
    },
  }),
];
