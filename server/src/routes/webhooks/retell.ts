import { Router, Request, Response } from 'express';
import { verify as retellVerify } from 'retell-sdk';
import { supabase } from '../../services/supabase';
import { postCallWorkflow } from '../../services/retell';
import { detectEmergency, escalateEmergency } from '../../lib/emergency';
import { logCall, logIncident } from '../../services/notion';
import { errorMessage, logEvent, requestId } from '../../lib/observability';
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
//
// Retell's signature format is NOT a plain HMAC of the body.
// The SDK signs/verifies as: HMAC-SHA256(body + timestamp) with the result
// formatted as "v={timestamp},d={hex}". The 5-minute replay window is
// enforced inside retell-sdk's verify() — never roll this by hand.
//
async function verifySignature(rawBody: Buffer, signature: string): Promise<boolean> {
  const secret = (process.env.RETELL_API_KEY ?? '').trim();
  if (!secret) return false;

  try {
    // SDK expects a string body — same bytes, different type.
    return await retellVerify(rawBody.toString('utf8'), secret, signature.trim());
  } catch {
    return false;
  }
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

const VALID_OUTCOMES: CallOutcome[] = [
  'booked', 'lead_captured', 'enquiry', 'spam', 'voicemail', 'emergency', 'transferred', 'no_answer',
];

function deriveOutcome(summary: string, customData?: Record<string, unknown>): CallOutcome {
  // Prefer the structured call_outcome from Retell's post-call analysis.
  const fromAnalysis = customData?.['call_outcome'];
  if (typeof fromAnalysis === 'string') {
    const v = fromAnalysis.trim().toLowerCase() as CallOutcome;
    if (VALID_OUTCOMES.includes(v)) return v;
  }

  // Fallback: parse a leading status word from the freeform summary.
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
    logEvent('warn', 'retell.webhook.client_not_found', { eventType: 'call_started' });
    return;
  }

  // Insert a placeholder call so we have a row from the moment it starts
  const { error } = await supabase.from('calls').upsert(
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

  if (error) {
    logEvent('error', 'retell.webhook.db_persistence_failed', {
      eventType: 'call_started',
      clientId: client.id,
      error: error.message,
    });
    return;
  }

  logEvent('info', 'retell.webhook.call_started_persisted', { eventType: 'call_started', clientId: client.id });
}

async function handleCallEnded(event: RetellCallEndedEvent): Promise<void> {
  // Look up client
  const { data: clientRow } = await supabase
    .from('clients')
    .select('*')
    .eq('retell_agent_id', event.agent_id)
    .single();

  if (!clientRow) {
    logEvent('warn', 'retell.webhook.client_not_found', { eventType: 'call_ended' });
    return;
  }

  const client = clientRow as Client;
  const transcript = event.transcript ?? '';
  const summary    = event.call_analysis?.call_summary ?? '';
  const outcome    = deriveOutcome(summary, event.call_analysis?.custom_analysis_data);
  const isEmergency = outcome === 'emergency' || detectEmergency(transcript);

  const durationSecs = Math.round((event.duration_ms ?? 0) / 1000);
  const startedAt = event.start_timestamp
    ? new Date(event.start_timestamp).toISOString()
    : null;
  const endedAt = event.end_timestamp
    ? new Date(event.end_timestamp).toISOString()
    : null;

  // Upsert the call — idempotent if Retell retries.
  // Only set started_at/ended_at when Retell provides them — never overwrite a
  // previously-set timestamp with null (call_started may have already set started_at).
  const upsertPayload: Record<string, unknown> = {
    client_id:      client.id,
    retell_call_id: event.call_id,
    caller_number:  event.from_number,
    direction:      'inbound',
    duration_secs:  durationSecs,
    outcome,
    is_emergency:   isEmergency,
    recording_url:  event.recording_url ?? null,
  };
  if (startedAt) upsertPayload.started_at = startedAt;
  if (endedAt)   upsertPayload.ended_at   = endedAt;

  const { data: callRow, error: callErr } = await supabase
    .from('calls')
    .upsert(upsertPayload, { onConflict: 'retell_call_id' })
    .select()
    .single();

  if (callErr || !callRow) {
    logEvent('error', 'retell.webhook.db_persistence_failed', {
      eventType: 'call_ended',
      clientId: client.id,
      error: callErr?.message ?? 'call upsert returned no row',
    });
    void logIncident({
      errorType:      'call_upsert_failed',
      subscriberName: client.business_name,
      severity:       'high',
      detail:         callErr?.message ?? null,
      timestamp:      new Date().toISOString(),
    });
    return;
  }

  const call = callRow as Call;

  // Save transcript
  if (transcript || summary) {
    const { error: transcriptErr } = await supabase.from('transcripts').upsert(
      {
        call_id:   call.id,
        full_text: transcript || null,
        summary:   summary || null,
        raw_json:  (event.call_analysis as Record<string, unknown>) ?? null,
      },
      { onConflict: 'call_id' }
    );

    if (transcriptErr) {
      logEvent('error', 'retell.webhook.db_persistence_failed', {
        eventType: 'call_ended',
        clientId: client.id,
        error: transcriptErr.message,
      });
    }
  }

  // Extract and persist lead for outcomes worth following up
  // Include no_answer and voicemail so missed calls create a lead record.
  // This is required for the deep-link SMS → lead flow (Phase 2.3): without a
  // lead row there is no leadId, leadUrl stays null, and the "View lead:" line
  // never appears in the owner SMS.
  const leadOutcomes: CallOutcome[] = ['booked', 'lead_captured', 'enquiry', 'emergency', 'no_answer', 'voicemail'];
  let insertedLeadId: string | null = null;
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

    const { data: insertedLead, error: leadErr } = await supabase
      .from('leads')
      .upsert(
        { ...lead, updated_at: new Date().toISOString() },
        { onConflict: 'call_id' }
      )
      .select('id')
      .single();

    if (leadErr) {
      logEvent('error', 'retell.webhook.db_persistence_failed', {
        eventType: 'call_ended',
        clientId: client.id,
        error: leadErr.message,
      });
    } else if (insertedLead) {
      insertedLeadId = insertedLead.id;
      logEvent('info', 'retell.webhook.lead_upserted', {
        eventType: 'call_ended',
        clientId: client.id,
      });

      const { error: bookingLinkError } = await supabase
        .from('bookings')
        .update({ lead_id: insertedLead.id })
        .eq('call_id', call.id)
        .is('lead_id', null);

      if (bookingLinkError) {
        logEvent('error', 'retell.webhook.db_persistence_failed', {
          eventType: 'call_ended',
          clientId: client.id,
          error: bookingLinkError.message,
        });
      }
    }
  }

  // Emergency escalation
  if (isEmergency) {
    const emergencyLead = extractLeadData(summary, event.call_analysis?.custom_analysis_data);
    void logCall({
      callerName:     emergencyLead.caller_name   ?? null,
      callerNumber:   event.from_number,
      postcode:       emergencyLead.postcode       ?? null,
      jobType:        emergencyLead.job_type       ?? null,
      urgency:        'emergency',
      durationSecs,
      subscriberName: client.business_name,
      outcome,
      recordingUrl:   event.recording_url          ?? null,
      timestamp:      new Date().toISOString(),
    });
    await escalateEmergency(client, call, summary);
    return;
  }

  // Normal post-call workflow (SMS + email)
  const leadData = extractLeadData(summary, event.call_analysis?.custom_analysis_data);
  try {
    await postCallWorkflow(client, call, summary, {
      callerName:  leadData.caller_name  ?? null,
      jobType:     leadData.job_type     ?? null,
      postcode:    leadData.postcode     ?? null,
      urgency:     leadData.urgency      ?? null,
      transcript:  transcript            || null,
      leadId:      insertedLeadId,
    });
  } catch (err: unknown) {
    logEvent('error', 'retell.webhook.provider_failure', {
      eventType: 'call_ended',
      clientId: client.id,
      provider: 'post_call_workflow',
      error: errorMessage(err),
    });
  }

  void logCall({
    callerName:     leadData.caller_name   ?? null,
    callerNumber:   event.from_number,
    postcode:       leadData.postcode       ?? null,
    jobType:        leadData.job_type       ?? null,
    urgency:        leadData.urgency        ?? 'routine',
    durationSecs,
    subscriberName: client.business_name,
    outcome,
    recordingUrl:   event.recording_url    ?? null,
    timestamp:      new Date().toISOString(),
  });

  logEvent('info', 'retell.webhook.call_ended_processed', {
    eventType: 'call_ended',
    clientId: client.id,
    outcome,
    durationSecs,
  });
}

