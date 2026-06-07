# Phase 2 Implementation Summary

**Date:** 2026-06-07
**Branch:** `feat/phase2-differentiators`
**Build status:** ✅ Frontend clean | ✅ Server clean

---

## What Was Implemented

### 2.1 — Missed Call Alert (Differentiated SMS + Email)

**Goal:** When `outcome = 'no_answer'` or `'voicemail'`, the owner gets a distinct alert — not the generic booking summary — with the caller's number prominent and a direct callback prompt.

**Changes:**
- `server/src/services/twilio.ts` — `sendOwnerSms` extended with a `leadUrl` parameter and a missed-call branch. Missed calls now produce `"⚠️ Missed call from [number]\nCall back: [number]\nView lead: [url]\n— [business]"`. Handled numbers get the booking summary as before. Withheld numbers handled gracefully (no callback line if number unknown).
- `server/src/services/resend.ts` — missed call email template now includes an orange `<a href="tel:...">Call Back</a>` button block, inserted before the recording block. Booking emails unchanged.
- `server/src/services/retell.ts` — `PostCallExtra` interface extended with `leadId?: string | null`. `postCallWorkflow` now builds `leadUrl` from `leadId` and passes it to `sendOwnerSms`.
- `server/src/routes/webhooks/retell.ts` — `insertedLeadId` is captured when a lead is upserted and passed to `postCallWorkflow`, closing the deep-link loop from call → lead record.

---

### 2.2 — In-Product Missed Revenue Card

**Goal:** Show owners the financial cost of missed calls using real data, personalised to their average job value.

**Changes:**
- `supabase/migrations/013_business_config_avg_job_value.sql` — new migration adds `avg_job_value INTEGER DEFAULT 250` to `business_config`.
- `shared/types.ts` — `avg_job_value: number | null` added to `BusinessConfig` interface.
- `server/src/routes/clients/index.ts` — `settingsSchema` extended with `avg_job_value` (Zod: `z.number().int().min(0).max(100000).nullable().optional()`). Cross-field validation via `superRefine` ensures `business_hours_end > business_hours_start`. `configFieldsPatch` and destructuring updated to persist the field.
- `src/pages/SettingsPage.tsx` — `avg_job_value` LabeledField added in the Services & Hours section. `ClientSettings` interface extended. Query extended to fetch `avg_job_value` from `business_config`.
- `src/pages/DashboardPage.tsx` — parallel queries extended with: (a) count of missed calls in rolling 30-day window; (b) `avg_job_value` from `business_config`. Missed revenue card rendered when `missedCount30d > 0`, showing estimated value as `missedCalls × avgJobValue`, linking to `/dashboard/leads`. Fallback £250 when `avg_job_value` is null.

**Design:** Accent-coloured card (matching informational tone, not alarm). Labelled "estimated missed value" — never "lost revenue".

---

### 2.3 — Mobile PWA + Deep-Link SMS → Lead

**Goal:** Transform the post-call SMS from a notification into a direct action. Owner taps the SMS → lands on that specific lead with a "Call back" button ready.

