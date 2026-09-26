import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CalendarAuthError,
  GOOGLE_SCOPES,
  MICROSOFT_SCOPES,
  adapterFor,
  authRejectionDetail,
  buildICalEvent,
  calendarConnection,
  calendarIsConnected,
  decodeCaldavCredentials,
  encodeCaldavCredentials,
  eventDescription,
  isAuthRejection,
  parseCalendarDataTimes,
  parseFreeBusyPeriods,
  parseGraphDateTime,
  parseICalDate,
  parseIsoDuration,
  providerLabel,
  stripZone,
  type CalendarColumns,
} from './calendar-providers';
import { GOOGLE_CALENDAR_SCOPE_STRING } from '../../../shared/types';

/**
 * These exist because the calendar path has no automated coverage at all and is
 * the product's headline feature. Of five tenants, exactly one has ever
 * connected a diary, and that one is the founder's own test account — so no real
 * usage has ever exercised this code either.
 *
 * Everything here is pure. The provider round-trips need a live Google,
 * Microsoft or Apple account and are not simulated: a passing test against a
 * hand-written fake would say nothing about whether iCloud accepts our XML.
 */

function clientRow(overrides: Partial<CalendarColumns> = {}): CalendarColumns {
  return {
    id: 'client-1',
    calendar_provider: null,
    calendar_id: null,
    calendar_credentials: null,
    google_cal_id: null,
    google_refresh_token: null,
    ...overrides,
  };
}

describe('calendarConnection', () => {
  test('a tenant with nothing connected has no connection', () => {
    assert.equal(calendarConnection(clientRow()), null);
    assert.equal(calendarIsConnected(clientRow()), false);
  });

  test('reads the provider-neutral columns', () => {
    const conn = calendarConnection(clientRow({
      calendar_provider: 'microsoft',
      calendar_id: 'AAMkAD...',
      calendar_credentials: 'ms-refresh',
    }));
    assert.equal(conn?.provider, 'microsoft');
    assert.equal(conn?.calendarId, 'AAMkAD...');
    assert.equal(conn?.credentials, 'ms-refresh');
    // Carried so a credential rejection can flag the right tenant without every
    // caller remembering to pass the id alongside.
    assert.equal(conn?.clientId, 'client-1');
  });

  test('falls back to the legacy Google pair', () => {
    // A tenant who connected before migration 019 must keep working without
    // being asked to reconnect. Vasco's Plumbing is in exactly this state.
    const conn = calendarConnection(clientRow({
      google_cal_id: 'someone@gmail.com',
      google_refresh_token: 'google-refresh',
    }));
    assert.equal(conn?.provider, 'google');
    assert.equal(conn?.calendarId, 'someone@gmail.com');
    assert.equal(conn?.credentials, 'google-refresh');
  });

  test('the generic columns win when both are present', () => {
    const conn = calendarConnection(clientRow({
      calendar_provider: 'caldav',
      calendar_id: 'https://caldav.icloud.com/123/calendars/home/',
      calendar_credentials: 'apple\u001fpassword',
      google_cal_id: 'stale@gmail.com',
      google_refresh_token: 'stale',
    }));
    assert.equal(conn?.provider, 'caldav');
  });

  test('a half-written row is not a connection', () => {
    // A provider with no credential would otherwise produce a connection that
    // fails on first use, which is the silent-failure shape this replaces.
    assert.equal(calendarConnection(clientRow({
      calendar_provider: 'google', calendar_id: 'x', calendar_credentials: null,
    })), null);
    assert.equal(calendarConnection(clientRow({
      google_cal_id: 'x', google_refresh_token: null,
    })), null);
  });
});

describe('isAuthRejection', () => {
  test('401 and 403 always mean reconnect', () => {
    assert.equal(isAuthRejection(401, ''), true);
    assert.equal(isAuthRejection(403, 'forbidden'), true);
  });

  test('400 invalid_grant means the refresh token is dead', () => {
    // This is how Google reports a token the account holder has revoked. (The
    // 7-day Testing-mode expiry never applied: the project is In production.)
    assert.equal(isAuthRejection(400, '{"error":"invalid_grant"}'), true);
    assert.equal(isAuthRejection(400, '{"error":"unauthorized_client"}'), true);
  });

  test('a plain 400 or a provider outage is not a reconnect', () => {
    // Telling a customer to reconnect a working diary because Google had a bad
    // minute is worse than the outage.
    assert.equal(isAuthRejection(400, '{"error":"invalid_request"}'), false);
    assert.equal(isAuthRejection(500, 'backend error'), false);
    assert.equal(isAuthRejection(503, ''), false);
  });
});

