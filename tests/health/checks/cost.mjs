/**
 * Money leaking out — catalogue C19.
 *
 * The unit economics work at typical usage and break at the top of the
 * allowance, so the two things worth watching are (a) infrastructure being paid
 * for with no customer attached, and (b) a single tenant burning more than
 * their plan brings in.
 *
 * Neither is visible anywhere today. A number costs £1.89/month whether or not
 * a tenant exists, and Retell bills per minute against a flat monthly price —
 * so a heavy customer is a silent loss, not an alert.
 *
 * Rates are read live where possible and pinned where not; every figure used in
 * a verdict is printed in the evidence so the arithmetic can be checked.
 */
import { check, evidence, PASS, FAIL, BLOCKED, HIGH, MEDIUM } from '../lib/check.mjs';
import { admin, isOurs } from '../lib/env.mjs';

const RETELL_KEY = (process.env.RETELL_API_KEY ?? '').trim();
const TWILIO_SID = (process.env.TWILIO_ACCOUNT_SID ?? '').trim();
const TWILIO_TOK = (process.env.TWILIO_AUTH_TOKEN ?? '').trim();

/** Verified from the Twilio pricing API, GBP. */
const UK_NUMBER_MONTHLY_GBP = 1.8895;
/** Assumption — check against your own FX before treating as exact. */
const USD_TO_GBP = 0.79;

/** Plan prices, mirroring src/lib/plans.ts. */
const PLAN_PRICE_GBP = { starter: 49, pro: 89, business: 159, agency: 249 };

/** Share of a plan's price that call costs may consume before we complain. */
const SPEND_ALARM_RATIO = 0.5;

