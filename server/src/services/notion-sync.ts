/**
 * Supabase → Notion sync.
 *
 * The existing `notion.ts` is write-once and fire-and-forget: it appends a row
 * when a call finishes or a subscriber signs up, and never touches it again. So
 * Notion drifts from reality the moment anything changes — a plan upgrade, a
 * churn, a lead being worked — and leads were never written there at all.
 *
 * This is a reconciling sync instead. It reads Supabase, finds the matching
 * Notion page by a stable id property, and updates it in place or creates it.
 * Running it twice changes nothing the second time, so it is safe on a cron and
 * safe to re-run by hand after a bad day.
 *
 * Direction is deliberately one-way. Notion is a working surface, not a source
 * of truth — anything typed into a synced column is overwritten on the next
 * run. Columns Notion owns (your own notes, checkboxes you tick) are simply
 * never written by this code.
 */
import { Client as NotionClient } from '@notionhq/client';
import { supabase } from './supabase';
import { errorMessage, logEvent } from '../lib/observability';
import { sendOpsAlert } from './alerts';
import {
  resolveUsagePeriod,
  summariseUsage,
  type UsagePeriod,
  type UsageSnapshot,
  type UsageThreshold,
} from '../lib/plan-usage';

let cached: NotionClient | null = null;

function notion(): NotionClient | null {
  const key = process.env.NOTION_API_KEY;
  if (!key) return null;
  cached ??= new NotionClient({ auth: key });
  return cached;
}

interface ClientRow {
  id: string; business_name: string; owner_name: string | null; owner_email: string;
  owner_mobile: string | null; twilio_number: string | null; plan: string;
  subscription_status: string | null; is_active: boolean | null;
  google_cal_id: string | null; calendar_provider: string | null; onboarding_complete: boolean | null;
  created_at: string; current_period_start: string | null; current_period_end: string | null;
}

interface LeadRow {
  id: string; client_id: string; call_id: string | null;
  caller_name: string | null; caller_number: string | null; caller_email: string | null;
  postcode: string | null; job_type: string | null; urgency: string | null;
  status: string | null; notes: string | null;
  created_at: string; follow_up_sent_at: string | null;
}

export interface SyncResult {
  database: string;
  created:  number;
  updated:  number;
  skipped:  number;
  failed:   number;
  /**
   * Why this database did not sync cleanly, in the provider's own words.
   *
   * Counts alone are not actionable: "failed: 5" was emailed every two hours
   * for six days while the cause — the integration had never been given access
   * to the database — sat only in Sentry. Whatever fails here has to travel
   * back out to whoever reads the alert.
   */
  reason?:  string;
}

/**
 * Notion SDK 5.x queries data sources, not databases. Resolve the database's
 * first data source once and cache it, so the sync keeps working if the ids
 * are ever recreated and we don't need another environment variable.
 */
const dataSourceCache = new Map<string, string>();

const USAGE_SCHEMA = {
  'Calls this period': { number: { format: 'number' as const } },
  'Plan limit':        { number: { format: 'number' as const } },
  'Calls remaining':   { number: { format: 'number' as const } },
  'Usage %':           { number: { format: 'number' as const } },
  'Usage status':      {
    select: {
      options: [
        { name: 'OK', color: 'green' as const },
        { name: 'Approaching limit', color: 'yellow' as const },
        { name: 'Limit reached', color: 'orange' as const },
        { name: 'Over limit', color: 'red' as const },
      ],
    },
  },
  'Overage calls':         { number: { format: 'number' as const } },
  'Billing period starts': { date: {} },
  'Billing period ends':   { date: {} },
  'Over limit at':         { date: {} },
};

async function dataSourceIdFor(client: NotionClient, databaseId: string): Promise<string> {
  const hit = dataSourceCache.get(databaseId);
  if (hit) return hit;

  const db = await client.databases.retrieve({ database_id: databaseId }) as unknown as {
    data_sources?: Array<{ id: string }>;
  };
  const id = db.data_sources?.[0]?.id;
  if (!id) throw new Error(`notion: database ${databaseId} exposes no data source`);
  dataSourceCache.set(databaseId, id);
  return id;
}

