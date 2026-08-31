/**
 * Acknowledgements — a failure someone has decided about.
 *
 * The problem this solves: a real finding that the owner has seen and accepted
 * still fails the job every morning. Within a fortnight the daily email is
 * noise, and the moment it is noise the whole system is worthless — that is
 * catalogue C13 arriving by a different door.
 *
 * The problem it must not create: a snooze that quietly buries things. So:
 *
 *   1. An acknowledgement needs a reason and a review date. Both required.
 *   2. It covers **named entities only**. If a check starts complaining about
 *      something that is not on the list, it escalates again — an ack written
 *      for one tenant can never hide a second one.
 *   3. It lapses on its own. Past the review date it stops applying and the
 *      finding escalates, so nothing is accepted permanently by accident.
 *   4. Acknowledged findings stay in the report, in their own section, with the
 *      reason and the date they come back.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './env.mjs';
import { ACKNOWLEDGED, FAIL } from './check.mjs';

const FILE = path.join(repoRoot, '.claude/health/acknowledged.json');

export async function loadAcknowledgements() {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.acknowledgements) ? parsed.acknowledgements : [];
  } catch {
    return [];
  }
}

function isExpired(ack, now) {
  const review = Date.parse(`${ack.reviewOn}T00:00:00Z`);
  return !Number.isFinite(review) || now >= review;
}

/**
 * Apply acknowledgements to a finished result set. Returns the results with
 * statuses adjusted, plus notes for the report.
 */
export function applyAcknowledgements(results, acks, now = Date.now()) {
  const lapsed = [];

  const adjusted = results.map((r) => {
    if (r.status !== FAIL) return r;

    const ack = acks.find((a) => a.check === r.id);
    if (!ack) return r;

    // A malformed acknowledgement must never suppress anything.
    if (!ack.reason || !ack.reviewOn || !Array.isArray(ack.entities)) return r;

    if (isExpired(ack, now)) {
      lapsed.push({ check: r.id, reviewOn: ack.reviewOn });
      return { ...r, detail: `${r.detail} — acknowledgement lapsed on ${ack.reviewOn} and was not renewed.` };
    }

    // Every entity the check is complaining about must be covered. One new
    // name and this is a plain failure again.
    const uncovered = (r.entities ?? []).filter((e) => !ack.entities.includes(e));
    if (uncovered.length > 0) {
      return {
        ...r,
        detail: `${r.detail} — NOT acknowledged: ${uncovered.join(', ')} ${uncovered.length === 1 ? 'is' : 'are'} not covered by the existing acknowledgement.`,
      };
    }

    return {
      ...r,
      status: ACKNOWLEDGED,
      ack: { reason: ack.reason, reviewOn: ack.reviewOn, by: ack.by ?? 'unrecorded' },
    };
  });

  return { results: adjusted, lapsed };
}