async function twilioNumbers() {
  if (!TWILIO_SID || !TWILIO_TOK) return null;
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOK}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers.json?PageSize=100`,
    { headers: { Authorization: `Basic ${auth}` } },
  ).catch(() => null);
  if (!res?.ok) return null;
  const body = await res.json();
  return (body.incoming_phone_numbers ?? []).map((n) => n.phone_number);
}

export default [
  check({
    id: 'cost.no_orphan_numbers', cls: 'C19', severity: MEDIUM,
    title: 'Every rented number belongs to an active tenant',
    fn: async () => {
      const db = admin();
      if (!db) return { status: BLOCKED, evidence: evidence('supabase', 'no service-role key', 1) };

      const numbers = await twilioNumbers();
      if (!numbers) {
        return {
          status: BLOCKED,
          evidence: evidence('GET twilio IncomingPhoneNumbers', 'Twilio credentials unavailable here', 1),
        };
      }

      const { data } = await db.from('clients').select('business_name,twilio_number,is_active');
      const claimed = new Map(
        (data ?? []).filter((c) => c.twilio_number).map((c) => [c.twilio_number, c]),
      );

      const lines = [];
      const orphans = [];
      for (const n of numbers) {
        const owner = claimed.get(n);
        if (!owner) {
          lines.push(`${n} — NO TENANT`);
          orphans.push(n);
        } else if (!owner.is_active) {
          lines.push(`${n} — ${owner.business_name} (INACTIVE tenant)`);
          orphans.push(`${n} (${owner.business_name}, churned)`);
        } else {
          lines.push(`${n} — ${owner.business_name}`);
        }
      }

      const waste = orphans.length * UK_NUMBER_MONTHLY_GBP;
      lines.push('', `${numbers.length} numbers rented @ £${UK_NUMBER_MONTHLY_GBP}/mo = £${(numbers.length * UK_NUMBER_MONTHLY_GBP).toFixed(2)}/mo`);
      if (orphans.length) lines.push(`wasted: £${waste.toFixed(2)}/mo`);

      return {
        status: orphans.length ? FAIL : PASS,
        evidence: evidence('Twilio numbers vs active tenants', lines.join('\n'), orphans.length ? 1 : 0),
        entities: orphans,
        detail: orphans.length
          ? `£${waste.toFixed(2)}/month for numbers with no active tenant: ${orphans.join(', ')}. `
            + 'Release them only when you are sure the tenant will not resubscribe — a released UK number cannot be reclaimed, and their divert would break silently.'
          : `All ${numbers.length} numbers belong to active tenants.`,
      };
    },
  }),

  check({
    id: 'cost.no_stranded_test_tenants', cls: 'C19', severity: MEDIUM,
    title: 'No automated-test tenants left behind in production',
    fn: async () => {
      const db = admin();
      if (!db) return { status: BLOCKED, evidence: evidence('supabase', 'no service-role key', 1) };

      const { data, error } = await db
        .from('clients')
        .select('business_name,owner_email,created_at')
        .like('owner_email', '%@tradereceptionist.test');
      if (error) return { status: BLOCKED, evidence: evidence('supabase clients query', error.message, 1) };

      // Two exclusions, both matching the e2e teardown's own rules:
      //   - health seeds are created and destroyed inside a single check
      //   - anything under two hours old may still be in use by a running suite,
      //     and the teardown will sweep it on the next run
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      const stranded = (data ?? []).filter((c) => {
        if (c.owner_email.toLowerCase().endsWith('@health.tradereceptionist.test')) return false;
        const age = Date.now() - Date.parse(c.created_at ?? '');
        return Number.isFinite(age) && age > TWO_HOURS;
      });

      return {
        status: stranded.length ? FAIL : PASS,
        evidence: evidence("SELECT ... FROM clients WHERE owner_email LIKE '%@tradereceptionist.test'",
          stranded.length
            ? stranded.map((c) => `${c.business_name} — ${c.owner_email} (${String(c.created_at).slice(0, 10)})`).join('\n')
            : 'none',
          stranded.length ? 1 : 0),
        entities: stranded.map((c) => c.owner_email),
        detail: stranded.length
          ? `${stranded.length} test tenant(s) stranded in production. The e2e global teardown sweeps these, `
            + 'so any that survive mean the sweep failed or was skipped — check the last run\'s teardown output.'
          : 'Production contains no leftover test tenants.',
      };
    },
  }),

  check({
    id: 'cost.tenant_spend_within_plan', cls: 'C19', severity: HIGH,
    title: 'No tenant is costing more to serve than their plan brings in',
    fn: async () => {
      const db = admin();
      if (!db) return { status: BLOCKED, evidence: evidence('supabase', 'no service-role key', 1) };
      if (!RETELL_KEY) {
        return {
          status: BLOCKED,
          evidence: evidence('POST retell /v2/list-calls', 'RETELL_API_KEY not available here', 1),
          detail: 'Needs the Retell key to read real per-call costs.',
        };
      }

      const { data: clients } = await db
        .from('clients')
        .select('business_name,owner_email,plan,retell_agent_id,is_active');

      const live = (clients ?? []).filter((c) => c.is_active && c.retell_agent_id && !isOurs(c.owner_email));
      if (!live.length) {
        return { status: BLOCKED, evidence: evidence('supabase', 'no live customer tenants to assess', 1) };
      }

      // Month to date.
      const since = new Date();
      since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);

      const res = await fetch('https://api.retellai.com/v2/list-calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RETELL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1000 }),
      }).catch(() => null);
      if (!res?.ok) {
        return { status: BLOCKED, evidence: evidence('POST retell /v2/list-calls', `HTTP ${res?.status ?? 'unreachable'}`, 1) };
      }
      const calls = await res.json();

      // combined_cost is in cents.
      const spendByAgent = new Map();
      for (const c of calls) {
        const started = c.start_timestamp ? new Date(c.start_timestamp) : null;
        if (!started || started < since) continue;
        const cents = c.call_cost?.combined_cost ?? 0;
        const agent = c.agent_id;
        if (!agent) continue;
        const prev = spendByAgent.get(agent) ?? { cents: 0, calls: 0 };
        spendByAgent.set(agent, { cents: prev.cents + cents, calls: prev.calls + 1 });
      }

      const lines = [`month to date from ${since.toISOString().slice(0, 10)}`, ''];
      const over = [];
      for (const c of live) {
        const s = spendByAgent.get(c.retell_agent_id) ?? { cents: 0, calls: 0 };
        const gbp = (s.cents / 100) * USD_TO_GBP;
        const price = PLAN_PRICE_GBP[c.plan] ?? 0;
        const pct = price ? (gbp / price) * 100 : 0;
        lines.push(`${c.business_name}: ${s.calls} calls, £${gbp.toFixed(2)} of £${price} (${pct.toFixed(0)}%)`);
        if (price && gbp > price * SPEND_ALARM_RATIO) {
          over.push(`${c.business_name} — £${gbp.toFixed(2)} against a £${price} plan`);
        }
      }
      lines.push('', `alarm threshold: ${SPEND_ALARM_RATIO * 100}% of plan price · FX assumed ${USD_TO_GBP}`);

      return {
        status: over.length ? FAIL : PASS,
        evidence: evidence('Retell per-call costs aggregated by agent, month to date', lines.join('\n'), over.length ? 1 : 0),
        entities: over.map((o) => o.split(' — ')[0]),
        detail: over.length
          ? `Serving cost past ${SPEND_ALARM_RATIO * 100}% of plan price: ${over.join('; ')}. `
            + 'Margin is thin at the top of every allowance and negative on Business/Agency at Fast Tier.'
          : `All ${live.length} live tenants are inside ${SPEND_ALARM_RATIO * 100}% of their plan price.`,
      };
    },
  }),
];
