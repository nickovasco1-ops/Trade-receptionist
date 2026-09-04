# Health audit — standing rules

These govern every health run, every fix that comes out of one, and any agent or
person operating this system. They are not defaults to be weighed against
convenience; they are the terms on which the reports can be trusted at all.

---

## 1. Evidence, or it did not happen

**Never mark a check as passing because the code looks correct.** A pass
requires a command, its output, and its exit code, all recorded in the report.

**If a check cannot run, its status is BLOCKED, never PASS.** Fifteen honest
blocked checks are worth more than forty confident green ones.

This is enforced structurally in `tests/health/lib/check.mjs` — `finalise()`
downgrades any PASS lacking evidence to BLOCKED. Do not route around it. A run
in which *every* check is BLOCKED is treated as a failed run, because an
all-blocked run proves nothing.

Corollary, learned the hard way: **a test you have not watched fail is not a
test.** Before trusting any new check, run it against the unfixed code and see it
go red. Three separate safety nets in this repo were green for months while
executing nothing (catalogue C13).

## 2. Production data is read-only

**Never write to production data outside the designated seed test tenants.**

The only writable identities are:

- `health-tenant-a@health.tradereceptionist.test`
- `health-tenant-b@health.tradereceptionist.test`

`assertSeedTenant()` in `tests/health/lib/env.mjs` enforces this, and every
mutating helper goes through it. The server uses the service-role key and
bypasses RLS, so there is no database backstop — this rule is the only thing
standing between a health check and a customer's data.

## 3. Secrets

**Never touch secrets beyond reading whether a name exists.** Presence booleans
only, as `/health/integrations` returns them. Never print, log, copy or transmit
a value.

## 4. No structural changes

**Never run migrations, never alter schema, never rotate keys.**

If a check needs database catalog access it does not have, it reports BLOCKED.
That is the correct outcome, not an obstacle to engineer around. Two checks are
permanently BLOCKED for exactly this reason (`schema.union_vs_check`,
`schema.migrations_describe_production`) and they should stay that way until
someone decides, deliberately and outside the health system, to expose a
read-only SQL path.

## 5. Off-limits integrations

**Do not modify the Gemini TTS AudioPlayer or the Google Sheets Waitlist Modal
integrations.** `components/AudioPlayer.tsx` and `components/WaitlistModal.tsx`
work and are out of scope. Both have been misdescribed in project docs before —
verify against the file, and still do not change it.

## 6. How fixes ship

You may fix things, but:

- **only on a branch** — never a commit directly on `main`;
- **one concern per pull request** — a signature fix and a health system are two
  pull requests, not one;
- **every fix ships with the test that would have caught it**, and that test must
  be demonstrated failing against the unfixed code before it is trusted.

## 7. Lead with what is serious

When you find something serious, lead with it. **Do not bury a tenant data leak
underneath a bundle size warning.** The report sorts by status then severity for
this reason; any human summary must do the same.

## 8. The catalogue is the spine

**Update `.claude/health/FAILURE_CATALOG.md` whenever a genuinely new failure
class appears, and add the check in the same commit.** A class without a check
is a class that will recur — that is the entire lesson of the eight months of
history the catalogue is built from.

`meta.catalogue_present` enforces the other direction: every `C*` class in the
catalogue must be covered by at least one check, or the run fails.

---

## Why silence has to mean healthy

The stated requirement is that a daily report nobody reads is worthless, so
silence must mean healthy and that silence must be trustworthy.

That has **never been true in this repo before now**. Every automated safety net
built here has been dark at some point:

- `notification-health.yml` reported **success on all 20 of its last runs**
  while the notifications it checked were failing: Sentry logged 59 Twilio
  `21211` errors over the same period. It only failed on a non-2xx, and the
  endpoint returned 2xx regardless — so a broken pipeline read as green. It also
  fired a live SMS and email at a real tenant every run. Retired 2026-08-30 and
  folded into `providers.credentials_live`, which probes the provider itself.
  (Corrected 2026-08-31: this was first recorded as "red for 29 days". That was
  inferred from the Sentry errors and was wrong. Green-while-broken is the worse
  failure and the more important lesson.)
- `emergency.test.ts` was written against `bun:test` in a repo with no Bun: 44
  tests that had never once executed.
- The Playwright suite sat at 20 hard failures while excluded from CI.
- `server/package.json` used an unquoted `src/**/*.test.ts`, so nested test
  files silently never ran.

Green has historically meant "the check is broken", not "the system is fine". So
this system escalates on **critical and high failures only**, reports everything
else in the artifact, and refuses to call anything green that it did not
actually execute. If the daily job is quiet, that quiet is an assertion — and
`meta.no_workflow_failing_repeatedly` and `meta.test_suites_actually_run` exist
to keep it an honest one.