async function handleCallAnalyzed(event: RetellCallAnalyzedEvent): Promise<void> {
  // Find the stored call
  const { data: callRow } = await supabase
    .from('calls')
    .select('id')
    .eq('retell_call_id', event.call_id)
    .single();

  if (!callRow) {
    logEvent('warn', 'retell.webhook.call_not_found', { eventType: 'call_analyzed' });
    return;
  }

  // Update transcript with refined analysis
  const { error: transcriptErr } = await supabase.from('transcripts').upsert(
    {
      call_id:   callRow.id,
      summary:   event.call_analysis?.call_summary ?? null,
      raw_json:  event.call_analysis as Record<string, unknown>,
    },
    { onConflict: 'call_id' }
  );

  if (transcriptErr) {
    logEvent('error', 'retell.webhook.db_persistence_failed', {
      eventType: 'call_analyzed',
      error: transcriptErr.message,
    });
  }

  // Update lead if custom_analysis_data has better structured values
  const customData = event.call_analysis?.custom_analysis_data;
  if (customData && Object.keys(customData).length > 0) {
    const lead = extractLeadData('', customData);
    const { error: leadErr } = await supabase
      .from('leads')
      .update({ ...lead, updated_at: new Date().toISOString() })
      .eq('call_id', callRow.id);

    if (leadErr) {
      logEvent('error', 'retell.webhook.db_persistence_failed', {
        eventType: 'call_analyzed',
        error: leadErr.message,
      });
    }
  }

  logEvent('info', 'retell.webhook.call_analyzed_processed', { eventType: 'call_analyzed' });
}

