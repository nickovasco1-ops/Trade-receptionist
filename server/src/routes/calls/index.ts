import { Router, Request, Response } from 'express';
import { supabase } from '../../services/supabase';
import { getCall, postCallWorkflow } from '../../services/retell';
import type { ApiResponse, Call, Client, LeadInsert } from '../../../../shared/types';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { client_id, limit = '50', page = '1' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  let query = supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  const { data, error, count } = await query;

  if (error) {
    res.status(500).json({ success: false, error: error.message } satisfies ApiResponse);
    return;
  }

  res.json({
    success: true,
    data,
    meta: { total: count ?? 0, page: pageNum, limit: limitNum },
  } satisfies ApiResponse<Call[]>);
});

router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ success: false, error: 'Call not found' } satisfies ApiResponse);
    return;
  }

  res.json({ success: true, data } satisfies ApiResponse<Call>);
});

// POST /calls/backfill/:retell_call_id
// Fetch a call from Retell API and process it as if the call_ended webhook had fired.
// Use this to recover any call that didn't get processed (e.g. webhook delivery failure).
router.post('/backfill/:retell_call_id', async (req: Request, res: Response) => {
  const retell_call_id = req.params['retell_call_id'] as string;

  // Check if already processed
  const { data: existing } = await supabase
    .from('calls')
    .select('id')
    .eq('retell_call_id', retell_call_id)
    .single();

  if (existing) {
    res.json({ success: true, data: existing } satisfies ApiResponse);
    return;
  }

  // Fetch from Retell
  const retellCall = await getCall(retell_call_id);
  if (!retellCall) {
    res.status(404).json({ success: false, error: 'Call not found in Retell' } satisfies ApiResponse);
    return;
  }

  const agentId = retellCall.agent_id as string | undefined;
  if (!agentId) {
    res.status(400).json({ success: false, error: 'Call has no agent_id' } satisfies ApiResponse);
    return;
  }

  // Look up client
  const { data: clientRow } = await supabase
    .from('clients')
    .select('*')
    .eq('retell_agent_id', agentId)
    .single();

  if (!clientRow) {
    res.status(404).json({ success: false, error: `No client for agent_id ${agentId}` } satisfies ApiResponse);
    return;
  }

  const client = clientRow as Client;
  const analysis = retellCall.call_analysis as Record<string, unknown> | undefined;
  const summary = (analysis?.call_summary as string | undefined) ?? '';
  const transcript = (retellCall.transcript as string | undefined) ?? '';
  const durationSecs = Math.round(((retellCall.duration_ms as number | undefined) ?? 0) / 1000);
  const startedAt = retellCall.start_timestamp
    ? new Date(retellCall.start_timestamp as number).toISOString()
    : null;
  const endedAt = retellCall.end_timestamp
    ? new Date(retellCall.end_timestamp as number).toISOString()
    : null;

  const first = summary.trim().split(/[\s|:\n]/)[0]?.toUpperCase() ?? '';
  const outcomeMap: Record<string, string> = {
    BOOKED: 'booked', LEAD_CAPTURED: 'lead_captured', ENQUIRY: 'enquiry',
    SPAM: 'spam', VOICEMAIL: 'voicemail', EMERGENCY: 'emergency',
    TRANSFERRED: 'transferred', NO_ANSWER: 'no_answer',
  };
  const outcome = (outcomeMap[first] ?? 'enquiry') as Call['outcome'];

  // Upsert call
  const { data: callRow, error: callErr } = await supabase
    .from('calls')
    .upsert(
      {
        client_id:     client.id,
        retell_call_id,
        caller_number: (retellCall.from_number as string | undefined) ?? null,
        direction:     'inbound' as const,
        duration_secs: durationSecs,
        outcome,
        is_emergency:  outcome === 'emergency',
        recording_url: (retellCall.recording_url as string | undefined) ?? null,
        started_at:    startedAt,
        ended_at:      endedAt,
      },
      { onConflict: 'retell_call_id' }
    )
    .select()
    .single();

  if (callErr || !callRow) {
    res.status(500).json({ success: false, error: callErr?.message ?? 'Upsert failed' } satisfies ApiResponse);
    return;
  }

  const call = callRow as Call;

  // Save transcript
  if (transcript || summary) {
    await supabase.from('transcripts').upsert(
      { call_id: call.id, full_text: transcript || null, summary: summary || null },
      { onConflict: 'call_id' }
    );
  }

  // Insert lead if worth following up
  const leadOutcomes = ['booked', 'lead_captured', 'enquiry', 'emergency'];
  if (leadOutcomes.includes(outcome ?? '')) {
    const customData = (analysis?.custom_analysis_data as Record<string, unknown> | undefined) ?? {};
    const str = (key: string) => {
      const v = customData[key];
      return v && typeof v === 'string' && v.trim() ? v.trim() : undefined;
    };
    const lead: LeadInsert = {
      client_id:     client.id,
      call_id:       call.id,
      caller_number: str('caller_number') ?? call.caller_number,
      caller_name:   str('caller_name') ?? null,
      caller_email:  str('caller_email') ?? null,
      postcode:      str('postcode') ?? null,
      job_type:      str('job_type') ?? null,
      urgency:       (str('urgency') as LeadInsert['urgency'] | undefined) ?? 'routine',
      notes:         summary || null,
      status:        outcome === 'booked' ? 'booked' : 'new',
    };
    await supabase.from('leads').insert(lead).then(({ error: e }) => {
      if (e) console.error('[backfill] lead insert failed', e);
    });
  }

  // Fire notifications
  await postCallWorkflow(client, call, summary, {
    callerName: null, jobType: null, postcode: null, urgency: null, transcript: transcript || null,
  });

  console.log(`[backfill] processed call_id=${retell_call_id}  outcome=${outcome}`);
  res.json({ success: true, data: call } satisfies ApiResponse<Call>);
});

export default router;
