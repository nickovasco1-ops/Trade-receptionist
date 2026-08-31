# Failure Catalogue — Trade Receptionist

**Built:** 2026-08-30 · **Phase 0 output** · Evidence-only. No class in this file is
inferred from "things that usually go wrong with web apps" — every row cites commits,
Sentry issue IDs, migration filenames, live database state, or file:line in this repo.

Ranked by **recurrence × blast radius**. Recurrence counts distinct shipped incidents,
not commits (one incident often took five commits to fix). Blast radius is measured in
customer impact, not lines of code.

---

## Evidence sources — what was actually available

| # | Source | Status | Yield |
|---|---|---|---|
| 1 | `git log` fix/bug/revert/broken/fail/crash/regress | ✅ Mined | 176 commits total, **75 matching** |
| 2 | Reverts (`--grep=revert`) | ✅ Mined | Exactly **1** (`9e06a79`) |
| 3 | Sentry MCP, 90 days | ✅ Mined | 10 unresolved issues, top group 143 events |
| 4 | Supabase migrations 001–018 | ✅ Mined, all 18 read in date order | 4 are pure regression fixes |
| 5 | Live DB state (`pg_policies`, row counts) | ✅ Queried read-only | **Found drift not visible in any file** |
| 6 | Repo grep: TODO/FIXME/HACK/XXX/WORKAROUND/"for now"/"temporary"/"known issue" | ⚠️ Mined, **near-empty** | 6 hits, 0 substantive |
| 7 | `gh pr list --state merged --limit 200` | ⚠️ Mined, **near-empty** | **1 PR ever** |
| 8 | `gh issue list --state all --limit 200` | ⚠️ Mined, **empty** | **0 issues ever** |
| 9 | Test inventory | ✅ Mined | 70 e2e tests / 11 specs, 44 unit tests / 1 file |
| 10 | `docs/BUGS.md` | ✅ Read in full | BUG-001…BUG-004 with root causes |
| 11 | Stripe MCP | ❌ **UNAVAILABLE** | Connector not authorised in this session |

### Stated gaps — read these before trusting any count below

1. **Git history is ~8 months, not 18.** First commit `2026-01-06`, HEAD `2026-08-30`.
   The requested 18-month window does not exist. All "recurrence" figures are
   floors over 8 months, not 18.
2. **There is no code-review or issue-tracking evidence.** One merged PR
   (`#2`, a UI redesign) and zero issues, ever. Everything ships directly to `main`.
   Failure evidence therefore lives *only* in commit messages, Sentry, and the DB —
   there is no discussion record of anything that was caught *before* shipping.
   This is itself a finding (see **C16**).
3. **The in-code warning grep contributed nothing.** 6 hits, all benign UI copy
   ("Skip for now") or a doc-link. This codebase leaves no TODO breadcrumbs, so the
   absence of markers is *not* evidence of absence of debt.
4. **Sentry `TRADE-RECEPTIONIST-API-B` is excluded.** It is `integrity.check_complete`
   from instrumentation I added earlier today. It is not historical failure evidence
   and is not counted anywhere in this file.
5. **The live call path is largely unexercised.** 29 calls total, **none since
   2026-07-03** (58 days). Exactly **1 booking has ever been created from a call**
   (2026-06-06). Traffic cannot confirm or refute whether the mid-call booking path
   works today — see **C2b**, which is flagged as *unverified*, not *broken*.
6. **Coverage is skewed to the browser.** 70 of 114 automated tests drive the UI.
   The provisioning pipeline, the Retell service layer, and the money path have
   **no unit tests at all**.

---

## Ranked failure classes

