# Notion workspace

Notion is a **working surface, not a source of truth**. The sync is one-way,
Supabase → Notion, and it reconciles rather than appends: it finds the page by a
stable id column and updates it in place. Anything typed into a synced column is
overwritten on the next run. Columns the sync never writes are yours to use.

Run it with `POST /admin/sync-notion` (`x-admin-key`), or let
`.github/workflows/notion-sync.yml` do it every two hours.

## Databases

| Database | Env var | Sync key | Written by |
|---|---|---|---|
| Subscribers | `NOTION_SUBSCRIBERS_DB_ID` | `Client ID` | `syncSubscribers()` |
| Leads | `NOTION_LEADS_DB_ID` | `Lead ID` | `syncLeads()` |
| Call Log | `NOTION_CALL_LOG_DB_ID` | — (append-only) | `notion.ts` at call end |
| Incidents | `NOTION_INCIDENTS_DB_ID` | — (append-only) | `notion.ts` on escalation |

### The `Health` column

Derived at sync time, so the definition lives with the data rather than in a
Notion formula someone can edit. It is the one column worth scanning:

- `churned` — inactive, or Stripe says cancelled
- `no calls yet` — live but has never received a call. Usually means the divert was never set up
- `no diary` — taking calls but no calendar connected, so it can capture a lead but cannot book a job
- `ok`

## Setup — the integration needs access

**This is the step that bites.** Creating an integration and setting
`NOTION_API_KEY` is not enough: each database must also be shared with it, or
every write fails with `object_not_found`. The failures are caught and logged,
so nothing breaks loudly — the databases just stay empty.

For each database: open it → `···` menu → **Connections** → **Connect to** →
select the integration (**trade receptionist**).

Confirm with:

```bash
curl -s -X POST https://trade-receptionist-production.up.railway.app/admin/sync-notion \
  -H "x-admin-key: $ADMIN_API_KEY" -H 'Content-Type: application/json' -d '{}'
```

A clean run reports `failed: 0` for every database.

## Creating the Leads database

It does not exist yet. Create it under **Trade Receptionist HQ** with these
properties, then set `NOTION_LEADS_DB_ID`:

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
| Notes | Text | |
| Received | Date | |
| Followed Up | Date | Set when the 48h chase SMS went out |
| Call ID | Text | |
| Last Synced | Date | |

Until `NOTION_LEADS_DB_ID` is set, `syncLeads()` reports `skipped: 1` and does
nothing — it does not fail the run.
