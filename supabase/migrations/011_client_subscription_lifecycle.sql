-- Persist Stripe lifecycle state on the canonical clients table.
-- These columns let webhook retries update the same subscriber idempotently.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    )),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'current'
    CHECK (payment_status IN ('current', 'failed', 'canceled')),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS clients_stripe_customer_id_unique_idx
  ON public.clients(stripe_customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS clients_stripe_subscription_id_unique_idx
  ON public.clients(stripe_subscription_id);