### C1 — Third-party API contract drift (Retell) 🔴
| | |
|---|---|
| **Recurrence** | **11 incidents** — the single largest class in the repo |
| **Blast radius** | Total. Provisioning fails, or numbers route nowhere, or the agent hangs up. Customer pays and gets silence. |
| **Files / services** | `server/src/services/retell.ts`, `server/src/lib/prompt-builder.ts`, `server/src/routes/webhooks/retell.ts` |
| **Evidence** | `7f07a31` (bogus `/v2/` prefix on all endpoints) · `4cd191e` (`eleven_turbo_v2` voice_model incompatible) · `3f3bcec` (`end_call_after_silence_ms` below Retell's minimum) · `d0a05a0` (transfer tool → `bridge_transfer`) · `5f89438` + `03e7cd5` + `7aa6140` (list-calls: wrong path, wrong filter shape, wrong response shape — three consecutive attempts) · `0321bfb` (v2 nested webhook payload) · `5524e62` + `8d4e26f` (`begin_message` silently ignored at agent level, must be set on the LLM) · `dcae61f` (2026-08-30: `inbound_agent_id` removed by Retell's **dated deprecation of 2026-03-31**, every number import hard-failed) · `retell.ts:440` carries the deprecation URL |
| **Why it recurs** | Retell ships breaking changes on a schedule. A working provisioning path rots **with no code change on our side**. Several of these failed *silently* — the API returned 2xx and simply ignored the field. |
| **Deterministically checkable?** | **Yes.** Assert our stored agent/number config round-trips through Retell's live API and matches what we sent. |

### C2 — Webhook signature verification wrong, or failing open 🔴
| | |
|---|---|
| **Recurrence** | **4 historical incidents + 2 defects live in `main` right now** |
| **Blast radius** | Historically: every call silently dropped from launch. Currently: **an unauthenticated internet caller can trigger money-spending provisioning.** |
| **Files** | `server/src/routes/webhooks/stripe.ts:661`, `server/src/routes/retell-tools/index.ts:24`, `server/src/routes/webhooks/retell.ts:30` |
| **Evidence** | `0677c26` (made Retell fail *open* when secret unset) · `5707e06` (trim + lowercase attempt) · `4233cf1` (**definitive**: Retell signs `HMAC(body+timestamp)` as `v=…,d=…`, not a plain body HMAC — every webhook had been rejected since launch) · `docs/BUGS.md` BUG-002a |
| **Status** | Retell's webhook route is now **fixed and fails closed** (`retell.ts:32` `if (!secret) return false`). Two defects remain: |

**C2a — Stripe webhook accepted unsigned requests. FIXED 2026-08-30** (branch
`fix/stripe-webhook-signature-fail-closed`; verifier extracted to
`stripe-signature.ts`, 11 unit tests + 2 e2e tests, replay window added).
Recorded here because the *class* stays open — see C13. Original defect:**
`stripe.ts:661` reads `if (secret && sigHeader && !verifyStripeSignature(...)) return;`
Verification is skipped when the secret is unset **and also when the caller simply
omits the `stripe-signature` header**. `/webhooks/stripe` is mounted publicly
(`index.ts:155`) behind only a 300/min rate limiter. A forged
`checkout.session.completed` therefore reaches `provisionClient()`, which **buys a UK
Twilio number (real money), creates a Retell agent, and creates a Supabase auth user
for an attacker-chosen email address.** `verifyStripeSignature` also has **no timestamp
tolerance check**, so a captured genuine webhook can be replayed indefinitely.

