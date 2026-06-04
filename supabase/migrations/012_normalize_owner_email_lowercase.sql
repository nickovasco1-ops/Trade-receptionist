-- 012_normalize_owner_email_lowercase.sql
--
-- Problem: clients RLS matches `owner_email = auth.jwt() ->> 'email'` (case-sensitive),
-- but Supabase/GoTrue always stores the JWT email lowercased. When a customer typed a
-- capitalised email at Stripe checkout (e.g. "Nickosuji21@gmail.com"), the provisioning
-- webhook stored that exact casing in clients.owner_email. The RLS comparison then failed,
-- locking the owner out of read AND write on their own row — which surfaced as the
-- onboarding "Session error" (no clientId) and a broken Google Calendar connection.
--
-- Fix: guarantee clients.owner_email is always stored lowercase via a BEFORE INSERT/UPDATE
-- trigger, and normalise any existing rows. The JWT email is already lowercase, so RLS now
-- always matches regardless of how the address was typed at checkout.

CREATE OR REPLACE FUNCTION public.lowercase_owner_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_email IS NOT NULL THEN
    NEW.owner_email := lower(NEW.owner_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_lowercase_owner_email ON public.clients;
CREATE TRIGGER clients_lowercase_owner_email
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.lowercase_owner_email();

-- Normalise existing data so currently-locked-out owners regain access.
UPDATE public.clients
SET owner_email = lower(owner_email)
WHERE owner_email <> lower(owner_email);
