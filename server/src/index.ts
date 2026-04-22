import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

import healthRouter   from './routes/health';
import webhooksRouter from './routes/webhooks';
import clientsRouter  from './routes/clients';
import callsRouter    from './routes/calls';
import authRouter     from './routes/auth';

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

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

// ── Body parsers ──────────────────────────────────────────────────────────────
// /webhooks/retell needs the raw Buffer so the HMAC signature can be verified.
// This MUST be registered before express.json() or the raw body is lost.
app.use('/webhooks/retell', express.raw({ type: 'application/json' }));

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

// ── Start ─────────────────────────────────────────────────────────────────────
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`[server] Trade Receptionist API → http://localhost:${PORT}`);
  console.log(`[server] Health check          → http://localhost:${PORT}/health`);
  console.log(`[server] Retell webhook        → POST http://localhost:${PORT}/webhooks/retell`);
});

export default app;
