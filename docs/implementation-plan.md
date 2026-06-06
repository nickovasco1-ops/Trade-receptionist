# Trade Receptionist — Implementation Plan

> **Single source of truth.** Grounded in the existing codebase audit and product opportunity analysis.
> Updated: 2026-06-06

---

## Guiding Constraints

- Reuse current architecture: React + Vite, Express + Pino, Supabase, Retell, Twilio, Stripe
- No new frameworks, no new animation libraries, no parallel auth systems
- Touch the fewest files possible per feature — vertical slices, not rewrites
- `App.tsx` is a landmine (~1,800 lines) — do not bulk-add to it
- Every change ships independently and can be reviewed in isolation

---

## Phase 1 — Close the Core Loop
**Target: 2–3 weeks | Goal: make the product feel finished to existing users**

The dashboard fetches data it never shows. Config set in onboarding can never be changed. These are not missing features — they are product defects that cause silent churn.

### Outcomes
- A user can read every call summary without leaving the app
- A user can update their services, hours, tone, and areas without contacting support
- A user can upgrade, download invoices, and manage billing without emailing anyone
- The product correctly handles all 4 pricing tiers end-to-end

---

### 1.1 — Call Transcript + Summary in Calls UI

**What it does:** Expands each call row to show the AI-generated summary and an inline audio player. Data already exists in `transcripts.summary` and is already fetched — it is simply never rendered.

**Codebase changes:**
- `src/pages/CallsPage.tsx` — add expandable row on click; render `transcript.summary` text; replace raw recording URL with `<audio controls src={recordingUrl} />`
- No backend changes required
- Supabase query already joins `transcripts(summary)` — verify `full_text` is also selected if surfacing transcript body in V2

**Dependencies:** Retell `call_analyzed` webhook must have fired to populate `summary`. Add a null guard: show "Summary processing…" if null.

**Risk:** Low. Read-only UI change. Retell recording URLs — verify they don't expire. If they do, proxy via a signed Supabase Storage URL in V2.

**KPI:** Support tickets asking "what was said on my call?" should drop. Dashboard session time should increase.

---

### 1.2 — Post-Onboarding Config Editing

**What it does:** Exposes all onboarding-collected fields as editable in Settings. On save, re-pushes the Retell system prompt.

**Codebase changes:**
- `src/pages/SettingsPage.tsx` — add new sections: Services (chip list), Working hours (time pickers + day toggles), Receptionist name + tone (text + 3-button toggle), Service areas (text input)
- `server/src/routes/clients/index.ts` — extend `PATCH /clients/:id/settings` to accept `services`, `working_days`, `business_hours_start`, `business_hours_end`, `receptionist_name`, `receptionist_tone`, `service_area`. Extend `settingsUpdateSchema` Zod schema.
- `server/src/services/retell.ts` — `updateRetellLlmConfig` already exists and re-pushes the prompt. Call it after saving config to Supabase.
- No schema migrations needed — all fields exist in `business_config`

**Dependencies:** `updateRetellLlmConfig` in `retell.ts` must handle partial updates without clobbering unchanged fields. Audit before wiring.

**Risk:** Medium. A failed Retell update after a successful DB write creates drift. Wrap in a transaction pattern: update Supabase → call Retell → on Retell failure, surface error and leave DB unchanged (or retry). Add a "Receptionist last updated" timestamp to the UI so the owner knows their changes took effect.

**KPI:** % of users who modify any config field in their first 30 days. Reduction in "AI is saying the wrong thing" support contacts.

---

### 1.3 — Stripe Billing Portal Link

**What it does:** Adds a self-serve "Manage billing" link in Settings that opens a Stripe Customer Portal session. Covers: upgrade/downgrade, invoice history, card update, cancellation.

**Codebase changes:**
- `server/src/routes/` — add `POST /billing/portal-session`. Uses `stripe.billingPortal.sessions.create({ customer: client.stripe_customer_id, return_url })`. One Stripe API call.
- `src/pages/SettingsPage.tsx` — add "Manage billing" button in the subscription section. On click, POST to the new route and redirect to the returned URL.