**C2b — `retell-tools` used the algorithm BUG-002a proved wrong. CONFIRMED, then FIXED 2026-08-30** (PR #4). No longer a suspicion: a probe signed with `retell-sdk` against production returned `401 Invalid Retell signature`, and Retell's custom-function docs confirm the `v=,d=` scheme applies to tool URLs. **Every mid-call availability check and booking was rejected from 2026-05-21 to 2026-08-30** — the agent could never read a diary or book a job on a real call. Corroborated by the database: the only call-linked booking in the entire history is a synthetic `auto_test_*` row. Original defect:
`retell-tools/index.ts:26` computes `HMAC-SHA256(rawBody)` and compares it to the
raw header. That is precisely the scheme `4233cf1` replaced in the webhook route
after it rejected 100% of traffic. If Retell signs custom function calls the same way
it signs webhooks, **every mid-call `check-availability` and `create-booking` returns
401** and the agent can never book. This was flagged for verification rather than asserted;
verification confirmed it.

### C3 — Provisioning fails part-way, silently, after the customer has paid 🔴
| | |
|---|---|
| **Recurrence** | **5+ incidents**, incl. one reported by a paying customer 2026-08-30 |
| **Blast radius** | Maximum. Customer is charged; receives no account, no number, no email; nothing alerts us. |
| **Files** | `server/src/routes/webhooks/stripe.ts` (`provisionClient()`), `server/src/routes/clients/index.ts` |
| **Evidence** | Sentry `TRADE-RECEPTIONIST-API-A` `stripe.webhook.db_persistence_failed` · Steve / R L Rattray incident (2026-08-30, £159 refunded, manual rebuild) · `467338c` (numbers provisioned with no SIP trunk attach → callers heard "incorrect number") · `71729d9` (number purchase made optional) · migration `018` |
| **Why it recurs** | Provisioning spans Stripe → Supabase → Retell → Twilio with **no transaction and no rollback** in the webhook path. Stripe already has its 200, so there is no retry. `provisionClient()` logs and `return`s. |
| **Deterministically checkable?** | **Yes** — this is what `server/src/services/tenant-integrity.ts` already does. Needs to run on a schedule and escalate. |

### C4 — TypeScript union widened without the matching Postgres CHECK 🔴
| | |
|---|---|
| **Recurrence** | **2 confirmed**, one of which took a paying customer to detect |
| **Blast radius** | Silent insert failure on the money path. Invisible to `tsc`. |
| **Evidence** | `018_clients_plan_business_tier.sql` — the four-tier scheme shipped in `shared/types.ts`, `src/lib/plans.ts` and `PRODUCT_TO_PLAN`, but `clients_plan_check` still allowed only `starter\|pro\|agency`. **Every £159 Business checkout failed** from the day four tiers shipped until 2026-08-30 · `017_escalation_routing.sql` — same shape, `leads_status_check` widened for `flagged_for_review` · related: `e9d2238`, `99ee237` (Stripe product→plan map drift) |
| **Deterministically checkable?** | **Yes.** Extract every union in `shared/types.ts` that maps to a constrained column, diff against `pg_constraint`. |

### C5 — Production schema is not what the migrations describe 🟠
| | |
|---|---|
| **Recurrence** | Systemic — found today, present across **all 6 tables** |
| **Blast radius** | Any environment rebuilt from `supabase/migrations/` differs from production. RLS behaviour cannot be reasoned about from the repo. |
| **Evidence** | Live `pg_policies` query 2026-08-30: **36 policies in production, 8 in migrations.** Three overlapping naming generations coexist (`clients: owner can read own row` from `004`, plus `clients_owner`, plus `clients_select_own`). `bookings` has 4 live policies and **zero** in any migration file. |
| **Severity note** | **No policy is permissive.** Every one is owner-scoped on `owner_email = auth.jwt() ->> 'email'`; the `{public}`-role ones still deny anonymous callers because `auth.jwt()` is NULL. The drift is real; the exposure is not. |
| **Deterministically checkable?** | **Yes.** Snapshot `pg_policies` + `pg_constraint` and fail on unexplained diff. |

### C6 — RLS enabled with no policy → silent empty reads 🟠
| | |
|---|---|
| **Recurrence** | 1 confirmed shipped, undetected **for months** |
| **Blast radius** | Customer-visible: the product looks empty and broken, with no error anywhere. |
| **Evidence** | `015_transcripts_rls.sql`: "*Transcripts had RLS ENABLED (002) but no SELECT policy was ever created, so the dashboard received zero transcript rows on every join. Call summaries never appeared on the Calls page.*" |
| **Why it's insidious** | RLS-with-no-policy denies silently. There is no error — just zero rows. Neither `tsc` nor an integration test that asserts "no crash" catches it. |
| **Deterministically checkable?** | **Yes** — and it must be a *behavioural* check (read as a real tenant), not a config check. |

### C7 — Call data not persisting / dashboard shows nothing 🟠
| | |
|---|---|
| **Recurrence** | **7 incidents** |
| **Blast radius** | The customer's entire product surface appears empty. |
| **Evidence** | `3acfff7` ("3 root causes") · `0321bfb` (v2 nested payload) · `0546070` (calls going missing → sync cron) · `6581e90` (recordings unplayable, transcripts invisible) · `9a94ee3` + `e5efded` (BUG-004: PostgREST returns a UNIQUE-FK embed as an **object**, code indexed it `[0]`) · `70a0e63` (`data-animate` left on dashboard page roots pinned **all content at `opacity:0`**) · BUG-002b (`call_ended` overwrote `started_at` with null) |
| **Live residue** | 1 of 29 calls still has `started_at IS NULL`; 7 of 29 have no `recording_url`. |
| **Deterministically checkable?** | **Yes** — replay a captured webhook and assert rows land with non-null required fields. |

### C8 — Deploy / config / environment drift 🟠
| | |
|---|---|
| **Recurrence** | **8 incidents** |
| **Blast radius** | Whole-service outage or a silently non-functional integration. |
| **Evidence** | `accab85` (Railway URL in `vercel.json`, Node version) · `f7fa0e0` (Railway proxy + node runtime) · `b7354c5` (Vercel publish config + broken gitlink) · `6c70640` (restart retries 3→10, healthcheck 30s→60s) · `9e06a79` (**the only revert**: `sleepApplication` is not a valid Railway field) · `6dfb33b` (Railway sleep loop) · `d575963` (root manifest clobbered by a Remotion scaffold) · `5212d1b` (Vercel build warnings + SPA routing) |
| **Standing hazards** | **Two `railway.json` files with different build commands, healthcheck timeouts and restart policies** — which one applies depends on the Railway dashboard root-dir setting. `STRIPE_SECRET_KEY_LIVE` is in local `.env` but **not in Railway**. |
| **Deterministically checkable?** | **Partly.** Env-var *presence* in Vercel/Railway is checkable; which `railway.json` is authoritative is not readable from the repo and must be recorded manually. |

### C9 — Provider credentials expire and degrade silently 🟠
| | |
|---|---|
| **Recurrence** | 3 distinct providers, **208 Sentry events** |
| **Blast radius** | Notifications stop. The call still works, so nothing looks broken — the tradesperson simply never hears about the lead. |
| **Evidence** | `TRADE-RECEPTIONIST-API-3` `post_call.provider_failure` — **143 occurrences since 2026-06-11**, extra data `provider: resend, error: "Resend failed 401"` · `API-9` Resend 401 (6) · `API-2` Twilio `21211` invalid To number (**59 events**) · `API-5` Notion (2) |
| **Note** | The Resend 401 ran for **~11 weeks** before being fixed today. Nothing escalated it. |
| **Deterministically checkable?** | **Yes.** Authenticated no-op call per provider; assert 2xx. |

### C10 — Auth / routing / redirect breakage 🟡
| | |
|---|---|
| **Recurrence** | **6 incidents** |
| **Blast radius** | Users locked out of their own account, or bounced mid-onboarding. |
| **Evidence** | `012_normalize_owner_email_lowercase.sql` (a capitalised email at Stripe checkout broke case-sensitive RLS and **locked the owner out of read *and* write on their own row**) · `1aaec73` · `dadf81c` (auth deep-link redirects) · `054b8e2` (Settings route + Google OAuth redirect) · `823d450` (Log in button unwired) · `aa4b6ac` (`RedirectPreservingQuery` — a bare `<Navigate>` dropped the query string) |
| **Deterministically checkable?** | **Yes** — Playwright journeys, incl. a mixed-case signup email. |

### C11 — The data plane shipped with no authorisation 🔴
| | |
|---|---|
| **Recurrence** | 1 incident, but **live in production for months** |
| **Blast radius** | Cross-tenant data disclosure of every customer's email, mobile and Stripe IDs; open money-spending endpoints. |
| **Evidence** | `dcae61f` (2026-08-30) created `server/src/middleware/auth.ts`. Until then `GET /clients` returned **every tenant** and `GET /calls` returned **every call**, unauthenticated on the public internet; `DELETE /clients/:id`, `/provision` and `/:id/assign-number` were open, the last two able to **buy Twilio numbers**. |
| **Why nobody noticed** | The dashboard reads Supabase directly under RLS, so these routes had no visible consumer — they were never exercised by the UI. |
| **Standing hazard** | The server uses the **service-role key and bypasses RLS entirely**. There is **no default-deny and no database backstop**: a new route on `/clients` or `/calls` is world-readable until someone remembers to add a guard. |
| **Deterministically checkable?** | **Yes.** Enumerate every mounted route, probe unauthenticated, assert 401/404. |

### C12 — Time, timezone and format normalisation 🟡
| | |
|---|---|
| **Recurrence** | **5 incidents** |
| **Blast radius** | Wrong availability offered to callers; settings silently un-saveable. |
| **Evidence** | `c84ac49` (Postgres `HH:MM:SS` vs `HH:MM`; `00:00` as an "unset" sentinel) · `e34c108` (midnight end-of-day in availability) · `6dfb33b` (business-hours re-save bug) · `615b657` (`normaliseHour` dedup) · `7f443e5` |
| **Deterministically checkable?** | **Yes** — unit tests on `server/src/lib/time.ts`, which currently has none. |

### C13 — Automated checks that fail forever and are ignored 🔴
| | |
|---|---|
| **Recurrence** | **3 confirmed** — every automated safety net this project has built has been dark at some point |
| **Blast radius** | Meta. Determines whether *any* other row in this catalogue gets caught. |
| **Evidence** | `.github/workflows/notification-health.yml` reported **success on all 20 of its last runs while the notifications it checked were failing** — Sentry logged 59 Twilio `21211` errors over the same window (`API-2`). It only failed on a non-2xx and the endpoint returned 2xx regardless (*corrected 2026-08-31: first recorded here as "red for 29 days", which was inferred from the Sentry errors and was wrong — green-while-broken is the worse failure*) · `server/src/lib/emergency.test.ts` was written against `bun:test` in a repo with no Bun — **44 tests that had never once executed** until ported to `node:test` on 2026-08-30 · the Playwright suite had **20 hard failures** and was excluded from CI until `aa4b6ac` |
| **Direct implication for Phase 2** | The stated requirement — *"silence has to mean healthy and I have to be able to trust that"* — has **never held true in this repo**. A green/silent signal here has historically meant "the check is broken", not "the system is fine". Any runner built in Phase 2 must prove it can still fail, and BLOCKED must never render as silence. |

### C14 — PII leaking into logs and telemetry 🟠
| | |
|---|---|
| **Recurrence** | 1 fixed; surface still live |
| **Blast radius** | UK GDPR. Caller phone numbers, names and addresses flow through this system continuously. |
| **Evidence** | `0520ed1` "stop attaching PII to frontend Sentry events" · Sentry `API-2` currently stores caller numbers as `+44770090XXXX` — that masking is **Sentry-side scrubbing, not ours** |
| **Deterministically checkable?** | **Yes.** Drive a synthetic call and assert no E.164 number, caller name or postcode appears in application log output. |

### C15 — Stale frontend chunks after deploy 🟡
| | |
|---|---|
| **Recurrence** | 2 Sentry groups |
| **Blast radius** | A user mid-session hits a blank route after a deploy. |
| **Evidence** | `JAVASCRIPT-REACT-9`, `JAVASCRIPT-REACT-8` — "Failed to fetch dynamically imported module" on the `PartnerPage` and `Calculator` lazy chunks |
| **Deterministically checkable?** | **Partly.** Detectable as a console-error assertion in the Playwright journeys; the fix (reload-on-chunk-error) is a code change, not a check. |

### C16 — Stripe lifecycle state drifts from Stripe 🟠
| | |
|---|---|
| **Recurrence** | 4 tenants affected out of 5 |
| **Blast radius** | Churned customers keep being served; a genuine payer was mislabelled `trialing`. Revenue and access both wrong. |
| **Evidence** | Found 2026-08-30 via `tenant-integrity.ts`: three churned customers still had `is_active: true`. `customer.subscription.deleted` never landed. **No reconciliation job exists** — `clients.subscription_status` is not self-healing. |
| **Deterministically checkable?** | **Yes** — already implemented in `tenant-integrity.ts` (`billing_drift`, `churned_still_active`); needs scheduling. |

### C18 — Provisioned but inert: paying for silence 🔴
| | |
|---|---|
| **Recurrence** | **2 of 2 real customers**, found 2026-08-31 |
| **Blast radius** | Total, and invisible. The customer pays, receives nothing, and churns without telling you why. Every other check in this suite passes while it happens. |
| **Files / services** | `src/pages/OnboardingPage.tsx` (no calendar step exists), `server/src/services/retell.ts` (`buildRetellTools` gates calendar tools on `google_cal_id`), carrier divert activation |
| **Evidence** | **Derbyshire Renewables**: `active` and paying since 2026-07-02, **zero calls in 59 days**. Their number passed every integrity check — on the SIP trunk, imported into Retell, bound to the correct agent · **Neither paying tenant has `google_cal_id` set**, so `calendarBookingEnabled` is false and the booking tools are never attached to their agent · all 29 calls, 13 leads and 4 bookings in the database belong to `Vasco's Plumbing`, the owner's own tenant — **no real customer call has ever been handled** · the onboarding wizard's six steps are receptionist, business, services, hours, contact, ready: **it never asks for a calendar**, so a customer only gets one by happening to sign in with Google |
| **Why it is invisible** | `onboarding_complete` means "walked the wizard", not "has a working product", and it is the only completion signal the dashboard has. A tenant can be fully provisioned, fully green on integrity, and completely inert. |
| **Deterministically checkable?** | **Yes** — `activation.tenants_receive_calls` and `activation.booking_is_possible`. |

### C17 — Unsubstantiated marketing claims 🟡
| | |
|---|---|
| **Recurrence** | 2 sweeps, 11+ individual claims |
| **Blast radius** | Legal, not technical. DMCC Act 2024 gives the CMA direct fining power (to 10% of global turnover) since April 2025. |
| **Evidence** | `fd10612` / `4e799c6` — removed "500+ tradespeople" (DB held 7 clients, 0 paying), "98.7% answer rate" ×3 (DB held 29 calls), "UK's #1"; corrected **"No card required", which was false and shipped in 7 places** including the checkout modal itself, while every Payment Link is `payment_method_collection=always` |
| **Still outstanding** | `PAIN_STATS` and `ROI_STATS` in `App.tsx` carry "27% of callers never ring back" and "3 in 5 jobs go to whoever answers first" — **both uncited**, per CLAUDE.md §1.1 |
| **Deterministically checkable?** | **Partly.** A regex denylist of retired claims is deterministic. Judging a *new* claim's substantiation is not — that belongs in `health:deep`. |

---

## What is NOT deterministically checkable

Stated plainly, per the Phase 1 instruction to say so rather than write a check that always passes:

- **C2b** — whether Retell signs custom function calls with the webhook scheme. Requires a real signed request from Retell or a documentation citation. Until then the Phase 1 check can only assert *our* implementation matches the SDK's, not that Retell agrees.
- **C8, `railway.json`** — which of the two files is authoritative is a Railway dashboard setting, not repo state.
- **C17, new claims** — substantiation is a judgement call.
- **C1, future deprecations** — we can detect drift after Retell ships it, never before.

## Coverage summary

| Class | Severity | Recurrence | Deterministic check possible? |
|---|---|---|---|
| **C18 Provisioned but inert** | 🔴 | **2 of 2 customers** | Yes |
| C1 Retell contract drift | 🔴 | 11 | Yes |
| C2 Webhook signature / fail-open | 🔴 | 4 + **2 live** | Yes (C2b partial) |
| C3 Silent partial provisioning | 🔴 | 5 | Yes (already built) |
| C4 TS union vs Postgres CHECK | 🔴 | 2 | Yes |
| C11 Unauthenticated data plane | 🔴 | 1 (months live) | Yes |
| C13 Health checks dark | 🔴 | 3 | Yes |
| C5 Schema drift vs migrations | 🟠 | systemic | Yes |
| C6 RLS enabled, no policy | 🟠 | 1 | Yes (behavioural) |
| C7 Data not persisting | 🟠 | 7 | Yes |
| C8 Deploy / config drift | 🟠 | 8 | Partial |
| C9 Provider creds silently dead | 🟠 | 3 providers / 208 events | Yes |
| C14 PII in logs | 🟠 | 1 | Yes |
| C16 Stripe lifecycle drift | 🟠 | 4 of 5 tenants | Yes (already built) |
| C10 Auth / routing | 🟡 | 6 | Yes |
| C12 Time / timezone | 🟡 | 5 | Yes |
| C15 Stale chunks | 🟡 | 2 | Partial |
| C17 Marketing claims | 🟡 | 11+ | Partial |

**18 classes. 7 critical.** C2a (PR #3) and C2b (PR #4) both confirmed and fixed on 2026-08-30.

**C18 is the one that matters most right now**, and it is the only class here that no amount of code correctness would have prevented. The plumbing is right; nobody is using it.
