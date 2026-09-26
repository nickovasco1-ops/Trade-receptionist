import { Client as NotionClient } from '@notionhq/client';
import { onboardingState } from '../lib/notion-ops';
import { errorMessage, logEvent } from '../lib/observability';
import { supabase } from './supabase';

const DEFAULT_ONBOARDING_DATABASE_ID = 'bdaf71a769e145e08465df0680e532d8';
const DEFAULT_OWNER_DASHBOARD_PAGE_ID = '3e70e35d1b4981c1b39bf1608ae03804';

export interface OperationalSyncResult {
  database: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  reason?: string;
  metrics?: Record<string, number>;
}

type RichText = { plain_text?: string; text?: { content?: string }; [key: string]: unknown };
type Block = {
  id: string;
  type: string;
  table_row?: { cells?: RichText[][] };
  [key: string]: unknown;
};

interface OnboardingClient {
  id: string;
  business_name: string;
  plan: string;
  retell_agent_id: string | null;
  twilio_number: string | null;
  google_cal_id: string | null;
  calendar_provider: string | null;
  is_active: boolean | null;
  subscription_status: string | null;
  created_at: string;
}

let cached: NotionClient | null = null;

function notion(): NotionClient | null {
  const key = process.env.NOTION_API_KEY;
  if (!key) return null;
  cached ??= new NotionClient({ auth: key });
  return cached;
}

const text = (value: string | null | undefined) => ({
  rich_text: [{ text: { content: value ?? '' } }],
});
const title = (value: string | null | undefined) => ({
  title: [{ text: { content: value || 'Unknown' } }],
});
const date = (value: string | null | undefined) => (
  value ? { date: { start: value } } : { date: null }
);
const select = (value: string | null | undefined) => (
  value ? { select: { name: value } } : { select: null }
);
const check = (value: boolean) => ({ checkbox: value });
const num = (value: number | null) => ({ number: value });

async function dataSourceIdFor(client: NotionClient, databaseId: string): Promise<string> {
  const database = await client.databases.retrieve({ database_id: databaseId }) as unknown as {
    data_sources?: Array<{ id: string }>;
  };
  const id = database.data_sources?.[0]?.id;
  if (!id) throw new Error(`notion: database ${databaseId} exposes no data source`);
  return id;
}

async function findPageByKey(
  client: NotionClient,
  databaseId: string,
  property: string,
  value: string,
): Promise<string | null> {
  const dataSourceId = await dataSourceIdFor(client, databaseId);
  const response = await client.dataSources.query({
    data_source_id: dataSourceId,
    filter: { property, rich_text: { equals: value } },
    page_size: 1,
  } as Parameters<typeof client.dataSources.query>[0]);
  const first = (response as unknown as { results: Array<{ id: string }> }).results[0];
  return first?.id ?? null;
}

