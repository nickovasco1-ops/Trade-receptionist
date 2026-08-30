/**
 * Build and configuration integrity — catalogue C8 (deploy/config drift),
 * plus C13 (checks that silently run nothing).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { check, run, evidence, PASS, FAIL, BLOCKED, HIGH, MEDIUM, CRITICAL } from '../lib/check.mjs';
import { repoRoot, API_BASE } from '../lib/env.mjs';
import { httpProbe } from '../lib/check.mjs';

const BASELINE = path.join(repoRoot, '.claude/health/bundle-baseline.json');
const GROWTH_BUDGET = 0.10; // 10% growth in total gzipped JS before we complain

export default [
  check({
    id: 'build.typecheck', cls: 'C8', severity: HIGH,
    title: 'Web typecheck passes (tsc --noEmit)',
    fn: async () => {
      const ev = await run('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: repoRoot });
      return {
        status: ev.exitCode === 0 ? PASS : FAIL,
        evidence: ev,
        detail: ev.exitCode === 0 ? 'no type errors' : 'type errors present',
      };
    },
  }),

  check({
    id: 'build.server', cls: 'C8', severity: HIGH,
    title: 'Server builds (tsc)',
    fn: async () => {
      const ev = await run('npm', ['run', 'build:api'], { cwd: repoRoot });
      return { status: ev.exitCode === 0 ? PASS : FAIL, evidence: ev };
    },
  }),

  check({
    id: 'build.web', cls: 'C8', severity: HIGH,
    title: 'Production web build succeeds',
    fn: async () => {
      const ev = await run('npm', ['run', 'build'], { cwd: repoRoot });
      return { status: ev.exitCode === 0 ? PASS : FAIL, evidence: ev };
    },
  }),

  check({
    id: 'build.lint', cls: 'C8', severity: MEDIUM,
    title: 'Lint passes',
    fn: async () => {
      const pkg = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
      if (!pkg.scripts?.lint) {
        // Honest BLOCKED. Adding ESLint is a new dependency and needs the §11
        // justification, so this check refuses to invent a pass.
        return {
          status: BLOCKED,
          evidence: evidence('npm run lint', 'no "lint" script in package.json; no linter configured in this repo', 1),
          detail: 'No linter is configured. Not a failure — an absent capability. Adding ESLint needs a §11 dependency decision.',
        };
      }
      const ev = await run('npm', ['run', 'lint'], { cwd: repoRoot });
      return { status: ev.exitCode === 0 ? PASS : FAIL, evidence: ev };
    },
  }),

  check({
    id: 'build.bundle_size', cls: 'C8', severity: MEDIUM,
    title: 'Bundle size has not grown beyond budget vs last recorded value',
    fn: async () => {
      const dir = path.join(repoRoot, 'dist/assets');
      let files;
      try {
        files = (await fs.readdir(dir)).filter((f) => f.endsWith('.js'));
      } catch {
        return {
          status: BLOCKED,
          evidence: evidence(`ls ${dir}`, 'dist/assets missing — run the web build first', 1),
          detail: 'No build output to measure.',
        };
      }

      const { gzipSync } = await import('node:zlib');
      let total = 0;
      for (const f of files) total += gzipSync(await fs.readFile(path.join(dir, f))).length;

      let baseline = null;
      try { baseline = JSON.parse(await fs.readFile(BASELINE, 'utf8')); } catch { /* first run */ }

      const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
      const summary = `total gzipped JS: ${kb(total)} across ${files.length} chunks`;

      if (!baseline?.totalGzipBytes) {
        await fs.mkdir(path.dirname(BASELINE), { recursive: true });
        await fs.writeFile(BASELINE, JSON.stringify(
          { totalGzipBytes: total, chunks: files.length, recordedAt: new Date().toISOString() }, null, 2));
        return {
          status: BLOCKED,
          evidence: evidence('gzip dist/assets/*.js', `${summary}\nno previous baseline — recorded this run as the baseline`, 1),
          detail: 'First run: baseline recorded, nothing to compare against yet.',
        };
      }

      const delta = (total - baseline.totalGzipBytes) / baseline.totalGzipBytes;
      const pct = `${(delta * 100).toFixed(1)}%`;
      const out = `${summary}\nbaseline ${kb(baseline.totalGzipBytes)} (${baseline.recordedAt})\ndelta ${pct} (budget +${GROWTH_BUDGET * 100}%)`;

      if (delta > GROWTH_BUDGET) {
        return { status: FAIL, evidence: evidence('gzip dist/assets/*.js', out, 1), detail: `Bundle grew ${pct}.` };
      }
      // Ratchet down so shrinkage becomes the new baseline.
      if (total < baseline.totalGzipBytes) {
        await fs.writeFile(BASELINE, JSON.stringify(
          { totalGzipBytes: total, chunks: files.length, recordedAt: new Date().toISOString() }, null, 2));
      }
      return { status: PASS, evidence: evidence('gzip dist/assets/*.js', out, 0) };
    },
  }),

  check({
    id: 'config.env_referenced_vs_live', cls: 'C8', severity: CRITICAL,
    title: 'Every env var the server needs is configured in production',
    fn: async () => {
      // Extract what the code actually reads, then compare with what the live
      // API reports as configured. /health/integrations returns booleans only.
      const grep = await run('sh', ['-c',
        `grep -rhoE "process\\.env\\.[A-Z0-9_]+" ${repoRoot}/server/src | sed 's/process\\.env\\.//' | sort -u`]);
      const referenced = grep.output.split('\n').map((s) => s.trim()).filter(Boolean);

      const { res, ev } = await httpProbe(`${API_BASE}/health/integrations`, {}, `GET ${API_BASE}/health/integrations`);
      if (!res || !res.ok) {
        return { status: BLOCKED, evidence: ev, detail: 'Could not reach the production API to read configured integrations.' };
      }
      const live = JSON.parse(ev.output.split('\n').slice(1).join('\n'));

      // Map the booleans the endpoint exposes onto the env var names they represent.
      const COVERED = {
        SENTRY_DSN: live.sentry?.dsn,
        NOTION_API_KEY: live.notion?.api_key,
        STRIPE_SECRET_KEY: live.stripe?.secret_key,
        STRIPE_WEBHOOK_SECRET: live.stripe?.webhook_secret,
        RETELL_API_KEY: live.retell?.api_key,
        TWILIO_ACCOUNT_SID: live.twilio?.account_sid,
        TWILIO_AUTH_TOKEN: live.twilio?.auth_token,
        RESEND_API_KEY: live.resend?.api_key,
        GOOGLE_CLIENT_ID: live.google?.client_id,
        GOOGLE_CLIENT_SECRET: live.google?.client_secret,
      };

      const unset = Object.entries(COVERED).filter(([, v]) => v === false).map(([k]) => k);
      const unverifiable = referenced.filter((n) => !(n in COVERED));

      const out = [
        `env vars referenced in server/src: ${referenced.length}`,
        `verifiable via /health/integrations: ${Object.keys(COVERED).length}`,
        unset.length ? `UNSET IN PRODUCTION: ${unset.join(', ')}` : 'all verifiable vars are set',
        `not verifiable from here (${unverifiable.length}): ${unverifiable.join(', ') || 'none'}`,
      ].join('\n');

      if (unset.length) {
        return { status: FAIL, evidence: evidence(ev.command, out, 1), detail: `Unset in production: ${unset.join(', ')}` };
      }
      // Deliberately not a PASS: most referenced vars cannot be confirmed from
      // outside Vercel/Railway, and claiming otherwise would be the false green
      // this whole system exists to prevent.
      return {
        status: unverifiable.length ? BLOCKED : PASS,
        evidence: evidence(ev.command, out, unverifiable.length ? 1 : 0),
        detail: unverifiable.length
          ? `${unverifiable.length} referenced env vars are not exposed by /health/integrations and cannot be verified without Vercel/Railway API access.`
          : 'All referenced vars confirmed configured.',
      };
    },
  }),
];
