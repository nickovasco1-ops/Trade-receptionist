import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../../services/supabase';
import { postCallWorkflow } from '../../services/retell';
import { detectEmergency, escalateEmergency } from '../../lib/emergency';
import type {
  RetellCallStartedEvent,
  RetellCallEndedEvent,
  RetellCallAnalyzedEvent,
  RetellWebhookEvent,
  Client,
  Call,
  CallOutcome,
  LeadInsert,
  LeadUrgency,
} from '../../../../shared/types';

const router = Router();

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.RETELL_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[retell] RETELL_WEBHOOK_SECRET not set — rejecting all webhooks');
      return false;
    }
    console.warn('[retell] RETELL_WEBHOOK_SECRET not set — skipping verification (dev only)');
    return true;
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  // timingSafeEqual requires equal-length buffers
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// ── Lead extraction ───────────────────────────────────────────────────────────

function extractLeadData(
  summary: string,
  customData?: Record<string, unknown>
): Partial<LeadInsert> {
  // Prefer structured data from Retell's post-call analysis
  if (customData && Object.keys(customData).length > 0) {
    const str = (key: string) => {
      const v = customData[key];
      return v && typeof v === 'string' && v.trim() ? v.trim() : undefined;
    };
    return {
      caller_name:   str('caller_name'),
      caller_number: str('caller_number'),
      caller_email:  str('caller_email'),
      postcode:      str('postcode'),
      job_type:      str('job_type'),
      urgency:       (str('urgency') as LeadUrgency | undefined),
      notes:         str('notes'),
    };
  }

  // Fallback: regex parse the AI's freeform summary
  const get = (re: RegExp): string | undefined => summary.match(re)?.[1]?.trim() || undefined;

  return {
    caller_name:   get(/(?:customer|caller|name)[:\s|]+([A-Z][a-z]+(?: [A-Z][a-z]+)+)/),
    caller_number: get(/(?:number|mobile|phone|tel)[:\s|]+([+\d\s().-]{7,15})/i),
    postcode:      get(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i),
    job_type:      get(/(?:job|trade|work|repair|service)[:\s|]+([^|.\n]{3,40})/i),
    urgency:       (/urgent|emergency/i.test(summary) ? 'urgent' : 'routine') as LeadUrgency,
    notes:         summary.length > 20 ? summary.slice(0, 1000) : undefined,
  };
}

