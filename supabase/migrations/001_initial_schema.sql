-- Trade Receptionist — Initial Schema
-- Run via: supabase db push  OR  psql $DATABASE_URL -f 001_initial_schema.sql

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Clients ──────────────────────────────────────────────────────────────────
-- One row per tradesperson / business subscribed to the service.
CREATE TABLE IF NOT EXISTS clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  business_name         TEXT,
  email                 TEXT UNIQUE NOT NULL,
  phone                 TEXT UNIQUE NOT NULL,
  retell_agent_id       TEXT,             -- Retell AI agent assigned to this client
  twilio_number         TEXT,             -- virtual inbound number assigned to this client
  plan                  TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','agency')),
  status                TEXT NOT NULL DEFAULT 'trial'   CHECK (status IN ('trial','active','paused','cancelled')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  calendar_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  google_calendar_id    TEXT,             -- client's Google Calendar ID for booking
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Calls ─────────────────────────────────────────────────────────────────────
-- Every call handled by the AI receptionist.
CREATE TABLE IF NOT EXISTS calls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  retell_call_id    TEXT UNIQUE,
  caller_number     TEXT,
  duration_seconds  INTEGER,
  outcome           TEXT CHECK (outcome IN ('booked','enquiry','spam','voicemail','transferred','emergency')),
  transcript        TEXT,
  summary           TEXT,
  job_details       JSONB,
  whatsapp_sent     BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calls_client_id_idx ON calls(client_id);
CREATE INDEX IF NOT EXISTS calls_created_at_idx ON calls(created_at DESC);

-- ── Messages ──────────────────────────────────────────────────────────────────
-- Outbound notifications sent to the tradesperson after each call.
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id     UUID REFERENCES calls(id) ON DELETE SET NULL,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  recipient   TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
  twilio_sid  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_client_id_idx ON messages(client_id);

-- ── Calendar Events ───────────────────────────────────────────────────────────
-- Appointments booked by the AI during calls.
CREATE TABLE IF NOT EXISTS calendar_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id          UUID REFERENCES calls(id) ON DELETE SET NULL,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ,
  customer_name    TEXT,
  customer_phone   TEXT,
  notes            TEXT,
  google_event_id  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendar_events_client_id_idx ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS calendar_events_start_time_idx ON calendar_events(start_time);

-- ── Webhook Events ────────────────────────────────────────────────────────────
-- Audit log of every incoming webhook for debugging / replay.
CREATE TABLE IF NOT EXISTS webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL CHECK (source IN ('retell','twilio','stripe')),
  event_type   TEXT,
  payload      JSONB,
  processed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_events_created_at_idx ON webhook_events(created_at DESC);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Enable RLS on all tables. The API uses the service role key, which bypasses RLS.
-- These policies are for future client-facing dashboard use.
ALTER TABLE clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events  ENABLE ROW LEVEL SECURITY;
