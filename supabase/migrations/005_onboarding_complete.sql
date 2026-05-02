-- Track whether a client has completed post-payment onboarding.
-- FALSE = just signed up, redirect to /onboarding.
-- TRUE  = setup done, go straight to /dashboard.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;
