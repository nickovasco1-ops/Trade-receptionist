-- 022 — a per-tenant voice override, and "domestic only" tenants.
--
-- agent_overrides: settings that change what an agent costs us, which the
-- tenant must not be able to set. Owners can update their own rows in clients
-- and business_config under RLS, so a voice override on either would let a
-- Starter tenant hand themselves the paid ElevenLabs voice. RLS is enabled with
-- NO policies: only the service role can read or write it (same pattern as
-- usage_alerts, migration 020). First use: Orrell Park Heating Solutions, on
-- Starter, whose callers heard retell-Willa as Australian (2026-10-09).
--
-- business_config.domestic_only: the business only works on homes, so the
-- agent never asks "domestic or commercial?". The tenant's own preference, so
-- it sits on business_config under the existing owner policies. Defaults to
-- false, so every existing tenant is unaffected.

CREATE TABLE IF NOT EXISTS public.agent_overrides (
  client_id  uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  voice_id   text,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_overrides ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.agent_overrides IS
  'Service-role only (RLS on, no policies). Per-tenant agent settings the tenant must not set, e.g. a voice other than their plan''s.';
COMMENT ON COLUMN public.agent_overrides.voice_id IS
  'Retell voice id used instead of the plan''s voice. Must be listed in server/src/lib/agent-voice.ts KNOWN_VOICES or it is ignored.';

ALTER TABLE public.business_config
  ADD COLUMN IF NOT EXISTS domestic_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_config.domestic_only IS
  'Only works on homes: the agent never asks whether a property is domestic or commercial.';