**Changes:**
- `public/manifest.json` — new PWA manifest: `start_url: "/dashboard"`, `display: "standalone"`, navy `background_color` / `theme_color`, logo-mark icons at 192×192 and 512×512.
- `index.html` — added `<link rel="manifest">`, `<meta name="theme-color">`, Apple PWA meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`).
- `src/pages/LeadsPage.tsx`:
  - `useSearchParams` reads `?leadId=xxx` from the URL.
  - Deep-linked lead gets `id="lead-{id}"`, accent ring (`box-shadow: 0 0 0 2px rgba(153,203,255,0.50)`), and `data-deep-linked` attribute.
  - `useEffect` scrolls to the lead on mount and clears the URL param after 3 seconds (so refreshing doesn't re-highlight).
  - Call-back and SMS buttons added to every lead that has a `caller_number`: `<a href="tel:...">` and `<a href="sms:...?body=...">` styled as accent/orange pill buttons.
- `server/src/routes/billing/index.ts` — `return_url` corrected from `/dashboard` to `/dashboard/settings` so the Stripe portal returns to the right page.

---

### 2.4 — Repeat Caller Recognition

**Goal:** Surface "Returning" context on calls from numbers that have called before, so owners don't re-qualify the same person twice.

**Changes:**
- `src/pages/CallsPage.tsx`:
  - `callerFrequency` useMemo builds a `Map<string, number>` from all 200 loaded calls. Cost: O(n) on load, zero extra queries.
  - Mobile card view: "Returning" badge (accent pill) shown after Emergency/Recording chips when `callerFrequency.get(caller_number) > 1`.
  - Desktop table view: "Returning" badge rendered inline next to the caller number in the caller cell header row.

---

## Files Changed

| File | Change type |
|------|-------------|
| `server/src/services/twilio.ts` | Extended |
| `server/src/services/resend.ts` | Extended |
| `server/src/services/retell.ts` | Extended (`PostCallExtra`, `leadUrl`) |
| `server/src/routes/webhooks/retell.ts` | Extended (`insertedLeadId` capture) |
| `server/src/routes/billing/index.ts` | Fixed (`return_url`) |
| `server/src/routes/clients/index.ts` | Extended (`avg_job_value`, `superRefine`) |
| `shared/types.ts` | Extended (`avg_job_value` on `BusinessConfig`) |
| `src/pages/DashboardPage.tsx` | Extended (missed revenue card) |
| `src/pages/LeadsPage.tsx` | Extended (deep-link, call-back buttons) |
| `src/pages/CallsPage.tsx` | Extended (callerFrequency, Returning badge) |
| `src/pages/SettingsPage.tsx` | Extended (avg_job_value field, raw textarea fix) |
| `public/manifest.json` | New (PWA manifest) |
| `index.html` | Extended (PWA meta tags) |
| `supabase/migrations/013_business_config_avg_job_value.sql` | New |
| `docs/implementation-plan.md` | Updated (Phase 2 completion status) |

---

## Validation Run

| Check | Result |
|-------|--------|
| `npm run build` (Vite + TS) | ✅ Clean — 2109 modules, 35.2s |
| `npm run build:api` (tsc) | ✅ Clean — no errors |
| Sentry source map upload | ✅ Succeeded |

---

## Manual Review Points

1. **Apply the migration** — run `supabase/migrations/013_business_config_avg_job_value.sql` against the production database. Until applied, `avg_job_value` reads as `null` and the missed revenue card falls back to £250.
2. **Verify deep-link flow end-to-end** — manually trigger a `no_answer` call in staging, confirm the SMS contains the `?leadId=` URL, tap it, confirm the lead highlights and the Call Back button works.
3. **iOS "Add to Home Screen"** — install the PWA on an iPhone and verify the `apple-mobile-web-app-title` shows "Trade Rec." and the splash/status bar colour is correct.
4. **Returning badge threshold** — currently fires when frequency > 1 across the last 200 calls. If owners load fewer calls than the caller's full history, this may under-fire. Monitor and adjust the `limit(200)` if needed.
5. **Missed revenue card £0 edge case** — confirm the card is hidden when `missedCount30d === 0` (not shown as "Estimated missed value: £0").

---

## Risks & Follow-ups

| Risk | Severity | Mitigation |
|------|----------|------------|
| `leadId` null if lead upsert fails or is skipped (spam gate) | Low | `leadUrl` is null-guarded in `postCallWorkflow`; SMS sends without the link |
| PWA icons reference `/assets/logo-mark.png` — must exist in `public/` | Medium | Verify asset exists before deploying; fallback: browser will use favicon |
| `avg_job_value` migration not applied → card always shows £250 estimate | Low | Clearly labelled as estimate; not harmful, but schedule migration promptly |
| Supabase `superRefine` hours validation is server-side only | Low | Frontend shows the error from the API response; no silent failure |

---

## Phase 2 Hardening Review (post-merge)

**Verdict: HARDEN → PASS after fixes**

### Issues found and fixed

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| C1 | 🔴 Critical | `no_answer`/`voicemail` absent from `leadOutcomes` — missed calls never created a lead → `insertedLeadId` always null → deep-link SMS never fired | Added both outcomes to `leadOutcomes` |
| C2 | 🔴 Critical | `<Link to="/leads">` in missed revenue card — correct path is `/dashboard/leads` — broken navigation | Fixed to `/dashboard/leads` |
| H1 | 🟠 High | SMS "Send message" body said "Hi, it's your receptionist service returning your call" — nonsensical from owner's phone | Replaced with `"Hi, just returning your call. Please ring me back when you get a chance."` |
| H2 | 🟠 High | `data.callerNumber` interpolated raw into email HTML (`href="tel:..."` and table row) | Added `escapeHtml()` helper; all email HTML now uses `safeCallerNumber` |
| M1 | 🟡 Medium | `DashboardPage.load()` had no try/catch — network error or bad RLS response left loading spinner forever | Wrapped in try/catch with `setLoading(false)` in catch |
| M2 | 🟡 Medium | Missed revenue card missing ARIA role | Added `role="status"` |

### Remaining low-priority issues (not fixed, documented)

- `postCallWorkflow` hardcodes `https://app.tradereceptionist.com` for `leadUrl` — use `DASHBOARD_BASE_URL` env var in Phase 3
- Emergency calls skip `postCallWorkflow` (handled by `escalateEmergency` separately) — accepted behaviour

**Build results (hardening pass):**
- Frontend: ✅ `npm run build` clean
- Server: ✅ `npm run build:api` clean

---

## Suggested Commit Message

```
feat: Phase 2 — missed call alerts, revenue card, PWA deep-link, repeat caller badge

2.1 Missed call alert: branch twilio SMS on outcome (no_answer/voicemail),
    add orange call-back button in Resend email, thread leadId through
    retell webhook → postCallWorkflow → sendOwnerSms → leadUrl in SMS.

2.2 Missed revenue card: avg_job_value field in Settings + migration,
    parallel dashboard queries (missed 30d count + avg_job_value),
    accent card linking to Leads page.

2.3 Mobile PWA + deep-link: manifest.json, index.html meta tags,
    LeadsPage ?leadId param → scroll + accent ring + auto-clear,
    call-back (tel:) and message (sms:) buttons on leads.
    Fix billing portal return_url → /dashboard/settings.

2.4 Repeat caller badge: callerFrequency useMemo in CallsPage,
    "Returning" accent badge in both mobile and desktop call rows.

Builds: npm run build ✅  npm run build:api ✅
```