/** Reconcile objective activation state into the existing Onboarding Tracker. */
export async function syncOnboardingTracker(now = new Date()): Promise<OperationalSyncResult> {
  const result: OperationalSyncResult = {
    database: 'Onboarding Tracker', created: 0, updated: 0, skipped: 0, failed: 0,
    metrics: { stalledOnboarding: 0 },
  };
  const client = notion();
  const databaseId = process.env.NOTION_ONBOARDING_DB_ID?.trim()
    || DEFAULT_ONBOARDING_DATABASE_ID;
  if (!client) {
    result.skipped = 1;
    result.reason = 'NOTION_API_KEY is not set';
    return result;
  }

  try {
    await dataSourceIdFor(client, databaseId);
    const [{ data: clientData, error: clientError }, { data: callData, error: callError }] = await Promise.all([
      supabase.from('clients').select(
        'id,business_name,plan,retell_agent_id,twilio_number,google_cal_id,calendar_provider,'
        + 'is_active,subscription_status,created_at',
      ),
      supabase.from('calls').select('client_id,started_at').eq('direction', 'inbound')
        .not('started_at', 'is', null).order('started_at', { ascending: true }),
    ]);
    if (clientError) throw new Error(`onboarding client fetch failed: ${clientError.message}`);
    if (callError) throw new Error(`onboarding call fetch failed: ${callError.message}`);

    const firstCallByClient = new Map<string, string>();
    for (const call of (callData ?? []) as unknown as Array<{ client_id: string; started_at: string }>) {
      if (!firstCallByClient.has(call.client_id)) firstCallByClient.set(call.client_id, call.started_at);
    }
    const activeClients = ((clientData ?? []) as unknown as OnboardingClient[]).filter(
      (candidate) => candidate.is_active && candidate.subscription_status !== 'canceled',
    );
    const syncedAt = now.toISOString();

    for (const customer of activeClients) {
      try {
        const firstCallAt = firstCallByClient.get(customer.id) ?? null;
        const state = onboardingState({
          createdAt: customer.created_at,
          hasAgent: Boolean(customer.retell_agent_id),
          hasNumber: Boolean(customer.twilio_number),
          diaryConnected: Boolean(customer.calendar_provider ?? customer.google_cal_id),
          firstCallAt,
        }, now);
        if (state.stage === 'Stalled') result.metrics!.stalledOnboarding += 1;

        const properties = {
          'Client':                 title(customer.business_name),
          'Client ID':              text(customer.id),
          'Plan':                   select(customer.plan[0]?.toUpperCase() + customer.plan.slice(1)),
          'Stage':                  select(state.stage),
          'Signup Date':            date(customer.created_at),
          'Retell Agent Created':   check(Boolean(customer.retell_agent_id)),
          'Number Assigned':        check(Boolean(customer.twilio_number)),
          'Calendar Connected':     check(Boolean(customer.calendar_provider ?? customer.google_cal_id)),
          'Test Call Passed':       check(Boolean(firstCallAt)),
          'First Live Call':        check(Boolean(firstCallAt)),
          'Live Date':              date(state.liveDate),
          'Days to Live':           num(state.daysToLive),
          'Days Waiting':           num(state.daysWaiting),
          'Blocker':                text(state.blocker),
          'Next Action':            text(state.nextAction),
          'Last Synced':            date(syncedAt),
        } as Parameters<typeof client.pages.create>[0]['properties'];
        const pageId = await findPageByKey(client, databaseId, 'Client ID', customer.id);
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
        logEvent('error', 'notion_sync.onboarding_row_failed', {
          clientId: customer.id,
          error: errorMessage(err),
        });
      }
    }
  } catch (err: unknown) {
    result.failed = Math.max(1, result.failed);
    result.reason = errorMessage(err);
  }

  logEvent(result.failed ? 'error' : 'info', 'notion_sync.onboarding_complete', {
    ...result,
    metrics: JSON.stringify(result.metrics ?? {}),
  });
  return result;
}

function plainText(items: RichText[] | undefined): string {
  return (items ?? []).map((item) => item.plain_text ?? item.text?.content ?? '').join('');
}

function blockText(block: Block): string {
  const value = block[block.type] as { rich_text?: RichText[] } | undefined;
  return plainText(value?.rich_text);
}

const rich = (content: string, bold = false) => [{
  type: 'text' as const,
  text: { content },
  annotations: bold ? { bold: true } : undefined,
}];

async function listChildren(client: NotionClient, blockId: string): Promise<Block[]> {
  const blocks: Block[] = [];
  let cursor: string | undefined;
  do {
    const response = await client.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    blocks.push(...response.results as unknown as Block[]);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);
  return blocks;
}

function tableAfterHeading(blocks: Block[], heading: string): Block {
  const index = blocks.findIndex((block) => block.type === 'heading_2'
    && blockText(block).trim() === heading);
  const table = index < 0 ? undefined : blocks.slice(index + 1).find((block) => block.type === 'table');
  if (!table) throw new Error(`Owner's Daily Dashboard is missing the "${heading}" table`);
  return table;
}

async function updateTable(
  client: NotionClient,
  tableId: string,
  rowsByLabel: Record<string, string[]>,
): Promise<number> {
  const rows = (await listChildren(client, tableId)).filter((block) => block.type === 'table_row');
  let updated = 0;
  for (const row of rows) {
    const cells = row.table_row?.cells ?? [];
    const label = plainText(cells[0]);
    const values = rowsByLabel[label];
    if (!values) continue;
    await client.blocks.update({
      block_id: row.id,
      table_row: { cells: [label, ...values].map((value, index) => rich(value, index === 0)) },
    } as Parameters<typeof client.blocks.update>[0]);
    updated += 1;
  }
  return updated;
}

function metric(results: OperationalSyncResult[], database: string, name: string): number | null {
  const source = results.find((candidate) => candidate.database === database);
  if (!source || source.failed > 0 || source.skipped > 0) return null;
  return source.metrics?.[name] ?? null;
}