describe('authRejectionDetail', () => {
  // A customer's diary died on 2026-09-25 and the stored reason was a fixed
  // sentence; the provider's own answer had been thrown away. These pin down
  // that the reason now survives, and that it cannot leak what it must not.

  test('keeps Google\'s code and description for a revoked token', () => {
    const body = '{"error":"invalid_grant","error_description":"Token has been expired or revoked."}';
    assert.equal(authRejectionDetail(400, body), 'HTTP 400 invalid_grant: Token has been expired or revoked.');
  });

  test('reads the nested shape Google\'s APIs use', () => {
    const body = JSON.stringify({ error: { code: 401, message: 'Request had invalid authentication credentials.', status: 'UNAUTHENTICATED' } });
    assert.equal(authRejectionDetail(401, body), 'HTTP 401 UNAUTHENTICATED: Request had invalid authentication credentials.');
  });

  test('reads Graph\'s error code', () => {
    const body = JSON.stringify({ error: { code: 'InvalidAuthenticationToken', message: 'Access token has expired or is not yet valid.' } });
    assert.equal(authRejectionDetail(401, body), 'HTTP 401 InvalidAuthenticationToken: Access token has expired or is not yet valid.');
  });

  test('drops Microsoft\'s trace and correlation lines', () => {
    const body = JSON.stringify({
      error: 'invalid_grant',
      error_description: 'AADSTS700082: The refresh token has expired due to inactivity.\r\nTrace ID: abc\r\nCorrelation ID: def',
    });
    const detail = authRejectionDetail(400, body);
    assert.equal(detail, 'HTTP 400 invalid_grant: AADSTS700082: The refresh token has expired due to inactivity.');
    assert.ok(!detail.includes('Trace ID'));
  });

  test('says plainly when it is our client, not the customer, that was refused', () => {
    // invalid_client means every tenant on this provider is dead, and no amount
    // of asking the customer to reconnect will fix it.
    const detail = authRejectionDetail(401, '{"error":"invalid_client","error_description":"The OAuth client was not found."}');
    assert.ok(detail.startsWith('HTTP 401 invalid_client: The OAuth client was not found.'));
    assert.ok(detail.includes('affects every tenant'));
    assert.ok(!authRejectionDetail(400, '{"error":"invalid_grant"}').includes('affects every tenant'));
  });

  test('masks email addresses and caps the length', () => {
    const long = JSON.stringify({ error: 'invalid_grant', error_description: `Grant for someone@example.com revoked. ${'x'.repeat(400)}` });
    const detail = authRejectionDetail(400, long);
    assert.ok(!detail.includes('someone@example.com'));
    assert.ok(detail.includes('[email]'));
    assert.ok(detail.length <= 200);
  });

  test('falls back to the status alone for a non-JSON body such as CalDAV', () => {
    assert.equal(authRejectionDetail(401, '<html><body>Unauthorized</body></html>'), 'HTTP 401');
    assert.equal(authRejectionDetail(403, ''), 'HTTP 403');
  });
});