// ── Main POST handler ─────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  // req.body is a raw Buffer here (set in index.ts before express.json())
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-retell-signature'] as string | undefined;
  const reqId = requestId(req);

  logEvent('info', 'retell.webhook.received', {
    requestId: reqId,
    hasSignature: Boolean(signature),
    bodyBytes: rawBody?.length ?? 0,
  });

  if (!(await verifySignature(rawBody, signature ?? ''))) {
    // Log as ERROR (not warn) so Railway alerts fire — this is a call being silently dropped.
    // Return 200 so Retell does not retry (avoids log spam), but this MUST be investigated:
    // it means RETELL_API_KEY in Railway no longer matches what Retell uses to sign webhooks.
    // Recovery: run POST /admin/sync-calls to backfill any missed calls.
    logEvent('error', 'retell.webhook.invalid_signature', {
      requestId: reqId,
      hasSignature: Boolean(signature),
      action: 'call_dropped — run POST /admin/sync-calls to recover, check RETELL_API_KEY in Railway',
    });
    res.status(200).json({ ok: false, reason: 'invalid_signature' });
    return;
  }

  // Always ack before any async work
  res.status(200).json({ received: true });

  let event: RetellWebhookEvent;
  try {
    const raw = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    // Retell v2 nests the call fields under `call` ({ event, call: { agent_id, ... } }).
    // The handlers (and our types) read them flat, so flatten the call object up to the
    // top level. Falls back to the raw payload if it is already flat (defensive).
    const call = raw['call'];
    event = (call && typeof call === 'object')
      ? ({ event: raw['event'], ...(call as Record<string, unknown>) } as unknown as RetellWebhookEvent)
      : (raw as unknown as RetellWebhookEvent);
  } catch (err) {
    logEvent('error', 'retell.webhook.malformed_payload', { requestId: reqId, error: errorMessage(err) });
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
          logEvent('warn', 'retell.webhook.unknown_event', { requestId: reqId, eventType: (event as { event: string }).event });
      }
    } catch (err) {
      logEvent('error', 'retell.webhook.handler_error', {
        requestId: reqId,
        eventType: event.event,
        error: errorMessage(err),
      });
      void logIncident({
        errorType:      'webhook_handler_error',
        subscriberName: null,
        severity:       'critical',
        detail:         err instanceof Error ? err.message : String(err),
        timestamp:      new Date().toISOString(),
      });
    }
  })();
});

export default router;
