// Initialise Sentry before any other import so the SDK can auto-instrument.
import './instrument';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

import healthRouter   from './routes/health';
import webhooksRouter from './routes/webhooks';
import clientsRouter  from './routes/clients';
import callsRouter    from './routes/calls';
import authRouter     from './routes/auth';
import bookingsRouter from './routes/bookings';
import retellToolsRouter from './routes/retell-tools';
import billingRouter  from './routes/billing';
import { applyE2ETestProviderEnv } from './config/e2e';
import { runLeadFollowUp } from './services/lead-followup';
import { listCallsForAgent, postCallWorkflow, patchRetellAgent } from './services/retell';
import { supabase } from './services/supabase';
import { logEvent } from './lib/observability';
import type { Call, Client } from '../../shared/types';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const TRUST_PROXY_HOPS = parseInt(
  process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? '1' : '0'),
  10
);

function getForwardedIp(forwardedHeader: string): string | null {
  const match = forwardedHeader.match(/for=(?:"?\[?([^;\]",]+)\]?)/i);
  return match?.[1]?.trim() || null;
}

function getClientIdentifier(request: express.Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]?.trim()) {
    return forwardedFor[0].split(',')[0].trim();
  }

  const forwarded = request.headers.forwarded;

  if (typeof forwarded === 'string') {
    const forwardedIp = getForwardedIp(forwarded);

    if (forwardedIp) {
      return forwardedIp;
    }
  }

  return request.ip || request.socket.remoteAddress || 'unknown';
}

const rateLimitKeyGenerator = (request: express.Request) => getClientIdentifier(request);

app.set('trust proxy', Number.isNaN(TRUST_PROXY_HOPS) ? 0 : Math.max(TRUST_PROXY_HOPS, 0));

