# Pre-Launch Bug Report — Trade Receptionist

Generated: May 26, 2026
Test runner: Playwright 1.59.1
Environment: Local Playwright E2E, `TEST_BASE_URL=http://localhost:3000`, `TEST_API_BASE_URL=http://localhost:3001`, `E2E_TEST_MODE=true`, `VITE_STRIPE_MODE=test`, real Supabase test project, external providers stubbed in test mode.

## 🔴 Launch blockers

| # | Area | Bug | Evidence | File:Line | Severity | Recommended fix |
|---|------|-----|----------|-----------|----------|-----------------|
| — | — | No remaining P0 launch blockers after applying the schema migration to project `pyeztxqgjdrguktydtez`. | Postgres and PostgREST both see `business_config.after_hours_message` and `bookings.call_id`; focused settings/Retell run passed with no schema skips/errors. | `supabase/migrations/007_after_hours_message.sql:4`, `supabase/migrations/009_booking_call_link.sql:2` | — | Continue with P1 items below. |

## 🟡 High priority

| # | Area | Bug | Evidence | File:Line | Severity | Recommended fix |
|---|------|-----|----------|-----------|----------|-----------------|
| 1 | Auth deep links | Auth-gated routes redirect to `/login` without preserving the originally requested destination. | Full run skipped deep-link preservation test. | `e2e/auth.spec.ts:88`, `src/pages/LoginPage.tsx:67` | P1 | Preserve requested route in auth redirect state/query and navigate there after session creation. |
| 2 | Onboarding resilience | Refreshing mid-onboarding loses unsaved progress, and rebuild-agent provider failures are invisible because completion does not await the response. | Full run skipped refresh persistence and provider-failure feedback tests. | `e2e/onboarding.spec.ts:272`, `e2e/onboarding.spec.ts:276`, `src/pages/OnboardingPage.tsx:721` | P1 | Persist onboarding draft state or explicitly define it as disposable; await/enqueue rebuild with visible failure/retry state. |

## 🟢 Nice to have

| # | Area | Bug | Evidence | File:Line | Severity | Recommended fix |
|---|------|-----|----------|-----------|----------|-----------------|
| 1 | Webhook status semantics | Retell and Stripe return `200` for malformed or invalid-signature webhook payloads. This avoids provider retries, but does not meet stricter 400/401 API semantics. | Full run passed “not 500” tests while server logged rejected/parse-error webhooks. | `server/src/routes/webhooks/retell.ts:336`, `server/src/routes/webhooks/stripe.ts:335` | P2 | Decide whether webhook routes should prefer non-retry acknowledgements or conventional 400/401 responses, then align tests and monitoring. |
| 2 | Dashboard filtering/details | Calls page has outcome filtering only; no date filter or call detail view with transcript/details. | Full run skipped date filter and call detail tests. | `e2e/dashboard.spec.ts:267`, `e2e/dashboard.spec.ts:271` | P2 | Add date filter and call-detail drawer/page if launch users need deeper call review. |
| 3 | Dashboard large datasets | Calls/leads pages load up to 200 records directly and expose no pagination/load-more controls. | Full run skipped pagination/load-more test; 50+ direct rendering passed. | `e2e/dashboard.spec.ts:254`, `e2e/dashboard.spec.ts:275` | P3 | Add pagination, virtualization, or load-more before larger production datasets. |
| 4 | Settings self-service | Settings supports Google Calendar connect/re-connect only and has no billing/customer portal entry point. | Full run skipped calendar disconnect and billing portal tests. | `e2e/settings.spec.ts:187`, `e2e/settings.spec.ts:191` | P2 | Add calendar disconnect and Stripe portal/plan-management entry points if required for subscriber self-service. |
| 5 | Accessibility navigation | Axe-backed critical checks pass, but no reusable skip-to-content link is exposed. | Keyboard users tab through chrome/content rather than getting a skip target. | `e2e/accessibility.spec.ts:13`, `src/components/dashboard/DashboardShell.tsx:323` | P2 | Add a focus-visible skip link targeting each page's main landmark. |

## ✅ Passing flows

- Frontend production build passed: `npm run build`.
- Backend TypeScript build passed: `cd server && npm run build`.
- E2E infrastructure preflight passed.
- Auth redirects, login validation, magic-link state, real Supabase session creation, sign out, and missing-session redirect passed.
- Onboarding access, required gating, step order, back/forward persistence, completion, Supabase `clients`/`business_config` persistence, and rebuild-agent request boundary passed.
- Dashboard overview, KPI cards, recent calls, calls list, outcome filter, empty state, leads page, and 50+ loaded records passed.
- Settings access, profile loading, profile save/reload persistence, after-hours message persistence, subscription payment warning, API error UI, and Google OAuth boundary passed.
- Billing modal, plan choices, test Payment Links, live-link exclusion, and hosted Stripe boundary passed.
- Stripe webhook malformed/invalid/harmless events, `checkout.session.completed` provisioning, invoice success, invoice failure, and subscription deletion passed with E2E provider stubs.
- Retell webhook malformed/invalid events, `call_started`, `call_ended`, `call_analyzed`, emergency intent persistence, and duplicate `call_ended` idempotency passed.
- Mobile login, onboarding, dashboard navigation, call-log card adaptation, settings reachability, overflow, and tap-target checks passed.
- Accessibility axe checks for login, onboarding, dashboard, settings, and Stripe modal passed with zero critical violations.

## ⚠️ Skipped or blocked flows

| Flow | Reason | Required action |
|---|---|---|
| Auth deep-link destination after login | App does not preserve requested route when redirecting to `/login`. | Preserve route in auth redirect state/query and consume it after login. |
| Onboarding refresh persistence | Unsaved onboarding state is React-only and resets on refresh. | Persist draft state or document product decision. |
| Onboarding rebuild-agent failure feedback | Completion fires provider rebuild and navigates without awaiting/displaying failure. | Await/enqueue rebuild with visible status and retry path. |
| Dashboard date filter | No date filter UI is implemented. | Add date filter if required. |
| Dashboard call detail/transcript view | No call detail drawer/page exists. | Add detail view for transcript, recording, linked lead, and metadata. |
| Dashboard pagination/load-more | Lists render directly without pagination/load-more. | Add pagination, load-more, or virtualization. |
| Settings calendar disconnect | UI supports connect/re-connect only. | Add disconnect control and backend flow. |
| Settings billing/customer portal | No billing/customer portal entry point exists. | Add Stripe portal or plan-management UI. |

## 📊 Coverage summary

- Auth flows: 7/8 passing
- Onboarding: 6/8 passing
- Dashboard: 8/11 passing
- Settings: 7/9 passing
- Billing/Stripe: 10/10 passing
- Retell webhooks: 7/7 passing
- Mobile: 5/5 passing
- Accessibility: 5/5 passing
- Infrastructure smoke: 1/1 passing
- Total E2E after subscription-status UI fix: 56/64 passing, 8 skipped, 0 failed based on prior full run plus focused verification.