/**
 * Confirm the integration can actually see the database before doing any work.
 *
 * Notion answers an unshared database with "Could not find database with ID",
 * identically for every request. Without this probe that answer arrives once
 * per tenant row — five copies of one fact — and the sync spends its whole run
 * discovering the same thing over and over.
 */
async function probeAccess(client: NotionClient, databaseId: string): Promise<string | null> {
  try {
    await dataSourceIdFor(client, databaseId);
    return null;
  } catch (err: unknown) {
    return errorMessage(err);
  }
}

/** Add the managed usage columns once; never alter or remove user-owned columns. */
async function ensureUsageSchema(client: NotionClient, databaseId: string): Promise<void> {
  const dataSourceId = await dataSourceIdFor(client, databaseId);
  const source = await client.dataSources.retrieve({ data_source_id: dataSourceId }) as unknown as {
    properties?: Record<string, unknown>;
  };
  const existing = source.properties ?? {};
  const missing = Object.fromEntries(
    Object.entries(USAGE_SCHEMA).filter(([name]) => !(name in existing)),
  );
  if (Object.keys(missing).length === 0) return;

  await client.dataSources.update({
    data_source_id: dataSourceId,
    properties: missing,
  } as Parameters<typeof client.dataSources.update>[0]);
  logEvent('info', 'notion_sync.usage_schema_extended', {
    database: 'subscribers',
    properties: Object.keys(missing).join(','),
  });
}

/** Find an existing page by an exact match on a rich-text id column. */
async function findPageByKey(
  client: NotionClient,
  databaseId: string,
  property: string,
  value: string,
): Promise<string | null> {
  const dataSourceId = await dataSourceIdFor(client, databaseId);
  const res = await client.dataSources.query({
    data_source_id: dataSourceId,
    filter: { property, rich_text: { equals: value } },
    page_size: 1,
  } as Parameters<typeof client.dataSources.query>[0]);
  const first = (res as unknown as { results: Array<{ id: string }> }).results[0];
  return first?.id ?? null;
}

const text  = (v: string | null | undefined) => ({ rich_text: [{ text: { content: v ?? '' } }] });
const title = (v: string | null | undefined) => ({ title: [{ text: { content: v || 'Unknown' } }] });
const date  = (v: string | null | undefined) => (v ? { date: { start: v } } : { date: null });
const select = (v: string | null | undefined) => (v ? { select: { name: v } } : { select: null });
const phone = (v: string | null | undefined) => ({ phone_number: v || null });
const email = (v: string | null | undefined) => ({ email: v || null });
const num   = (v: number | null | undefined) => ({ number: typeof v === 'number' ? v : null });
const check = (v: boolean | null | undefined) => ({ checkbox: Boolean(v) });

/**
 * The one column worth scanning. Derived here rather than in Notion so the
 * definition lives with the data, not in a formula someone can edit.
 */
function healthOf(c: {
  is_active: boolean | null;
  subscription_status: string | null;
  google_cal_id: string | null;
  calendar_provider: string | null;
  callCount: number;
}): string {
  if (!c.is_active || c.subscription_status === 'canceled') return 'churned';
  if (c.callCount === 0) return 'no calls yet';
  // Any provider counts. Reading google_cal_id alone would have reported every
  // Outlook and Apple tenant as having no diary.
  if (!c.calendar_provider && !c.google_cal_id) return 'no diary';
  return 'ok';
}

async function claimUsageAlert(
  clientId: string,
  periodStart: string,
  threshold: UsageThreshold,
  usageCount: number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('usage_alerts')
    .insert({
      client_id: clientId,
      period_start: periodStart,
      threshold_percent: threshold,
      usage_count: usageCount,
    })
    .select('id')
    .maybeSingle();

  if (error?.code === '23505') return null;
  if (error) throw new Error(`usage alert claim failed: ${error.message}`);
  return (data as { id?: string } | null)?.id ?? null;
}

