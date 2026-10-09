-- 024 — "callback only" tenants: the receptionist takes the caller's preferred
-- days and times and the tradesperson rings back to confirm, instead of booking
-- straight into the diary.
--
-- First use: Orrell Park Heating Solutions (2026-10-09). He has a Google diary
-- connected, which is what attaches the booking tools, but wants to confirm
-- every booking himself. Disconnecting the diary would have done it by accident
-- and thrown away his credentials, so it is a setting of its own.
--
-- Service-role only for now: migration 023 grants the browser named columns of
-- business_config, and this is not one of them.

ALTER TABLE public.business_config
  ADD COLUMN IF NOT EXISTS callback_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_config.callback_only IS
  'Take the caller''s preferred availability for a callback; never book into the diary, even when one is connected.';
