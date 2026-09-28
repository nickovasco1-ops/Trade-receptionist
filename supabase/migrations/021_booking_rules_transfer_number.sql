-- 021 — per-tenant booking rules, and a transfer number separate from the owner's mobile.
--
-- booking_rules: diary rules by job size that working_days + business hours
-- cannot express (sizes on different days, travel before the first job, a gap
-- after each one, big jobs only weeks ahead, emergencies any time). Shape and
-- validation live in server/src/lib/booking-rules.ts; NULL keeps the plain
-- working-days/hours behaviour, so every existing tenant is unaffected.
--
-- transfer_number: where "put me through" rings. The owner's mobile is often
-- the very number diverted to the agent, so transferring to it looped the
-- caller back to the receptionist. NULL falls back to owner_mobile.
--
-- Additive and nullable only. Both tables already carry RLS policies scoped by
-- owner_email, which cover new columns; no policy change is needed.

ALTER TABLE public.business_config
  ADD COLUMN IF NOT EXISTS booking_rules jsonb;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS transfer_number text;

COMMENT ON COLUMN public.business_config.booking_rules IS
  'Diary rules by job size (server/src/lib/booking-rules.ts). NULL = plain working days and hours.';
COMMENT ON COLUMN public.clients.transfer_number IS
  'Where call transfers ring. NULL = owner_mobile. Keep distinct from a mobile that is diverted to the agent.';
