import * as Sentry from '@sentry/node';

// Initialise Sentry before any other module is imported so the SDK can
// auto-instrument HTTP and Express. Gated on SENTRY_DSN: absent in local/CI,
// set in production (Railway) to activate error + performance capture.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    // Server-side: never attach PII (call audio, phone numbers, emails).
    sendDefaultPii: false,
  });
}
