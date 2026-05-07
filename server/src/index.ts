import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

import healthRouter   from './routes/health';
import webhooksRouter from './routes/webhooks';
import clientsRouter  from './routes/clients';
import callsRouter    from './routes/calls';
import authRouter     from './routes/auth';

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
app.use('/auth',              writeLimiter);
app.use('/webhooks',          webhookLimiter);

// ── Body parsers ──────────────────────────────────────────────────────────────
// /webhooks/retell and /webhooks/stripe need the raw Buffer for HMAC verification.
// These MUST be registered before express.json() or the raw body is lost.
app.use('/webhooks/retell',  express.raw({ type: 'application/json' }));
app.use('/webhooks/stripe',  express.raw({ type: 'application/json' }));

// Everything else gets parsed JSON
app.use(express.json());

// Twilio sends form-encoded delivery receipt callbacks
app.use(express.urlencoded({ extended: false }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health',   healthRouter);
app.use('/webhooks', webhooksRouter);
app.use('/clients',  clientsRouter);
app.use('/calls',    callsRouter);
app.use('/auth',     authRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ── Startup validation ────────────────────────────────────────────────────────
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
