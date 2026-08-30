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
  const { res, ev } = await httpProbe(`${API_BASE}/admin/check-tenant-integrity`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
    body: '{}',
    timeoutMs: 120_000,
  }, 'POST /admin/check-tenant-integrity');
  if (!res || !res.ok) return { blocked: `endpoint returned ${res?.status ?? 'nothing'}`, ev };
  try {
    const json = JSON.parse(ev.output.split('\n').slice(1).join('\n'));
    return { report: json.report ?? json, ev };
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

      const broken = (r.report.findings ?? []).filter((f) => PRODUCT_BROKEN.has(f.code));
      const lines = [
        `tenants checked: ${r.report.tenantsChecked}`,
        `findings: ${(r.report.findings ?? []).length}`,
        ...(r.report.findings ?? []).map((f) => `${f.severity.toUpperCase()} ${f.code} — ${f.businessName}: ${f.detail}`),
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
      const bad = (r.report.findings ?? []).filter((f) => ROUTING.has(f.code));

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
      const drift = (r.report.findings ?? []).filter((f) => BILLING.has(f.code));

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
      const { res, ev } = await httpProbe(`${API_BASE}/health/integrations`, {}, 'GET /health/integrations');
      if (!res || !res.ok) return { status: BLOCKED, evidence: ev, detail: 'API unreachable.' };

      const live = JSON.parse(ev.output.split('\n').slice(1).join('\n'));
      const flat = [];
      for (const [group, vals] of Object.entries(live)) {
        for (const [name, set] of Object.entries(vals)) flat.push([`${group}.${name}`, set]);
      }
      const unset = flat.filter(([, v]) => !v).map(([k]) => k);

      // Presence is not liveness. A Resend key was present and 401ing for 11
      // weeks (143 Sentry events), so exercise it if we hold one.
      let resendLine = 'resend liveness: not checked (no RESEND_API_KEY available here)';
      let resendDead = false;
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

      return {
        status: bad ? FAIL : PASS,
        evidence: evidence('GET /health/integrations + provider liveness probe', out, bad ? 1 : 0),
        detail: bad
          ? [unset.length ? `unset: ${unset.join(', ')}` : '', resendDead ? 'Resend key rejected' : ''].filter(Boolean).join('; ')
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
];
