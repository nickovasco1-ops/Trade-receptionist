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

### BUG-002a — Webhook signature verification always failing (wrong algorithm)

**Root cause (definitive — June 2026):** Retell's webhook signature is **not** a plain `HMAC-SHA256(body)`. The correct algorithm is:

```
signature = "v={timestamp},d={hex(HMAC-SHA256(body + timestamp))}"
```

The SDK also enforces a 5-minute replay window. Our hand-rolled `verifySignature` computed `HMAC(body)` and compared the hex directly — it was always wrong, so every single webhook was rejected from launch. This was the root cause of all missed calls.

**Fix (commit 4233cf1):**
- Removed the hand-rolled `verifySignature` function entirely
- Replaced with `retell-sdk`'s `verify()` — the official SDK function that implements the correct `v=/d=` format. The SDK was already installed (`retell-sdk@5.27.0`) but was unused in the webhook path.

**Rule: never hand-roll Retell webhook verification.** The SDK's algorithm is not documented in plain language — only the SDK source reveals it. Always use `import { verify } from 'retell-sdk'`.

**Recovery safeguards still in place:**
- `POST /admin/sync-calls` with `X-Admin-Key` — backfills calls missed by any future webhook failures
- `.github/workflows/sync-calls-cron.yml` — runs every 6 hours automatically. Warns in GH Actions log if `synced > 0`.

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
| `POST /admin/enable-recording` | Patches `record_audio: true` on all provisioned Retell agents. Idempotent. Body: `{}` |
| `POST /admin/test-notifications` | Fires test email + SMS to verify Resend and Twilio are live. Body: `{"clientId": "..."}` |
| `POST /admin/notify-call` | Re-fires post-call notifications for a specific past call. Body: `{"retellCallId": "..."}` |

---

## Automated Safeguards

| Cron | Schedule | What it does |
|------|----------|-------------|
| `sync-calls-cron.yml` | Every 6 hours | Backfills calls missed by webhook failures. Warns in GH Actions log if recoveries > 0. |
| `lead-followup-cron.yml` | Every 4 hours | Sends 48h follow-up SMS to unresponded leads. |
| `notification-health.yml` | Daily 08:00 UTC | Fires a test email + SMS. GitHub emails owner if the pipeline is broken. |

---

---

## BUG-003 — Call recordings missing from dashboard

**Severity:** Medium (recordings always blank)  
**Discovered:** June 2026  
**Status:** ✅ Fixed

### Symptom
Dashboard Calls page shows `—` in the Recording column for every call. No audio player appears when expanding a call row.

### Root cause
`createRetellAgent` never set `record_audio: true` in the agent creation body. Retell defaults to no recording. `recording_url` was `null` in every webhook event and every Retell API response.

### Fix
- Added `record_audio: true` to `createRetellAgent`'s `agentBody` — all future agents record by default
- Added `patchRetellAgent()` utility function for targeted agent-level patches
- Added `POST /admin/enable-recording` endpoint — patches `record_audio: true` on all existing agents. Called immediately after deploy to fix the live agent.

### Prevention
`POST /admin/enable-recording` is idempotent — safe to run again after any re-provisioning.

---

## BUG-004 — Call summary & transcript never showed on dashboard

**Severity:** High (core dashboard data silently blank, no error anywhere)  
**Discovered:** June 2026  
**Status:** ✅ Fixed

### Symptom
The Calls page showed the recording (playable) but never the call summary or transcript, even though both existed in the database. No error in the console or Sentry — purely silent.

### Root cause
`transcripts.call_id` has a `UNIQUE` constraint, so PostgREST treats the embed as **one-to-one** and returns the transcript as a **single object**, not an array. The component read `call.transcripts?.[0]?.summary` — indexing `[0]` on an object is always `undefined`, so summary and full transcript rendered empty. The recording was unaffected because `recording_url` is a direct column on `calls`.

(Note: this was initially misdiagnosed as missing RLS. A `transcripts_select_own` SELECT policy already existed — RLS was never the blocker. Migration `015_transcripts_rls.sql` added a redundant but harmless duplicate policy.)

### Fix
- `src/lib/transcript.ts` — single source of truth `transcriptOf()` that normalises both object and array embed shapes. No page should index `transcripts[0]` directly again.
- `CallsPage.tsx` reads transcripts only through `transcriptOf()`, and now also shows the full transcript + a download-recording fallback.
- Backend `handleCallAnalyzed` backfills `recording_url` and `full_text` in case Retell only attaches them to the later `call_analyzed` event.

### Prevention
- **Sentry guardrail:** `transcriptEmbedAnomaly()` runs on every CallsPage load. If PostgREST ever returns the embed in an unexpected shape again (multi-row array, missing keys, primitive), it fires an `error`-level Sentry alert with the offending call ids and a fix hint — so this silent failure can never go unnoticed again.
- **Rule:** never index a PostgREST embedded relationship with `[0]`. A `UNIQUE` FK column makes it one-to-one (object); a non-unique one makes it to-many (array). Use a normaliser.

---

*Last updated: June 2026*
