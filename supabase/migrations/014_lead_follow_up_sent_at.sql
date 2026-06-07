-- Track when a 48h follow-up SMS was sent to a lead.
-- NULL = not yet sent. Prevents duplicate sends on repeated cron runs.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ NULL;
