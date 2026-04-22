-- Trade Receptionist — Revised Schema (migration 002)
-- Drops tables from 001 and rebuilds with the canonical schema.

-- ── Drop old tables ───────────────────────────────────────────────────────────
DROP TABLE IF EXISTS webhook_events    CASCADE;
DROP TABLE IF EXISTS calendar_events   CASCADE;
DROP TABLE IF EXISTS messages          CASCADE;
DROP TABLE IF EXISTS calls             CASCADE;
DROP TABLE IF EXISTS clients           CASCADE;

-- ── updated_at helper ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── clients ───────────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name        TEXT        NOT NULL,
  owner_name           TEXT        NOT NULL,
  owner_email          TEXT        NOT NULL UNIQUE,
  owner_mobile         TEXT,
  retell_agent_id      TEXT,
  twilio_number        TEXT,
  google_cal_id        TEXT,
  google_refresh_token TEXT,
  plan                 TEXT        NOT NULL DEFAULT 'starter'
                                   CHECK (plan IN ('starter','pro','agency')),
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── business_config ───────────────────────────────────────────────────────────
CREATE TABLE business_config (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID        NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  receptionist_name       TEXT        NOT NULL DEFAULT 'Sarah',
  services                TEXT[]      NOT NULL DEFAULT '{}',
  service_areas           TEXT[]      NOT NULL DEFAULT '{}',
  hourly_rate_min         NUMERIC(8,2),
  hourly_rate_max         NUMERIC(8,2),
  emergency_keywords      TEXT[]      NOT NULL DEFAULT '{}',
  business_hours_start    TIME,
  business_hours_end      TIME,
  working_days            INT[]       NOT NULL DEFAULT '{1,2,3,4,5}', -- Mon–Fri
  timezone                TEXT        NOT NULL DEFAULT 'Europe/London',
  system_prompt_override  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hourly_rate_order CHECK (
    hourly_rate_min IS NULL OR hourly_rate_max IS NULL OR hourly_rate_min <= hourly_rate_max
  )
);

CREATE TRIGGER business_config_updated_at
  BEFORE UPDATE ON business_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── calls ─────────────────────────────────────────────────────────────────────
CREATE TABLE calls (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  retell_call_id  TEXT        UNIQUE,
  caller_number   TEXT,
  direction       TEXT        NOT NULL DEFAULT 'inbound'
                              CHECK (direction IN ('inbound','outbound')),
  duration_secs   INTEGER     CHECK (duration_secs >= 0),
  outcome         TEXT        CHECK (outcome IN (
                                'booked','lead_captured','enquiry',
                                'spam','voicemail','transferred',
                                'emergency','no_answer'
                              )),
  is_emergency    BOOLEAN     NOT NULL DEFAULT FALSE,
  recording_url   TEXT,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT call_time_order CHECK (
    started_at IS NULL OR ended_at IS NULL OR ended_at >= started_at
  )
);

CREATE INDEX calls_client_id_idx  ON calls(client_id);
CREATE INDEX calls_created_at_idx ON calls(created_at DESC);
CREATE INDEX calls_is_emergency_idx ON calls(is_emergency) WHERE is_emergency = TRUE;

-- ── transcripts ───────────────────────────────────────────────────────────────
CREATE TABLE transcripts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id    UUID        NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
  full_text  TEXT,
  summary    TEXT,
  raw_json   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── leads ─────────────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  call_id        UUID        REFERENCES calls(id) ON DELETE SET NULL,
  caller_name    TEXT,
  caller_number  TEXT,
  caller_email   TEXT,
  postcode       TEXT,
  job_type       TEXT,
  urgency        TEXT        CHECK (urgency IN ('routine','urgent','emergency')),
  notes          TEXT,
  status         TEXT        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new','contacted','booked','lost','spam')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX leads_client_id_idx  ON leads(client_id);
CREATE INDEX leads_status_idx     ON leads(status);
CREATE INDEX leads_created_at_idx ON leads(created_at DESC);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── bookings ──────────────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lead_id         UUID        REFERENCES leads(id) ON DELETE SET NULL,
  google_event_id TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  job_type        TEXT,
  address         TEXT,
  status          TEXT        NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX bookings_client_id_idx   ON bookings(client_id);
CREATE INDEX bookings_scheduled_at_idx ON bookings(scheduled_at);
CREATE INDEX bookings_status_idx       ON bookings(status);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- API uses the service-role key (bypasses RLS).
-- These are stubs for future client-portal auth.
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