**Dependencies:** `stripe_customer_id` must be populated on the client row. Verify it is set correctly for all active subscribers via the Stripe webhook handler (`server/src/routes/webhooks/stripe.ts`).

**Risk:** Low. Stripe Customer Portal is a mature, documented API. The only failure mode is a missing `stripe_customer_id` — handle with a guard and a fallback message.

**KPI:** Reduction in manual support interventions for billing. Upgrade conversion rate via portal (Stripe tracks this).

---

### 1.4 — Fix `createSchema` Missing 'business' Plan

**What it does:** Provisioning a Business-tier client via `POST /clients/provision` currently fails Zod validation because `createSchema` has `z.enum(['starter', 'pro', 'agency'])` — 'business' is absent.

**Codebase changes:**
- `server/src/routes/clients/index.ts` — change `z.enum(['starter', 'pro', 'agency'])` to `z.enum(['starter', 'pro', 'business', 'agency'])` in `createSchema`

**Dependencies:** None.

**Risk:** None. This is a one-line fix for a latent production bug.

---

### 1.5 — Call Volume Quota Enforcement

**What it does:** Counts calls per billing period per client. Shows a dashboard banner at 80% of quota. At 100%, surfaces a hard upgrade prompt. No calls are dropped — the gate is informational only at MVP.

**Codebase changes:**
- `src/pages/DashboardPage.tsx` — add a quota banner component. Query: `COUNT(*) FROM calls WHERE client_id = ? AND started_at >= billing_period_start`. Compare to plan limit from `PLANS` in `src/lib/plans.ts`. Show banner at ≥80%.
- `src/lib/plans.ts` — add `callLimit: number` to each `PlanConfig` entry (50 / 150 / 350 / 600).
- No backend enforcement at Phase 1 — informational only. Enforcement (blocking inbound) is Phase 3 scope.

**Dependencies:** `billing_period_start` derived from `subscription_current_period_start` on the client row (Stripe webhook populates this). Confirm field exists; if not, derive from `stripe_subscription_id` via Stripe API.

**Risk:** Low for the UI banner. Do not block calls at Phase 1 — an incorrect block would be worse than an overage.

**KPI:** Upgrade rate when banner is shown. Revenue uplift from tier upgrades.

---

### Phase 1 — Affected Files Summary

```
src/pages/CallsPage.tsx          — transcript expand, audio player
src/pages/SettingsPage.tsx       — config editing, billing portal button
src/pages/DashboardPage.tsx      — quota banner
src/lib/plans.ts                 — callLimit per plan
server/src/routes/clients/index.ts    — settingsUpdateSchema + PATCH handler
server/src/routes/billing/index.ts    — new: portal session endpoint
```

No new dependencies. No schema migrations.

### Phase 1 — Completion Status

| Item | Status | Completed |
|------|--------|-----------|
| 1.1 Call transcript + summary in Calls UI | ✅ DONE | 2026-06-06 |
| 1.2 Post-onboarding config editing (backend) | ✅ DONE | 2026-06-06 |
| 1.2 Post-onboarding config editing (frontend) | ✅ DONE | 2026-06-06 |
| 1.3 Stripe billing portal (backend) | ✅ DONE | 2026-06-06 |
| 1.3 Stripe billing portal (frontend) | ✅ DONE | 2026-06-06 |
| 1.4 Fix 'business' plan validation bug | ✅ DONE | 2026-06-06 |
| 1.5 Call volume quota banner | ✅ DONE | 2026-06-06 |

**Build results (2026-06-06):**
- Frontend: ✅ `npm run build` clean (24.6s, Sentry upload succeeded)
- Server: ✅ `npm run build:api` clean (tsc, no errors)
- Typecheck: ✅ no errors in changed files (5 pre-existing errors in `e2e/` and `TestCallPage.tsx` — all pre-existing, none introduced)

---

