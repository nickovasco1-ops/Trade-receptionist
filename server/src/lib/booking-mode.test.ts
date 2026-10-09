import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { takesLiveBookings } from './booking-mode';

/**
 * 2026-10-09: Orrell Park Heating Solutions has a Google diary connected but
 * wants to ring every caller back to confirm a time himself.
 */
describe('takesLiveBookings', () => {
  test('a connected diary books live by default', () => {
    assert.equal(takesLiveBookings(true, {}), true);
    assert.equal(takesLiveBookings(true, { callback_only: false }), true);
  });

  test('callback_only turns live booking off even with a diary connected', () => {
    assert.equal(takesLiveBookings(true, { callback_only: true }), false);
  });

  test('no diary, no live booking', () => {
    assert.equal(takesLiveBookings(false, {}), false);
    assert.equal(takesLiveBookings(false, { callback_only: true }), false);
  });
});

describe('the prompt and the tools agree', () => {
  const read = (p: string): string => readFileSync(resolve(__dirname, p), 'utf8');

  test('prompt-builder decides the booking section with takesLiveBookings', () => {
    const src = read('./prompt-builder.ts');
    assert.match(src, /const hasCalendar\s*=\s*takesLiveBookings\(/);
    assert.match(src, /config\.callback_only === true/);
  });

  test('rebuilds attach the booking tools only when takesLiveBookings says so', () => {
    const src = read('../services/retell.ts');
    const body = src.slice(src.indexOf('export async function updateAgentConfiguration('));
    const fn = body.slice(0, body.indexOf('\n}\n'));
    assert.doesNotMatch(fn, /calendarBookingEnabled: calendarIsConnected\(client\)/);
    assert.doesNotMatch(fn, /calendarIsConnected\(client\), beginMessage/);
    assert.match(body, /calendarBookingEnabled: takesLiveBookings\(/);
    assert.match(body, /updateRetellLlmConfig\(llmId, prompt, transferNumberFor\(client\), liveBooking, beginMessage\)/);
  });
});
