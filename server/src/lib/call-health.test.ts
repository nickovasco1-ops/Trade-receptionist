import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ALERT_COOLDOWN_MS,
  buildDailyReport,
  classifyDisconnection,
  shouldAlert,
  summariseLine,
} from './call-health';
import type { CalendarSweepReport } from '../services/calendar';

/**
 * 2026-09-28: Retell's payment lapsed and every call was rejected with
 * disconnection_reason 'no_valid_payment'. Nothing read it.
 */
describe('classifyDisconnection', () => {
  test('a lapsed payment is a fault that stops every call', () => {
    assert.equal(classifyDisconnection('no_valid_payment')?.tone, 'bad');
  });

  test('normal endings never alert', () => {
    for (const r of ['user_hangup', 'agent_hangup', 'voicemail_reached', 'inactivity', 'call_transfer', 'transfer_bridged', 'marked_as_spam']) {
      assert.equal(classifyDisconnection(r), null, r);
    }
  });

  test('missing or unknown reasons never alert', () => {
    assert.equal(classifyDisconnection(undefined), null);
    assert.equal(classifyDisconnection(''), null);
    assert.equal(classifyDisconnection('something_new'), null);
  });
});

describe('shouldAlert', () => {
  test('one alert per reason per hour, so an outage is one email', () => {
    const sent = new Map<string, number>();
    const t0 = 1_000_000;
    assert.equal(shouldAlert('no_valid_payment', t0, sent), true);
    assert.equal(shouldAlert('no_valid_payment', t0 + 60_000, sent), false);
    assert.equal(shouldAlert('sip_routing_error', t0 + 60_000, sent), true);
    assert.equal(shouldAlert('no_valid_payment', t0 + ALERT_COOLDOWN_MS, sent), true);
  });
});

describe('summariseLine', () => {
  const since = 1_000;
  test('counts only the window, and only platform faults as failures', () => {
    const line = summariseLine('TAPS', [
      { start_timestamp: 500, disconnection_reason: 'no_valid_payment' },   // before the window
      { start_timestamp: 2_000, disconnection_reason: 'user_hangup' },
      { start_timestamp: 3_000, disconnection_reason: 'no_valid_payment' },
      { start_timestamp: 4_000, disconnection_reason: 'no_valid_payment' },
    ], since);
    assert.equal(line.calls, 3);
    assert.deepEqual(line.faults, { no_valid_payment: 2 });
  });
});

function calendars(rows: CalendarSweepReport['rows']): CalendarSweepReport {
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return {
    checkedAt: '2026-09-29T05:30:00Z',
    tenantsChecked: rows.length,
    ok: count('ok'),
    needsReconnect: count('needs_reconnect'),
    providerErrors: count('provider_error'),
    notConnected: count('not_connected'),
    rows,
  };
}

const row = (businessName: string, status: CalendarSweepReport['rows'][number]['status'], provider = 'google') =>
  ({ clientId: businessName, businessName, ownerEmail: 'x@example.com', provider, status });

describe('buildDailyReport', () => {
  test('all healthy says so in the subject — silence is never the signal', () => {
    const r = buildDailyReport(
      calendars([row('TAPS', 'ok')]),
      [{ businessName: 'TAPS', calls: 4, faults: {} }],
      '29 Sept',
    );
    assert.equal(r.tone, 'good');
    assert.match(r.subject, /all lines and diaries working/);
    assert.match(r.facts[0][1], /4 calls in 24h/);
    assert.match(r.facts[0][1], /Google — working/);
  });

  test('failed calls and a dead diary lead the subject, with what to do', () => {
    const r = buildDailyReport(
      calendars([row('TAPS', 'needs_reconnect'), row('Derbyshire', 'not_connected', 'none')]),
      [
        { businessName: 'TAPS', calls: 3, faults: { no_valid_payment: 3 } },
        { businessName: 'Derbyshire', calls: 0, faults: {} },
      ],
      '29 Sept',
    );
    assert.equal(r.tone, 'bad');
    assert.match(r.subject, /3 calls failed/);
    assert.match(r.subject, /1 diary dead/);
    assert.match(r.action ?? '', /Retell dashboard → Billing/);
    assert.match(r.facts[1][1], /not connected/);
  });

  test('a line that could not be checked is never reported as quiet', () => {
    const r = buildDailyReport(
      calendars([row('TAPS', 'ok')]),
      [{ businessName: 'TAPS', calls: 0, faults: {}, error: 'Retell 500' }],
      '29 Sept',
    );
    assert.equal(r.tone, 'warn');
    assert.match(r.subject, /1 line not checked/);
    assert.doesNotMatch(r.facts[0][1], /0 calls/);
  });

  test('tenant names are escaped before they reach the email', () => {
    const r = buildDailyReport(calendars([row('<b>Evil</b>', 'ok')]), [], '29 Sept');
    assert.equal(r.facts[0][0], '&lt;b&gt;Evil&lt;/b&gt;');
  });
});

describe('the webhook reads the reason', () => {
  // The regression itself: the reason arrived on every failed call and was dropped.
  test('call_ended checks disconnection_reason before anything can return early', () => {
    const source = readFileSync(resolve(__dirname, '../routes/webhooks/retell.ts'), 'utf8');
    const handler = source.slice(source.indexOf('async function handleCallEnded'));
    const firstAwait = handler.indexOf('await ');
    const alertAt = handler.indexOf('alertOnLineFault(event)');
    assert.ok(alertAt > -1, 'handleCallEnded must call alertOnLineFault');
    assert.ok(alertAt < firstAwait, 'the fault check must run before the tenant lookup can return early');
  });
});
