-- Exact monthly plan-usage windows and idempotent threshold alerts.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.usage_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_start      TIMESTAMPTZ NOT NULL,
  threshold_percent SMALLINT NOT NULL CHECK (threshold_percent IN (80, 100)),
  usage_count       INTEGER NOT NULL CHECK (usage_count >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at           TIMESTAMPTZ,
  UNIQUE (client_id, period_start, threshold_percent)
);

ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.usage_alerts IS
  'Service-role-only audit of one plan-usage alert per tenant, billing period and threshold.';