async function releaseUsageAlert(alertId: string): Promise<void> {
  await supabase.from('usage_alerts').delete().eq('id', alertId);
}

async function markUsageAlertSent(alertId: string): Promise<void> {
  await supabase.from('usage_alerts').update({ sent_at: new Date().toISOString() }).eq('id', alertId);
}

/** One operational email per threshold, tenant and allowance period. */
async function sendUsageAlerts(
  client: ClientRow,
  period: UsagePeriod,
  usage: UsageSnapshot,
): Promise<void> {
  for (const threshold of usage.reachedThresholds) {
    let alertId: string | null = null;
    try {
      alertId = await claimUsageAlert(client.id, period.start, threshold, usage.calls);
      if (!alertId) continue;

      const atLimit = threshold === 100;
      const sent = await sendOpsAlert({
        tone: atLimit ? 'bad' : 'warn',
        subject: atLimit
          ? `Call allowance reached — ${client.business_name}`
          : `Call allowance at ${threshold}% — ${client.business_name}`,
        headline: atLimit
          ? `${client.business_name} has reached its monthly call allowance`
          : `${client.business_name} is approaching its monthly call allowance`,
        facts: [
          ['Plan', client.plan],
          ['Usage', `${usage.calls} of ${usage.limit} calls (${usage.usagePercent}%)`],
          ['Calls remaining', String(usage.remaining)],
          ['Overage calls', String(usage.overageCalls)],
          ['Period ends', new Date(period.end).toLocaleString('en-GB', { timeZone: 'Europe/London' })],
          ...(usage.overLimitAt
            ? [['First over-limit call', new Date(usage.overLimitAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })] as [string, string]]
            : []),
        ],
        action: atLimit
          ? 'Calls are still being answered. Contact the subscriber to agree an upgrade or overage arrangement.'
          : 'Contact the subscriber before the allowance is exhausted and offer the next plan.',
      });

      if (sent) await markUsageAlertSent(alertId);
      else await releaseUsageAlert(alertId);
    } catch (err: unknown) {
      if (alertId) {
        try {
          await releaseUsageAlert(alertId);
        } catch (releaseErr: unknown) {
          logEvent('error', 'notion_sync.usage_alert_release_failed', {
            alertId,
            error: errorMessage(releaseErr),
          });
        }
      }
      logEvent('error', 'notion_sync.usage_alert_failed', {
        clientId: client.id,
        threshold,
        error: errorMessage(err),
      });
    }
  }
}

