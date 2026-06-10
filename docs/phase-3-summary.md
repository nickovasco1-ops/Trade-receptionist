# Phase 3 — Implementation Summary & Hardening Review

> **Status: HARDEN → PASS**
> Review conducted: 2026-06-10
> Reviewer: Senior engineer audit pass

---

## What Was Built

### 3.1 — Automated 48h Follow-Up SMS (`server/src/services/lead-followup.ts`)
- Queries leads created 48h–7d ago with `status = 'new'` and `follow_up_sent_at IS NULL`
- Sends personalised SMS via Twilio (`Hi [name] — we missed you when you called us about your [job].`)
- Marks lead as `contacted` + sets `follow_up_sent_at` before sending (idempotency guard prevents duplicate sends on crash/retry)
- `server/src/index.ts` runs it on a cron schedule (every 4h via `node-cron`)
- Migration: `supabase/migrations/014_lead_follow_up_sent_at.sql`

### 3.2 — Calendar Slot Injection into AI Prompt (`server/src/services/slot-cache.ts`)
- Fetches up to 3 next available slots from Google Calendar per client before each prompt rebuild
- Slots injected into `buildSystemPrompt` via the `availableSlots` parameter
- Called from `updateAgentConfiguration` in `retell.ts`
- Falls back silently to `[]` if calendar disconnected or fetch fails

### 3.3 — Team Access
- **Correctly deferred.** Not built. Plan rated it HIGH RISK; Business/Agency conversion data does not yet justify the multi-user auth complexity. This is the right call.

### 3.4 — Prompt Override UI (`SettingsPage.tsx` + `clients/index.ts`)
- `business_config.system_prompt_override` surfaced as an editable textarea in Settings
- Appended after base prompt in `buildSystemPrompt`
- Server accepts field in `PATCH /:id/settings`

---

## Review Verdict: HARDEN

Six issues found. Three critical, two medium, one low. All fixed in this session.

---

## Issues Found & Fixed

### CRITICAL 1 — `lead.clients` null crash (would abort entire cron run)
**File:** `server/src/services/lead-followup.ts`
**Problem:** The `LeadWithClient` interface typed `clients` as non-nullable, but Supabase JOIN results can return null at runtime. An unexpected null on any row would throw `TypeError: Cannot read properties of null`, aborting the entire batch.
**Fix:** Added null guard before accessing `client.twilio_number`. Changed interface to `clients: ... | null`. Skips the lead and logs a warning.

### CRITICAL 2 — `normaliseHour` duplicated in two files
**Files:** `server/src/lib/prompt-builder.ts` (line 7) and `server/src/services/slot-cache.ts` (line 11)
**Problem:** Identical function defined twice. Any future fix to normalisation logic (e.g., how `00:00` is handled) would need to be applied in two places. Drift risk.
**Fix:** Extracted to `server/src/lib/time.ts` as single source of truth. Both files now import from there.

### CRITICAL 3 — No cache, no timeout in `getNextAvailableSlots`
**File:** `server/src/services/slot-cache.ts`
**Problem:** Every call to `updateAgentConfiguration` (triggered by `PATCH /settings`) hit Google Calendar API synchronously with no timeout. A slow or unresponsive Google API call would block the settings save response indefinitely, causing client-side timeout, while Supabase write had already committed.
**Fix:**
- Added 5s `Promise.race` timeout — slot fetch fails fast, falls back to `[]` (or stale cache)
- Added in-memory TTL cache (5 min per client) — subsequent calls within the window skip the API entirely
- On timeout/error: logs `slot_cache.fetch_failed`, returns stale cache if available, otherwise `[]`

### MEDIUM 1 — No plan gate on `system_prompt_override`
**File:** `server/src/routes/clients/index.ts`
**Problem:** `PATCH /:id/settings` accepted `system_prompt_override` from any plan, including Starter. The frontend gates it behind plan level, but server-side had no enforcement — a crafted request could set it on a Starter account.
**Fix:** Added plan check after client ownership verification. Returns `403` with "Custom AI instructions require a Pro plan or above." for Starter accounts attempting to set a non-empty override.

### MEDIUM 2 — `console.error/log/warn` in rollback and operational paths
**File:** `server/src/routes/clients/index.ts`
**Problem:** 10 `console.*` calls in rollback handlers, provision completion, assign-number, rebuild-agent, and connect-number routes. These bypass Pino structured logging, are invisible in Railway log aggregation queries, and can't be filtered or alerted on.
**Fix:** All replaced with `logEvent(level, event, fields)` from `server/src/lib/observability.ts`.

### LOW — Missing `docs/phase-3-summary.md`
**Fix:** This file.

---

## Files Changed in This Hardening Pass

| File | Change |
|------|--------|
| `server/src/lib/time.ts` | NEW — shared `normaliseHour` utility |
| `server/src/lib/prompt-builder.ts` | Import `normaliseHour` from `./time`, remove local definition |
| `server/src/services/slot-cache.ts` | Import from `../lib/time`; add 5s timeout + 5min TTL cache |
| `server/src/services/lead-followup.ts` | Null guard on `lead.clients`; interface typed `| null` |
| `server/src/routes/clients/index.ts` | Plan gate for `system_prompt_override`; all `console.*` → `logEvent` |
| `docs/phase-3-summary.md` | NEW — this file |
| `docs/implementation-plan.md` | Phase 3 completion status + hardening pass recorded |

---

## Build Validation

- `npm run build:api` — ✅ clean (tsc, no errors)
- `npm run build` — ✅ clean (Vite, no warnings, all chunks within budget)
- No pre-existing errors introduced

---

## Remaining Non-Blocking Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| `PATCH /:id` (general update) is unauthenticated | Medium | Pre-existing. Internal admin route. Gate behind API key or internal network before public launch. |
| `rollbackSettings` silently ignores Supabase failures | Low | If the rollback itself fails, the DB is in an inconsistent state with no alert. Acceptable at current scale but worth an explicit `logEvent('error')` around the whole function. |
| Slot cache is process-local, not shared | Low | Each Railway replica has its own cache. Fine at current scale (single replica). If scaled to >1 replica, move cache to Redis/KV. |
| Team access (3.3) still unbuilt | Deferred | Correct decision. Re-evaluate when Business/Agency conversion data is available. |

---

## Recommendation

**Proceed to final release hardening.** All critical issues are fixed. Both builds pass. The three Phase 3 features that were built (3.1, 3.2, 3.4) are now production-safe.

Suggested commit message for this pass:
```
fix: harden Phase 3 — null guard, slot cache timeout, normaliseHour dedup, plan gate, logEvent migration
```
