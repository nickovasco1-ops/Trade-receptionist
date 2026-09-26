# Notion workspace

Notion is a **working surface, not a source of truth**. The sync is one-way from
the operational systems into Notion. Supabase supplies subscribers, leads and
call usage; Stripe supplies revenue. Anything typed into a synced field is
overwritten on the next run. Fields the sync never writes are yours to use.

Run it with `POST /admin/sync-notion` (`x-admin-key`), or let
`.github/workflows/notion-sync.yml` do it every two hours.

## Databases

| Database | Env var | Sync key | Written by |
|---|---|---|---|
| Subscribers | `NOTION_SUBSCRIBERS_DB_ID` | `Client ID` | `syncSubscribers()` |
| Live Leads | `NOTION_LEADS_DB_ID` (optional override) | `Lead ID` | `syncLeads()` |
| Onboarding Tracker | `NOTION_ONBOARDING_DB_ID` (optional override) | `Client ID` | `syncOnboardingTracker()` |
| Call Log | `NOTION_CALL_LOG_DB_ID` | — (append-only) | `notion.ts` at call end |
| Incidents | `NOTION_INCIDENTS_DB_ID` | — (append-only) | `notion.ts` on escalation |

The **Revenue Tracker** is an existing page containing inline tables rather
than a database. `syncRevenueTracker()` updates it using
`NOTION_REVENUE_PAGE_ID`; the live page id is the default, so the variable is
only needed for a replacement page. The **Owner's Daily Dashboard** is also an
inline-table page; `syncOwnerDashboard()` refreshes it using
`NOTION_OWNER_DASHBOARD_PAGE_ID`, with the live page id as its default.

### The live database ids

A Notion database id is not a credential — it identifies a page, it does not
grant access to one. Recorded here so a failing sync can be diagnosed without
guessing whether the id in Railway is wrong. Confirmed against the workspace on
2026-09-26; all live under **Trade Receptionist HQ**:

| Database | Id |
|---|---|
| Subscribers | `fcb48b66-4ea0-45a0-87f2-776ac88f1bbc` |
| Call Log | `e5dced91-a91f-4b63-9dfe-3a3754ded353` |
| Live Leads | `62c4cf9f-9fde-4c91-af69-4c7f3c362739` |
| Onboarding Tracker | `bdaf71a7-69e1-45e0-8465-df0680e532d8` |

| Page | Id |
|---|---|
| Revenue Tracker | `37e0e35d-1b49-815b-8188-e1e48163157a` |
| Owner's Daily Dashboard | `3e70e35d-1b49-81c1-b39b-f1608ae03804` |

If `NOTION_SUBSCRIBERS_DB_ID` in Railway matches the value above and the sync
still reports `Could not find database with ID: …`, the id is not the problem —
it is the access grant below. Notion answers **404 for a database that exists
but is not shared with the integration**, which reads as "wrong id" and is not.

### The `Health` column

Derived at sync time, so the definition lives with the data rather than in a
Notion formula someone can edit. It is the one column worth scanning:

- `churned` — inactive, or Stripe says cancelled
- `no calls yet` — live but has never received a call. Usually means the divert was never set up
- `no diary` — taking calls but no calendar connected, so it can capture a lead but cannot book a job
- `ok`

### Plan usage

`syncSubscribers()` derives monthly usage from Supabase call rows and Stripe's
billing-period dates. Supabase remains authoritative; the append-only Call Log
is not used for totals because provider outages can leave gaps in it.

The sync creates these managed properties when they are missing, then refreshes
them every two hours:

| Property | Type | Meaning |
|---|---|---|
| Calls this period | Number | Inbound calls whose `started_at` falls in the current monthly allowance window |
| Plan limit | Number | Starter 50, Pro 150, Business 350, Agency 600 |
| Calls remaining | Number | Allowance minus usage, never below zero |
| Usage % | Number | Usage divided by the allowance |
| Usage status | Select | `OK`, `Approaching limit`, `Limit reached`, `Over limit` |
| Overage calls | Number | Calls beyond the allowance |
| Billing period starts | Date | Start of the current monthly allowance window |
| Billing period ends | Date | End of the current monthly allowance window |
| Over limit at | Date | Exact `started_at` of the first call beyond the allowance |

