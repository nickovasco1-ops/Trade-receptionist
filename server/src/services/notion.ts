import { Client as NotionClient } from '@notionhq/client';

// Lazy singleton — only created if NOTION_API_KEY is set.
// All exported functions silently no-op when credentials are absent.
let _notion: NotionClient | null = null;

function getNotion(): NotionClient | null {
  const key = process.env.NOTION_API_KEY;
  if (!key) return null;
  if (!_notion) _notion = new NotionClient({ auth: key });
  return _notion;
}

function last4(phone: string | null | undefined): string {
  if (!phone) return '****';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '*');
}

// ── Call Log ──────────────────────────────────────────────────────────────────

export interface CallLogEntry {
  callerName:     string | null;
  callerNumber:   string | null;
  postcode:       string | null;
  jobType:        string | null;
  urgency:        string | null;
  durationSecs:   number;
  subscriberName: string;
  outcome:        string;
  recordingUrl:   string | null;
  timestamp:      string; // ISO-8601
}

export async function logCall(entry: CallLogEntry): Promise<void> {
  const notion = getNotion();
  const dbId   = process.env.NOTION_CALL_LOG_DB_ID;
  if (!notion || !dbId) return;

  try {
    // Cast through unknown to satisfy the SDK's exhaustive property union —
    // the shapes are correct at runtime; TypeScript can't verify the DB schema.
    const properties = {
      'Caller Name':    { title:     [{ text: { content: entry.callerName ?? 'Unknown' } }] },
      'Phone (last 4)': { rich_text: [{ text: { content: last4(entry.callerNumber) } }] },
      'Postcode':       { rich_text: [{ text: { content: entry.postcode ?? '' } }] },
      'Job Type':       { rich_text: [{ text: { content: entry.jobType ?? '' } }] },
      'Outcome':        { select: { name: entry.outcome } },
      'Urgency':        { select: { name: entry.urgency ?? 'routine' } },
      'Duration':       { number: entry.durationSecs },
      'Subscriber':     { rich_text: [{ text: { content: entry.subscriberName } }] },
      'Timestamp':      { date: { start: entry.timestamp } },
      ...(entry.recordingUrl ? { 'Recording': { url: entry.recordingUrl } } : {}),
    } as Parameters<typeof notion.pages.create>[0]['properties'];

    await notion.pages.create({ parent: { database_id: dbId }, properties });
  } catch (err: unknown) {
    console.error('[notion] logCall failed', err instanceof Error ? err.message : err);
  }
}

// ── Subscriber Log ────────────────────────────────────────────────────────────

export interface SubscriberEntry {
  businessName: string;
  email:        string;
  plan:         string;
  signupDate:   string; // ISO-8601
}

export async function logSubscriber(entry: SubscriberEntry): Promise<void> {
  const notion = getNotion();
  const dbId   = process.env.NOTION_SUBSCRIBERS_DB_ID;
  if (!notion || !dbId) return;

  try {
    const properties = {
      'Business Name': { title:     [{ text: { content: entry.businessName } }] },
      'Email':         { email:     entry.email },
      'Plan':          { select:    { name: entry.plan } },
      'Signup Date':   { date:      { start: entry.signupDate } },
    } as Parameters<typeof notion.pages.create>[0]['properties'];

    await notion.pages.create({ parent: { database_id: dbId }, properties });
  } catch (err: unknown) {
    console.error('[notion] logSubscriber failed', err instanceof Error ? err.message : err);
  }
}

// ── Incident Log ──────────────────────────────────────────────────────────────

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentEntry {
  errorType:      string;
  subscriberName: string | null;
  severity:       IncidentSeverity;
  detail:         string | null;
  timestamp:      string; // ISO-8601
}

export async function logIncident(entry: IncidentEntry): Promise<void> {
  const notion = getNotion();
  const dbId   = process.env.NOTION_INCIDENTS_DB_ID;
  if (!notion || !dbId) return;

  try {
    const properties = {
      'Error Type':  { title:     [{ text: { content: entry.errorType } }] },
      'Subscriber':  { rich_text: [{ text: { content: entry.subscriberName ?? 'Unknown' } }] },
      'Severity':    { select:    { name: entry.severity } },
      'Detail':      { rich_text: [{ text: { content: (entry.detail ?? '').slice(0, 2000) } }] },
      'Timestamp':   { date:      { start: entry.timestamp } },
    } as Parameters<typeof notion.pages.create>[0]['properties'];

    await notion.pages.create({ parent: { database_id: dbId }, properties });
  } catch (err: unknown) {
    console.error('[notion] logIncident failed', err instanceof Error ? err.message : err);
  }
}
