# E2E Audit Report

## Existing files reviewed

- `e2e/onboarding.spec.ts` - replaced; it was a monolithic launch audit with fixed sleeps, soft-pass branches, and stale onboarding assumptions.
- `e2e/auth.setup.ts` - still present but no longer part of the Playwright project dependency chain.
- `e2e/global-teardown.ts` - retained for legacy `TEST_EMAIL` cleanup, while new tests clean their own unique users.
- `playwright.config.ts` - updated to run focused desktop specs and only `mobile.spec.ts` in the mobile project.
- `package.json`, `server/package.json`, `vite.config.ts`, `index.tsx`, `src/lib/supabase.ts`, `src/lib/plans.ts`.
- Pages/components reviewed: `LoginPage`, `OnboardingPage`, `DashboardPage`, `CallsPage`, `LeadsPage`, `SettingsPage`, `DashboardShell`, `StripeCheckoutModal`, `App`.
- Server routes/services reviewed: `server/src/index.ts`, `routes/clients`, `routes/auth`, `routes/webhooks/retell`, `routes/webhooks/stripe`, `routes/webhooks/index`, `routes/calls`, `routes/bookings`, `services/retell`, `services/twilio`, `services/calendar`, `services/supabase`.
- Supabase migrations reviewed: `001` through `009`.

GitNexus note: GitNexus skills are present on disk, but no GitNexus MCP resources/tools are exposed in this session. The shell PATH initially missed `/Volumes/Macintosh HD/usr/local/bin`; after prepending that path, `npm`/`npx` were available. `npx gitnexus` needed an isolated install prefix because npm's transient exec cache hit `ECOMPROMISED`, then `gitnexus analyze`, `gitnexus status`, and `gitnexus detect-changes` completed successfully.

Phase 2B env note: Playwright now loads `.env.test`, maps `SUPABASE_URL` to `VITE_SUPABASE_URL`, maps `SUPABASE_ANON_KEY` to `VITE_SUPABASE_ANON_KEY`, forces `VITE_STRIPE_MODE=test`, defaults `TEST_API_BASE_URL` to `http://localhost:3001`, and starts both Vite and the API with `E2E_TEST_MODE=true`. In that mode only, the server supplies fake Retell/Twilio credentials when absent and stubs Retell, Twilio, Resend, and Notion outbound provider calls.

## Execution map

Routes:

- Public: `/`, `/login`, `/welcome`, `/terms`, `/privacy`, `/onboarding-preview`, `/dashboard-preview`, `/dashboard-preview/calls`, `/dashboard-preview/leads`, `/dashboard-preview/settings`.
- Auth-gated: `/dashboard`, `/dashboard/calls`, `/dashboard/leads`, `/settings`, `/onboarding`.
- Catch-all: `*` renders `NotFoundPage`.

API endpoints:

- Clients: `GET /clients`, `GET /clients/:id`, `POST /clients`, `PATCH /clients/:id`, `PATCH /clients/:id/settings`, `POST /clients/provision`, `POST /clients/:id/assign-number`, `GET /clients/:id/activation-code`, `POST /clients/rebuild-agent`.
- Auth/Google: `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/google/save-calendar-token`.
- Calls/bookings: `POST /calls/backfill/:retell_call_id`, `GET /bookings`, `GET /bookings/availability`, `POST /bookings`.
- Webhooks: `POST /webhooks/retell`, `POST /webhooks/stripe`, `POST /webhooks/twilio`.
- Retell tools: `POST /retell-tools/check-availability`, `POST /retell-tools/create-booking`.

Providers:

- Supabase Auth and PostgREST for sessions, clients, business_config, calls, transcripts, leads, and bookings.
- Stripe Payment Links on the frontend; Stripe webhook provisions clients.
- Retell webhooks and agent APIs.
- Twilio number search/purchase/import and SMS callbacks.
- Google Calendar OAuth and Calendar API.
- Resend welcome email.
- Notion logging for subscribers, calls, and incidents.

Persistence paths:

- Auth setup uses Supabase admin `createUser` and `generate_link`.
- Dashboard data reads `clients`, `calls`, `transcripts`, `leads`, and `bookings`.
- Onboarding updates `clients` and `business_config`, then calls `/api/clients/rebuild-agent`.
- Settings updates `clients` and optionally `business_config.after_hours_message` through `/api/clients/:id/settings`.
- Retell webhooks upsert `calls`, `transcripts`, and `leads`.