describe('scopes', () => {
  test('Google asks for events and freebusy, not full calendar access', () => {
    assert.ok(GOOGLE_SCOPES.includes('calendar.events'));
    // freeBusy is not covered by calendar.events. Omitting it would break every
    // availability check while still compiling and still passing other tests.
    assert.ok(GOOGLE_SCOPES.includes('calendar.freebusy'));
    assert.ok(!GOOGLE_SCOPES.includes('auth/calendar '));
    assert.ok(!/auth\/calendar$/.test(GOOGLE_SCOPES));
  });

  test('every place that asks Google for calendar access asks for the same thing', () => {
    // Two OAuth clients request calendar access: this one, and the Supabase Google
    // provider behind LoginPage's "Sign in with Google", whose returned token
    // src/lib/calendar.ts captures as the zero-tap connection. Only this one was
    // narrowed; the login button kept asking for full `auth/calendar` until
    // 2026-09-24, so signing in granted read/write over every calendar the person
    // owns — and contradicted the "request minimum scopes" requirement in Google's
    // OAuth verification review, which was live at the time.
    assert.equal(GOOGLE_SCOPES, GOOGLE_CALENDAR_SCOPE_STRING);

    const loginPage = readFileSync(
      resolve(__dirname, '../../../src/pages/LoginPage.tsx'),
      'utf8',
    );
    // A literal scope string here is the drift. It must read the shared constant.
    assert.ok(
      !/scopes:\s*['\`"]https:\/\//.test(loginPage),
      'LoginPage hard-codes an OAuth scope string — import GOOGLE_CALENDAR_SCOPE_STRING instead',
    );
    assert.ok(loginPage.includes('GOOGLE_CALENDAR_SCOPE_STRING'));
  });

  test('Microsoft asks for offline_access, or the connection dies in an hour', () => {
    assert.ok(MICROSOFT_SCOPES.includes('offline_access'));
    assert.ok(MICROSOFT_SCOPES.includes('Calendars.ReadWrite'));
  });
});

describe('CalDAV credentials', () => {
  test('round-trips an Apple ID and app-specific password', () => {
    const blob = encodeCaldavCredentials('trade@icloud.com', 'abcd-efgh-ijkl-mnop');
    assert.deepEqual(decodeCaldavCredentials(blob), {
      username: 'trade@icloud.com',
      appPassword: 'abcd-efgh-ijkl-mnop',
    });
  });

  test('a malformed blob is an auth error, not a crash', () => {
    assert.throws(() => decodeCaldavCredentials('no-separator-here'), CalendarAuthError);
    assert.throws(() => decodeCaldavCredentials(''), CalendarAuthError);
  });
});

describe('eventDescription', () => {
  test('includes only the fields that were captured', () => {
    const text = eventDescription({
      title: 'Boiler repair',
      startTime: '2026-10-01T09:00:00Z',
      customerName: 'Tito',
      address: 'DE4 3AB',
    });
    assert.ok(text.includes('Customer: Tito'));
    assert.ok(text.includes('Address: DE4 3AB'));
    assert.ok(!text.includes('Phone:'));
    assert.ok(text.includes('Booked via Trade Receptionist'));
  });
});

describe('iCalendar', () => {
  test('parses a UTC iCal timestamp', () => {
    assert.equal(parseICalDate('20261001T090000Z')?.toISOString(), '2026-10-01T09:00:00.000Z');
    assert.equal(parseICalDate('20261001T090000')?.toISOString(), '2026-10-01T09:00:00.000Z');
  });

  test('rejects anything that is not an iCal timestamp', () => {
    assert.equal(parseICalDate('2026-10-01T09:00:00Z'), null);
    assert.equal(parseICalDate(''), null);
  });

  test('parses the ISO durations iCloud emits', () => {
    assert.equal(parseIsoDuration('PT1H'), 3_600_000);
    assert.equal(parseIsoDuration('PT30M'), 1_800_000);
    assert.equal(parseIsoDuration('PT1H30M'), 5_400_000);
    assert.equal(parseIsoDuration('P1D'), 86_400_000);
    assert.equal(parseIsoDuration('nonsense'), 0);
  });

  test('builds an event with CRLF line endings', () => {
    // RFC 5545 requires CRLF. A bare \n is accepted by some servers and
    // rejected by others, which would make this work in testing and fail for
    // whichever customer happened to be on the strict one.
    const ical = buildICalEvent('tr-123', {
      title: 'Boiler repair',
      startTime: '2026-10-01T09:00:00Z',
      endTime: '2026-10-01T10:00:00Z',
    }, 'Customer: Tito');
    assert.ok(ical.includes('\r\n'));
    assert.ok(!/[^\r]\n/.test(ical));
    assert.ok(ical.startsWith('BEGIN:VCALENDAR'));
    assert.ok(ical.trimEnd().endsWith('END:VCALENDAR'));
    assert.ok(ical.includes('UID:tr-123'));
    assert.ok(ical.includes('DTSTART:20261001T090000Z'));
    assert.ok(ical.includes('DTEND:20261001T100000Z'));
  });

  test('escapes commas and semicolons in user-supplied text', () => {
    // An unescaped comma in a summary splits the property value and corrupts
    // the event — a postcode line like "Flat 2, Mill St" is enough to do it.
    const ical = buildICalEvent('tr-1', {
      title: 'Leak, urgent; kitchen',
      startTime: '2026-10-01T09:00:00Z',
      address: 'Flat 2, Mill St',
    }, 'Notes: ring the bell, not the buzzer');
    assert.ok(ical.includes('SUMMARY:Leak\\, urgent\\; kitchen'));
    assert.ok(ical.includes('LOCATION:Flat 2\\, Mill St'));
    // The description is free text from the caller and a lead's notes, so it is
    // the most likely field to carry a stray comma.
    assert.ok(ical.includes('DESCRIPTION:Notes: ring the bell\\, not the buzzer'));
  });
});

describe('CalDAV free/busy parsing', () => {
  test('reads explicit start/end periods', () => {
    const xml = [
      'BEGIN:VFREEBUSY',
      'FREEBUSY;FBTYPE=BUSY:20261001T090000Z/20261001T100000Z',
      'END:VFREEBUSY',
    ].join('\r\n');

    const windows = parseFreeBusyPeriods(xml);
    assert.equal(windows.length, 1);
    assert.equal(windows[0]?.start.toISOString(), '2026-10-01T09:00:00.000Z');
    assert.equal(windows[0]?.end.toISOString(), '2026-10-01T10:00:00.000Z');
  });

  test('reads the start/duration form, which is equally legal', () => {
    const windows = parseFreeBusyPeriods('FREEBUSY:20261001T090000Z/PT90M');
    assert.equal(windows.length, 1);
    assert.equal(windows[0]?.end.toISOString(), '2026-10-01T10:30:00.000Z');
  });

  test('reads several comma-separated periods on one line', () => {
    const windows = parseFreeBusyPeriods(
      'FREEBUSY:20261001T090000Z/20261001T100000Z,20261001T140000Z/20261001T150000Z',
    );
    assert.equal(windows.length, 2);
    assert.equal(windows[1]?.start.toISOString(), '2026-10-01T14:00:00.000Z');
  });

  test('an empty diary parses to no busy windows rather than throwing', () => {
    assert.deepEqual(parseFreeBusyPeriods('BEGIN:VFREEBUSY\r\nEND:VFREEBUSY'), []);
  });

  test('the calendar-query fallback reads VEVENT times', () => {
    const xml = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART:20261002T080000Z',
      'DTEND:20261002T093000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART;TZID=Europe/London:20261003T080000Z',
      'DTEND;TZID=Europe/London:20261003T090000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const windows = parseCalendarDataTimes(xml);
    assert.equal(windows.length, 2);
    assert.equal(windows[0]?.start.toISOString(), '2026-10-02T08:00:00.000Z');
    // Parameters before the colon must not stop the match.
    assert.equal(windows[1]?.start.toISOString(), '2026-10-03T08:00:00.000Z');
  });

  test('a VEVENT missing an end time is skipped, not guessed', () => {
    const windows = parseCalendarDataTimes('BEGIN:VEVENT\r\nDTSTART:20261002T080000Z\r\nEND:VEVENT');
    assert.deepEqual(windows, []);
  });
});

describe('Microsoft Graph datetimes', () => {
  test('an unmarked datetime is treated as UTC', () => {
    // Graph omits the Z even when Prefer: outlook.timezone="UTC" is sent. Read
    // as local it would shift every busy window by the server's offset.
    assert.equal(parseGraphDateTime('2026-10-01T09:00:00.0000000').toISOString(), '2026-10-01T09:00:00.000Z');
  });

  test('an explicit zone is respected', () => {
    assert.equal(parseGraphDateTime('2026-10-01T09:00:00Z').toISOString(), '2026-10-01T09:00:00.000Z');
    assert.equal(parseGraphDateTime('2026-10-01T10:00:00+01:00').toISOString(), '2026-10-01T09:00:00.000Z');
  });

  test('stripZone leaves the wall clock for Graph to interpret', () => {
    // Graph rejects a dateTime carrying an offset when timeZone is also given.
    assert.equal(stripZone('2026-10-01T09:00:00Z'), '2026-10-01T09:00:00');
    assert.equal(stripZone('2026-10-01T09:00:00.000Z'), '2026-10-01T09:00:00');
    assert.equal(stripZone('2026-10-01T09:00:00+01:00'), '2026-10-01T09:00:00');
  });
});

describe('dispatch', () => {
  test('every provider in the union has an adapter', () => {
    // A provider added to the type union with no adapter would compile and then
    // throw on the first real booking.
    for (const provider of ['google', 'microsoft', 'caldav'] as const) {
      assert.equal(adapterFor(provider).provider, provider);
    }
  });

  test('labels are what a tenant would recognise, not our internal names', () => {
    assert.equal(providerLabel('google'), 'Google Calendar');
    assert.equal(providerLabel('microsoft'), 'Outlook Calendar');
    assert.equal(providerLabel('caldav'), 'Apple Calendar');
  });
});
