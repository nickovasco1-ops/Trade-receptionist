-- Add avg_job_value to business_config for personalised missed revenue estimates.
-- Defaults to £250, which is the fallback used in the dashboard card.
ALTER TABLE business_config
  ADD COLUMN IF NOT EXISTS avg_job_value INTEGER DEFAULT 250;