The first observed crossing at 80% and 100% sends an operational email through
`ALERT_EMAIL` (falling back to `INTEGRITY_ALERT_EMAIL`). `usage_alerts` records
one send per subscriber, period and threshold so a two-hour cron cannot repeat
the same warning. Calls continue to be answered after the allowance is reached.

The same sync derives three owner-facing fields. `Attention` is `None`,
`Needs attention`, `At risk` or `Churned`; `Next Action` says what to do; and
`Payment Status` reflects the stored Stripe lifecycle state. The saved
**Needs Attention** view filters out healthy rows, so the owner works a queue
instead of interpreting raw account fields.

For a useful Notion view, create **Plan Usage**, filter `Status` to active or
trialling, and sort by `Usage %` descending followed by `Overage calls`
descending. Views are presentation owned by Notion; the sync manages fields and
values, not a person's saved view layout.

### Revenue Tracker

`syncRevenueTracker()` reads every Stripe subscription with `status=all` and
updates the existing **Revenue Tracker** page every two hours as part of
`POST /admin/sync-notion`. Stripe remains authoritative; no revenue value is
read from Supabase or from a hand-entered Notion number.

The managed figures are:

| Figure | Definition |
|---|---|
| MRR | Monthly-normalised value of `active` Stripe subscriptions only |
| ARR | MRR × 12 |
| Active paying clients | Count of `active` Stripe subscriptions |
| Trial clients | Count of `trialing` Stripe subscriptions |
| Past-due clients | Count of `past_due` Stripe subscriptions; excluded from MRR |
| Churn this month | Subscriptions whose Stripe `canceled_at` falls in the current UTC month |
| Net new MRR | Ending MRR less the month's stored starting MRR |
| MRR by plan | Active clients and MRR grouped by the shared Stripe product-to-plan map |

The Monthly Log is updated in place for the current month and appends one row
when a new month begins. Its first automated month ends in `*`: historic
opening MRR and upgrade/contraction movements cannot be reconstructed exactly
from the current subscription list, so that bootstrap row uses a neutral
baseline and keeps expansion/contraction at zero. Later months use the previous
stored closing MRR. **Do not remove the `*`; it is also the idempotency marker
that keeps reruns from pretending the bootstrap month is complete history.**

The Churn Log is keyed internally by Stripe subscription id, stored at the end
of the Reason cell, so rerunning the job updates a cancellation instead of
duplicating it. Trial-to-paid conversion remains `—`: an exact cohort measure
needs historical trial/payment events and must not be guessed from current
subscription status.

The sync fails visibly rather than publishing a misleading number if it sees a
discounted or metered subscription, an unknown/mixed plan, or a non-GBP/mixed
currency catalogue. Add explicit calculation support and tests before allowing
one of those shapes.

### Live Leads and onboarding

The **Live Leads** database was created on 2026-09-26. It deliberately replaces
the incompatible hand-made **Leads Pipeline** as the automated target; the old
database is retained for historical notes. `syncLeads()` defaults to the live
database id above, so `NOTION_LEADS_DB_ID` is now an optional replacement-page
override. In addition to the source fields, the sync derives `Needs Action`,
`Next Action`, `Action Due` and `Age (hours)`. The **Follow Up Today** view is
the working queue and **Pipeline** groups every lead by status.

The **Onboarding Tracker** is reconciled from Supabase rather than updated by
hand. A customer is `Live` only when the Retell agent, receptionist number and
diary exist and an inbound call has been received. After 24 hours with any of
those missing, the row becomes `Stalled` with a specific blocker and next
action. This is stricter than `clients.onboarding_complete`, which only means
the customer walked through the wizard.

### Owner's Daily Dashboard

The dashboard is the front door for day-to-day operations. Every two hours it
shows revenue, customers, calls, leads, onboarding blockers and allowance
warnings, then links to the filtered queues where the work is done. If any
source fails or is skipped, its figures and action row say
`Unavailable — check sync`; they never fall back to a plausible-looking zero.

