#!/usr/bin/env node
/**
 * Health-check runner.
 *
 *   node tests/health/runner.mjs --mode=daily   # fast, deterministic, no browser
 *   node tests/health/runner.mjs --mode=deep    # adds the Playwright journeys
 *
 * Writes reports/health/YYYY-MM-DD.{md,json} and exits non-zero **only** when a
 * critical or high check fails. That is the contract behind "silence means
 * healthy": a green run is an assertion that nothing escalating is wrong, and a
 * BLOCKED check is never counted as green.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalise, BLOCKED, FAIL, PASS, CRITICAL, HIGH } from './lib/check.mjs';
import { toMarkdown, toJson, summarise, sortResults } from './lib/report.mjs';
import { repoRoot } from './lib/env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const mode = (process.argv.find((a) => a.startsWith('--mode=')) ?? '--mode=daily').split('=')[1];
const onlyId = (process.argv.find((a) => a.startsWith('--only=')) ?? '').split('=')[1];

async function loadChecks() {
  const dir = path.join(here, 'checks');
  const out = [];
  for (const file of (await fs.readdir(dir)).sort()) {
    if (!file.endsWith('.mjs')) continue;
    const mod = await import(path.join(dir, file));
    for (const def of mod.default ?? []) out.push({ ...def, file });
  }
  return out;
}

async function main() {
  const startedAt = new Date().toISOString();
  const all = await loadChecks();

  const selected = all.filter((c) => {
    if (onlyId) return c.id === onlyId || c.cls === onlyId;
    return mode === 'deep' ? true : (c.mode ?? 'daily') === 'daily';
  });

  if (selected.length === 0) {
    console.error('No checks selected — refusing to report a healthy run on an empty set.');
    process.exit(1);
  }

  console.error(`health: running ${selected.length} checks in ${mode} mode\n`);
  const results = [];

  for (const def of selected) {
    process.stderr.write(`  ${def.id} … `);
    let raw;
    try {
      raw = await def.fn();
    } catch (err) {
      raw = {
        status: BLOCKED,
        evidence: { command: def.id, output: `check threw: ${err?.stack ?? err}`, exitCode: 1 },
        detail: `Check threw an exception: ${err?.message ?? err}`,
      };
    }
    const result = finalise(def, raw);
    results.push(result);
    process.stderr.write(`${result.status}\n`);
  }

  const finishedAt = new Date().toISOString();
  const summary = summarise(results);

  // A run where nothing could execute is itself a failure — that is precisely
  // how a check suite goes quietly dark (catalogue C13).
  if (summary.pass === 0 && summary.fail === 0) {
    console.error('\nEvery check was BLOCKED. Treating the run as failed: an all-blocked run proves nothing.');
  }

  const date = startedAt.slice(0, 10);
  const dir = path.join(repoRoot, 'reports/health');
  await fs.mkdir(dir, { recursive: true });
  const payload = { mode, startedAt, finishedAt, results };
  await fs.writeFile(path.join(dir, `${date}.md`), toMarkdown(payload));
  await fs.writeFile(path.join(dir, `${date}.json`), toJson(payload));

  // Console summary: serious things first.
  console.error('');
  for (const r of sortResults(results)) {
    if (r.status === PASS) continue;
    const tag = r.status === FAIL ? '🔴 FAIL' : '⛔ BLOCKED';
    console.error(`${tag}  [${r.severity}/${r.cls}] ${r.id} — ${r.detail || r.title}`);
  }
  console.error('');
  console.error(`health: ${summary.pass} pass, ${summary.fail} fail, ${summary.blocked} blocked (${summary.escalating} escalating)`);
  console.error(`health: report written to reports/health/${date}.md`);

  const allBlocked = summary.pass === 0 && summary.fail === 0;
  if (!summary.healthy || allBlocked) {
    // GitHub Actions surfaces this as an annotation and fails the job, which is
    // what reaches the owner by email.
    for (const r of results.filter((x) => x.status === FAIL && (x.severity === CRITICAL || x.severity === HIGH))) {
      console.error(`::error title=${r.id} (${r.cls})::${r.detail || r.title}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('health runner crashed:', err);
  process.exit(1);
});