## Phase 2 — Strongest Differentiators
**Target: Weeks 4–10 | Goal: make the daily workflow faster; close the mobile gap**

### Outcomes
- Owner is notified meaningfully when a call is missed (not just "a call happened")
- Owner can act on a lead from their phone in under 10 seconds
- The dashboard shows revenue impact, not just call counts
- Repeat callers are surfaced so context isn't lost

---

### 2.1 — Missed Call Alert (Differentiated SMS)

**What it does:** When `outcome = 'no_answer'` or `outcome = 'voicemail'`, sends a distinct SMS with the caller's number prominent and a prompt to call back. Currently these outcomes use the same generic summary template.

**Codebase changes:**
- `server/src/services/retell.ts` — in `postCallWorkflow`, branch on outcome. For `no_answer` / `voicemail`: send new SMS template `"⚠️ Missed call [time] from [caller_number]. Worth a callback."`. Suppress if outcome is `spam`.
- `server/src/services/resend.ts` — update email template for missed calls to feature a `tel:` call-back link.

**Dependencies:** `caller_number` from `calls` table. Handle `null` (withheld numbers) gracefully.

**Risk:** Low. Extending existing `postCallWorkflow` logic. Watch Twilio SMS costs if spam calls trigger this — spam gate is the mitigation.

---

### 2.2 — In-Product Missed Revenue Card

**What it does:** Shows on the Dashboard: "You had N calls that didn't reach us this month. Estimated missed value: £X." Uses real call data, not a marketing calculator.

**Codebase changes:**
- `src/pages/DashboardPage.tsx` — new `MissedRevenueCard` component. Query: `COUNT(*) FROM calls WHERE outcome IN ('no_answer','voicemail') AND started_at >= [30 days ago]`. Multiply by `avg_job_value` from `business_config` (fallback: £250).
- `src/pages/SettingsPage.tsx` — add "Average job value" editable field so the estimate is personalised.
- `server/src/routes/clients/index.ts` — add `avg_job_value` to `settingsUpdateSchema` and PATCH handler.
- Migration: add `avg_job_value INTEGER DEFAULT 250` to `business_config`.

**Dependencies:** Phase 1 settings editing work provides the PATCH route pattern to follow.

**Risk:** Low. The number is an estimate — label it clearly. Do not call it "lost revenue"; call it "estimated missed value".

---

### 2.3 — Mobile PWA + Deep-Link SMS → Lead

**What it does:** Transforms the post-call SMS from a notification into a direct action. Owner taps the SMS → lands on that specific lead record with a "Call back" button.

**Codebase changes:**
- `server/src/services/retell.ts` — append `https://app.tradereceptionist.com/leads/{lead_id}` to the owner SMS. `lead.id` is available within `handleCallEnded` at time of SMS send.
- `src/pages/LeadsPage.tsx` — add URL-based lead selection: `?leadId=xxx` param opens and highlights that lead record. Add `<a href="tel:{caller_number}">Call back</a>` and `<a href="sms:{caller_number}?body=...">Message</a>` buttons on the expanded lead view.
- `public/manifest.json` — PWA manifest for installability (name, icons, start_url, display: standalone)
- `index.html` — add `<link rel="manifest">` and `<meta name="theme-color">`
- `vite.config.ts` — add `vite-plugin-pwa` (justified: core workflow dependency, not an animation library)

**Dependencies:** `lead.id` must be set before the SMS fires. Confirm order of operations in `handleCallEnded`.

**Risk:** Medium. Deep-link requires the user to be logged in; unauthenticated redirect to login → back to lead after auth. Handle via `?redirect=/leads?leadId=xxx` in the auth flow.

---

### 2.4 — Repeat Caller Recognition

**What it does:** If a call comes in from a number that matches an existing lead's `caller_number`, the call row in `CallsPage` shows "Returning caller — previously: [job_type], [date]".

