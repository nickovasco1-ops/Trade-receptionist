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
  google_cal_id: string | null; onboarding_complete: boolean | null;
  created_at: string; current_period_end: string | null;
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
}

/**
 * Notion SDK 5.x queries data sources, not databases. Resolve the database's
 * first data source once and cache it, so the sync keeps working if the ids
 * are ever recreated and we don't need another environment variable.
 */
const dataSourceCache = new Map<string, string>();

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
  callCount: number;
}): string {
  if (!c.is_active || c.subscription_status === 'canceled') return 'churned';
  if (c.callCount === 0) return 'no calls yet';
  if (!c.google_cal_id) return 'no diary';
  return 'ok';
}

/** Upsert every tenant into the Subscribers database. */
export async function syncSubscribers(): Promise<SyncResult> {
  const client = notion();
  const databaseId = process.env.NOTION_SUBSCRIBERS_DB_ID;
  const result: SyncResult = { database: 'Subscribers', created: 0, updated: 0, skipped: 0, failed: 0 };

  if (!client || !databaseId) {
    logEvent('warn', 'notion_sync.skipped', { database: 'subscribers', reason: 'not configured' });
    result.skipped = 1;
    return result;
  }

  const { data: clientData, error } = await supabase
    .from('clients')
    .select('id,business_name,owner_name,owner_email,owner_mobile,twilio_number,plan,'
          + 'subscription_status,is_active,google_cal_id,onboarding_complete,created_at,current_period_end');
  if (error) throw new Error(`notion sync: client fetch failed: ${error.message}`);
  const clients = (clientData ?? []) as unknown as ClientRow[];

  const now = new Date().toISOString();

  for (const c of clients) {
    try {
      const [{ count: callCount }, { count: leadCount }, { data: lastCall }] = await Promise.all([
        supabase.from('calls').select('id', { count: 'exact', head: true }).eq('client_id', c.id),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', c.id),
        supabase.from('calls').select('created_at').eq('client_id', c.id)
          .order('created_at', { ascending: false }).limit(1),
      ]);

      const properties = {
        'Business Name':       title(c.business_name),
        'Client ID':           text(c.id),
        'Email':               email(c.owner_email),
        'Owner Name':          text(c.owner_name),
        'Owner Mobile':        phone(c.owner_mobile),
        'Receptionist Number': phone(c.twilio_number),
        'Plan':                select(c.plan),
        'Status':              select(c.subscription_status),
        'Diary Connected':     check(Boolean(c.google_cal_id)),
        'Onboarding Complete': check(Boolean(c.onboarding_complete)),
        'Calls (all time)':    num(callCount ?? 0),
        'Leads (all time)':    num(leadCount ?? 0),
        'Last Call':           date((lastCall as Array<{ created_at: string }> | null)?.[0]?.created_at ?? null),
        'Signup Date':         date(c.created_at),
        'Trial Ends':          date(c.current_period_end),
        'Health':              select(healthOf({
                                 is_active: c.is_active,
                                 subscription_status: c.subscription_status,
                                 google_cal_id: c.google_cal_id,
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
    } catch (err: unknown) {
      result.failed += 1;
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
    logEvent('warn', 'notion_sync.skipped', { database: 'leads', reason: 'NOTION_LEADS_DB_ID not set' });
    result.skipped = 1;
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
