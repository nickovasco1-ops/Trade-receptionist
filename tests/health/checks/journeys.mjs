/**
 * End-to-end behaviour — catalogue C7 (data not persisting), C10 (auth and
 * routing), C2 (webhook integrity), C3 (the money path).
 *
 * These drive the existing Playwright suite rather than duplicating it. The
 * suite already replays captured Retell and Stripe payloads against a real
 * handler, asserts a tampered payload is rejected, asserts duplicate delivery
 * produces one row not two, and walks signup → onboarding → dashboard.
 *
 * Deep mode only: the suite takes minutes and needs a browser image, so the
 * daily run stays fast.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { check, run, evidence, PASS, FAIL, BLOCKED, CRITICAL, HIGH } from '../lib/check.mjs';
import { admin, repoRoot } from '../lib/env.mjs';

function summarise(output) {
  const m = /(\d+) passed/.exec(output);
  const f = /(\d+) failed/.exec(output);
  const fl = /(\d+) flaky/.exec(output);
  return `passed=${m?.[1] ?? '?'} failed=${f?.[1] ?? '0'} flaky=${fl?.[1] ?? '0'}`;
}

export default [
  check({
    id: 'journeys.webhook_integrity', cls: 'C2', severity: CRITICAL, mode: 'deep',
    title: 'Webhook fixtures replay correctly: signed accepted, tampered rejected, duplicates idempotent',
    fn: async () => {
      const ev = await run('npx', ['playwright', 'test',
        'e2e/webhooks.retell.spec.ts', 'e2e/webhooks.stripe.spec.ts', 'e2e/retell-tools.spec.ts',
        '--reporter=line'], { cwd: repoRoot, timeout: 900_000 });
      return {
        status: ev.exitCode === 0 ? PASS : FAIL,
        evidence: { ...ev, output: `${summarise(ev.output)}\n\n${ev.output.slice(-2500)}` },
        detail: ev.exitCode === 0 ? 'Signature, replay and idempotency behaviour verified against a real handler.' : 'Webhook specs failing.',
      };
    },
  }),

  check({
    id: 'journeys.frontend', cls: 'C10', severity: HIGH, mode: 'deep',
    title: 'Signup, onboarding, dashboard, settings and billing journeys pass',
    fn: async () => {
      const ev = await run('npx', ['playwright', 'test',
        'e2e/auth.spec.ts', 'e2e/onboarding.spec.ts', 'e2e/dashboard.spec.ts',
        'e2e/settings.spec.ts', 'e2e/billing.spec.ts',
        '--reporter=line'], { cwd: repoRoot, timeout: 900_000 });
      return {
        status: ev.exitCode === 0 ? PASS : FAIL,
        evidence: { ...ev, output: `${summarise(ev.output)}\n\n${ev.output.slice(-2500)}` },
        detail: ev.exitCode === 0 ? '' : 'A user-facing journey is broken.',
      };
    },
  }),

  check({
    id: 'journeys.money_path', cls: 'C3', severity: CRITICAL, mode: 'deep',
    title: 'Checkout → webhook → subscription row → entitlements → cancellation',
    fn: async () => {
      // The Stripe spec covers checkout.session.completed through to the
      // provisioned client row and the full lifecycle including cancellation,
      // using E2E provider stubs. A real test-mode card journey through
      // Stripe-hosted checkout is not automated here.
      const ev = await run('npx', ['playwright', 'test', 'e2e/webhooks.stripe.spec.ts', '--reporter=line'],
        { cwd: repoRoot, timeout: 900_000 });

      if (ev.exitCode !== 0) {
        return { status: FAIL, evidence: { ...ev, output: `${summarise(ev.output)}\n\n${ev.output.slice(-2500)}` },
          detail: 'The provisioning and billing lifecycle path is failing.' };
      }
      return {
        status: BLOCKED,
        evidence: { ...ev, output: `${summarise(ev.output)}\n\nCovered: checkout.session.completed → clients row → business_config; invoice.payment_succeeded/failed; customer.subscription.deleted.\nNOT covered: a real Stripe test-mode card through hosted checkout, and entitlement enforcement on a downgraded account.` },
        detail: 'Webhook half verified. The hosted-checkout half is not automated: it needs a Stripe test-mode key in CI and a card journey. Reported BLOCKED rather than PASS so the gap stays visible.',
      };
    },
  }),

  check({
    id: 'data.persistence_invariants', cls: 'C7', severity: HIGH,
    title: 'Call records satisfy their persistence invariants',
    fn: async () => {
      const db = admin();
      if (!db) return { status: BLOCKED, evidence: evidence('supabase', 'no service-role key', 1) };

      const { count: total } = await db.from('calls').select('id', { count: 'exact', head: true });
      const { count: nullStart } = await db.from('calls')
        .select('id', { count: 'exact', head: true }).is('started_at', null);
      const { count: orphanTranscripts } = await db.from('transcripts')
        .select('id', { count: 'exact', head: true }).is('call_id', null);

      // call_ended once overwrote started_at with null (BUG-002b), and the
      // dashboard ordered by that nullable column so those calls vanished.
      const lines = [
        `calls: ${total}`,
        `calls with null started_at: ${nullStart}`,
        `transcripts with null call_id: ${orphanTranscripts}`,
      ];

      const bad = (orphanTranscripts ?? 0) > 0;
      return {
        status: bad ? FAIL : PASS,
        evidence: evidence('supabase counts over calls/transcripts', lines.join('\n'), bad ? 1 : 0),
        detail: bad ? 'Orphaned transcripts exist — a transcript with no call cannot be shown to anyone.'
          : `${nullStart} of ${total} calls have no started_at (historic BUG-002b residue; the dashboard no longer orders by it).`,
      };
    },
  }),

  check({
    id: 'journeys.call_path', cls: 'C7', severity: CRITICAL, mode: 'deep',
    title: 'Synthetic inbound call persists a call, transcript and lead',
    fn: async () => {
      // The Retell webhook spec drives call_started → call_ended → call_analyzed
      // against a real handler and asserts the call, transcript and lead rows.
      // What it does NOT do is place a real PSTN call through Twilio into
      // Retell, so agent audio, the calendar write and the confirmation email
      // are not exercised end to end.
      const ev = await run('npx', ['playwright', 'test', 'e2e/webhooks.retell.spec.ts', '--reporter=line'],
        { cwd: repoRoot, timeout: 900_000 });

      const covered = 'Covered: call_started → calls row; call_ended → transcript + lead + outcome + emergency tier; call_analyzed; duplicate delivery idempotent.';
      const notCovered = 'NOT covered: a real inbound PSTN call, agent audio, the Google Calendar write, and the Resend confirmation. Those need a live telephony fixture.';

      if (ev.exitCode !== 0) {
        return { status: FAIL, evidence: { ...ev, output: `${summarise(ev.output)}\n\n${ev.output.slice(-2500)}` },
          detail: 'The call → persistence pipeline is failing.' };
      }
      return {
        status: BLOCKED,
        evidence: { ...ev, output: `${summarise(ev.output)}\n\n${covered}\n${notCovered}` },
        detail: 'Persistence half verified; the telephony half is not automated. Reported BLOCKED, not PASS — this is exactly the gap that let retell-tools 401 for three months.',
      };
    },
  }),
];
