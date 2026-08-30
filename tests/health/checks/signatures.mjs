/**
 * Webhook and tool signature verification — catalogue C2.
 *
 * Three endpoints verify a signature: `webhooks/retell`, `webhooks/stripe`,
 * `retell-tools`. Historically each was wrong at some point, and fixing one
 * never propagated to the others — the retell-tools defect survived three
 * months after the identical webhook bug was fixed.
 *
 * The Stripe endpoint is checked **statically, on purpose**. Probing it live
 * with a forged `checkout.session.completed` would provision a tenant and buy a
 * Twilio number if the guard were broken — a health check must not be capable
 * of spending money. The e2e suite covers that path against a local server.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { check, evidence, httpProbe, PASS, FAIL, BLOCKED, CRITICAL, HIGH } from '../lib/check.mjs';
import { API_BASE, repoRoot } from '../lib/env.mjs';

const toolBody = JSON.stringify({ call: { call_id: 'health_probe' }, args: {} });

export default [
  check({
    id: 'sig.retell_tools_rejects_forged', cls: 'C2', severity: CRITICAL,
    title: 'retell-tools rejects unsigned and legacy-HMAC requests',
    fn: async () => {
      // The decisive case is the legacy scheme, and forging it needs the real
      // key. Without it we would send a signature that is wrong under *both*
      // schemes, production would reject it for the wrong reason, and the check
      // would report a false green — which is the failure mode this whole
      // system exists to prevent. So: no key, no verdict.
      const key = (process.env.RETELL_API_KEY ?? '').trim();
      if (!key) {
        return {
          status: BLOCKED,
          evidence: evidence('POST /retell-tools/check-availability (legacy-HMAC forgery)',
            'RETELL_API_KEY not available, so a legacy-scheme signature cannot be constructed. '
            + 'Sending an arbitrary digest would be rejected regardless of whether the bug is present, '
            + 'so this would pass for the wrong reason.', 1),
          detail: 'Needs RETELL_API_KEY to forge a legacy signature. Refusing to report a pass that would not distinguish a fixed server from a broken one.',
        };
      }

      const legacy = crypto.createHmac('sha256', key).update(toolBody).digest('hex');

      const cases = [
        ['no signature header', {}],
        ['legacy plain-HMAC signature', { 'X-Retell-Signature': legacy }],
        ['garbage signature', { 'X-Retell-Signature': 'v=1,d=deadbeef' }],
      ];

      const lines = [];
      const accepted = [];
      for (const [label, headers] of cases) {
        const { res } = await httpProbe(`${API_BASE}/retell-tools/check-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: toolBody,
        }, label);
        if (!res) { lines.push(`${label}: unreachable`); continue; }
        lines.push(`${label} → HTTP ${res.status}`);
        if (res.status !== 401) accepted.push(`${label} → ${res.status}`);
      }

      if (lines.every((l) => l.endsWith('unreachable'))) {
        return { status: BLOCKED, evidence: evidence('retell-tools probe', lines.join('\n'), 1) };
      }
      return {
        status: accepted.length ? FAIL : PASS,
        evidence: evidence(`POST ${API_BASE}/retell-tools/check-availability x${cases.length}`,
          lines.join('\n'), accepted.length ? 1 : 0),
        detail: accepted.length
          ? `Not rejected: ${accepted.join('; ')}`
          : 'All forged variants rejected with 401.',
      };
    },
  }),

  check({
    id: 'sig.retell_webhook_rejects_unsigned', cls: 'C2', severity: CRITICAL,
    title: 'Retell webhook rejects an unsigned event',
    fn: async () => {
      const body = JSON.stringify({ event: 'call_started', call: { call_id: 'health_probe' } });
      const { res, ev } = await httpProbe(`${API_BASE}/webhooks/retell`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      }, 'POST /webhooks/retell (unsigned)');

      if (!res) return { status: BLOCKED, evidence: ev };

      // The route always returns 200 to stop Retell retry storms, so the body
      // is the only signal that matters.
      const rejected = ev.output.includes('invalid_signature');
      return {
        status: rejected ? PASS : FAIL,
        evidence: ev,
        detail: rejected
          ? 'Unsigned event acknowledged with 200 but explicitly not processed.'
          : 'Unsigned event was NOT reported as invalid_signature — it may have been processed.',
      };
    },
  }),

  check({
    id: 'sig.stripe_fails_closed', cls: 'C2', severity: CRITICAL,
    title: 'Stripe webhook guard fails closed (static)',
    fn: async () => {
      const rel = 'server/src/routes/webhooks/stripe.ts';
      const src = await fs.readFile(path.join(repoRoot, rel), 'utf8');

      // The exact defect: verification skipped when either value is falsy.
      const failOpen = /if\s*\(\s*secret\s*&&\s*sigHeader\s*&&\s*!verifyStripeSignature/.test(src);
      const requiresSecret = /if\s*\(\s*!secret\s*\)/.test(src);
      const requiresHeader = /if\s*\(\s*!sigHeader\s*\|\|\s*!verifyStripeSignature/.test(src);

      const lines = [
        `${rel}`,
        `fail-open guard present: ${failOpen}`,
        `rejects when secret unset: ${requiresSecret}`,
        `rejects when header absent: ${requiresHeader}`,
      ];

      const ok = !failOpen && requiresSecret && requiresHeader;
      return {
        status: ok ? PASS : FAIL,
        evidence: evidence(`static analysis of ${rel}`, lines.join('\n'), ok ? 0 : 1),
        detail: ok
          ? 'Missing secret and missing header both reject.'
          : 'Guard does not fail closed — an unsigned request can reach provisionClient().',
      };
    },
  }),

  check({
    id: 'sig.no_handrolled_verifiers', cls: 'C2', severity: HIGH,
    title: 'No route hand-rolls a provider signature scheme',
    fn: async () => {
      // Retell has an SDK verify(); using createHmac against a Retell signature
      // is the exact bug that shipped twice. Stripe has no SDK here, so
      // stripe-signature.ts is the one sanctioned hand-rolled verifier.
      const ALLOWED = new Set(['server/src/routes/webhooks/stripe-signature.ts']);
      const scan = await import('node:child_process').then(({ execSync }) => {
        try {
          return execSync(
            `grep -rln "createHmac" ${repoRoot}/server/src/routes || true`,
            { encoding: 'utf8' });
        } catch { return ''; }
      });

      const offenders = scan.split('\n').map((s) => s.trim()).filter(Boolean)
        .map((f) => path.relative(repoRoot, f))
        .filter((f) => !ALLOWED.has(f));

      return {
        status: offenders.length ? FAIL : PASS,
        evidence: evidence('grep -rln createHmac server/src/routes',
          offenders.length ? `unsanctioned hand-rolled verifiers:\n${offenders.join('\n')}`
                           : `only the sanctioned verifier uses createHmac (${[...ALLOWED].join(', ')})`,
          offenders.length ? 1 : 0),
        detail: offenders.length
          ? `Hand-rolled signature logic in: ${offenders.join(', ')}. Retell signatures must use retell-sdk's verify().`
          : '',
      };
    },
  }),
];