// ── Security headers ────────────────────────────────────────────────────────────
// API serves JSON to a cross-origin SPA, not HTML documents — disable the document
// CSP (the frontend CSP lives in vercel.json) and allow cross-origin resource use.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',');

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o.trim()))) {
        cb(null, true);
      } else {
        cb(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────

// Generous default for dashboard API calls
const defaultLimiter = rateLimit({
  windowMs:         60_000,
  max:              120,
  standardHeaders:  true,
  legacyHeaders:    false,
  keyGenerator:     rateLimitKeyGenerator,
  message:          { success: false, error: 'Too many requests — please slow down.' },
});

// Tight limit on write operations that trigger third-party calls
const writeLimiter = rateLimit({
  windowMs:         60_000,
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  keyGenerator:     rateLimitKeyGenerator,
  message:          { success: false, error: 'Too many requests — please slow down.' },
});

// Webhooks are called by Stripe/Retell/Twilio — allow high volume but still cap abuse
const webhookLimiter = rateLimit({
  windowMs:         60_000,
  max:              300,
  standardHeaders:  true,
  legacyHeaders:    false,
  keyGenerator:     rateLimitKeyGenerator,
  message:          { success: false, error: 'Rate limit exceeded.' },
});

app.use('/clients',           defaultLimiter);
app.use('/calls',             defaultLimiter);
app.use('/billing',           writeLimiter);
app.use('/bookings',          defaultLimiter, (req, res, next) => {
  if (req.method === 'POST') {
    return writeLimiter(req, res, next);
  }

  return next();
});
app.use('/auth',              writeLimiter);
app.use('/webhooks',          webhookLimiter);
app.use('/retell-tools',      webhookLimiter);

// ── Body parsers ──────────────────────────────────────────────────────────────
// /webhooks/retell and /webhooks/stripe need the raw Buffer for HMAC verification.
// These MUST be registered before express.json() or the raw body is lost.
app.use('/webhooks/retell',  express.raw({ type: 'application/json' }));
app.use('/webhooks/stripe',  express.raw({ type: 'application/json' }));
app.use('/retell-tools',     express.raw({ type: 'application/json' }));

// Everything else gets parsed JSON
app.use(express.json());

// Twilio sends form-encoded delivery receipt callbacks
app.use(express.urlencoded({ extended: false }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health',       healthRouter);
app.use('/webhooks',     webhooksRouter);
app.use('/clients',      clientsRouter);
app.use('/calls',        callsRouter);
app.use('/bookings',     bookingsRouter);
app.use('/auth',         authRouter);
app.use('/billing',      billingRouter);
app.use('/retell-tools', retellToolsRouter);

// ── POST /admin/test-notifications ───────────────────────────────────────────
// Send a live test email + SMS to the owner to verify Resend and Twilio work.
app.post('/admin/test-notifications', express.json(), async (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    res.status(401).json({ success: false, error: 'Unauthorised' });
    return;
  }

  const { clientId } = req.body as { clientId?: string };
  if (!clientId) { res.status(400).json({ success: false, error: 'clientId required' }); return; }

  const [{ data: client }, { data: config }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('business_config').select('*').eq('client_id', clientId).single(),
  ]);

  if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return; }

  const fakeCall: Call = {
    id: 'test-call-id',
    client_id: clientId,
    retell_call_id: 'test_call_diagnostic',
    caller_number: '+447700900000',
    direction: 'inbound',
    outcome: 'enquiry',
    is_emergency: false,
    duration_secs: 90,
    recording_url: null,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const results: Record<string, string> = {};

  try {
    await postCallWorkflow(client as Client, fakeCall, '🧪 TEST — This is a diagnostic notification to verify your email and SMS are working correctly. If you received this, notifications are live.', {
      callerName: 'Test Caller',
      jobType: 'Diagnostic test',
      postcode: null,
      urgency: null,
      transcript: null,
      leadId: null,
    });
    results.status = 'sent';
  } catch (err: unknown) {
    results.status = 'failed';
    results.error = err instanceof Error ? err.message : String(err);
  }

  res.json({ success: true, data: { owner_email: client.owner_email, owner_mobile: (client as Client).owner_mobile, twilio_number: (client as Client).twilio_number, results } });
});

// ── POST /admin/notify-call ───────────────────────────────────────────────────
// Re-fire post-call notifications for a specific call that missed them.
app.post('/admin/notify-call', express.json(), async (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    res.status(401).json({ success: false, error: 'Unauthorised' });
    return;
  }

  const { retellCallId } = req.body as { retellCallId?: string };
  if (!retellCallId) { res.status(400).json({ success: false, error: 'retellCallId required' }); return; }

  const { data: callRow } = await supabase
    .from('calls').select('*').eq('retell_call_id', retellCallId).single();
  if (!callRow) { res.status(404).json({ success: false, error: 'Call not found' }); return; }

  const { data: clientRow } = await supabase
    .from('clients').select('*').eq('id', callRow.client_id).single();
  if (!clientRow) { res.status(404).json({ success: false, error: 'Client not found' }); return; }

  const { data: transcriptRow } = await supabase
    .from('transcripts').select('summary, full_text').eq('call_id', callRow.id).maybeSingle();

  const { data: leadRow } = await supabase
    .from('leads').select('id, caller_name, job_type, postcode, urgency').eq('call_id', callRow.id).maybeSingle();

  try {
    await postCallWorkflow(clientRow as Client, callRow as Call, transcriptRow?.summary ?? '', {
      callerName: leadRow?.caller_name ?? null,
      jobType: leadRow?.job_type ?? null,
      postcode: leadRow?.postcode ?? null,
      urgency: leadRow?.urgency ?? null,
      transcript: transcriptRow?.full_text ?? null,
      leadId: leadRow?.id ?? null,
    });
    res.json({ success: true, data: { retellCallId, outcome: callRow.outcome, owner_email: clientRow.owner_email } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Admin endpoints (internal cron targets) ───────────────────────────────────
app.post('/admin/run-lead-followup', express.json(), async (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    res.status(401).json({ success: false, error: 'Unauthorised' });
    return;
  }
  try {
    const result = await runLeadFollowUp();
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── POST /admin/enable-recording ─────────────────────────────────────────────
// Patch record_audio: true onto every provisioned Retell agent.
// Safe to call repeatedly — PATCH is idempotent.
app.post('/admin/enable-recording', express.json(), async (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    res.status(401).json({ success: false, error: 'Unauthorised' });
    return;
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, retell_agent_id, business_name')
    .not('retell_agent_id', 'is', null);

  if (!clients?.length) {
    res.json({ success: true, data: { patched: 0 } });
    return;
  }

  let patched = 0;
  const errors: string[] = [];

  for (const client of clients) {
    try {
      await patchRetellAgent(client.retell_agent_id as string, { record_audio: true });
      patched++;
      logEvent('info', 'admin.enable_recording.patched', {
        clientId: client.id,
        agentId: client.retell_agent_id as string,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${client.retell_agent_id}: ${msg}`);
      logEvent('error', 'admin.enable_recording.failed', {
        clientId: client.id,
        agentId: client.retell_agent_id as string,
        error: msg,
      });
    }
  }

  res.json({ success: true, data: { patched, errors } });
});

// ── POST /admin/sync-calls ────────────────────────────────────────────────────
// Pull the last N days of calls from Retell for all clients and upsert any that
// are missing from the database. Fixes calls lost due to webhook delivery failures.
app.post('/admin/sync-calls', express.json(), async (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    res.status(401).json({ success: false, error: 'Unauthorised' });
    return;
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, retell_agent_id')
    .not('retell_agent_id', 'is', null);

  if (!clients?.length) {
    res.json({ success: true, data: { synced: 0, skipped: 0 } });
    return;
  }

  let synced = 0;
  let skipped = 0;

  for (const client of clients) {
    const retellCalls = await listCallsForAgent(client.retell_agent_id as string);

    for (const rc of retellCalls) {
      const retellCallId = rc.call_id as string | undefined;
      if (!retellCallId) continue;

      const { data: existing } = await supabase
        .from('calls')
        .select('id')
        .eq('retell_call_id', retellCallId)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const startTs = rc.start_timestamp as number | undefined;
      const endTs   = rc.end_timestamp   as number | undefined;
      const durationSecs = Math.round(((rc.duration_ms as number | undefined) ?? 0) / 1000);
      const analysis = rc.call_analysis as Record<string, unknown> | undefined;
      const summary = (analysis?.call_summary as string | undefined) ?? '';
      const first = summary.trim().split(/[\s|:\n]/)[0]?.toUpperCase() ?? '';
      const outcomeMap: Record<string, string> = {
        BOOKED: 'booked', LEAD_CAPTURED: 'lead_captured', ENQUIRY: 'enquiry',
        SPAM: 'spam', VOICEMAIL: 'voicemail', EMERGENCY: 'emergency',
        TRANSFERRED: 'transferred', NO_ANSWER: 'no_answer',
      };
      const outcome = outcomeMap[first] ?? 'enquiry';

      const { error } = await supabase.from('calls').insert({
        client_id:      client.id,
        retell_call_id: retellCallId,
        caller_number:  (rc.from_number as string | undefined) ?? null,
        direction:      'inbound',
        duration_secs:  durationSecs,
        outcome,
        is_emergency:   outcome === 'emergency',
        recording_url:  (rc.recording_url as string | undefined) ?? null,
        started_at:     startTs ? new Date(startTs).toISOString() : null,
        ended_at:       endTs   ? new Date(endTs).toISOString()   : null,
      });

      if (error) {
        logEvent('error', 'admin.sync_calls.insert_failed', { retellCallId, error: error.message });
      } else {
        // Upsert transcript if available
        if (summary) {
          const { data: callRow } = await supabase.from('calls').select('id').eq('retell_call_id', retellCallId).single();
          if (callRow) {
            await supabase.from('transcripts').upsert(
              { call_id: callRow.id, summary, full_text: (rc.transcript as string | undefined) ?? null },
              { onConflict: 'call_id' }
            );
          }
        }
        synced++;
      }
    }
  }

  logEvent('info', 'admin.sync_calls.complete', { synced, skipped });
  res.json({ success: true, data: { synced, skipped } });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Sentry error handler — must be registered after routes. No-ops without SENTRY_DSN.
Sentry.setupExpressErrorHandler(app);

// ── Startup validation ────────────────────────────────────────────────────────
applyE2ETestProviderEnv();

const REQUIRED_ENV: string[] = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'RETELL_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const WARN_ENV: string[] = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[server] FATAL: required env var ${key} is not set. Exiting.`);
    process.exit(1);
  }
}

for (const key of WARN_ENV) {
  if (!process.env[key]) {
    console.warn(`[server] WARNING: ${key} is not set — related features will not work correctly.`);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`[server] Trade Receptionist API → http://localhost:${PORT}`);
  console.log(`[server] Health check          → http://localhost:${PORT}/health`);
  console.log(`[server] Retell webhook        → POST http://localhost:${PORT}/webhooks/retell`);
});

export default app;
