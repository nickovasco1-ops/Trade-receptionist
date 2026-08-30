-- Add the 'business' tier (£159/mo) to the clients.plan allowed values.
--
-- The four-tier scheme (starter/pro/business/agency) shipped in shared/types.ts,
-- src/lib/plans.ts and the Stripe PRODUCT_TO_PLAN map, but the DB check constraint
-- was never widened past the original three tiers from migration 002. Every
-- Business-plan checkout therefore failed at the clients insert inside
-- provisionClient() with:
--
--   new row for relation "clients" violates check constraint "clients_plan_check"
--
-- The Stripe webhook logs that error and returns early, so the customer is charged
-- but gets no tenant row, no Retell agent, no Twilio number and no welcome email.
-- Observed in production 2026-08-30 (Sentry TRADE-RECEPTIONIST-API-A).

-- Drop and recreate the check constraint (append-only migration — never edit 002).
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_check;
ALTER TABLE clients ADD CONSTRAINT clients_plan_check
  CHECK (plan IN ('starter', 'pro', 'business', 'agency'));
