# Trade Receptionist — Bug Registry

Confirmed bugs that have been found, diagnosed, and fixed. Each entry records the symptom, root cause, fix applied, and what prevents recurrence.

---

## BUG-001 — AI receptionist does not offer calendar slots

**Severity:** Critical (core product feature broken)  
**Discovered:** June 2026 (reported after live call)  
**Status:** ✅ Fixed

### Symptom
The AI answers calls but never offers diary slots or attempts to check availability. Instead falls back to "the owner will call you back."

### Root cause
The Retell agent was provisioned when `google_cal_id` was null (calendar not yet connected). At that point, `calendarBookingEnabled = false` and the LLM was created without calendar tools. When the calendar was later connected, `updateAgentConfiguration` was called but its fallback path (`updateAgentPrompt`) only updates the prompt text — it does NOT re-register tools. The `check_calendar_availability` and `create_calendar_booking` tools were never attached to the LLM.

A secondary silent failure: if `RETELL_FUNCTION_BASE_URL` and `RETELL_WEBHOOK_URL` are both unset, `buildRetellTools` skips calendar tools with no error.

### Fix
- Rebuilt the agent via `POST /clients/rebuild-agent` — verified `has_calendar_tools: true` via `GET /clients/:id/test-retell-agent`
- Added `logEvent('error', 'retell.calendar_tools_skipped', ...)` in `buildRetellTools` when `calendarBookingEnabled = true` but `baseUrl` is null — now surfaces loudly in Railway logs instead of silently skipping

### Prevention
- `GET /clients/:id/test-retell-agent` admin endpoint — returns `tool_names`, `has_calendar_tools`, `llm_id`, `webhook_url`. Run after any agent rebuild or calendar reconnect.
- If calendar tools ever go missing again: call `POST /clients/rebuild-agent` with `{"clientId": "<id>"}` and `X-Admin-Key` header.

---

## BUG-002 — Calls not visible in dashboard

**Severity:** Critical (no call history visible to operator)  
**Discovered:** June 2026 (reported after live call)  
**Status:** ✅ Fixed — three separate root causes

### Symptom
The Calls page and Dashboard showed empty or very few calls despite the AI having handled many inbound calls over multiple days.

---

### BUG-002a — Webhook signature failures silently dropped calls

**Root cause:** Retell signs webhooks with HMAC-SHA256 using the `RETELL_API_KEY`. When the API key in Railway differed from what Retell was using (key rotation or misconfiguration), `verifySignature` returned false. The handler returned `HTTP 200` with `{ ok: false, reason: 'invalid_signature' }` — Retell interpreted this as successful delivery and never retried. Every call was silently lost.

**Fix:**
- Upgraded `retell.webhook.invalid_signature` from `logEvent('warn', ...)` to `logEvent('error', ...)` with an explicit action message: *"call dropped — run POST /admin/sync-calls to recover, check RETELL_API_KEY in Railway"*
- Added `POST /admin/sync-calls` endpoint — pulls all calls directly from Retell's `v2/list-calls` API and inserts any missing from the database. Idempotent (dedupes by `retell_call_id`).
- Added `.github/workflows/sync-calls-cron.yml` — runs every 6 hours automatically. If `synced > 0`, GitHub Actions prints a warning in the run log (signal that webhooks are broken again).

**Recovery procedure if it happens again:**
1. Railway error log will show `retell.webhook.invalid_signature` with action message
2. Verify `RETELL_API_KEY` in Railway matches the key in the Retell dashboard
3. Run `POST /admin/sync-calls` with `X-Admin-Key` to backfill missed calls

---

### BUG-002b — `call_ended` webhook overwrote `started_at` with null

**Root cause:** The `call_ended` Retell event does not always include `start_timestamp`. The handler derived `startedAt = event.start_timestamp ? new Date(...).toISOString() : null` and then unconditionally upserted `started_at: startedAt`. This overwrote the `started_at` value already set by the `call_started` handler with null.

**Fix (`server/src/routes/webhooks/retell.ts`):**
```typescript
// Only set started_at/ended_at when Retell provides them — never overwrite with null
const upsertPayload: Record<string, unknown> = { ...coreFields };
if (startedAt) upsertPayload.started_at = startedAt;
if (endedAt)   upsertPayload.ended_at   = endedAt;
```

---

### BUG-002c — Dashboard ordered by `started_at` (nullable), hiding calls

**Root cause:** `CallsPage.tsx` and `DashboardPage.tsx` both used `.order('started_at', { ascending: false })`. Since `started_at` is nullable, any call where `started_at` was null would sort unpredictably, potentially off the visible list. The `created_at` column is `NOT NULL` (populated by Postgres default on insert) and is the correct column for chronological ordering.

**Fix:**
- `CallsPage.tsx` line 70: `.order('started_at', ...)` → `.order('created_at', ...)`
- `DashboardPage.tsx` line 180: same change

---

## Diagnostic Endpoints (Admin)

All require `X-Admin-Key` header matching `ADMIN_API_KEY` in Railway.

| Endpoint | Purpose |
|----------|---------|
| `GET /clients/:id/test-calendar` | Tests Google token refresh + freeBusy. Returns exact error if calendar is broken. |
| `GET /clients/:id/test-retell-agent` | Returns agent webhook URL, LLM ID, tool list, and `has_calendar_tools`. |
| `POST /clients/rebuild-agent` | Rebuilds Retell LLM prompt + tools from current DB state. Body: `{"clientId": "..."}` |
| `POST /admin/sync-calls` | Pulls calls from Retell API and backfills any missing from DB. Body: `{}` |
| `POST /admin/run-lead-followup` | Manually triggers the 48h follow-up SMS batch. Body: `{}` |

---

## Automated Safeguards

| Cron | Schedule | What it does |
|------|----------|-------------|
| `sync-calls-cron.yml` | Every 6 hours | Backfills calls missed by webhook failures. Warns in GH Actions log if recoveries > 0. |
| `lead-followup-cron.yml` | Every 4 hours | Sends 48h follow-up SMS to unresponded leads. |

---

*Last updated: June 2026*