## Existing test issues

| File | Test / Area | Issue | Risk | Fix |
|---|---|---|---|---|
| `e2e/onboarding.spec.ts` | All areas | Used many fixed sleeps and soft-pass/manual branches. | Flaky launch signal and false confidence. | Replaced with focused specs using assertions and deterministic waits. |
| `e2e/onboarding.spec.ts` | Onboarding | Expected an old 4-step onboarding flow; real flow is 6 steps. | Missed current launch-critical behavior. | New onboarding spec covers receptionist, business, services, hours, contact, ready. |
| `e2e/onboarding.spec.ts` | Auth | Shared one static `TEST_EMAIL` across the whole suite. | Cross-test coupling and stale session risk. | New helpers create unique users and clean them per test. |
| `e2e/onboarding.spec.ts` | Stripe | Attempted hosted Stripe form interaction and wrote screenshots to tracked paths. | Unstable external-provider test. | New billing test validates test Payment Links and intercepts hosted checkout. |
| `e2e/onboarding.spec.ts` | Selectors | Mixed CSS/text selectors and stale ids. | Fragile tests after UI copy/layout updates. | New tests prefer labels, roles, visible headings, and stable ids only where labels already exist. |
| `playwright.config.ts` | Projects | All tests previously depended on a setup project and storage state file. | Session coupling, harder isolation. | Desktop specs now create their own authenticated users; mobile project runs only mobile coverage. |

## Selector issues

| Component | Current selector problem | Recommended data-testid |
|---|---|---|
| `StripeCheckoutModal` | Plan buttons have long accessible names composed from nested plan content; the final CTA is an external Payment Link. | Added `stripe-plan-starter`, `stripe-plan-pro`, `stripe-plan-agency`, `stripe-checkout-cta`. |
| `OnboardingPage` | Step panes share repeated navigation button names and rely on current copy/headings. | Added `onboarding-step-receptionist`, `onboarding-step-business`, `onboarding-step-services`, `onboarding-step-hours`, `onboarding-step-contact`, `onboarding-step-ready` via the step wrapper. |
| `DashboardPage` | Stats are animated and text values are dynamic; recent calls can be empty or populated. | Added `dashboard-stat-total-calls`, `dashboard-stat-total-leads`, `dashboard-recent-calls`. |
| `SettingsPage` | Save button text changes from `Save changes` to `Saving...` to `Saved`. | Added `settings-save-button`, `settings-save-status`. |
| `LeadsPage` | Status select already has stable accessible labels such as `Update status for Jane Caller`. | No test id added; role/label selectors are sufficient. |

## Missing coverage

| Area | Missing flow | Priority |
|---|---|---|
| Stripe subscription lifecycle | Invoice success/failure, subscription deletion, and account gating/payment state. | P1 |
| Retell webhook | Run in CI with `RETELL_API_KEY` and local API server available. | P0 |
| Accessibility | Automated axe-core ruleset. | P1 |
| Google OAuth callback | Full token exchange and Calendar API persistence with mocked Google token/calendar responses. | P1 |
| Twilio provisioning | `/clients/provision` and `/clients/:id/assign-number` with stable provider mocks. | P1 |
| Bookings | Leads booking composer with Calendar availability and create-booking paths. | P2 |

## Phase 2A reconciliation

