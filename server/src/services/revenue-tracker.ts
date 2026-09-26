import { Client as NotionClient } from '@notionhq/client';
import { errorMessage, logEvent } from '../lib/observability';
import {
  buildRevenueSnapshot,
  deriveMonthlyMovement,
  formatGbp,
  parseGbp,
  revenueMonthKey,
  revenueMonthKeyFromLabel,
  type StripeRevenueSubscription,
} from '../lib/revenue';

const DEFAULT_REVENUE_PAGE_ID = '37e0e35d1b49815b8188e1e48163157a';

export interface RevenueSyncResult {
  database: 'Revenue Tracker';
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  reason?: string;
  metrics?: Record<string, number>;
}

type Block = {
  id: string;
  type: string;
  has_children?: boolean;
  paragraph?: { rich_text?: RichText[] };
  heading_2?: { rich_text?: RichText[] };
  table_row?: { cells?: RichText[][] };
  [key: string]: unknown;
};

type RichText = {
  plain_text?: string;
  text?: { content?: string };
  [key: string]: unknown;
};

interface TableRow {
  id: string;
  cells: string[];
}

let cached: NotionClient | null = null;

function notion(): NotionClient | null {
  const key = process.env.NOTION_API_KEY;
  if (!key) return null;
  cached ??= new NotionClient({ auth: key });
  return cached;
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
  const headingIndex = blocks.findIndex(
    (block) => block.type === 'heading_2' && blockText(block).trim() === heading,
  );
  const table = headingIndex < 0
    ? undefined
    : blocks.slice(headingIndex + 1).find((block) => block.type === 'table');
  if (!table) throw new Error(`Revenue Tracker is missing the "${heading}" table`);
  return table;
}

async function readRows(client: NotionClient, tableId: string): Promise<TableRow[]> {
  return (await listChildren(client, tableId))
    .filter((block) => block.type === 'table_row')
    .map((block) => ({
      id: block.id,
      cells: (block.table_row?.cells ?? []).map((cell) => plainText(cell)),
    }));
}

async function updateRow(client: NotionClient, rowId: string, values: string[]): Promise<void> {
  await client.blocks.update({
    block_id: rowId,
    table_row: { cells: values.map((value, index) => rich(value, index === 0)) },
  } as Parameters<typeof client.blocks.update>[0]);
}

async function appendRow(client: NotionClient, tableId: string, values: string[]): Promise<void> {
  await client.blocks.children.append({
    block_id: tableId,
    children: [{
      object: 'block',
      type: 'table_row',
      table_row: { cells: values.map((value, index) => rich(value, index === 0)) },
    }],
  } as Parameters<typeof client.blocks.children.append>[0]);
}

async function upsertLabelledRow(
  client: NotionClient,
  tableId: string,
  rows: TableRow[],
  label: string,
  values: string[],
): Promise<'created' | 'updated'> {
  const row = rows.find((candidate) => candidate.cells[0]?.trim() === label);
  if (row) {
    await updateRow(client, row.id, [label, ...values]);
    return 'updated';
  }
  await appendRow(client, tableId, [label, ...values]);
  return 'created';
}

async function listStripeSubscriptions(secretKey: string): Promise<StripeRevenueSubscription[]> {
  const subscriptions: StripeRevenueSubscription[] = [];
  let startingAfter: string | undefined;

  do {
    const url = new URL('https://api.stripe.com/v1/subscriptions');
    url.searchParams.set('status', 'all');
    url.searchParams.set('limit', '100');
    url.searchParams.append('expand[]', 'data.customer');
    if (startingAfter) url.searchParams.set('starting_after', startingAfter);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const body = await response.json() as {
      data?: StripeRevenueSubscription[];
      has_more?: boolean;
      error?: { message?: string; code?: string };
    };
    if (!response.ok) {
      throw new Error(`Stripe subscription list failed: ${body.error?.message ?? body.error?.code ?? response.status}`);
    }
    const page = body.data ?? [];
    subscriptions.push(...page);
    startingAfter = body.has_more ? page.at(-1)?.id : undefined;
    if (body.has_more && !startingAfter) throw new Error('Stripe pagination returned no cursor');
  } while (startingAfter);

  return subscriptions;
}

