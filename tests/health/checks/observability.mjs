/**
 * Whether we would actually find out — catalogue C13 (safety nets that go dark)
 * and C14 (PII in logs).
 *
 * C13 is the meta-class and the reason this system exists. Every automated
 * check this project has built has been broken at some point: a cron that
 * reported success for 20 consecutive runs while the notifications it checked
 * were failing, 44 unit tests written for a runner that was never installed, a
 * Playwright suite excluded from CI while 20 failures piled up.
 * If these checks pass, silence can be trusted. If they do not, nothing else in
 * this report can be.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { check, run, evidence, PASS, FAIL, BLOCKED, CRITICAL, HIGH } from '../lib/check.mjs';
import { repoRoot } from '../lib/env.mjs';

/** Fields that must never be written to a log or telemetry event verbatim. */
const PII_FIELDS = [
  'caller_number', 'callerNumber', 'owner_mobile', 'ownerMobile',
  'caller_name', 'callerName', 'postcode', 'address',
  'full_text', 'fullText', 'transcript', 'owner_email', 'ownerEmail',
];

export default [
  check({
    id: 'meta.no_workflow_failing_repeatedly', cls: 'C13', severity: CRITICAL,
    title: 'No scheduled workflow has been failing run after run',
    fn: async () => {
      // stdoutOnly: gh writes advisory notices to stderr, which would corrupt
      // the JSON and make this check BLOCKED for a cosmetic reason.
      const gh = await run('gh', ['run', 'list', '--limit', '60',
        '--json', 'name,conclusion,createdAt,event'], { stdoutOnly: true });
      if (gh.exitCode !== 0) {
        return { status: BLOCKED, evidence: gh, detail: 'gh CLI unavailable or unauthenticated.' };
      }

      let runs;
      try { runs = JSON.parse(gh.raw ?? gh.output); } catch { return { status: BLOCKED, evidence: gh, detail: 'unparseable gh output' }; }

      // Group by workflow, newest first, and count the leading failure streak.
      // The health workflows exit non-zero whenever they FIND something, so
      // judging them by their own exit code would flag a working check as a
      // broken one. Their health is the report, not the job status — and if the
      // job never got far enough to run this check, this check did not run either.
      const SELF = new Set(['Health (daily)', 'Health (deep)']);

      const byName = new Map();
      for (const r of runs) {
        if (SELF.has(r.name)) continue;
        if (r.conclusion === null) continue;   // still in progress — no verdict yet
        if (!byName.has(r.name)) byName.set(r.name, []);
        byName.get(r.name).push(r);
      }

      const lines = [];
      const rotten = [];
      for (const [name, list] of byName) {
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        let streak = 0;
        for (const r of list) {
          if (r.conclusion === 'failure') streak += 1;
          else if (r.conclusion === 'success') break;
          // cancelled/skipped are neither — keep walking.
        }
        lines.push(`${name}: latest=${list[0].conclusion}, consecutive failures=${streak}, runs seen=${list.length}`);
        if (streak >= 3) rotten.push(`${name} (${streak} consecutive failures)`);
      }

      return {
        status: rotten.length ? FAIL : PASS,
        evidence: evidence('gh run list --limit 60', lines.join('\n'), rotten.length ? 1 : 0),
        detail: rotten.length
          ? `Persistently failing, so its signal is being ignored: ${rotten.join('; ')}. A red check nobody acts on is worse than no check.`
          : 'No workflow is stuck failing.',
      };
    },
  }),

  check({
    id: 'meta.test_suites_actually_run', cls: 'C13', severity: CRITICAL,
    title: 'Test suites execute a non-zero number of tests',
    fn: async () => {
      // A suite that matches no files exits 0. That is how 44 unit tests sat
      // dormant for months, and how an unquoted `**` glob hid a whole
      // directory of new ones.
      const server = await run('npm', ['test', '--prefix', 'server'], { cwd: repoRoot });
      const m = /^ℹ tests (\d+)$/m.exec(server.output) ?? /tests (\d+)/.exec(server.output);
      const count = m ? Number(m[1]) : 0;

      const specs = await run('sh', ['-c', `ls ${repoRoot}/e2e/*.spec.ts | wc -l`]);
      const specCount = Number(specs.output.trim()) || 0;

      const out = [
        `server unit tests reported: ${count}`,
        `e2e spec files present: ${specCount}`,
        server.exitCode === 0 ? 'server suite exit 0' : `server suite exit ${server.exitCode}`,
      ].join('\n');

      const bad = count === 0 || specCount === 0 || server.exitCode !== 0;
      return {
        status: bad ? FAIL : PASS,
        evidence: evidence('npm test --prefix server', out, bad ? 1 : 0),
        detail: bad
          ? (count === 0 ? 'The server suite ran zero tests — it is matching no files.' : 'Server test suite failing.')
          : `${count} unit tests executed across ${specCount} e2e specs available.`,
      };
    },
  }),

  check({
    id: 'observability.no_pii_in_logs', cls: 'C14', severity: HIGH,
    title: 'No log or telemetry call passes raw PII',
    fn: async () => {
      // Static, so it catches a regression at review time rather than after a
      // caller's number is already sitting in Sentry.
      const grep = await run('sh', ['-c',
        `grep -rn "logEvent(\\|captureError(\\|Sentry.setUser(\\|setContext(" ${repoRoot}/server/src ${repoRoot}/src ${repoRoot}/index.tsx 2>/dev/null || true`]);

      const offenders = [];
      for (const line of grep.output.split('\n')) {
        if (!line.trim()) continue;
        for (const field of PII_FIELDS) {
          // Flag a bare field reference; masked/boolean forms are fine.
          const re = new RegExp(`\\b${field}\\b(?!\\s*:\\s*(Boolean|mask|hash))`);
          if (re.test(line) && !/hasPhone|Boolean\(|masked|\.length/.test(line)) {
            offenders.push(`${line.trim().slice(0, 180)}   ← ${field}`);
            break;
          }
        }
      }

      return {
        status: offenders.length ? FAIL : PASS,
        evidence: evidence('grep logEvent/captureError/Sentry context calls for PII fields',
          offenders.length ? offenders.join('\n') : `no raw PII in ${PII_FIELDS.length} checked field names`,
          offenders.length ? 1 : 0),
        detail: offenders.length
          ? `${offenders.length} log call(s) may carry PII. UK GDPR applies — caller numbers, names and addresses flow through this system continuously.`
          : '',
      };
    },
  }),

  check({
    id: 'meta.catalogue_present', cls: 'C13', severity: HIGH,
    title: 'The failure catalogue exists and every class has a check',
    fn: async () => {
      const cat = path.join(repoRoot, '.claude/health/FAILURE_CATALOG.md');
      let src;
      try { src = await fs.readFile(cat, 'utf8'); } catch {
        return {
          status: FAIL,
          evidence: evidence(`read ${path.relative(repoRoot, cat)}`, 'catalogue missing', 1),
          detail: 'The catalogue is the input to this whole system.',
        };
      }

      const classes = [...new Set([...src.matchAll(/^### (C\d+)/gm)].map((m) => m[1]))];

      // Load every check module and collect the classes they cover.
      const dir = path.join(repoRoot, 'tests/health/checks');
      const covered = new Set();
      for (const f of await fs.readdir(dir)) {
        if (!f.endsWith('.mjs')) continue;
        const mod = await import(path.join(dir, f));
        for (const c of mod.default ?? []) covered.add(c.cls);
      }

      const uncovered = classes.filter((c) => !covered.has(c));
      return {
        status: uncovered.length ? FAIL : PASS,
        evidence: evidence('cross-reference FAILURE_CATALOG.md against tests/health/checks/*.mjs',
          `catalogue classes: ${classes.join(', ')}\ncovered by checks: ${[...covered].sort().join(', ')}\nuncovered: ${uncovered.join(', ') || 'none'}`,
          uncovered.length ? 1 : 0),
        detail: uncovered.length
          ? `No check covers: ${uncovered.join(', ')}. Every catalogue row must have at least one automated check.`
          : `All ${classes.length} catalogue classes have at least one check.`,
      };
    },
  }),
];