/** Upsert every tenant into the Subscribers database. */
export async function syncSubscribers(): Promise<SyncResult> {
  const client = notion();
  const databaseId = process.env.NOTION_SUBSCRIBERS_DB_ID;
  const result: SyncResult = { database: 'Subscribers', created: 0, updated: 0, skipped: 0, failed: 0 };

  if (!client || !databaseId) {
    result.skipped = 1;
    result.reason  = client
      ? 'NOTION_SUBSCRIBERS_DB_ID is not set'
      : 'NOTION_API_KEY is not set';
    logEvent('warn', 'notion_sync.skipped', { database: 'subscribers', reason: result.reason });
    return result;
  }

  const denied = await probeAccess(client, databaseId);
  if (denied) {
    result.failed = 1;
    result.reason = denied;
    logEvent('error', 'notion_sync.database_unreachable', { database: 'subscribers', databaseId, error: denied });
    return result;
  }

  try {
    await ensureUsageSchema(client, databaseId);
  } catch (err: unknown) {
    result.failed = 1;
    result.reason = `Could not add plan-usage columns: ${errorMessage(err)}`;
    logEvent('error', 'notion_sync.usage_schema_failed', { error: errorMessage(err) });
    return result;
  }

  const { data: clientData, error } = await supabase
    .from('clients')
    .select('id,business_name,owner_name,owner_email,owner_mobile,twilio_number,plan,'
          + 'subscription_status,is_active,google_cal_id,calendar_provider,onboarding_complete,created_at,'
          + 'current_period_start,current_period_end');
  if (error) throw new Error(`notion sync: client fetch failed: ${error.message}`);
  const clients = (clientData ?? []) as unknown as ClientRow[];

  const now = new Date().toISOString();

  for (const c of clients) {
    try {
      const period = resolveUsagePeriod({
        subscriptionStatus: c.subscription_status,
        createdAt: c.created_at,
        currentPeriodStart: c.current_period_start,
        currentPeriodEnd: c.current_period_end,
      });
      const planLimit = summariseUsage(c.plan, 0, []).limit;

      const [callCountRes, leadCountRes, lastCallRes, periodCountRes, periodCallsRes] = await Promise.all([
        supabase.from('calls').select('id', { count: 'exact', head: true }).eq('client_id', c.id),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', c.id),
        supabase.from('calls').select('created_at').eq('client_id', c.id)
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('calls').select('id', { count: 'exact', head: true })
          .eq('client_id', c.id).eq('direction', 'inbound')
          .gte('started_at', period.start).lt('started_at', period.end),
        supabase.from('calls').select('started_at').eq('client_id', c.id)
          .eq('direction', 'inbound').gte('started_at', period.start).lt('started_at', period.end)
          .order('started_at', { ascending: true }).range(0, planLimit),
      ]);
      const queryError = callCountRes.error ?? leadCountRes.error ?? lastCallRes.error
        ?? periodCountRes.error ?? periodCallsRes.error;
      if (queryError) throw new Error(`usage query failed: ${queryError.message}`);

      const callCount = callCountRes.count;
      const leadCount = leadCountRes.count;
      const lastCall = lastCallRes.data;
      const periodCallCount = periodCountRes.count;
      const periodCalls = periodCallsRes.data;
      const orderedStarts = ((periodCalls ?? []) as Array<{ started_at: string | null }>)
        .map((call) => call.started_at)
        .filter((value): value is string => Boolean(value));
      const usage = summariseUsage(c.plan, periodCallCount ?? 0, orderedStarts);

      const properties = {
        'Business Name':       title(c.business_name),
        'Client ID':           text(c.id),
        'Email':               email(c.owner_email),
        'Owner Name':          text(c.owner_name),
        'Owner Mobile':        phone(c.owner_mobile),
        'Receptionist Number': phone(c.twilio_number),
        'Plan':                select(c.plan),
        'Status':              select(c.subscription_status),
        'Diary Connected':     check(Boolean(c.calendar_provider ?? c.google_cal_id)),
        'Onboarding Complete': check(Boolean(c.onboarding_complete)),
        'Calls (all time)':    num(callCount ?? 0),
        'Calls this period':   num(usage.calls),
        'Plan limit':          num(usage.limit),
        'Calls remaining':     num(usage.remaining),
        'Usage %':             num(usage.usagePercent),
        'Usage status':        select(usage.status),
        'Overage calls':       num(usage.overageCalls),
        'Billing period starts': date(period.start),
        'Billing period ends':   date(period.end),
        'Over limit at':         date(usage.overLimitAt),
        'Leads (all time)':    num(leadCount ?? 0),
        'Last Call':           date((lastCall as Array<{ created_at: string }> | null)?.[0]?.created_at ?? null),
        'Signup Date':         date(c.created_at),
        'Trial Ends':          date(c.current_period_end),
        'Health':              select(healthOf({
                                 is_active: c.is_active,
                                 subscription_status: c.subscription_status,
                                 google_cal_id: c.google_cal_id,
                                 calendar_provider: c.calendar_provider,
                                 callCount: callCount ?? 0,
                               })),
        'Last Synced':         date(now),
      } as Parameters<typeof client.pages.create>[0]['properties'];

      const pageId = await findPageByKey(client, databaseId, 'Client ID', c.id);
      if (pageId) {
        await client.pages.update({ page_id: pageId, properties });
        result.updated += 1;
      } else {
        await client.pages.create({ parent: { database_id: databaseId }, properties });
        result.created += 1;
      }

      await sendUsageAlerts(c, period, usage);
    } catch (err: unknown) {
      result.failed += 1;
      result.reason ??= errorMessage(err);
      logEvent('error', 'notion_sync.row_failed', {
        database: 'subscribers', clientId: c.id, error: errorMessage(err),
      });
    }
  }

  logEvent('info', 'notion_sync.complete', { ...result });
  return result;
}

