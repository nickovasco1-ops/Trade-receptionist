/**
 * Report emitters. Markdown for humans, JSON for machines.
 *
 * The ordering rule is deliberate: **lead with what is serious.** A tenant data
 * leak must never appear below a bundle-size warning.
 */
import { PASS, FAIL, BLOCKED, CRITICAL, HIGH, MEDIUM, LOW } from './check.mjs';

const SEVERITY_RANK = { [CRITICAL]: 0, [HIGH]: 1, [MEDIUM]: 2, [LOW]: 3 };
const STATUS_RANK = { [FAIL]: 0, [BLOCKED]: 1, [PASS]: 2 };
const ICON = { [PASS]: '✅', [FAIL]: '🔴', [BLOCKED]: '⛔' };

export function sortResults(results) {
  return [...results].sort((a, b) =>
    (STATUS_RANK[a.status] - STATUS_RANK[b.status])
    || (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    || a.id.localeCompare(b.id));
}

export function summarise(results) {
  const by = (s) => results.filter((r) => r.status === s);
  const escalating = by(FAIL).filter((r) => r.severity === CRITICAL || r.severity === HIGH);
  return {
    total: results.length,
    pass: by(PASS).length,
    fail: by(FAIL).length,
    blocked: by(BLOCKED).length,
    escalating: escalating.length,
    healthy: escalating.length === 0,
  };
}

export function toJson({ mode, startedAt, finishedAt, results }) {
  return JSON.stringify({
    mode,
    startedAt,
    finishedAt,
    summary: summarise(results),
    results: sortResults(results).map((r) => ({
      id: r.id, class: r.cls, title: r.title, severity: r.severity, status: r.status,
      detail: r.detail, command: r.evidence.command, exitCode: r.evidence.exitCode,
      output: r.evidence.output,
    })),
  }, null, 2);
}

export function toMarkdown({ mode, startedAt, finishedAt, results }) {
  const s = summarise(results);
  const sorted = sortResults(results);
  const escalating = sorted.filter((r) => r.status === FAIL && (r.severity === CRITICAL || r.severity === HIGH));
  const otherFails = sorted.filter((r) => r.status === FAIL && !escalating.includes(r));
  const blocked = sorted.filter((r) => r.status === BLOCKED);
  const passed = sorted.filter((r) => r.status === PASS);

  const out = [];
  const date = startedAt.slice(0, 10);

  out.push(`# Health report — ${date}`);
  out.push('');
  out.push(`**Mode:** \`${mode}\` · **Started:** ${startedAt} · **Duration:** ${
    Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000)}s`);
  out.push('');
  out.push(s.healthy
    ? `## ✅ Healthy — ${s.pass} passed, ${s.blocked} blocked, ${s.fail} failed (none escalating)`
    : `## 🔴 ${s.escalating} escalating failure${s.escalating === 1 ? '' : 's'}`);
  out.push('');

  if (escalating.length) {
    out.push('### Act on these');
    out.push('');
    for (const r of escalating) {
      out.push(`#### 🔴 ${r.title}`);
      out.push(`\`${r.id}\` · **${r.severity}** · catalogue **${r.cls}**`);
      out.push('');
      if (r.detail) out.push(`${r.detail}`);
      out.push('');
      out.push('```');
      out.push(`$ ${r.evidence.command}`);
      out.push(r.evidence.output || '(no output)');
      out.push(`exit ${r.evidence.exitCode}`);
      out.push('```');
      out.push('');
    }
  }

  out.push('### All checks');
  out.push('');
  out.push('| | Check | Class | Severity | Detail |');
  out.push('|---|---|---|---|---|');
  for (const r of sorted) {
    const detail = (r.detail || '').replace(/\|/g, '\\|').slice(0, 200);
    out.push(`| ${ICON[r.status]} | \`${r.id}\` ${r.title} | ${r.cls} | ${r.severity} | ${detail} |`);
  }
  out.push('');

  if (blocked.length) {
    out.push('### Blocked — could not run, so not counted as passing');
    out.push('');
    for (const r of blocked) {
      out.push(`- **\`${r.id}\`** (${r.cls}) — ${r.detail || 'no reason recorded'}`);
    }
    out.push('');
  }

  if (otherFails.length) {
    out.push('### Lower-severity failures');
    out.push('');
    for (const r of otherFails) out.push(`- **\`${r.id}\`** (${r.cls}, ${r.severity}) — ${r.detail}`);
    out.push('');
  }

  out.push('<details><summary>Evidence for passing checks</summary>');
  out.push('');
  for (const r of passed) {
    out.push(`**\`${r.id}\`** — \`${r.evidence.command}\` → exit ${r.evidence.exitCode}`);
    out.push('');
    out.push('```');
    out.push((r.evidence.output || '(no output)').slice(0, 1500));
    out.push('```');
    out.push('');
  }
  out.push('</details>');
  out.push('');
  out.push('---');
  out.push('');
  out.push('*A PASS in this report always carries a command, its output and its exit code. A check that could not run is BLOCKED, never PASS.*');

  return out.join('\n');
}
