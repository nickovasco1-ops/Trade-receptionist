# Pre-Launch Bug Report — Trade Receptionist

Generated: May 28, 2026 10:23 BST
Test runner: Playwright 1.59.1
Environment: Local Playwright E2E, `TEST_BASE_URL=http://localhost:3000`, `TEST_API_BASE_URL=http://localhost:3001`, `E2E_TEST_MODE=true`, `VITE_STRIPE_MODE=test`, real Supabase test project, external providers stubbed in test mode.

## 🔴 Launch blockers

| # | Area | Bug | Evidence | File:Line | Severity | Recommended fix |
|---|------|-----|----------|-----------|----------|-----------------|
| — | — | No remaining P0 launch blockers after applying the schema migration to project `pyeztxqgjdrguktydtez`. | Final full run passed: `npm run test:e2e` reported 60 passed, 5 skipped, 0 failed. | `supabase/migrations/007_after_hours_message.sql:4`, `supabase/migrations/009_booking_call_link.sql:2` | — | Continue with P2/P3 items below. |

## 🟡 High priority

| # | Area | Bug | Evidence | File:Line | Severity | Recommended fix |
|---|------|-----|----------|-----------|----------|-----------------|
| — | — | No remaining P1 items after auth deep-link and onboarding resilience fixes. | Final full run passed: `npm run test:e2e` reported 60 passed, 5 skipped, 0 failed. | `e2e/auth.spec.ts:89`, `e2e/onboarding.spec.ts:274` | — | Continue with P2/P3 launch improvements below. |

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
- Auth redirects, login validation, magic-link state, real Supabase session creation, sign out, missing-session redirect, deep-link preservation, and external redirect rejection passed.
- Onboarding access, required gating, step order, back/forward persistence, refresh persistence, completion, Supabase `clients`/`business_config` persistence, rebuild-agent request boundary, and rebuild-agent failure retry passed.
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
| Dashboard date filter | No date filter UI is implemented. | Add date filter if required. |
| Dashboard call detail/transcript view | No call detail drawer/page exists. | Add detail view for transcript, recording, linked lead, and metadata. |
| Dashboard pagination/load-more | Lists render directly without pagination/load-more. | Add pagination, load-more, or virtualization. |
| Settings calendar disconnect | UI supports connect/re-connect only. | Add disconnect control and backend flow. |
| Settings billing/customer portal | No billing/customer portal entry point exists. | Add Stripe portal or plan-management UI. |

## 📊 Coverage summary

- Auth flows: 9/9 passing
- Onboarding: 8/8 passing
- Dashboard: 8/11 passing
- Settings: 7/9 passing
- Billing/Stripe: 10/10 passing
- Retell webhooks: 7/7 passing
- Mobile: 5/5 passing
- Accessibility: 5/5 passing
- Infrastructure smoke: 1/1 passing
- Total E2E final verification: 60/65 passing, 5 skipped, 0 failed on May 28, 2026.
