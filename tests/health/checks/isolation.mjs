/**
 * Tenant isolation — catalogue C6 and C11.
 *
 * **Behavioural, not configural.** A policy that exists is not a policy that
 * works: migration 015 proved the inverse (RLS enabled, no policy, silent empty
 * reads for months). So this seeds two real tenants, authenticates as A, and
 * tries to read, insert, update and delete B's rows through the same anon-key
 * path the dashboard uses.
 *
 * Writes are confined to `@health.tradereceptionist.test` by
 * `assertSeedTenant()`; every mutation goes through it.
 */
import { check, evidence, PASS, FAIL, BLOCKED, CRITICAL } from '../lib/check.mjs';
import { admin, asUser, assertSeedTenant, SEED_A, SEED_B, SUPABASE_URL, ANON_KEY } from '../lib/env.mjs';

const PASSWORD = 'health-check-only-not-a-real-account-8813';

async function destroyTenant(email) {
  assertSeedTenant(email);
  const db = admin();
  const { data: clients } = await db.from('clients').select('id').eq('owner_email', email);
  for (const c of clients ?? []) {
    await db.from('bookings').delete().eq('client_id', c.id);
    await db.from('leads').delete().eq('client_id', c.id);
    const { data: calls } = await db.from('calls').select('id').eq('client_id', c.id);
    for (const call of calls ?? []) await db.from('transcripts').delete().eq('call_id', call.id);
    await db.from('calls').delete().eq('client_id', c.id);
    await db.from('business_config').delete().eq('client_id', c.id);
  }
  await db.from('clients').delete().eq('owner_email', email);

  const { data: list } = await db.auth.admin.listUsers();
  for (const u of list?.users ?? []) {
    if (u.email === email) await db.auth.admin.deleteUser(u.id);
  }
}

async function seedTenant(email, name) {
  assertSeedTenant(email);
  const db = admin();
  await destroyTenant(email);

  const { error: authErr } = await db.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  });
  if (authErr) throw new Error(`auth user: ${authErr.message}`);

  const { data: client, error } = await db.from('clients').insert({
    business_name: name, owner_name: name, owner_email: email,
    plan: 'starter', is_active: true,
  }).select('id').single();
  if (error) throw new Error(`client row: ${error.message}`);

  await db.from('business_config').insert({ client_id: client.id });
  const { data: call } = await db.from('calls')
    .insert({ client_id: client.id, caller_number: '+447700900001', direction: 'inbound' })
    .select('id').single();
  if (call) await db.from('transcripts').insert({ call_id: call.id, full_text: `secret transcript for ${name}` });
  const { data: lead } = await db.from('leads')
    .insert({ client_id: client.id, call_id: call?.id ?? null, caller_name: `${name} caller`, status: 'new' })
    .select('id').single();
  const { data: booking } = await db.from('bookings')
    .insert({ client_id: client.id, lead_id: lead?.id ?? null, scheduled_at: new Date(Date.now() + 864e5).toISOString() })
    .select('id').single();

  return { email, clientId: client.id, callId: call?.id, leadId: lead?.id, bookingId: booking?.id };
}