**Codebase changes:**
- `src/pages/CallsPage.tsx` — in the call list query, LEFT JOIN `leads ON calls.caller_number = leads.caller_number` (where previous call). Show a "Returning" badge with the last job type and date.
- Alternatively: compute this server-side in a new `GET /calls` endpoint if the Supabase query becomes unwieldy.

**Dependencies:** Caller number must be stored on both `calls` and `leads`. Confirm both fields are populated; withheld numbers will not match.

**Risk:** Low. Read-only display logic.

---

### Phase 2 — Affected Files Summary

```
server/src/services/retell.ts         — missed call SMS branch, deep-link in SMS
src/pages/DashboardPage.tsx           — missed revenue card
src/pages/LeadsPage.tsx               — URL-based lead selection, call-back buttons
src/pages/CallsPage.tsx               — repeat caller badge
src/pages/SettingsPage.tsx            — avg_job_value field
public/manifest.json                  — new: PWA manifest
vite.config.ts                        — vite-plugin-pwa
supabase/migrations/                  — avg_job_value column on business_config
```

---

## Phase 3 — Moat-Building Additions
**Target: Weeks 11–18 | Goal: make leaving actively painful; deliver Business/Agency tier value**

### Outcomes
- Stale leads are automatically followed up — the product works without the owner remembering
- Calendar-aware AI fills the diary intelligently, not just opportunistically
- Business/Agency tiers deliver what the pricing page promises

---

### 3.1 — Automated Follow-Up SMS to Unconverted Leads (48h)

**What it does:** If a lead is created and has no associated booking after 48 hours, an automated SMS is sent to the caller: "Hi, it's [business_name]. Still looking for a [trade]? Give us a ring: [owner_mobile]."

**Codebase changes:**
- New `server/src/services/lead-followup.ts` — query `leads WHERE status = 'new' AND created_at < NOW() - INTERVAL '48 hours'` and no matching `bookings` row. Send SMS via Twilio. Mark lead with `followup_sent_at` to prevent repeats.
- New cron job or Supabase Edge Function to run the above every hour.
- Schema: add `followup_sent_at TIMESTAMPTZ` to `leads` table.
- `src/pages/LeadsPage.tsx` — show "Follow-up sent" badge on leads where `followup_sent_at` is set.

**Dependencies:** Twilio SMS working. `owner_mobile` populated on the client. Opt-out logic not required at MVP (B2B context, single follow-up only).

**Risk:** Medium. Cron reliability depends on hosting. Railway supports cron — wire it there. Test with a short interval in staging.

---

### 3.2 — Calendar-Aware Slot Prioritisation in AI Prompt

**What it does:** When the AI handles a booking call, it currently checks availability in real-time via `check_calendar_availability`. Extend `prompt-builder.ts` to inject the client's next 3 available half-days into the system prompt so the AI can proactively suggest slots rather than waiting to be asked.

**Codebase changes:**
- `server/src/lib/prompt-builder.ts` — add an async `fetchUpcomingSlots(clientId)` call. Inject the result as a "Your next available slots are: …" section in the BOOKING portion of the prompt. Only inject if Google Calendar is connected.
- `server/src/services/calendar.ts` — add `getNextAvailableSlots(clientId, count)` helper.
- `server/src/services/retell.ts` — `createRetellAgent` and `updateRetellLlmConfig` must await the new async prompt builder.

**Dependencies:** Google Calendar connected. OAuth token valid. Falls back gracefully (no injection) if calendar is disconnected.

**Risk:** Medium. Async prompt building adds latency to agent provisioning. Cache the fetched slots with a short TTL (15 minutes) to avoid blocking.

---

### 3.3 — Second Dashboard User / Team Access

**What it does:** Allows an Agency or Business subscriber to invite one additional user (admin/staff) to access the same client's dashboard. Delivers the "Shared team access" feature currently listed in the Business pricing tier.

