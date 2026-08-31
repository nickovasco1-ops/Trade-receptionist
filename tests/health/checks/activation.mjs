/**
 * Is anyone actually getting value? — catalogue C18 (provisioned but inert).
 *
 * Every other check in this suite verifies the plumbing is correct: the number
 * routes, the agent exists, the webhook verifies, the tenant row is complete.
 * All of that can be true while the customer receives nothing.
 *
 * Found 2026-08-31: Derbyshire Renewables had been paying since 2026-07-02 and
 * had taken **zero calls in 59 days**. Their number was on the trunk, imported
 * into Retell and bound to the right agent — every integrity check passed. And
 * neither paying tenant had a calendar connected, so the booking tools were
 * never attached to their agent at all and the headline feature was inert for
 * them regardless of the retell-tools fix.
 *
 * A tenant paying for silence churns quietly. These checks are the difference
 * between finding that out now and finding out from a cancellation.
 */
import { check, evidence, PASS, FAIL, BLOCKED, HIGH, MEDIUM } from '../lib/check.mjs';
import { admin, SEED_DOMAIN } from '../lib/env.mjs';

/** Grace period before a live tenant with no calls is worth raising. */
const SILENT_DAYS = 14;

/** Tenants we expect to be receiving calls. */
const SERVICEABLE = new Set(['trialing', 'active', 'past_due']);

const DAY = 24 * 60 * 60 * 1000;

async function liveTenants() {
  const db = admin();
  if (!db) return null;
  const { data, error } = await db
    .from('clients')
    .select('id,business_name,owner_email,created_at,is_active,subscription_status,google_cal_id,twilio_number');
  if (error) throw new Error(error.message);

  // Health seed tenants are ours and never take calls; excluding them keeps
  // the signal about real customers.
  return (data ?? []).filter((c) =>
    c.is_active
    && !c.owner_email.endsWith(SEED_DOMAIN)
    && SERVICEABLE.has(c.subscription_status ?? 'trialing'));
}

async function callCount(clientId) {
  const db = admin();
  const { count } = await db.from('calls')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId);
  return count ?? 0;
}

async function lastCallAt(clientId) {
  const db = admin();
  const { data } = await db.from('calls')
    .select('created_at').eq('client_id', clientId)
    .order('created_at', { ascending: false }).limit(1);
  return data?.[0]?.created_at ?? null;
}

export default [
  check({
    id: 'activation.tenants_receive_calls', cls: 'C18', severity: HIGH,
    title: 'No live tenant has been silent since signup',
    fn: async () => {
      let tenants;
      try { tenants = await liveTenants(); } catch (err) {
        return { status: BLOCKED, evidence: evidence('supabase clients query', err.message, 1) };
      }
      if (!tenants) return { status: BLOCKED, evidence: evidence('supabase', 'no service-role key', 1) };
      if (tenants.length === 0) {
        return {
          status: BLOCKED,
          evidence: evidence('supabase clients query', 'no serviceable tenants to assess', 1),
          detail: 'Nothing to measure — there are no live tenants.',
        };
      }

      const lines = [];
      const silent = [];

      for (const t of tenants) {
        const calls = await callCount(t.id);
        const ageDays = Math.floor((Date.now() - Date.parse(t.created_at)) / DAY);
        const last = calls ? await lastCallAt(t.id) : null;
        const quietDays = last ? Math.floor((Date.now() - Date.parse(last)) / DAY) : ageDays;

        lines.push(`${t.business_name}: ${calls} calls, signed up ${ageDays}d ago, `
          + `${last ? `last call ${quietDays}d ago` : 'never received a call'}`);

        // Only raise once a tenant has had a fair chance.
        if (ageDays >= SILENT_DAYS && calls === 0) {
          silent.push(`${t.business_name} (${t.twilio_number ?? 'no number'}) — ${ageDays} days, no calls ever`);
        }
      }

      return {
        status: silent.length ? FAIL : PASS,
        evidence: evidence(`call counts for ${tenants.length} live tenants`, lines.join('\n'), silent.length ? 1 : 0),
        detail: silent.length
          ? `Paying for silence, and likely to churn without saying why: ${silent.join('; ')}. `
            + 'Every integrity check can pass while this is true — verify the carrier divert is actually active, and place a test call to the number.'
          : `All ${tenants.length} live tenants have received calls.`,
      };
    },
  }),

  check({
    id: 'activation.booking_is_possible', cls: 'C18', severity: MEDIUM,
    title: 'Live tenants can actually book, not just take messages',
    fn: async () => {
      let tenants;
      try { tenants = await liveTenants(); } catch (err) {
        return { status: BLOCKED, evidence: evidence('supabase clients query', err.message, 1) };
      }
      if (!tenants?.length) {
        return { status: BLOCKED, evidence: evidence('supabase clients query', 'no serviceable tenants to assess', 1) };
      }

      // buildRetellTools() attaches the calendar tools only when
      // google_cal_id is set, so no calendar means the agent has no booking
      // capability at all — it can only capture a lead.
      const withoutCalendar = tenants.filter((t) => !t.google_cal_id);
      const lines = tenants.map((t) =>
        `${t.business_name}: calendar ${t.google_cal_id ? 'connected' : 'NOT connected — agent has no booking tools'}`);

      return {
        status: withoutCalendar.length ? FAIL : PASS,
        evidence: evidence(`calendar connection for ${tenants.length} live tenants`,
          lines.join('\n'), withoutCalendar.length ? 1 : 0),
        detail: withoutCalendar.length
          ? `${withoutCalendar.length} of ${tenants.length} live tenants cannot book a job: `
            + `${withoutCalendar.map((t) => t.business_name).join(', ')}. `
            + 'The onboarding wizard never asks for a calendar, so this is the default outcome unless the owner signed in with Google.'
          : 'Every live tenant has a calendar, so the booking tools are attached.',
      };
    },
  }),
];
