-- Persist a custom after-hours greeting per business so the Settings page
-- and receptionist prompt can both use the same source of truth.
ALTER TABLE business_config
  ADD COLUMN IF NOT EXISTS after_hours_message TEXT;
