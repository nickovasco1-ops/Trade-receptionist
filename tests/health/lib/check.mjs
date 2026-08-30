/**
 * Health-check primitives.
 *
 * The governing rule: **a pass requires a command, its output, and its exit
 * code.** A check that cannot run is BLOCKED, never PASS. That is enforced
 * structurally in `finalise()` rather than left to the author of each check —
 * this codebase's recurring failure mode (catalogue C13) is checks that report
 * green because they never actually ran.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const PASS = 'PASS';
export const FAIL = 'FAIL';
export const BLOCKED = 'BLOCKED';

export const CRITICAL = 'critical';
export const HIGH = 'high';
export const MEDIUM = 'medium';
export const LOW = 'low';

/** Severities that escalate. Everything else lands in the report only. */
export const ESCALATES = new Set([CRITICAL, HIGH]);

const MAX_OUTPUT = 4000;

function truncate(text) {
  const s = String(text ?? '').trim();
  return s.length > MAX_OUTPUT ? `${s.slice(0, MAX_OUTPUT)}\n… [truncated ${s.length - MAX_OUTPUT} chars]` : s;
}

/**
 * Run a shell command, capturing stdout+stderr and the real exit code.
 * Never throws — a non-zero exit is data, not an exception.
 */
export async function run(command, args = [], opts = {}) {
  const printable = [command, ...args].join(' ');
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: opts.cwd ?? process.cwd(),
      timeout: opts.timeout ?? 300_000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, ...(opts.env ?? {}) },
    });
    const combined = opts.stdoutOnly ? stdout : `${stdout}${stderr}`;
    // `raw` is untruncated: callers that parse JSON must not be defeated by
    // the display cap. `output` stays truncated for the report.
    return { command: printable, output: truncate(combined), raw: combined, exitCode: 0 };
  } catch (err) {
    const combined = `${err.stdout ?? ''}${err.stderr ?? ''}${err.message ?? ''}`;
    return {
      command: printable,
      output: truncate(combined),
      raw: combined,
      exitCode: typeof err.code === 'number' ? err.code : 1,
    };
  }
}

/**
 * Evidence for a non-shell operation (SQL, HTTP, SDK call). Still carries a
 * command string and an exit code so the report format stays uniform and a
 * reader can see exactly what was done.
 */
export function evidence(command, output, exitCode = 0) {
  return { command, output: truncate(typeof output === 'string' ? output : JSON.stringify(output, null, 2)), exitCode };
}

/**
 * Declare a check. `fn` returns { status, evidence, detail } or throws.
 * A throw becomes BLOCKED with the error recorded — never a silent pass.
 */
export function check({ id, cls, title, severity = MEDIUM, mode = 'daily', fn }) {
  return { id, cls, title, severity, mode, fn };
}

/** Structural guarantee: PASS without real evidence is downgraded to BLOCKED. */
export function finalise(def, result) {
  const base = { id: def.id, cls: def.cls, title: def.title, severity: def.severity };

  if (!result || typeof result !== 'object') {
    return { ...base, status: BLOCKED, detail: 'check returned nothing', evidence: evidence('(none)', '', 1) };
  }

  const ev = result.evidence;
  const hasEvidence = ev && typeof ev.command === 'string' && ev.command.length > 0
    && typeof ev.exitCode === 'number';

  if (result.status === PASS && !hasEvidence) {
    return {
      ...base,
      status: BLOCKED,
      detail: `${result.detail ?? ''} (downgraded: a PASS must record a command, its output and its exit code)`.trim(),
      evidence: evidence('(none)', '', 1),
    };
  }

  return {
    ...base,
    status: result.status,
    detail: result.detail ?? '',
    evidence: hasEvidence ? ev : evidence('(none)', '', 1),
  };
}

/** Fetch returning evidence rather than throwing. */
export async function httpProbe(url, init = {}, label) {
  const method = init.method ?? 'GET';
  const command = label ?? `${method} ${url}`;
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeoutMs ?? 20_000) });
    const body = await res.text();
    // `body` is returned untruncated alongside the display-capped evidence:
    // callers that parse JSON must never be defeated by the display cap.
    return { res, body, ev: evidence(command, `HTTP ${res.status}\n${body.slice(0, 1200)}`, res.ok ? 0 : 1) };
  } catch (err) {
    return { res: null, body: '', ev: evidence(command, `request failed: ${err.message}`, 1) };
  }
}
