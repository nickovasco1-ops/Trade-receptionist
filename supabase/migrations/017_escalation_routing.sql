-- Feature 4: Escalation & Emergency Routing
-- Add 'flagged_for_review' to the leads.status allowed values.
-- Complex/multi-trade/ambiguous jobs are flagged by the AI post-call analysis
-- so the owner can triage them personally before any tradesperson is dispatched.

-- Drop and recreate the check constraint (append-only migration — never edit 002).
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'booked', 'lost', 'spam', 'flagged_for_review'));
