/**
 * Shipped content and code hygiene — catalogue C17 (unsubstantiated marketing
 * claims), C12 (time/timezone normalisation), C15 (stale chunks after deploy).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { check, run, evidence, PASS, FAIL, BLOCKED, HIGH, MEDIUM } from '../lib/check.mjs';
import { repoRoot } from '../lib/env.mjs';

/**
 * Claims that were removed for being unevidenced. DMCC Act 2024 gives the CMA
 * direct fining power to 10% of global turnover, so a regression here is a
 * legal exposure, not a copy nit. Regexes, because the exact wording drifts.
 */
const RETIRED_CLAIMS = [
  { re: /\bNo card required\b/i, why: 'false — every Payment Link is payment_method_collection=always' },
  { re: /\b98\.7\s*%/, why: 'fabricated answer rate; the DB holds 29 calls total' },
  { re: /\b500\+\s*(UK\s*)?trades/i, why: 'fabricated customer volume; the DB holds 5 clients' },
  { re: /Join\s+500\+/i, why: 'fabricated customer volume' },
  { re: /UK'?s\s+#1/i, why: 'unsubstantiable superlative' },
  { re: /Britain'?s\s+best/i, why: 'unsubstantiable superlative' },
  { re: /Powered by AI/i, why: 'banned by §1 voice rules' },
];

const CONTENT_GLOBS = ['App.tsx', 'index.html', 'components', 'src'];

export default [
  check({
    id: 'claims.no_retired_claims', cls: 'C17', severity: HIGH,
    title: 'No retired marketing claim has come back',
    fn: async () => {
      const found = [];
      const scanned = [];

      async function walk(p) {
        const stat = await fs.stat(p).catch(() => null);
        if (!stat) return;
        if (stat.isDirectory()) {
          for (const e of await fs.readdir(p)) {
            if (e === 'node_modules' || e.startsWith('.')) continue;
            await walk(path.join(p, e));
          }
          return;
        }
        if (!/\.(tsx?|html|md)$/.test(p)) return;
        const rel = path.relative(repoRoot, p);
        if (rel.startsWith('.claude/') || rel === 'CLAUDE.md') return; // documentation *about* the claims
        scanned.push(rel);
        const src = await fs.readFile(p, 'utf8');
        for (const c of RETIRED_CLAIMS) {
          const m = c.re.exec(src);
          if (m) found.push(`${rel}: "${m[0]}" — ${c.why}`);
        }
      }

      for (const g of CONTENT_GLOBS) await walk(path.join(repoRoot, g));

      return {
        status: found.length ? FAIL : PASS,
        evidence: evidence(`scan ${scanned.length} source files for ${RETIRED_CLAIMS.length} retired claims`,
          found.length ? found.join('\n') : 'none of the retired claims are present',
          found.length ? 1 : 0),
        detail: found.length ? `Retired claims are back in ${found.length} place(s).` : '',
      };
    },
  }),

  check({
    id: 'time.normalisation_tested', cls: 'C12', severity: MEDIUM,
    title: 'Time normalisation helpers have unit tests',
    fn: async () => {
      const lib = path.join(repoRoot, 'server/src/lib/time.ts');
      const spec = path.join(repoRoot, 'server/src/lib/time.test.ts');
      const hasLib = await fs.stat(lib).then(() => true).catch(() => false);
      const hasSpec = await fs.stat(spec).then(() => true).catch(() => false);

      if (!hasLib) {
        return { status: BLOCKED, evidence: evidence('stat server/src/lib/time.ts', 'file not found', 1) };
      }
      return {
        status: hasSpec ? PASS : FAIL,
        evidence: evidence('stat server/src/lib/time.test.ts',
          `time.ts present: ${hasLib}\ntime.test.ts present: ${hasSpec}`, hasSpec ? 0 : 1),
        detail: hasSpec ? '' :
          'normaliseHour() and the 00:00 sentinel caused five separate incidents (c84ac49, e34c108, 6dfb33b, 615b657, 7f443e5) and still have no unit tests.',
      };
    },
  }),

  check({
    id: 'frontend.chunk_error_recovery', cls: 'C15', severity: MEDIUM,
    title: 'The app recovers from a stale lazy-chunk after deploy',
    fn: async () => {
      // Two Sentry groups are "Failed to fetch dynamically imported module" on
      // the PartnerPage and Calculator chunks — a user mid-session hits a blank
      // route after a deploy. The fix is a reload-on-chunk-error handler.
      const grep = await run('sh', ['-c',
        `grep -rn "Failed to fetch dynamically imported module\\|chunkerror\\|ChunkLoadError\\|vite:preloadError" ${repoRoot}/index.tsx ${repoRoot}/src ${repoRoot}/App.tsx 2>/dev/null || true`]);
      const handled = grep.output.trim().length > 0;

      return {
        status: handled ? PASS : FAIL,
        evidence: evidence('grep for a dynamic-import failure handler',
          handled ? grep.output.trim() : 'no handler for vite:preloadError / dynamic import failure found',
          handled ? 0 : 1),
        detail: handled ? '' :
          'Sentry JAVASCRIPT-REACT-8/-9 show real users hitting this. A window listener for `vite:preloadError` that reloads once would close it.',
      };
    },
  }),
];
