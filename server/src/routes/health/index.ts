import { Router } from 'express';

const router = Router();
const started = Date.now();

router.get('/', (_req, res) => {
  res.json({
    ok:        true,
    uptime:    Math.floor((Date.now() - started) / 1000),
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV ?? 'development',
  });
});

// Integration presence check — reports which env vars are configured.
// Never exposes values; safe to hit publicly.
router.get('/integrations', (_req, res) => {
  const has = (key: string) => !!process.env[key];
  res.json({
    sentry:  { dsn: has('SENTRY_DSN') },
    notion:  {
      api_key:        has('NOTION_API_KEY'),
      call_log_db:    has('NOTION_CALL_LOG_DB_ID'),
      subscribers_db: has('NOTION_SUBSCRIBERS_DB_ID'),
      incidents_db:   has('NOTION_INCIDENTS_DB_ID'),
    },
    stripe:  { secret_key: has('STRIPE_SECRET_KEY'), webhook_secret: has('STRIPE_WEBHOOK_SECRET') },
    retell:  { api_key: has('RETELL_API_KEY') },
    twilio:  { account_sid: has('TWILIO_ACCOUNT_SID'), auth_token: has('TWILIO_AUTH_TOKEN') },
    resend:  { api_key: has('RESEND_API_KEY') },
    google:  { client_id: has('GOOGLE_CLIENT_ID'), client_secret: has('GOOGLE_CLIENT_SECRET') },
  });
});

export default router;