| File | Exists? | Real implementation or placeholder? | Keep / Rewrite / Delete later | Reason |
|---|---:|---|---|---|
| `e2e/auth.spec.ts` | Yes | Real implementation | Keep, refine later | Covers redirect, magic-link validation, admin magic-link session, and sign-out with unique Supabase users. It is untracked new work from Phase 1. |
| `e2e/onboarding.spec.ts` | Yes | Real implementation replacing tracked legacy file | Keep, refine later | Exercises the current six-step onboarding flow and persisted Supabase effects. Phase 1 deleted the previous monolithic audit spec from this tracked file. |
| `e2e/dashboard.spec.ts` | Yes | Real implementation | Keep, refine later | Seeds real dashboard data and verifies dashboard, calls, leads, filters, status update, and empty states. It is untracked new work from Phase 1. |
| `e2e/settings.spec.ts` | Yes | Real implementation, currently blocked by environment | Keep, rewrite blocked portions later | Tests are explicit `test.skip` when the Supabase test schema lacks `business_config.after_hours_message`; useful structure but not active until the test schema is fixed. |
| `e2e/billing.spec.ts` | Yes | Real implementation | Keep, refine later | Verifies the pricing modal, starter/pro/agency plan choices, test-mode Payment Links, live-link exclusion, and Stripe hosted-checkout browser boundary with normal Playwright interactions. |
| `e2e/webhooks.retell.spec.ts` | Yes | Real implementation with known side-effect gaps | Keep, refine later | Calls the backend directly with signed/invalid Retell webhook payloads and verifies persisted `calls`, `transcripts`, and `leads`; server logs reveal post-call side-effect failures documented in `BUGS.md`. |
| `e2e/webhooks.stripe.spec.ts` | Yes | Real implementation with documented lifecycle gaps | Keep, refine later | Calls the backend directly for malformed, invalid-signature, harmless signed, and `checkout.session.completed` events. Checkout provisioning is safe under `E2E_TEST_MODE` provider stubs; subscription lifecycle events are skipped and documented in `BUGS.md`. |
| `e2e/mobile.spec.ts` | Yes | Real implementation | Keep, refine later | Uses the configured iPhone SE project to verify login, core onboarding, dashboard drawer navigation, call-log card adaptation, settings reachability, horizontal overflow, and primary tap targets. |
| `e2e/accessibility.spec.ts` | Yes | Real implementation | Keep, refine later | Uses `@axe-core/playwright` to assert zero critical violations on login, onboarding, dashboard, settings, and the Stripe pricing modal, plus landmarks, labels, keyboard navigation, and modal focus trapping. |
| `e2e/utils/env.ts` | Yes | Real utility | Keep | Centralizes base URLs, Supabase env, test phone, unique email, and env status. |
| `e2e/utils/fixtures.ts` | Yes | Real utility | Keep, refine later | Creates unique Supabase auth users, clients, business configs, seeded calls/leads, auth sessions, and cleanup. It intentionally avoids missing `after_hours_message`. |
| `e2e/utils/providers.ts` | Yes | Real utility with browser-route interception only | Keep, rewrite later for backend providers | Intercepts frontend `/api/clients/rebuild-agent`, Google OAuth URL generation, and Stripe hosted checkout navigation. It cannot intercept module-scope backend providers. |
| `e2e/utils/supabase-admin.ts` | Yes | Real utility | Keep | Provides Supabase Auth admin and PostgREST helpers using the service-role key from the environment. |
| `e2e/utils/webhooks.ts` | Yes | Real utility | Keep | Provides Retell/Stripe HMAC signing, direct backend POST helper, and deterministic polling without fixed Playwright sleeps. |
| `e2e/auth.setup.ts` | Yes | Legacy real implementation, currently unused | Delete or rewire later | Tracked pre-existing setup project helper; Playwright config no longer depends on it, so it is dead unless the suite returns to shared storage state. |
| `e2e/global-teardown.ts` | Yes | Legacy real implementation, mostly obsolete | Rewrite/delete later | Tracked pre-existing cleanup for static `TEST_EMAIL`; new tests clean unique users themselves. It still runs but usually reports no static user found. |
| `e2e/screenshots/stripe-checkout-structure.png` | Yes | Stale artifact | Delete later | Tracked screenshot from the old monolithic onboarding/billing exploration, not a test or fixture needed by the current suite. |
| `playwright.config.ts` | Yes | Real config change | Keep, refine later | Removes setup dependency, isolates mobile spec, and adds expect timeout; confirms Phase 1 modified runner behavior, not just documentation. |
| `package.json` | Yes | Unchanged | Keep | No current diff. Existing scripts/dependencies were not modified in Phase 1. |
| `server/package.json` | Yes | Unchanged | Keep | No current diff. Existing server scripts/dependencies were not modified in Phase 1. |

## Phase 2B environment reconciliation

