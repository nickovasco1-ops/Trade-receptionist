# Phase 1 — Completion Summary

> Completed: 2026-06-06
> Goal: Close the core loop — make the product feel finished to existing users

---

## What shipped

### 1.1 — Call Transcript + Summary in Calls UI
**File:** `src/pages/CallsPage.tsx`

Every call row in the Calls page is now expandable. Clicking a row reveals:
- The AI-generated call summary from `transcripts.summary`
- An inline HTML5 `<audio controls>` player for the recording (replaces the external link)
- A null guard: "No transcript available for this call." when summary is absent

Works on both mobile (card layout) and desktop (table layout). Chevron icon indicates expanded state. No new dependencies.

---

### 1.2 — Post-Onboarding Config Editing
**Files:** `server/src/routes/clients/index.ts`, `src/pages/SettingsPage.tsx`

Users can now edit all fields that were collected at onboarding but previously locked after setup:

**Backend (`PATCH /clients/:id/settings`):**
- Extended `settingsSchema` with: `receptionist_name`, `receptionist_tone` (friendly/professional/efficient), `services` (string[]), `service_areas` (string[]), `business_hours_start` (HH:MM), `business_hours_end` (HH:MM), `working_days` (number[])
- Uses `configFieldsPatch` object pattern — only fields explicitly provided are updated, no clobber
- Retell `updateAgentConfiguration` is called after DB write to re-push the system prompt
- Full rollback on any failure: Retell failure → restore previous `business_config`

**Frontend (Settings page):**
- New **Receptionist profile** section: name input + 3-button tone toggle (Friendly / Professional / Efficient) with contextual hint text
- New **Services and coverage** section: textarea for services (one per line) + textarea for service areas (one per line)
- New **Working hours** section: Opens/Closes time pickers + Mon–Sun day toggle buttons
- All new fields are disabled when `configLoaded = false` (safe guard against partial load)
- `handleSave` extended to include all new fields in the PATCH body

---

### 1.3 — Stripe Billing Portal Link
**Files:** `server/src/routes/billing/index.ts` (new), `server/src/index.ts`, `src/pages/SettingsPage.tsx`

**Backend:**
- New `POST /billing/portal-session` endpoint
- Auth: Bearer token → `supabase.auth.getUser()` → client lookup → `stripe_customer_id`
- Calls Stripe REST API directly (no SDK — consistent with existing codebase pattern)
- Returns `{ success: true, data: { url: string } }`
- Guards: missing token → 401, missing `stripe_customer_id` → 400 with user-friendly message, Stripe error → 502
- `return_url` derived from `req.headers.origin` with production fallback
- Rate-limited to `writeLimiter` (20 req/min)

**Frontend:**
- "Manage billing" button in Settings sidebar
- `portalLoading` state prevents double-clicks
- On success: `window.location.href = json.data.url` (Stripe-hosted portal)
- Errors surfaced in `actionError` banner

---

### 1.4 — Fix 'business' Plan Validation Bug
**File:** `server/src/routes/clients/index.ts`

`createSchema` and `provisionSchema` both had `z.enum(['starter', 'pro', 'agency'])` — the `'business'` tier was missing, silently failing provisioning for Business-plan clients.

Fixed in both schemas: `z.enum(['starter', 'pro', 'business', 'agency'])`.

---

### 1.5 — Call Volume Quota Banner
**Files:** `src/lib/plans.ts`, `src/pages/DashboardPage.tsx`

**`plans.ts`:** Added `callLimit: number` to `PlanConfig` interface and each plan entry (50 / 150 / 350 / 600).

**Dashboard banner:**
- Third parallel Supabase query on load: `COUNT(*) FROM calls WHERE client_id = ? AND started_at >= 30 days ago`
- At 80–99% of limit: accent-coloured informational banner ("You've used N of L calls in the last 30 days. Consider upgrading.")
- At 100%+: orange urgent banner ("You've reached your call limit. Upgrade to keep your receptionist answering calls.")
- Both states include a link to `/settings`
- Uses rolling 30-day window (no dependency on `subscription_current_period_start` which does not exist in the DB schema)

---

## Build verification

```
npm run build        ✅ clean — 24.6s, Sentry upload succeeded
npm run build:api    ✅ clean — tsc, zero errors
npx tsc --noEmit     ✅ zero errors in changed files
                        5 pre-existing errors in e2e/ + TestCallPage.tsx (unchanged)
```

---

## What is NOT in Phase 1

- No call blocking at quota (informational only — enforcement is Phase 3)
- No transcript full-text (`full_text` column) — summary only
- No recording proxy / signed URL (Retell URLs shown directly — V2 concern)
- No missed revenue card (Phase 2)
- No mobile PWA / deep-link SMS (Phase 2)

---

## Open items (from previous sessions, still unactioned)

| Item | Where | Action needed |
|------|-------|---------------|
| `STRIPE_SECRET_KEY` (live) | Railway env vars | Set manually in Railway dashboard |
| `VITE_CRISP_WEBSITE_ID` | Vercel env vars | Set in Vercel dashboard |
| Business hours SQL update | Supabase | Run SQL for client `b50957a3-bb48-41f9-8002-b2c10f59731b` |
| Supabase Service Role JWT rotation | Security | GitGuardian flag — rotate key |
| 4-minute call cap | Retell dashboard | Set max duration per agent config |
| SMS number verification | .env / Twilio | Verify `TWILIO_WHATSAPP_NUMBER` is a UK long code |
| Stripe Customer Portal config | Stripe dashboard | Enable portal in Products → Customer portal before billing endpoint goes live |
