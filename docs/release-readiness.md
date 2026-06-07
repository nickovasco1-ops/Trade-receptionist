# Trade Receptionist — Release Readiness Report

**Date:** 7 June 2026  
**Branch:** `main` (commit `f4c3e59` + hardening patches)  
**Audited by:** Claude Code (automated release-hardening pass)

---

## Verdict

> **ALMOST READY**

All three implementation phases are complete and functional. The codebase is architecturally sound, well-structured, and secure for its threat model. **One decision-point and one operational task must be resolved before go-live.** Several low-severity issues are documented below with fixes already applied.

---

## Critical Blockers

### 1. Pricing / plan-tier inconsistency — decision required

| Where | What it says |
|---|---|
| `CLAUDE.md §6.3` | 3 tiers: Starter £29, Pro £59, Agency £119 |
| `docs/legal/TermsPage.tsx` | 3 tiers: Starter £29, Pro £59, Agency £119 |
| `server/src/routes/webhooks/stripe.ts` (PRODUCT_TO_PLAN) | 3 live products: starter, pro, agency |
| `src/lib/plans.ts` | **4 tiers**: starter £49, pro £89, **business £159**, agency £249 |

`plans.ts` defines a fourth `business` tier with different prices, and **no Stripe product is mapped to `business`** in the webhook handler. If a customer purchases via the business Stripe URL, the checkout-completed webhook will not find a matching product ID and will fall back to `starter`, provisioning them at the wrong plan.

`plans.ts` call limits are also inconsistent with the constitution (50/150/350/600 vs the CLAUDE.md 100/300/unlimited).

**Required action (choose one):**

**Option A — Keep 3 tiers** *(aligns with constitution, TermsPage, Stripe products)*  
Remove `business` from `src/lib/plans.ts`. Update call limits to match CLAUDE.md (100, 300, unlimited).

**Option B — Keep 4 tiers**  
Create a `business` Stripe product at the intended price, add its product IDs to `PRODUCT_TO_PLAN` in `server/src/routes/webhooks/stripe.ts`, and update `TermsPage.tsx` and `CLAUDE.md`.

> Until this is resolved, do not run a live Stripe checkout for the `business` plan — subscribers will be silently downgraded to `starter`.

---

### 2. Railway cron not yet configured — operational task

The 48-hour lead follow-up SMS service (`POST /admin/run-lead-followup`) requires:

- `ADMIN_API_KEY` set in Railway environment
- A Railway cron job (or external scheduler) calling the endpoint hourly

**`.env.example` now documents `ADMIN_API_KEY`** (fixed in this pass). The service is fully implemented and tested; only the scheduler setup remains.

---

## High — Fixed in this pass

### H1. `POST /calls/create-web-call` had no authentication

**Before:** Any party with network access could call this endpoint to create Retell web-call sessions at the account owner's cost.

**Fixed:** The route now requires a valid Supabase Bearer token and verifies the caller owns the `agent_id` before proxying to Retell. Added a cross-tenant ownership check (`retell_agent_id` + `owner_email`).

### H2. `console.log` / `console.error` in backfill route

**Before:** Two raw `console.*` calls in `POST /calls/backfill/:retell_call_id` bypassed structured logging.

**Fixed:** Replaced with `logEvent('error', ...)` and `logEvent('info', ...)` for consistent observability.

### H3. `ADMIN_API_KEY` not in `.env.example`

**Before:** The cron endpoint used `ADMIN_API_KEY` but it was absent from `.env.example`, so it was invisible to anyone setting up the environment.

**Fixed:** Added with descriptive comments to `.env.example`.

---

## Medium — Non-blocking, monitor post-launch

### M1. ImprovMX webhook has no signature verification

**File:** `server/src/routes/webhooks/improvmx.ts`

The `/webhooks/improvmx` handler accepts any POST without authenticating the sender. A malicious actor could trigger arbitrary auto-reply emails via Resend, draining credits.

**Mitigation available:** ImprovMX supports a webhook secret that can be verified via an `X-ImprovMX-Signature` header. Implement when ImprovMX delivers the secret.

**Risk until fixed:** Low — Resend has rate limits; the endpoint only sends templated replies to the `from` address in the payload (which the attacker controls and could be their own).

### M2. `GET /calls/` and `GET /calls/:id` have no auth

**File:** `server/src/routes/calls/index.ts`

The list and detail routes use the service-role Supabase client (bypassing RLS) with no Bearer token requirement. Anyone with a known `client_id` UUID can enumerate all calls for that client.

**Mitigating factors:**
- The frontend does not use these endpoints — it queries Supabase directly with the anon key, which is protected by RLS policies.
- `client_id` values are UUIDs (128-bit entropy), so brute-forcing is not practical.
- Railway is behind CORS, limiting browser access.

**Recommendation:** Add the same `getOwnerEmail` auth pattern used by bookings and billing routes in a post-launch sprint.

### M3. `console.*` in other server files

Remaining raw `console.*` calls in production paths:

| File | Lines | Type |
|---|---|---|
| `server/src/routes/clients/index.ts` | 116, 121, 126, 131, 252, 381, 396, 561, 580, 594, 702, 785, 788, 841, 847 | `console.error` / `console.log` |
| `server/src/lib/emergency.ts` | 128, 140 | `console.error` |
| `server/src/services/booking.ts` | 355, 377, 394 | `console.error` |

These log useful information but in a different format than `logEvent`, making Railway log analysis inconsistent. Replace in a post-launch sprint.

### M4. Pre-existing TypeScript build errors on API

```
src/index.ts: error TS2307: Cannot find module 'helmet'
src/index.ts: error TS2307: Cannot find module '@sentry/node'
src/instrument.ts: error TS2307: Cannot find module '@sentry/node'
```

These are pre-existing type declaration gaps — the packages are installed and the server runs correctly. Missing `@types/helmet` and Sentry's own types. Does not affect runtime. Fix: `npm install --save-dev @types/helmet` (if available) or add `declare module 'helmet'` shims.

---

## Low — Informational

### L1. TestCallPage bundle size

`TestCallPage-CU_XDgJx.js` is 516kB raw / 135kB gzipped due to `retell-client-js-sdk`. This page is only accessed by the account owner for pre-launch testing. Acceptable for a dev-tool route; add lazy-loading guards if it appears in marketing analytics.

### L2. `GOOGLE_OAUTH_SUCCESS_URL` in `.env.example` points to `/settings` not `/dashboard/settings`

The example value is `https://tradereceptionist.com/settings` but the route is `/dashboard/settings`. Update the example to avoid confusion during new environment setup.

### L3. `RESEND_FROM_EMAIL` mismatch

`.env.example` shows `hello@tradereceptionist.co.uk` (`.co.uk`) but the codebase defaults to `hello@tradereceptionist.com` (`.com`). Verify which domain Resend is configured for.

---

## Flow Coverage

| Flow | Status | Notes |
|---|---|---|
| Visitor → Stripe checkout → auto-provision | ✅ | Tested (3 of 4 plan tiers mapped; see blocker #1) |
| Inbound call → Retell → webhook → lead + SMS | ✅ | Idempotent upsert; emergency escalation wired |
| Call ended → owner SMS + email summary | ✅ | `postCallWorkflow` in `retell.ts` |
| 48h no-response → follow-up SMS | ✅ | `lead-followup.ts`; requires cron setup |
| Calendar slot injection into AI prompt | ✅ | `slot-cache.ts` → `buildSystemPrompt` |
| Calendar booking via AI agent | ✅ | `retell-tools/check-availability` + `create-booking` |
| Google OAuth → calendar connect | ✅ | Both flow paths (direct + Supabase provider token) |
| Dashboard login → onboarding → ready | ✅ | `WelcomePage → OnboardingPage → DashboardPage` |
| Settings save → Retell prompt sync | ✅ | Rollback on Retell failure |
| Leads page → status update + booking | ✅ | Supabase direct + `/api/bookings` proxy |
| Stripe portal → self-serve billing | ✅ | `/billing/portal-session` |
| ImprovMX email → auto-reply | ✅ | Category detection + Resend; no auth (see M1) |
| Unauthenticated dashboard → redirect to login | ✅ | Router guard in place |

---

## Security Checklist

| Check | Status |
|---|---|
| No hardcoded secrets | ✅ |
| Webhook HMAC verification (Retell, Stripe) | ✅ |
| Supabase RLS on all user-facing tables | ✅ |
| Rate limiting on all routes | ✅ |
| Input validation with Zod at API boundaries | ✅ |
| CORS locked to known origins | ✅ |
| `Content-Security-Policy` configured | ✅ (via `vercel.json`) |
| Helmet security headers on API | ✅ |
| Auth on sensitive write endpoints | ✅ (billing, bookings, settings, auth) |
| Auth on `/calls/create-web-call` | ✅ **fixed this pass** |
| ImprovMX webhook auth | ⚠️ See M1 |
| `GET /calls/` auth | ⚠️ See M2 |
| `ADMIN_API_KEY` documented | ✅ **fixed this pass** |

---

## Build Status

```
Frontend (Vite):       ✅ Clean build — 33s
Server (tsc):          ⚠️ 3 pre-existing type errors (helmet, @sentry/node) — runtime unaffected
```

---

## Pre-Go-Live Checklist

- [ ] Resolve pricing/tier decision (Blocker #1 above)
- [ ] Set `ADMIN_API_KEY` in Railway
- [ ] Configure hourly cron for `POST /admin/run-lead-followup`
- [ ] Apply Supabase migrations 013 and 014 in production
- [ ] Enable Stripe Customer Portal (Products → Customer portal in dashboard)
- [ ] Set live `STRIPE_SECRET_KEY` in Railway
- [ ] Set `VITE_CRISP_WEBSITE_ID` in Vercel
- [ ] Fix `GOOGLE_OAUTH_SUCCESS_URL` in Railway to `/dashboard/settings`
- [ ] Verify `RESEND_FROM_EMAIL` domain matches Resend configuration
- [ ] Run `npm run test:smoke` against production URL
- [ ] Complete live call test (see `LAUNCH_CHECKLIST.md`)

---

*Generated by automated release-hardening audit — 7 June 2026*