| Area | Behavior after Phase 2B |
|---|---|
| `.env.test` loading | `playwright.config.ts` loads `.env.test` once before configuring projects or web servers. |
| Frontend Supabase env | `VITE_SUPABASE_URL` defaults from `SUPABASE_URL`; `VITE_SUPABASE_ANON_KEY` defaults from `SUPABASE_ANON_KEY`. |
| Stripe mode | `VITE_STRIPE_MODE` is forced to `test` during Playwright E2E. |
| Frontend URL | `TEST_BASE_URL` defaults to `http://localhost:3000`; the Vite web server uses that port. |
| API URL | `TEST_API_BASE_URL` defaults to `http://localhost:3001`; the API web server uses that port and Playwright waits on `/health`. |
| E2E provider mode | Playwright starts the API with `E2E_TEST_MODE=true`. Only in that mode, missing `RETELL_API_KEY`, `TWILIO_ACCOUNT_SID`, and `TWILIO_AUTH_TOKEN` are filled with fake non-secret values. |
| External provider network calls | Retell agent/LLM/phone-number calls, Twilio SMS/number/transfer calls, Resend email sends, and Notion logging return deterministic fake results or no-op when `E2E_TEST_MODE=true`; production behavior is unchanged. |
| Secret handling | No real secrets are hardcoded or printed. Fake credentials are scoped to E2E/test mode. |

## Phase 2C infrastructure reconciliation

| Utility | Purpose |
|---|---|
| `e2e/utils/env.ts` | Loads `.env.test`, validates required Supabase test vars, exposes `baseURL`, `apiBaseURL`, `testPhone`, `testRunId`, and unique id/email helpers without logging secrets. |
| `e2e/utils/supabase-admin.ts` | Provides a service-role Supabase admin client and REST/Auth helpers for node-side E2E setup only. |
| `e2e/utils/test-users.ts` | Generates unique test emails, creates confirmed Supabase users, tags them with run metadata, and lists/deletes run users. |
| `e2e/utils/auth.ts` | Creates real Supabase browser sessions through admin-generated magic links without shared static storage state. |
| `e2e/utils/fixtures.ts` | Seeds clients, business config, calls, transcripts, leads, and bookings where schema supports them; keeps legacy exports stable for existing specs. |
| `e2e/utils/provider-mocks.ts` | Provides browser boundary mocks for Stripe checkout, Google OAuth, Retell rebuild, and Twilio provisioning; backend providers are blocked by `E2E_TEST_MODE`. |
| `e2e/utils/polling.ts` | Deterministic polling helper for persisted effects, without Playwright fixed sleeps. |
| `e2e/utils/cleanup.ts` | Idempotent cleanup by test user/email or test run id. |
| `e2e/infra.smoke.spec.ts` | Tiny infrastructure preflight for env validation, `/login`, API `/health`, and Supabase user create/delete. |

## Phase 6A mobile reconciliation

| Area | Result |
|---|---|
| Mobile project | Playwright `mobile` project using `devices['iPhone SE']`. |
| Coverage added | `/login`, authenticated `/onboarding` core path, `/dashboard`, `/dashboard/calls`, `/dashboard/leads`, `/settings`, mobile drawer navigation, call-log mobile cards, overflow checks, and 44px primary tap-target checks. |
| Layout bugs fixed | Dashboard mobile open/close menu buttons were 28px hit areas; they now use fixed 44px touch targets. Dashboard settings navigation pointed to `/dashboard/settings`, a 404; it now routes to `/settings` for the real app route while preserving preview `navBase` behavior. |
| Remaining mobile blockers | None found in the focused iPhone SE E2E run. Broader device coverage is still future work. |

## Phase 6B accessibility reconciliation

| Area | Result |
|---|---|
| Axe package | Added `@axe-core/playwright` as the smallest focused dev dependency for Playwright accessibility scans. |
| Coverage added | `/login`, `/onboarding`, `/dashboard`, `/settings`, and the Stripe pricing modal. |
| Assertions added | Zero critical axe violations, visible main landmarks, accessible form labels, login keyboard order, settings form keyboard order, dialog semantics, and modal focus trap. |
| Accessibility bugs fixed | Public login/onboarding pages now expose `main` landmarks. Stripe pricing modal now exposes `role="dialog"`, `aria-modal`, a labelled title, initial focus, Escape close, focus restoration, and Tab/Shift+Tab containment. |
| Documented improvements | Skip-to-content link remains a launch improvement in `BUGS.md`. |

## Final launch verification

Generated: May 28, 2026 10:23 BST

| Command | Result | Notes |
|---|---|---|
| `npm run build` | Passed | Vite production build completed successfully; 2098 modules transformed. |
| `cd server && npm run build` | Passed | Server TypeScript build completed with `tsc`. |
| `npm run test:e2e` | Passed with skips | Playwright 1.59.1 ran 65 tests: 60 passed, 5 skipped, 0 failed, duration 15.4m. |
| `npx playwright test e2e/mobile.spec.ts --project=mobile` | Passed | Focused rerun after mobile helper alignment: 5 passed, 0 skipped, 0 failed, duration 1.6m. |

