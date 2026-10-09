-- 023 — the browser may read its own tenant's rows, and write only the few
-- columns the dashboard actually edits.
--
-- Found 2026-10-09: anon and authenticated held Supabase's default table-level
-- INSERT / UPDATE / DELETE / TRUNCATE on every public table, and the owner
-- policies constrain *which rows* but not *which columns*. So any signed-in
-- tenant could, from the browser console with the public anon key:
--   * set their own clients.plan to 'agency' (the next tier sync hands them the
--     paid voice and Fast Tier), or is_active / subscription_status to keep
--     service after cancelling;
--   * repoint retell_agent_id or twilio_number at another tenant's agent — the
--     webhook's .single() lookup then matches two rows and that tenant's calls
--     stop being recorded;
--   * delete or insert their own calls, which are the source of truth for plan
--     usage, or rewrite system_prompt_override past the server's checks.
--
-- What the browser genuinely writes (src/, checked 2026-10-09):
--   clients:         business_name, owner_name, owner_mobile,
--                    onboarding_complete, updated_at   (OnboardingPage)
--   business_config: receptionist_name, receptionist_tone, services,
--                    service_areas, business_hours_start, business_hours_end,
--                    working_days                      (OnboardingPage)
--   leads:           status, updated_at                (LeadsPage)
-- Everything else — Settings, diary connection, provisioning, billing — goes
-- through the API with the service-role key, which these grants do not touch.
--
-- RLS policies are unchanged: they still decide which rows. These grants
-- decide which columns. Supabase's default privileges grant full access to
-- every NEW public table, so any future table needs the same REVOKE.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
  public.clients,
  public.business_config,
  public.calls,
  public.transcripts,
  public.leads,
  public.bookings,
  public.usage_alerts,
  public.agent_overrides
FROM anon, authenticated;

-- Service-role-only tables: nothing for the browser at all.
REVOKE SELECT ON public.usage_alerts, public.agent_overrides FROM anon, authenticated;

GRANT UPDATE (business_name, owner_name, owner_mobile, onboarding_complete, updated_at)
  ON public.clients TO authenticated;

GRANT UPDATE (receptionist_name, receptionist_tone, services, service_areas,
              business_hours_start, business_hours_end, working_days, updated_at)
  ON public.business_config TO authenticated;

GRANT UPDATE (status, updated_at) ON public.leads TO authenticated;