async function tokenFor(email) {
  const anon = asUser();
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in: ${error.message}`);
  return data.session.access_token;
}

export default [
  check({
    id: 'isolation.cross_tenant', cls: 'C6', severity: CRITICAL,
    title: 'Tenant A cannot read, insert, update or delete tenant B\'s rows',
    fn: async () => {
      if (!admin() || !ANON_KEY) {
        return { status: BLOCKED, evidence: evidence('supabase', 'SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY not all set', 1) };
      }

      let a, b;
      const log = [];
      try {
        a = await seedTenant(SEED_A, 'Health Tenant A');
        b = await seedTenant(SEED_B, 'Health Tenant B');
        const token = await tokenFor(SEED_A);
        const asA = asUser(token);

        const violations = [];

        // ── READ ──────────────────────────────────────────────────────────
        const reads = [
          ['clients', asA.from('clients').select('id').eq('id', b.clientId)],
          ['business_config', asA.from('business_config').select('id').eq('client_id', b.clientId)],
          ['calls', asA.from('calls').select('id').eq('client_id', b.clientId)],
          ['leads', asA.from('leads').select('id').eq('client_id', b.clientId)],
          ['bookings', asA.from('bookings').select('id').eq('client_id', b.clientId)],
          ['transcripts', asA.from('transcripts').select('id').eq('call_id', b.callId)],
        ];
        for (const [table, q] of reads) {
          const { data, error } = await q;
          const n = data?.length ?? 0;
          log.push(`READ ${table}: rows=${n}${error ? ` error=${error.message}` : ''}`);
          if (n > 0) violations.push(`READ ${table} returned ${n} of tenant B's rows`);
        }

        // ── UPDATE ────────────────────────────────────────────────────────
        const { data: upd } = await asA.from('clients')
          .update({ business_name: 'HIJACKED' }).eq('id', b.clientId).select('id');
        log.push(`UPDATE clients: affected=${upd?.length ?? 0}`);
        if ((upd?.length ?? 0) > 0) violations.push('UPDATE modified tenant B\'s client row');

        const { data: updLead } = await asA.from('leads')
          .update({ status: 'lost' }).eq('id', b.leadId).select('id');
        log.push(`UPDATE leads: affected=${updLead?.length ?? 0}`);
        if ((updLead?.length ?? 0) > 0) violations.push('UPDATE modified tenant B\'s lead');

        // ── INSERT (into B's scope) ───────────────────────────────────────
        const { data: ins, error: insErr } = await asA.from('leads')
          .insert({ client_id: b.clientId, caller_name: 'injected', status: 'new' }).select('id');
        log.push(`INSERT leads into B: rows=${ins?.length ?? 0}${insErr ? ` error=${insErr.message}` : ''}`);
        if ((ins?.length ?? 0) > 0) violations.push('INSERT created a row under tenant B');

        // ── DELETE ────────────────────────────────────────────────────────
        const { data: del } = await asA.from('bookings').delete().eq('id', b.bookingId).select('id');
        log.push(`DELETE bookings: affected=${del?.length ?? 0}`);
        if ((del?.length ?? 0) > 0) violations.push('DELETE removed tenant B\'s booking');

        // Confirm B is intact — proves the negative results above were real
        // denials and not the rows having quietly vanished.
        const db = admin();
        const { data: intact } = await db.from('clients').select('business_name').eq('id', b.clientId).single();
        log.push(`tenant B intact after attacks: business_name=${intact?.business_name}`);
        if (intact?.business_name !== 'Health Tenant B') {
          violations.push('tenant B was mutated despite the checks reporting no affected rows');
        }

        // Positive control: A must still see its OWN data. Without this, a
        // total outage would look like perfect isolation.
        const { data: own } = await asA.from('clients').select('id').eq('id', a.clientId);
        log.push(`positive control — A reads own client row: rows=${own?.length ?? 0}`);
        if ((own?.length ?? 0) !== 1) {
          violations.push('positive control failed: tenant A cannot read its own row, so the negative results prove nothing');
        }

        return {
          status: violations.length ? FAIL : PASS,
          evidence: evidence('supabase-js as tenant A (anon key + JWT) against tenant B rows',
            log.join('\n'), violations.length ? 1 : 0),
          detail: violations.length ? violations.join('; ') : 'All cross-tenant operations denied; positive control passed.',
        };
      } catch (err) {
        return {
          status: BLOCKED,
          evidence: evidence('tenant isolation probe', `setup failed: ${err.message}`, 1),
          detail: 'Could not establish the two seed tenants, so isolation was not exercised.',
        };
      } finally {
        try { await destroyTenant(SEED_A); await destroyTenant(SEED_B); } catch { /* best effort */ }
      }
    },
  }),

  check({
    id: 'isolation.storage_buckets', cls: 'C6', severity: CRITICAL,
    title: 'Storage buckets are not publicly listable',
    fn: async () => {
      const db = admin();
      if (!db) return { status: BLOCKED, evidence: evidence('supabase', 'no service-role key', 1) };

      const { data: buckets, error } = await db.storage.listBuckets();
      if (error) return { status: BLOCKED, evidence: evidence('storage.listBuckets()', error.message, 1) };
      if (!buckets?.length) {
        return {
          status: PASS,
          evidence: evidence('storage.listBuckets()', 'no storage buckets exist in this project', 0),
          detail: 'No buckets to isolate. Re-evaluate if file upload is ever added.',
        };
      }

      const publicBuckets = buckets.filter((b) => b.public);
      return {
        status: publicBuckets.length ? FAIL : PASS,
        evidence: evidence('storage.listBuckets()',
          buckets.map((b) => `${b.name}: public=${b.public}`).join('\n'),
          publicBuckets.length ? 1 : 0),
        detail: publicBuckets.length ? `Public buckets: ${publicBuckets.map((b) => b.name).join(', ')}` : '',
      };
    },
  }),
];