| Area | Passing | Skipped/blocked | Notes |
|---|---:|---:|---|
| Auth | 9 | 0 | Deep-link destination preservation and external redirect rejection now pass. |
| Onboarding | 8 | 0 | Refresh persistence and rebuild-agent failure feedback now pass. |
| Dashboard | 8 | 3 | Date filtering, detail view, and pagination/load-more are not implemented; canceled subscription warning now renders. |
| Settings | 7 | 2 | After-hours persistence and payment-failed subscription warning now pass; calendar disconnect and billing portal remain missing. |
| Billing/Stripe | 10 | 0 | Checkout provisioning and Stripe lifecycle events pass with E2E stubs. |
| Retell webhooks | 7 | 0 | Core persistence and duplicate `call_ended` idempotency pass. |
| Mobile | 5 | 0 | iPhone SE project passed. |
| Accessibility | 5 | 0 | Axe-backed critical checks passed. |
| Infrastructure | 1 | 0 | Env/API/Supabase smoke passed. |

Launch readiness: **launch-ready from the covered P0/P1 E2E perspective**. No P0 or P1 blockers remain in the final full run; remaining gaps are P2/P3 product improvements tracked in `BUGS.md`.

## P0 schema blocker follow-up

Generated: May 26, 2026

| Check | Result |
|---|---|
| `supabase/migrations/007_after_hours_message.sql` | Present and idempotent: adds `business_config.after_hours_message TEXT`. |
| `supabase/migrations/009_booking_call_link.sql` | Present and idempotent: adds `bookings.call_id UUID REFERENCES calls(id)` and `bookings_call_id_idx`. |
| Test Supabase column probe | Both columns now exist in project `pyeztxqgjdrguktydtez`; PostgREST returns `200` for `business_config.after_hours_message` and `bookings.call_id`. |
| Migration method | Applied through Supabase MCP `apply_migration` with migration name `fix_p0_schema_columns`. |
| SQL applied | `ALTER TABLE public.business_config ADD COLUMN IF NOT EXISTS after_hours_message TEXT;` plus `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL;` plus `CREATE INDEX IF NOT EXISTS bookings_call_id_idx ON public.bookings(call_id);`. |
| Test state | Focused verification passed: `npx playwright test e2e/settings.spec.ts e2e/webhooks.retell.spec.ts` reported 12 passed, 3 skipped, 0 failed. The after-hours test now runs and passes; Retell no longer logs missing `bookings.call_id`. |

## Retell duplicate delivery idempotency follow-up

Generated: May 26, 2026

| Check | Result |
|---|---|
| Schema constraint | Added `supabase/migrations/010_leads_call_id_unique.sql`, creating unique index `leads_call_id_unique_idx` on `public.leads(call_id)`. PostgreSQL still allows multiple `NULL` `call_id` values, so manual unlinked leads remain supported. |
| Test Supabase migration | Applied through Supabase MCP `apply_migration` with migration name `leads_call_id_unique`; verified index exists in project `pyeztxqgjdrguktydtez`. |
| Webhook logic | `handleCallEnded` now writes leads with atomic `upsert(..., { onConflict: 'call_id' })` instead of a race-prone read-then-insert/update branch. |
| Test state | `npx playwright test e2e/webhooks.retell.spec.ts` passed 7/7 on May 26, 2026. Duplicate `call_ended` delivery test is active and verifies one call, one transcript, and one lead row for overlapping Retell retries. |

## Stripe subscription lifecycle follow-up

Generated: May 26, 2026

| Check | Result |
|---|---|
| Schema model | Added `supabase/migrations/011_client_subscription_lifecycle.sql`, storing Stripe customer/subscription IDs, `subscription_status`, `payment_status`, `current_period_end`, and last payment timestamps on `public.clients`. |
| Project migration | Applied through Supabase MCP `apply_migration` with migration name `client_subscription_lifecycle`; `list_migrations` shows version `20260526052623` in project `pyeztxqgjdrguktydtez`. |
| Webhook logic | `checkout.session.completed` now stores Stripe IDs; `invoice.payment_succeeded` marks the client active/current; `invoice.payment_failed` marks payment failed and gates the client; `customer.subscription.deleted` marks canceled and gates the client. |
| Idempotency | Lifecycle handlers find clients by Stripe subscription ID, customer ID, or checkout email, then update the same client row. E2E posts duplicate lifecycle events and verifies stable persisted state. |
| Test state | `npx playwright test e2e/webhooks.stripe.spec.ts e2e/billing.spec.ts` passed 10/10 on May 26, 2026. |
| UI state | Dashboard and settings now render `subscription-status-banner` for failed/past-due and canceled subscription states, with E2E assertions covering both surfaces. |