function deriveOutcome(summary: string): CallOutcome {
  const first = summary.trim().split(/[\s|:\n]/)[0]?.toUpperCase() ?? '';
  const map: Record<string, CallOutcome> = {
    BOOKED:        'booked',
    LEAD_CAPTURED: 'lead_captured',
    ENQUIRY:       'enquiry',
    SPAM:          'spam',
    VOICEMAIL:     'voicemail',
    EMERGENCY:     'emergency',
    TRANSFERRED:   'transferred',
    NO_ANSWER:     'no_answer',
  };
  return map[first] ?? 'enquiry';
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCallStarted(event: RetellCallStartedEvent): Promise<void> {
  // Look up client — we may want to log the inbound call start
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('retell_agent_id', event.agent_id)
    .single();

  if (!client) {
    console.warn('[retell] call_started: no client for agent_id', event.agent_id);
    return;
  }

  // Insert a placeholder call so we have a row from the moment it starts
  await supabase.from('calls').upsert(
    {
      client_id:      client.id,
      retell_call_id: event.call_id,
      caller_number:  event.from_number,
      direction:      'inbound',
      is_emergency:   false,
      started_at:     new Date().toISOString(),
    },
    { onConflict: 'retell_call_id', ignoreDuplicates: true }
  );

  console.log(`[retell] call_started  call_id=${event.call_id}`);
}

async function handleCallEnded(event: RetellCallEndedEvent): Promise<void> {
  // Look up client
  const { data: clientRow } = await supabase
    .from('clients')
    .select('*')
    .eq('retell_agent_id', event.agent_id)
    .single();

  if (!clientRow) {
    console.warn('[retell] call_ended: no client for agent_id', event.agent_id);
    return;
  }

  const client = clientRow as Client;
  const transcript = event.transcript ?? '';
  const summary    = event.call_analysis?.call_summary ?? '';
  const outcome    = deriveOutcome(summary);
  const isEmergency = outcome === 'emergency' || detectEmergency(transcript);

  const durationSecs = Math.round((event.duration_ms ?? 0) / 1000);
  const startedAt = event.start_timestamp
    ? new Date(event.start_timestamp).toISOString()
    : null;
  const endedAt = event.end_timestamp
    ? new Date(event.end_timestamp).toISOString()
    : null;

  // Upsert the call — idempotent if Retell retries
  const { data: callRow, error: callErr } = await supabase
    .from('calls')
    .upsert(
      {
        client_id:      client.id,
        retell_call_id: event.call_id,
        caller_number:  event.from_number,
        direction:      'inbound',
        duration_secs:  durationSecs,
        outcome,
        is_emergency:   isEmergency,
        recording_url:  event.recording_url ?? null,
        started_at:     startedAt,
        ended_at:       endedAt,
      },
      { onConflict: 'retell_call_id' }
    )
    .select()
    .single();

  if (callErr || !callRow) {
    console.error('[retell] call upsert failed', callErr);
    return;
  }

  const call = callRow as Call;

  // Save transcript
  if (transcript || summary) {
    await supabase.from('transcripts').upsert(
      {
        call_id:   call.id,
        full_text: transcript || null,
        summary:   summary || null,
        raw_json:  (event.call_analysis as Record<string, unknown>) ?? null,
      },
      { onConflict: 'call_id' }
    );
  }

  // Extract and persist lead for outcomes worth following up
  const leadOutcomes: CallOutcome[] = ['booked', 'lead_captured', 'enquiry', 'emergency'];
  if (leadOutcomes.includes(outcome)) {
    const leadData = extractLeadData(summary, event.call_analysis?.custom_analysis_data);
    const lead: LeadInsert = {
      client_id:     client.id,
      call_id:       call.id,
      caller_number: leadData.caller_number ?? event.from_number,
      caller_name:   leadData.caller_name ?? null,
      caller_email:  leadData.caller_email ?? null,
      postcode:      leadData.postcode ?? null,
      job_type:      leadData.job_type ?? null,
      urgency:       isEmergency ? 'emergency' : (leadData.urgency ?? 'routine'),
      notes:         leadData.notes ?? null,
      status:        outcome === 'booked' ? 'booked' : 'new',
    };

    const { error: leadErr } = await supabase.from('leads').insert(lead);
    if (leadErr) console.error('[retell] lead insert failed', leadErr);
  }

  // Emergency escalation
  if (isEmergency) {
    await escalateEmergency(client, call, summary);
    return;
  }

  // Normal post-call workflow (SMS + WhatsApp + email)
  const leadData = extractLeadData(summary, event.call_analysis?.custom_analysis_data);
  await postCallWorkflow(client, call, summary, {
    callerName:  leadData.caller_name  ?? null,
    jobType:     leadData.job_type     ?? null,
    postcode:    leadData.postcode     ?? null,
    urgency:     leadData.urgency      ?? null,
    transcript:  transcript            || null,
  });

  console.log(`[retell] call_ended  call_id=${event.call_id}  outcome=${outcome}  duration=${durationSecs}s`);
}

async function handleCallAnalyzed(event: RetellCallAnalyzedEvent): Promise<void> {
  // Find the stored call
  const { data: callRow } = await supabase
    .from('calls')
    .select('id')
    .eq('retell_call_id', event.call_id)
    .single();

  if (!callRow) {
    console.warn('[retell] call_analyzed: call not found', event.call_id);
    return;
  }

  // Update transcript with refined analysis
  await supabase.from('transcripts').upsert(
    {
      call_id:   callRow.id,
      summary:   event.call_analysis?.call_summary ?? null,
      raw_json:  event.call_analysis as Record<string, unknown>,
    },
    { onConflict: 'call_id' }
  );

  // Update lead if custom_analysis_data has better structured values
  const customData = event.call_analysis?.custom_analysis_data;
  if (customData && Object.keys(customData).length > 0) {
    const lead = extractLeadData('', customData);
    await supabase
      .from('leads')
      .update({ ...lead, updated_at: new Date().toISOString() })
      .eq('call_id', callRow.id);
  }

  console.log(`[retell] call_analyzed  call_id=${event.call_id}`);
}

// ── Main POST handler ─────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  // req.body is a raw Buffer here (set in index.ts before express.json())
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-retell-signature'] as string | undefined;

  if (!signature || !verifySignature(rawBody, signature)) {
    console.warn('[retell] rejected request — invalid signature');
    // Still return 200 so Retell doesn't retry (prevents log spam)
    res.status(200).json({ ok: false, reason: 'invalid_signature' });
    return;
  }

  // Always ack before any async work
  res.status(200).json({ received: true });

  let event: RetellWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as RetellWebhookEvent;
  } catch {
    console.error('[retell] body parse error');
    return;
  }

  // Fire and forget — never let processing errors surface back to Retell
  (async () => {
    try {
      switch (event.event) {
        case 'call_started':
          await handleCallStarted(event);
          break;
        case 'call_ended':
          await handleCallEnded(event);
          break;
        case 'call_analyzed':
          await handleCallAnalyzed(event);
          break;
        default:
          console.log('[retell] unknown event', (event as { event: string }).event);
      }
    } catch (err) {
      console.error('[retell] unhandled error in event handler', err);
    }
  })();
});

export default router;
