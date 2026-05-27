-- Prevent duplicate lead rows when Retell retries the same completed call.
-- PostgreSQL unique indexes still allow multiple NULL call_id values, so manual
-- leads that are not linked to a call remain supported.
CREATE UNIQUE INDEX IF NOT EXISTS leads_call_id_unique_idx
  ON public.leads(call_id);