function previousEndingMrr(rows: TableRow[], currentMonthKey: string): number | null {
  const candidates = rows
    .map((row) => ({
      key: revenueMonthKeyFromLabel(row.cells[0] ?? ''),
      value: parseGbp(row.cells[5] ?? ''),
    }))
    .filter((row): row is { key: string; value: number } => Boolean(row.key) && row.value !== null)
    .filter((row) => row.key < currentMonthKey)
    .sort((a, b) => b.key.localeCompare(a.key));
  return candidates[0]?.value ?? null;
}

/** Reconcile the existing Revenue Tracker page from Stripe without trusting plan labels in Supabase. */
export async function syncRevenueTracker(now = new Date()): Promise<RevenueSyncResult> {
  const result: RevenueSyncResult = {
    database: 'Revenue Tracker', created: 0, updated: 0, skipped: 0, failed: 0,
  };
  const client = notion();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const pageId = process.env.NOTION_REVENUE_PAGE_ID?.trim() || DEFAULT_REVENUE_PAGE_ID;

  if (!client || !stripeKey) {
    result.skipped = 1;
    result.reason = !client ? 'NOTION_API_KEY is not set' : 'STRIPE_SECRET_KEY is not set';
    return result;
  }

  try {
    const [blocks, subscriptions] = await Promise.all([
      listChildren(client, pageId),
      listStripeSubscriptions(stripeKey),
    ]);
    const snapshot = buildRevenueSnapshot(subscriptions, now);
    result.metrics = {
      mrrPence: snapshot.mrrPence,
      arrPence: snapshot.arrPence,
      activePayingClients: snapshot.activePayingClients,
      trialClients: snapshot.trialClients,
      pastDueClients: snapshot.pastDueClients,
      churnedClientsThisMonth: snapshot.churnedClientsThisMonth,
    };
    const intro = blocks.find((block) => block.type === 'paragraph');
    const firstAutomationRun = !intro || !blockText(intro).includes('Automated from Stripe');

    if (intro) {
      await client.blocks.update({
        block_id: intro.id,
        paragraph: { rich_text: rich('Automated from Stripe every two hours. MRR includes active subscriptions only; trials and past-due accounts are shown separately.') },
      } as Parameters<typeof client.blocks.update>[0]);
      result.updated += 1;
    }

    const currentTable = tableAfterHeading(blocks, 'Current Snapshot');
    const currentRows = await readRows(client, currentTable.id);
    const monthlyTable = tableAfterHeading(blocks, 'Monthly Log');
    const monthlyRows = await readRows(client, monthlyTable.id);
    const currentMonthRow = monthlyRows.find(
      (row) => revenueMonthKeyFromLabel(row.cells[0] ?? '') === snapshot.monthKey,
    );
    const storedStarting = currentMonthRow ? parseGbp(currentMonthRow.cells[1] ?? '') : null;
    const starting = currentMonthRow
      ? storedStarting
      : firstAutomationRun
        ? null
        : previousEndingMrr(monthlyRows, snapshot.monthKey);
    const isBootstrapMonth = (currentMonthRow?.cells[0] ?? '').trim().endsWith('*');
    const movement = deriveMonthlyMovement(snapshot, starting, isBootstrapMonth);

    const currentValues: Array<[string, string]> = [
      ['MRR', formatGbp(snapshot.mrrPence)],
      ['ARR', formatGbp(snapshot.arrPence)],
      ['Active paying clients', String(snapshot.activePayingClients)],
      ['Trial clients', String(snapshot.trialClients)],
      ['Past-due clients', String(snapshot.pastDueClients)],
      ['Churn this month', String(snapshot.churnedClientsThisMonth)],
      ['Net new MRR', formatGbp(movement.netChangePence)],
      ['Trial → paid conversion', '—'],
      ['Last synced', now.toISOString()],
    ];
    for (const [label, value] of currentValues) {
      const action = await upsertLabelledRow(client, currentTable.id, currentRows, label, [value]);
      result[action] += 1;
    }

    const planTable = tableAfterHeading(blocks, 'MRR by Plan');
    const planRows = await readRows(client, planTable.id);
    for (const plan of ['starter', 'pro', 'business', 'agency'] as const) {
      const label = plan[0].toUpperCase() + plan.slice(1);
      const row = planRows.find((candidate) => candidate.cells[0]?.trim() === label);
      if (!row) throw new Error(`Revenue Tracker is missing the ${label} plan row`);
      await updateRow(client, row.id, [
        label,
        row.cells[1] ?? '',
        String(snapshot.byPlan[plan].clients),
        formatGbp(snapshot.byPlan[plan].mrrPence),
      ]);
      result.updated += 1;
    }
    const totalRow = planRows.find((row) => row.cells[0]?.trim() === 'Total');
    if (!totalRow) throw new Error('Revenue Tracker is missing the Total plan row');
    await updateRow(client, totalRow.id, [
      'Total', '', String(snapshot.activePayingClients), formatGbp(snapshot.mrrPence),
    ]);
    result.updated += 1;

    const header = monthlyRows[0];
    if (header) {
      await updateRow(client, header.id, [
        'Month', 'Starting MRR', 'New MRR', 'Expansion / contraction',
        'Churn', 'Ending MRR', 'Net Change',
      ]);
      result.updated += 1;
    }
    const monthlyValues = [
      `${snapshot.monthLabel}${movement.bootstrap ? '*' : ''}`,
      formatGbp(movement.startingMrrPence),
      formatGbp(movement.newMrrPence),
      formatGbp(movement.expansionPence),
      formatGbp(movement.churnedMrrPence),
      formatGbp(movement.endingMrrPence),
      formatGbp(movement.netChangePence),
    ];
    if (currentMonthRow) {
      await updateRow(client, currentMonthRow.id, monthlyValues);
      result.updated += 1;
    } else {
      await appendRow(client, monthlyTable.id, monthlyValues);
      result.created += 1;
    }

    const churnTable = tableAfterHeading(blocks, 'Churn Log');
    const churnRows = await readRows(client, churnTable.id);
    let placeholder = churnRows.find((row) => row.cells.every((value) => value === '—'));
    for (const churn of snapshot.churnedSubscriptions) {
      const marker = churn.subscriptionId;
      const values = [
        churn.date,
        churn.customer,
        churn.plan[0].toUpperCase() + churn.plan.slice(1),
        formatGbp(churn.mrrPence),
        `${churn.reason} · ${marker}`,
      ];
      const existing = churnRows.find((row) => row.cells.some((value) => value.includes(marker)));
      if (existing) {
        await updateRow(client, existing.id, values);
        result.updated += 1;
      } else if (placeholder) {
        await updateRow(client, placeholder.id, values);
        placeholder = undefined;
        result.updated += 1;
      } else {
        await appendRow(client, churnTable.id, values);
        result.created += 1;
      }
    }

    logEvent('info', 'notion_sync.revenue_complete', {
      subscriptions: subscriptions.length,
      activePayingClients: snapshot.activePayingClients,
      trialClients: snapshot.trialClients,
      pastDueClients: snapshot.pastDueClients,
      mrrPence: snapshot.mrrPence,
      ...result,
      metrics: JSON.stringify(result.metrics ?? {}),
    });
  } catch (err: unknown) {
    result.failed = 1;
    result.reason = errorMessage(err);
    logEvent('error', 'notion_sync.revenue_failed', { error: result.reason });
  }

  return result;
}