function formatGbp(pence: number): string {
  const pounds = pence / 100;
  return `£${Number.isInteger(pounds) ? pounds.toFixed(0) : pounds.toFixed(2)}`;
}

const display = (value: number | null): string => value === null ? 'Unavailable — check sync' : String(value);
const countAction = (
  value: number | null,
  positive: (count: number) => string,
  clear: string,
): string => value === null ? 'Unavailable — check sync' : value > 0 ? positive(value) : clear;

/** Refresh the at-a-glance numbers and owner actions on the dashboard page. */
export async function syncOwnerDashboard(
  sources: OperationalSyncResult[],
  now = new Date(),
): Promise<OperationalSyncResult> {
  const result: OperationalSyncResult = {
    database: "Owner's Daily Dashboard", created: 0, updated: 0, skipped: 0, failed: 0,
  };
  const client = notion();
  const pageId = process.env.NOTION_OWNER_DASHBOARD_PAGE_ID?.trim()
    || DEFAULT_OWNER_DASHBOARD_PAGE_ID;
  if (!client) {
    result.skipped = 1;
    result.reason = 'NOTION_API_KEY is not set';
    return result;
  }

  try {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { count: callsThisMonth, error } = await supabase.from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'inbound').gte('started_at', monthStart);
    if (error) throw new Error(`dashboard call count failed: ${error.message}`);

    const active = metric(sources, 'Revenue Tracker', 'activePayingClients');
    const trials = metric(sources, 'Revenue Tracker', 'trialClients');
    const pastDue = metric(sources, 'Revenue Tracker', 'pastDueClients');
    const mrrPence = metric(sources, 'Revenue Tracker', 'mrrPence');
    const waiting = metric(sources, 'Live Leads', 'leadsWaiting');
    const urgent = metric(sources, 'Live Leads', 'urgentLeads');
    const atRisk = metric(sources, 'Subscribers', 'atRiskClients');
    const stalled = metric(sources, 'Onboarding Tracker', 'stalledOnboarding');
    const usage = metric(sources, 'Subscribers', 'usageWarnings');

    const blocks = await listChildren(client, pageId);
    result.updated += await updateTable(client, tableAfterHeading(blocks, 'Today').id, {
      'MRR': [mrrPence === null ? 'Unavailable — check sync' : formatGbp(mrrPence)],
      'Active paying clients': [display(active)],
      'Trials': [display(trials)],
      'Calls answered this month': [String(callsThisMonth ?? 0)],
      'Leads waiting': [display(waiting)],
      'Urgent leads': [display(urgent)],
      'Customers at risk': [display(atRisk)],
      'Onboarding stalled': [display(stalled)],
      'Call-limit warnings': [display(usage)],
      'Last synced': [now.toISOString()],
    });
    result.updated += await updateTable(client, tableAfterHeading(blocks, 'What needs attention').id, {
      '1': ['Sales', urgent === null || waiting === null
        ? 'Unavailable — check sync'
        : urgent > 0
          ? `${urgent} urgent lead${urgent === 1 ? '' : 's'} need a call now`
          : waiting > 0
            ? `${waiting} lead${waiting === 1 ? '' : 's'} need follow-up`
            : 'No lead follow-up is waiting'],
      '2': ['Customer health', countAction(
        atRisk,
        (count) => `${count} customer${count === 1 ? '' : 's'} are at risk`,
        'No customer is currently at risk',
      )],
      '3': ['Onboarding', countAction(
        stalled,
        (count) => `${count} customer${count === 1 ? '' : 's'} are stalled`,
        'No onboarding is stalled',
      )],
      '4': ['Call limits', countAction(
        usage,
        (count) => `${count} customer${count === 1 ? '' : 's'} need an allowance conversation`,
        'No call-limit action is needed',
      )],
      '5': ['Billing', countAction(
        pastDue,
        (count) => `${count} Stripe account${count === 1 ? '' : 's'} are past due`,
        'No payment is past due',
      )],
    });
  } catch (err: unknown) {
    result.failed = 1;
    result.reason = errorMessage(err);
    logEvent('error', 'notion_sync.owner_dashboard_failed', { error: result.reason });
  }

  logEvent(result.failed ? 'error' : 'info', 'notion_sync.owner_dashboard_complete', {
    ...result,
    metrics: JSON.stringify(result.metrics ?? {}),
  });
  return result;
}
