import { Router, Request, Response } from 'express';
import { Readable } from 'stream';
import { supabase } from '../../services/supabase';
import { getCall, postCallWorkflow } from '../../services/retell';
import type { ApiResponse, Call, Client, LeadInsert } from '../../../../shared/types';
import { logEvent, errorMessage } from '../../lib/observability';

function bearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim() || null;
}

async function getOwnerEmail(req: Request, res: Response): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing authentication token' } satisfies ApiResponse);
    return null;
  }
  const { data: authData, error } = await supabase.auth.getUser(token);
  const ownerEmail = authData.user?.email;
  if (error || !ownerEmail) {
    res.status(401).json({ success: false, error: 'Invalid authentication token' } satisfies ApiResponse);
    return null;
  }
  return ownerEmail;
}

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
    .eq('id', String(req.params['id']))
    .single();

  if (error || !data) {
    res.status(404).json({ success: false, error: 'Call not found' } satisfies ApiResponse);
    return;
  }

  res.json({ success: true, data } satisfies ApiResponse<Call>);
});

// GET /calls/:id/recording
// Stream a call recording through our own origin with the correct audio/wav
// content-type. Retell's CloudFront serves recordings as `binary/octet-stream`,
// which Safari and some browsers refuse to play in an <audio> element. Proxying
// also keeps the raw Retell CDN URL private.
//
// The browser <audio> element cannot send an Authorization header, so the access
// token is passed as a query param and validated here. Range requests are
// forwarded so seeking/scrubbing works.
router.get('/:id/recording', async (req: Request, res: Response) => {
  const callId = String(req.params['id']);
  const token = (req.query['token'] as string | undefined)?.trim() || bearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing authentication token' } satisfies ApiResponse);
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const ownerEmail = authData.user?.email;
  if (authError || !ownerEmail) {
    res.status(401).json({ success: false, error: 'Invalid authentication token' } satisfies ApiResponse);
    return;
  }

  // Fetch the call and verify the requester owns it (service role bypasses RLS).
  const { data: callRow } = await supabase
    .from('calls')
    .select('recording_url, clients!inner ( owner_email )')
    .eq('id', callId)
    .maybeSingle();

  const callOwner = (callRow as { clients?: { owner_email?: string } } | null)?.clients?.owner_email;
  const recordingUrl = (callRow as { recording_url?: string | null } | null)?.recording_url ?? null;

  if (!callRow || callOwner !== ownerEmail) {
    res.status(404).json({ success: false, error: 'Call not found' } satisfies ApiResponse);
    return;
  }
  if (!recordingUrl) {
    res.status(404).json({ success: false, error: 'No recording for this call' } satisfies ApiResponse);
    return;
  }

  try {
    const range = req.headers.range;
    const upstream = await fetch(recordingUrl, {
      headers: range ? { Range: range } : {},
    });

    if (!upstream.ok || !upstream.body) {
      logEvent('error', 'calls.recording.upstream_failed', { callId, status: upstream.status });
      res.status(502).json({ success: false, error: 'Could not fetch recording' } satisfies ApiResponse);
      return;
    }

    res.status(upstream.status === 206 ? 206 : 200);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  } catch (err: unknown) {
    logEvent('error', 'calls.recording.exception', { callId, error: errorMessage(err) });
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to stream recording' } satisfies ApiResponse);
    }
  }
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
      if (e) logEvent('error', 'calls.backfill.lead_insert_failed', { retell_call_id, error: errorMessage(e) });
    });
  }

  // Fire notifications
  await postCallWorkflow(client, call, summary, {
    callerName: null, jobType: null, postcode: null, urgency: null, transcript: transcript || null,
  });

  logEvent('info', 'calls.backfill.processed', { retell_call_id, outcome });
  res.json({ success: true, data: call } satisfies ApiResponse<Call>);
});

// ── Web call proxy (for browser-based agent testing without a phone) ──────────
router.post('/create-web-call', async (req: Request, res: Response) => {
  // Require a valid Supabase session — prevents unauthenticated Retell credit drain.
  const ownerEmail = await getOwnerEmail(req, res);
  if (!ownerEmail) return;

  const retellApiKey = process.env.RETELL_API_KEY;
  if (!retellApiKey) {
    res.status(500).json({ error: 'RETELL_API_KEY not configured' });
    return;
  }

  const { agent_id } = req.body as { agent_id?: string };
  if (!agent_id) {
    res.status(400).json({ error: 'agent_id is required' });
    return;
  }

  // Verify the caller owns the agent they're requesting (prevent cross-tenant test calls).
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('retell_agent_id', agent_id)
    .eq('owner_email', ownerEmail)
    .maybeSingle();

  if (!clientRow) {
    res.status(403).json({ error: 'Agent not found or not accessible' });
    return;
  }

  try {
    const retellRes = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id }),
    });

    const data = await retellRes.json() as Record<string, unknown>;

    if (!retellRes.ok) {
      logEvent('error', 'calls.create_web_call.failed', { status: retellRes.status, detail: JSON.stringify(data).slice(0, 200) });
      res.status(retellRes.status).json({ error: (data['message'] as string) ?? 'Failed to create web call' });
      return;
    }

    logEvent('info', 'calls.create_web_call.created', { call_id: String(data['call_id'] ?? '') });
    res.json({ access_token: data['access_token'], call_id: data['call_id'] });
  } catch (err) {
    logEvent('error', 'calls.create_web_call.exception', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Failed to create web call' });
  }
});

export default router;
