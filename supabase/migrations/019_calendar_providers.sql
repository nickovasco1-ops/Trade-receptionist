-- 019 — multi-provider calendars.
--
-- Until now a tenant could only connect Google, via two columns hard-coded to
-- that provider (google_cal_id, google_refresh_token). Every "is the diary
-- connected?" test in the codebase read google_cal_id directly, so supporting a
-- second provider meant touching ~30 call sites and would have silently left
-- half of them Google-only.
--
-- This adds a provider-neutral set of columns. The Google ones are deliberately
-- KEPT and still written alongside these, because the dashboard, the tenant
-- integrity checks and the Notion sync all read them; removing them in the same
-- change would have been a breaking rename disguised as a feature.
--
-- Why it matters: of five tenants, exactly one has ever connected a calendar,
-- and that one is the founder's own test account. Both paying customers keep
-- their diary in Google *through the iOS Calendar app*, which is why "we support
-- Google" was never the same thing as "our customers can connect".

alter table clients
  add column if not exists calendar_provider     text,
  add column if not exists calendar_id           text,
  add column if not exists calendar_credentials  text,
  add column if not exists calendar_status       text not null default 'none',
  add column if not exists calendar_last_error   text,
  add column if not exists calendar_connected_at timestamptz,
  add column if not exists calendar_checked_at   timestamptz;

-- A CHECK constraint is part of the type (see the 018 landmine: widening a
-- TypeScript union without the matching migration fails at runtime, not at
-- compile time). Any new provider needs BOTH the union in shared/types.ts and a
-- migration widening these.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_calendar_provider_check') then
    alter table clients add constraint clients_calendar_provider_check
      check (calendar_provider is null or calendar_provider in ('google', 'microsoft', 'caldav'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'clients_calendar_status_check') then
    alter table clients add constraint clients_calendar_status_check
      check (calendar_status in ('none', 'connected', 'needs_reconnect'));
  end if;
end $$;

comment on column clients.calendar_provider is
  'google | microsoft | caldav. NULL means no diary connected — the agent can capture a lead but cannot book a job.';
comment on column clients.calendar_id is
  'Provider-specific calendar identifier: Google calendarId, Microsoft calendar id, or a CalDAV collection URL.';
comment on column clients.calendar_credentials is
  'SECRET. Google/Microsoft refresh token, or "user\u001fapp-specific-password" for CalDAV. Never select this into the browser.';
comment on column clients.calendar_status is
  'connected | needs_reconnect | none. needs_reconnect is set when the provider rejects the stored credential, so a dead diary is visible instead of failing mid-call.';

-- Backfill the one real connection that exists, plus any added before deploy.
update clients
set calendar_provider     = 'google',
    calendar_id           = google_cal_id,
    calendar_credentials  = google_refresh_token,
    calendar_status       = 'connected',
    calendar_connected_at = coalesce(calendar_connected_at, updated_at, now())
where google_cal_id is not null
  and google_refresh_token is not null
  and calendar_provider is null;

-- Finding a tenant whose diary has gone stale is a scheduled sweep, not a
-- per-request lookup, so a partial index on the broken state is enough.
create index if not exists clients_calendar_needs_reconnect_idx
  on clients (calendar_status)
  where calendar_status = 'needs_reconnect';

-- RLS: policies on `clients` are table-scoped and already restrict rows to
-- `owner_email = auth.jwt() ->> 'email'`, so these columns inherit that without
-- a new policy. Note the consequence, though: a signed-in owner CAN read their
-- own calendar_credentials through the anon key. No frontend query selects it
-- (they enumerate columns rather than using `*`), and it must stay that way —
-- Postgres RLS has no column-level grant here to fall back on.