/**
 * Upsert leads into the Leads database.
 *
 * Gated on NOTION_LEADS_DB_ID: the database has to exist first. Create it in
 * Notion with the schema in docs/NOTION.md, then set the id.
 */
export async function syncLeads(limit = 500): Promise<SyncResult> {
  const client = notion();
  const databaseId = process.env.NOTION_LEADS_DB_ID;
  const result: SyncResult = { database: 'Leads', created: 0, updated: 0, skipped: 0, failed: 0 };

  if (!client || !databaseId) {
    result.skipped = 1;
    result.reason  = client
      ? 'NOTION_LEADS_DB_ID is not set, so no lead has ever reached Notion'
      : 'NOTION_API_KEY is not set';
    logEvent('warn', 'notion_sync.skipped', { database: 'leads', reason: result.reason });
    return result;
  }

  const denied = await probeAccess(client, databaseId);
  if (denied) {
    result.failed = 1;
    result.reason = denied;
    logEvent('error', 'notion_sync.database_unreachable', { database: 'leads', databaseId, error: denied });
    return result;
  }

  const { data: leadData, error } = await supabase
    .from('leads')
    .select('id,client_id,call_id,caller_name,caller_number,caller_email,postcode,'
          + 'job_type,urgency,status,notes,created_at,follow_up_sent_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`notion sync: lead fetch failed: ${error.message}`);
  const leads = (leadData ?? []) as unknown as LeadRow[];

  // One lookup for the business names, rather than one per lead.
  const { data: clientData } = await supabase.from('clients').select('id,business_name');
  const clients = (clientData ?? []) as unknown as Array<{ id: string; business_name: string }>;
  const nameById = new Map(clients.map((c) => [c.id, c.business_name]));

  const now = new Date().toISOString();

  for (const l of leads) {
    try {
      const properties = {
        'Caller':      title(l.caller_name),
        'Lead ID':     text(l.id),
        'Business':    text(nameById.get(l.client_id) ?? ''),
        'Phone':       phone(l.caller_number),
        'Email':       email(l.caller_email),
        'Postcode':    text(l.postcode),
        'Job Type':    text(l.job_type),
        'Urgency':     select(l.urgency),
        'Status':      select(l.status),
        'Notes':       text(l.notes),
        'Received':    date(l.created_at),
        'Followed Up': date(l.follow_up_sent_at),
        'Call ID':     text(l.call_id),
        'Last Synced': date(now),
      } as Parameters<typeof client.pages.create>[0]['properties'];

      const pageId = await findPageByKey(client, databaseId, 'Lead ID', l.id);
      if (pageId) {
        await client.pages.update({ page_id: pageId, properties });
        result.updated += 1;
      } else {
        await client.pages.create({ parent: { database_id: databaseId }, properties });
        result.created += 1;
      }
    } catch (err: unknown) {
      result.failed += 1;
      result.reason ??= errorMessage(err);
      logEvent('error', 'notion_sync.row_failed', {
        database: 'leads', leadId: l.id, error: errorMessage(err),
      });
    }
  }

  logEvent('info', 'notion_sync.complete', { ...result });
  return result;
}

export async function syncAll(): Promise<SyncResult[]> {
  return [await syncSubscribers(), await syncLeads()];
}
