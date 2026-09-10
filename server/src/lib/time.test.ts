import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseHour } from './time';

/**
 * normaliseHour() is four lines and has caused five separate incidents
 * (c84ac49, e34c108, 6dfb33b, 615b657, 7f443e5). Both of its jobs are easy to
 * undo by accident: stripping Postgres' seconds, and treating '00:00' as "not
 * set" rather than as midnight. Its two consumers — prompt-builder and
 * slot-cache — both put the result in front of a live caller, so a regression
 * is heard before it is seen.
 */
describe('normaliseHour', () => {
  test('strips seconds from a Postgres time value', () => {
    assert.equal(normaliseHour('08:00:00'), '08:00');
    assert.equal(normaliseHour('18:30:00'), '18:30');
    assert.equal(normaliseHour('23:59:59'), '23:59');
  });

  test('passes an already-normalised HH:MM through unchanged', () => {
    assert.equal(normaliseHour('08:00'), '08:00');
    assert.equal(normaliseHour('17:45'), '17:45');
  });

  test("treats '00:00' as the unset sentinel, not as midnight", () => {
    // This is the whole point of the helper. A tenant with no closing time set
    // must not be told the business shuts at midnight.
    assert.equal(normaliseHour('00:00'), null);
    assert.equal(normaliseHour('00:00:00'), null);
  });

  test('does not mistake other midnight-adjacent times for the sentinel', () => {
    assert.equal(normaliseHour('00:01'), '00:01');
    assert.equal(normaliseHour('00:30:00'), '00:30');
    assert.equal(normaliseHour('10:00:00'), '10:00');
  });

  test('returns null for every absent value', () => {
    assert.equal(normaliseHour(null), null);
    assert.equal(normaliseHour(undefined), null);
    assert.equal(normaliseHour(''), null);
  });

  test('never returns a string longer than HH:MM', () => {
    for (const raw of ['08:00:00.000', '08:00:00+01', '08:00:00Z']) {
      assert.equal(normaliseHour(raw), '08:00');
    }
  });
});