**Codebase changes:**
- Schema: new `team_members` table (`id, client_id, email, role ENUM('owner','member'), invited_at, accepted_at`).
- `server/src/routes/` — new `POST /team/invite`, `POST /team/accept`, `DELETE /team/:id` routes.
- `src/pages/SettingsPage.tsx` — team members section (Business/Agency plans only, gated by `client.plan`).
- Auth guard in `App.tsx` and dashboard shell — resolve `client_id` from both owner and team member rows.

**Dependencies:** Resend email (invite email). Supabase RLS update for `team_members` table. Gate behind plan check — Starter/Pro show a locked state with upgrade CTA.

**Risk:** High. Multi-user auth is the highest-complexity item in the roadmap. Do not start until Phase 1 and Phase 2 are shipped and Business/Agency conversion data justifies it.

---

### 3.4 — Prompt Override Field in Settings (Power Users)

**What it does:** Exposes `business_config.system_prompt_override` as an editable textarea in Settings (Business/Agency plans). The field already exists in the schema and is already honoured by `prompt-builder.ts`. It is simply invisible to users.

**Codebase changes:**
- `src/pages/SettingsPage.tsx` — add an "Advanced: Custom AI instructions" textarea, visible only for Business/Agency plans.
- `server/src/routes/clients/index.ts` — add `system_prompt_override` to `settingsUpdateSchema`.

**Dependencies:** Phase 1 settings editing infrastructure.

**Risk:** Low. One text field, one schema key. Gated behind plan tier.

---

### Phase 3 — Affected Files Summary

```
server/src/services/lead-followup.ts  — new: automated follow-up cron logic
server/src/lib/prompt-builder.ts       — async slot injection
server/src/services/calendar.ts        — getNextAvailableSlots helper
server/src/routes/team/index.ts        — new: team invite/accept/remove
src/pages/SettingsPage.tsx             — team members panel, prompt override
supabase/migrations/                   — team_members table, followup_sent_at on leads
```

---

## What Is Not Being Built

The following were evaluated and removed from scope:

| Idea | Reason |
|---|---|
| Invoice / quote generation | Competes with Tradify, Jobber, ServiceM8. Not our lane. |
| Customer-facing self-serve booking portal | Removes the trust signal. Trades want to vet callers. |
| WhatsApp Business API integration | Expensive, Meta-dependent, already replaced by SMS. |
| Complex analytics dashboards | Trades need 3 numbers, not cohort charts. |
| Native iOS / Android app | PWA covers the use case. Dual codebase not justified. |
| CRM integrations (HubSpot, Salesforce) | Zero overlap with sole-trader tradesperson user base. |
| Parallel GPT-4o call summarisation | Retell `call_analyzed` already does this. Redundant cost. |
| Robocall / spam detection infrastructure | Prompt-level handling is sufficient. Cost doesn't justify build. |
| ElevenLabs custom voice | Low retention impact at current scale. Phase 4 if demand emerges. |
| Multi-number / multi-department routing | Highest implementation complexity in the codebase. Defer until Business tier conversion data justifies it. |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Retell recording URLs expire | Medium | Medium | Proxy through Supabase Storage in Phase 2 |
| `updateRetellLlmConfig` fails silently after settings save | Medium | High | Wrap in try/catch, surface error in UI, add Pino log |
| Stripe `stripe_customer_id` missing for some clients | Low | High | Guard in billing portal route; log and alert |
| PWA deep-link requires authenticated session | High | Medium | Redirect flow: `/login?redirect=/leads?leadId=x` |
| Follow-up SMS cron drift or double-fire | Medium | Medium | `followup_sent_at` idempotency guard |
| `avg_job_value` estimate misleads owners | Medium | Medium | Label clearly as "estimate", let owners override |

---

## Phase 1 — Recommended Scope for Next Sprint

**Build first: 1.1 (Call Transcript UI) + 1.2 (Post-Onboarding Config) + 1.3 (Stripe Billing Portal) + 1.4 (Fix Business Plan Bug)**

These four items share the same branch. They are all changes to files the team already owns, require no new dependencies, and close the most visible gaps in the current product.

**Branch name:** `feat/phase1-core-loop`

---

*Last updated: 2026-06-06*
