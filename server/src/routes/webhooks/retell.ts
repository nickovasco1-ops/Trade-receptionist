import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../../services/supabase';
import { postCallWorkflow } from '../../services/retell';
import { createCalendarEvent, localToUtc } from '../../services/calendar';
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
  BookingInsert,
  LeadUrgency,
} from '../../../../shared/types';

const router = Router();

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.RETELL_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[retell] RETELL_WEBHOOK_SECRET not set — skipping verification');
    return true;
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

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

/**
 * Extract the booked appointment datetime from the call summary or Retell's
 * structured post-call analysis data.
 * Returns a local-time ISO string (no Z suffix) like "2024-06-20T10:00"
 * or null if no booking time could be found.
 */
function extractScheduledAt(
  summary:    string,
  customData?: Record<string, unknown>
): string | null {
  // Prefer Retell's structured extraction
  const fromCustom = customData?.scheduled_at;
  if (typeof fromCustom === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(fromCustom.trim())) {
    return fromCustom.trim().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  }

  // Fall back to parsing the "Scheduled: ..." line from the freeform summary
  const match = summary.match(/^Scheduled:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/m);
  return match?.[1] ?? null;
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
  let leadId: string | null = null;
  const customData = event.call_analysis?.custom_analysis_data;

  if (leadOutcomes.includes(outcome)) {
    const leadData = extractLeadData(summary, customData);
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

    const { data: leadRow, error: leadErr } = await supabase
      .from('leads')
      .insert(lead)
      .select('id')
      .single();
    if (leadErr) console.error('[retell] lead insert failed', leadErr);
    else         leadId = leadRow.id as string;
  }

  // Create Google Calendar event + booking record for confirmed bookings
  if (outcome === 'booked' && client.google_cal_id && client.google_refresh_token) {
    const leadData = extractLeadData(summary, customData);
    const scheduledLocal = extractScheduledAt(summary, customData);

    if (scheduledLocal) {
      // Fetch business config for timezone
      const { data: configRow } = await supabase
        .from('business_config')
        .select('timezone')
        .eq('client_id', client.id)
        .single();
      const timezone = (configRow as { timezone?: string } | null)?.timezone ?? 'Europe/London';

      try {
        const startUtc = localToUtc(scheduledLocal, timezone);
        const endUtc   = new Date(startUtc.getTime() + 60 * 60_000); // 1-hour slot

        // Build a local end-time string (no Z) for the Google Calendar API
        const endLocal = scheduledLocal.replace(/T(\d{2}):(\d{2})/, (_m, h, min) => {
          const totalMin = Number(h) * 60 + Number(min) + 60;
          return `T${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
        });

        const googleEventId = await createCalendarEvent(
          client.google_cal_id,
          client.google_refresh_token,
          {
            title:        `${leadData.job_type ?? 'Job'} — ${leadData.caller_name ?? 'Customer'}`,
            startTime:    scheduledLocal,
            endTime:      endLocal,
            customerName: leadData.caller_name ?? undefined,
            callerNumber: leadData.caller_number ?? event.from_number ?? undefined,
            notes:        leadData.notes ?? undefined,
            timezone,
          }
        );

        const booking: BookingInsert = {
          client_id:       client.id,
          lead_id:         leadId,
          google_event_id: googleEventId,
          scheduled_at:    startUtc.toISOString(),
          job_type:        leadData.job_type ?? null,
          address:         null,
          status:          'scheduled',
        };
        const { error: bookingErr } = await supabase.from('bookings').insert(booking);
        if (bookingErr) console.error('[retell] booking insert failed', bookingErr);
        else console.log(`[retell] calendar event created  event_id=${googleEventId}  scheduled=${startUtc.toISOString()}`);
      } catch (calErr) {
        console.error('[retell] Google Calendar event creation failed', calErr);
      }
    } else {
      console.warn(`[retell] BOOKED call ${event.call_id} has no parseable scheduled time — calendar event skipped`);
    }
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

  const webhookSecret = process.env.RETELL_WEBHOOK_SECRET;
  if (webhookSecret && (!signature || !verifySignature(rawBody, signature))) {
    // IMPORTANT: if you see this log, RETELL_WEBHOOK_SECRET in your environment
    // does not match the signing secret shown in your Retell dashboard.
    // All call notifications (SMS, email) are blocked until this is fixed.
    console.error(
      '[retell] SIGNATURE MISMATCH — webhook event rejected. ' +
      'Check RETELL_WEBHOOK_SECRET matches your Retell dashboard signing secret. ' +
      `signature_present=${!!signature}`
    );
    // Return 200 so Retell does not retry endlessly
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