## Setup — the integration needs access

**This is the step that bites.** Creating an integration and setting
`NOTION_API_KEY` is not enough: each database must also be shared with it, or
every write fails with `object_not_found`. The failures are caught and logged,
so nothing breaks loudly — the databases just stay empty.

For each database: open it → `···` menu → **Connections** → **Connect to** →
select the integration (**trade receptionist**). The live pages sit under the
**Trade Receptionist HQ** page, and access is inherited, so connecting the
integration to that one parent page covers every database under it.

Three things that make this step look broken when it is not:

- **There is no API for it.** Notion exposes no endpoint that shares a page with
  an integration — it is deliberately a human action in the UI. No token, and no
  amount of server-side code, can substitute for it.
- **`Connections` is absent in the Notion mobile app.** The `···` menu there does
  not carry it. Use the desktop app or notion.so in a browser.
- **A regenerated token invalidates the old one.** Issuing a fresh secret on an
  existing integration does not widen its access by a single page, but it does
  break `NOTION_API_KEY` in Railway until that value is updated — turning a 404
  into a 401 and looking like a new fault. Grant access first; only rotate the
  secret when you actually intend to.

> **This bit it, exactly as written, on 2026-09-04.** The Subscribers and Call
> Log databases lost the connection, and from then on every sync run failed all
> five tenant rows and every finished call failed to log. The env vars were
> correct the whole time — the ids in the error messages
> (`fcb48b66-…` Subscribers, `e5dced91-…` Call Log) are the live databases. The
> Notion sync workflow emailed "5 failed rows" every two hours for six days and
> 25 consecutive runs, because the cause was only ever written to Sentry.
> The sync now probes each database once before doing any work and returns the
> provider's own message in a `reason` field, which the workflow prints — so
> the next time this happens the alert says what to fix.

Confirm with:

```bash
curl -s -X POST https://trade-receptionist-production.up.railway.app/admin/sync-notion \
  -H "x-admin-key: $ADMIN_API_KEY" -H 'Content-Type: application/json' -d '{}'
```

A clean run reports `failed: 0` for Subscribers, Live Leads, Onboarding
Tracker, Revenue Tracker and Owner's Daily Dashboard.

Migration `020_plan_usage_tracking.sql` must be applied before deploying the
matching server code. It adds `clients.current_period_start` and the
service-role-only `usage_alerts` audit table.

## Live Leads schema

This database already exists under **Trade Receptionist HQ**. Keep these
properties if the page is ever recreated, then point `NOTION_LEADS_DB_ID` at
the replacement:

> **Do not point `NOTION_LEADS_DB_ID` at the existing "Leads Pipeline"
> database.** It is the hand-made June version and `syncLeads()` cannot write
> to it: its title column is `Caller Name` rather than `Caller`, and its
> `Lead ID` is an **auto-increment** property, which is read-only and cannot
> hold the Supabase uuid the sync matches on — so every row would fail and no
> row could ever be found again. Its `Status` and `Urgency` options are also
> Title Case against Supabase's lowercase, which would silently double every
> option. Create a new database with the schema below.

| Property | Type | Notes |
|---|---|---|
| Caller | Title | |
| Lead ID | Text | Sync key. Do not edit |
| Business | Text | |
| Phone | Phone | |
| Email | Email | |
| Postcode | Text | |
| Job Type | Text | |
| Urgency | Select | `routine`, `urgent`, `emergency` |
| Status | Select | `new`, `contacted`, `booked`, `lost`, `spam`, `flagged_for_review` |
| Needs Action | Checkbox | Derived working-queue flag |
| Next Action | Text | Derived owner action |
| Action Due | Date | Immediate for urgent/review; 24h for routine new leads |
| Age (hours) | Number | Whole hours since receipt |
| Notes | Text | |
| Received | Date | |
| Followed Up | Date | Set when the 48h chase SMS went out |
| Call ID | Text | |
| Last Synced | Date | |

Leaving `NOTION_LEADS_DB_ID` unset uses the recorded live id. Set it only when
the database is deliberately replaced.
