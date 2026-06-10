# Trade Receptionist — Launch Day Checklist

**Launch date:** TBD (after live call verification)  
**Status:** ✅ Code ready | ⏳ Manual verification needed | 📋 Launch prep

---

## Pre-Launch Verification (Day Before)

### Live Call Test
- [ ] Make a real call to `+44 7728 407580`
- [ ] Receptionist answers in 1–2 rings
- [ ] Ask to book a job for "Tuesday afternoon"
- [ ] Receptionist offers real calendar slots
- [ ] Booking appears in dashboard within 2 minutes
- [ ] Email summary arrives with booking details

**If any step fails:** Email code immediately, do not proceed to launch.

### Production Environment Check
- [ ] Railway: All required env vars present
  - `RETELL_API_KEY` ✅
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` ✅
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ✅
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ✅
  - `CORS_ORIGINS` ✅
- [ ] Sentry: Error tracking armed (check for test call events)
- [ ] Vercel: Analytics firing on page loads
- [ ] Email: Test welcome email received and renders properly

---

## Clean Up Test Artifacts

- [ ] Delete test trial account (`nickosuji21@gmail.com` / `nickovasco+test` in Supabase)
- [ ] Release test Twilio number (`+447728407580` is your production number — keep it)
- [ ] Archive test call records (optional — mark `is_test=true` or delete from `calls` table)
- [ ] Clear any debug logs from Railway dashboard

---

## Launch Day (Go-Live)

### Communications Ready
- [ ] **FAQ published** → link on website footer or support page
  - Location: `docs/FAQ.md` (or live on web)
  - Covers: divert codes, calendar, billing, troubleshooting
  
- [ ] **Onboarding guide ready** → send to early users
  - Location: `docs/ONBOARDING.md`
  - Includes: 5-minute quick start, step-by-step setup
  
- [ ] **Support email staffed**
  - Email: `hello@tradereceptionist.com`
  - Auto-responder: Set up (see `SUPPORT_TEMPLATES.md`)
  - Response templates: Saved and ready to use
  
- [ ] **Email address monitored**
  - Daily check for new support requests
  - First response within 24 hours
  - Escalation path clear

### Marketing & Outreach
- [ ] Landing page live and tested
- [ ] Pricing page up
- [ ] "Start Free Trial" CTA working (Stripe checkout)
- [ ] Welcome email template tested (goes out after sign-up)
- [ ] Dashboard onboarding flow tested (login → profile setup → calendar → ready)

### Dashboard Stability
- [ ] Dashboard loads without errors
- [ ] Calls tab shows test call
- [ ] Leads tab shows test lead with full details
- [ ] Settings page works (profile, calendar, billing)
- [ ] Can create and view web call tests

### API Stability
- [ ] Webhook endpoints responding (test via curl)
- [ ] Call creation working (Retell → Railway → Supabase)
- [ ] Calendar tool returning slots
- [ ] Booking tool creating calendar events
- [ ] No 5xx errors in Sentry in the last hour

---

## 24 Hours After Launch

### Monitor
- [ ] Watch Sentry for errors (none expected)
- [ ] Check Railway logs for any issues
- [ ] Review Vercel analytics — is traffic coming in?
- [ ] Confirm any support emails are answered

### Real Calls
- [ ] Monitor first real calls (they should appear in Retell + Supabase)
- [ ] Check lead quality (are details captured correctly?)
- [ ] Verify SMS/email summaries are being sent
- [ ] Test a full flow again (call → lead → booking)

### Support
- [ ] Answer any early support requests
- [ ] Note common issues (for improvement backlog)
- [ ] Confirm divert code is working for customers

---

## Week 1 Iterations

### Daily
- [ ] Check support email (respond within 24h)
- [ ] Monitor Sentry for new error patterns
- [ ] Spot-check 1–2 real calls for quality

### Friday
- [ ] Review the week: calls, leads, issues
- [ ] Prioritize fixes for next sprint
- [ ] Update FAQ if new questions came up

### Known Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Calendar not syncing | Users can't book | Auto-test in dashboard; support template ready |
| Divert code fails | Calls don't reach receptionist | Tested in pre-launch; support escalation ready |
| Webhook delays | Leads don't appear in dashboard | Async processing (2–3 min); documented |
| High error rate | Users can't use product | Sentry alert active; escalation contact ready |
| Support overwhelm | Can't respond within 24h | Response templates ready; prioritize divert issues |

---

## Post-Launch (First Month)

### Monitoring
- [ ] Set up dashboards for: call volume, lead quality, errors, response time
- [ ] Weekly Sentry review (fix high-impact bugs immediately)
- [ ] Monthly performance audit (LCP, CLS, API latency)

### Customer Success
- [ ] Reach out to early users after 3 days (check-in)
- [ ] Gather feedback at day 7 (what's working, what's not?)
- [ ] Spot early churn signals (low call volume = disengagement)

### Backlog
- [ ] Issues found in week 1 → prioritize fixes
- [ ] Feature requests → capture, evaluate, roadmap
- [ ] Support patterns → update FAQ / templates

---

## Docs & Resources

**For you:**
- `FAQ.md` — Common issues and answers
- `ONBOARDING.md` — New user setup guide (send to early users)
- `SUPPORT_TEMPLATES.md` — Copy-paste responses for common issues
- `LAUNCH_CHECKLIST.md` — This file

**For customers:**
- Website FAQ link (point to `FAQ.md`)
- Welcome email includes link to `ONBOARDING.md`
- Support email in footer

**For developers:**
- CLAUDE.md — Constitution (system design, design tokens, code standards)
- README.md — Getting started for dev setup
- `.env.example` — Required env vars

---

## Go / No-Go Decision

**GO if:**
- ✅ Live call test passed
- ✅ All env vars in Railway
- ✅ No critical Sentry errors
- ✅ Welcome email working
- ✅ Dashboard stable
- ✅ Support plan ready (templates + email monitored)

**NO-GO if:**
- ❌ Any live call test fails
- ❌ Calendar integration broken
- ❌ Missing env vars
- ❌ Sentry showing 5xx errors
- ❌ Support email not staffed

---

## Contacts & Escalation

| Issue | Owner | Escalate To |
|-------|-------|------------|
| Technical (code, API) | You | Retell support (API issues) / Railway support (infra) |
| Calendar integration | You | Google Cloud support |
| Billing / Stripe | You | Stripe dashboard / support |
| Customer support | You | (you're handling it) |
| Can't reach you | You | Set auto-responder |

---

## Notes

- This checklist assumes you're the sole founder/operator for the first month
- As you grow, delegate: customer support first, then ops, then product
- Keep this checklist in the repo — update it after launch with real learnings

**Good luck. 🚀**

---

**Last updated:** June 6, 2026  
**Status:** Ready to verify and launch