## Auth deep-link preservation follow-up

Generated: May 28, 2026

| Check | Result |
|---|---|
| Redirect strategy | `RequireAuth` preserves the requested path, query string, and hash by redirecting unauthenticated users to `/login?redirectTo=<encoded internal destination>`. |
| Login completion | `LoginPage` consumes `redirectTo` for existing sessions, magic-link redirects, and Google OAuth redirects; default remains `/dashboard`. |
| Open redirect protection | Redirect targets are parsed against `window.location.origin`, must remain same-origin, must use an internal path, and `/login` falls back to `/dashboard`. External URLs fall back to `/dashboard`. |
| Test state | `npx playwright test e2e/auth.spec.ts` passed 9/9 on May 28, 2026. `npm run build` also passed. |

## Onboarding resilience follow-up

Generated: May 28, 2026

| Check | Result |
|---|---|
| Draft persistence | Onboarding now stores an in-browser draft at `trade-receptionist:onboarding-draft:<clientId>`, including the current step and form data. Drafts are loaded after client prefill and cleared after successful activation or when a completed client is redirected to dashboard. |
| Stale state guard | Drafts are scoped by Supabase client id, so one client's unfinished setup cannot populate another client's onboarding flow. |
| Rebuild-agent behavior | Completion now saves client/config data, awaits `/api/clients/rebuild-agent`, surfaces provider errors in the ready step, leaves onboarding incomplete on provider failure, and re-enables the activation button for retry. |
| Test state | `npx playwright test e2e/onboarding.spec.ts` passed 8/8 on May 28, 2026. `npm run build` also passed. |

## Environment requirements

| Env var | Status | Notes |
|---|---|---|
| `TEST_BASE_URL` | Present in `.env.test` or defaulted by Playwright | Frontend target, defaults to `http://localhost:3000`. |
| `TEST_API_BASE_URL` | Present or defaulted by Playwright | API target, defaults to `http://localhost:3001`. |
| `TEST_PHONE` | Present in `.env.test` | Used for onboarding/settings fixtures. |
| `SUPABASE_URL` | Present in `.env.test` | Required. |
| `SUPABASE_ANON_KEY` | Present in `.env.test` | Available for parity with app config. |
| `SUPABASE_SERVICE_ROLE_KEY` | Present in `.env.test` | Required for fixture seeding/cleanup. |
| `VITE_SUPABASE_URL` | Mapped by Playwright | Defaults from `SUPABASE_URL` during E2E. |
| `VITE_SUPABASE_ANON_KEY` | Mapped by Playwright | Defaults from `SUPABASE_ANON_KEY` during E2E. |
| `VITE_STRIPE_MODE` | Forced by Playwright | Always `test` during E2E. |
| `E2E_TEST_MODE` | Forced by Playwright | Enables test-only fake provider credentials and stubs. |
| `RETELL_API_KEY` | Real value or E2E fake | Missing values are filled only when `E2E_TEST_MODE=true`. |
| `STRIPE_WEBHOOK_SECRET` | Real value or E2E fake | Missing values are filled only when `E2E_TEST_MODE=true`; signed Stripe webhook fixtures use the E2E fake secret if no real test secret is present. |
| `GOOGLE_CLIENT_ID` | Missing in `.env.test` | Intercepted for settings OAuth E2E. |
| `GOOGLE_CLIENT_SECRET` | Missing in `.env.test` | Needed for real OAuth callback tests. |
| `TWILIO_ACCOUNT_SID` | Real value or E2E fake | Missing values are filled only when `E2E_TEST_MODE=true`. |
| `TWILIO_AUTH_TOKEN` | Real value or E2E fake | Missing values are filled only when `E2E_TEST_MODE=true`. |
| `RESEND_API_KEY` | Missing in `.env.test` | Optional server warning; welcome email path needs mock/fixture. |
| `NOTION_API_KEY` | Missing in `.env.test` | Optional logging path. |
