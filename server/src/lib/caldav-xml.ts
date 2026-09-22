/**
 * iCalendar and WebDAV text handling — pure, dependency-free, no network.
 *
 * Extracted from the CalDAV adapter and the connect flow for one reason: both of
 * those import the Supabase client, which throws at import time without
 * credentials, so nothing in them could be unit-tested. The same extraction was
 * done to stripe-signature.ts after an entire suite silently never ran (§10).
 *
 * These parsers are deliberately regex-based rather than pulling in an XML
 * dependency. The documents are fixed, machine-generated WebDAV multistatus and
 * iCalendar payloads, and the alternative is a parser in the bundle for four
 * shapes of response.
 */

/** A busy period on someone's diary. Mirrors BusyWindow in calendar-providers. */
export interface TimeWindow {
  start: Date;
  end: Date;
}

/** The event fields iCalendar output needs. Kept local so this module imports nothing. */
export interface ICalEventFields {
  title: string;
  startTime: string;
  endTime?: string;
  address?: string;
}

/** iCalendar wants `20260922T090000Z`, not ISO 8601. */
export function toICalDate(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`;
}

/** Long lines must be folded at 75 octets, and commas/semicolons escaped. */
function icalEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

export function buildICalEvent(
  uid: string,
  event: ICalEventFields,
  description: string,
): string {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime ?? event.startTime);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trade Receptionist//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICalDate(new Date())}`,
    `DTSTART:${toICalDate(start)}`,
    `DTEND:${toICalDate(end)}`,
    `SUMMARY:${icalEscape(event.title)}`,
    `DESCRIPTION:${icalEscape(description)}`,
    ...(event.address ? [`LOCATION:${icalEscape(event.address)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Job reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** `19980119T070000Z/19980119T080000Z` or `.../PT1H` — both are legal. */
export function parseFreeBusyPeriods(xml: string): TimeWindow[] {
  const windows: TimeWindow[] = [];

  for (const line of xml.split(/\r?\n/)) {
    const match = /^FREEBUSY(?:;[^:]*)?:(.+)$/.exec(line.trim());
    if (!match) continue;

    for (const period of (match[1] as string).split(',')) {
      const [rawStart, rawEnd] = period.split('/');
      if (!rawStart || !rawEnd) continue;

      const start = parseICalDate(rawStart);
      if (!start) continue;

      const end = rawEnd.startsWith('P')
        ? new Date(start.getTime() + parseIsoDuration(rawEnd))
        : parseICalDate(rawEnd);
      if (!end) continue;

      windows.push({ start, end });
    }
  }

  return windows;
}

export function parseICalDate(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

/** Minimal ISO-8601 duration — enough for the PT/H/M/S forms iCloud emits. */
export function parseIsoDuration(value: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!match) return 0;
  const [, d, h, m, s] = match;
  return (
    Number(d ?? 0) * 86_400_000
    + Number(h ?? 0) * 3_600_000
    + Number(m ?? 0) * 60_000
    + Number(s ?? 0) * 1000
  );
}

/**
 * Fallback for servers that do not implement free-busy-query: ask for the
 * events themselves and read their times.
 *
 * Deliberately second choice. free-busy-query makes the *server* expand
 * recurring events; this fallback sees only what the server chose to return,
 * so a weekly job may be reported busy once rather than every week.
 */
export function parseCalendarDataTimes(xml: string): TimeWindow[] {
  const windows: TimeWindow[] = [];
  const blocks = xml.split(/BEGIN:VEVENT/).slice(1);

  for (const block of blocks) {
    const start = /DTSTART(?:;[^:]*)?:(\d{8}T\d{6}Z?)/.exec(block)?.[1];
    const end = /DTEND(?:;[^:]*)?:(\d{8}T\d{6}Z?)/.exec(block)?.[1];
    if (!start || !end) continue;

    const startDate = parseICalDate(start);
    const endDate = parseICalDate(end);
    if (startDate && endDate) windows.push({ start: startDate, end: endDate });
  }

  return windows;
}


/** Pull hrefs out of a WebDAV multistatus, namespace prefix and all. */
export function extractHrefs(xml: string): string[] {
  return [...xml.matchAll(/<[\w-]*:?href[^>]*>([^<]+)<\/[\w-]*:?href>/gi)]
    .map((match) => (match[1] as string).trim())
    .filter(Boolean);
}

/**
 * Choose the first response block that is a calendar collection supporting
 * VEVENT. Split on the response element rather than parsing properly: these are
 * fixed, machine-generated documents and a full XML dependency is not worth it.
 */
export function pickEventCalendar(xml: string): { href: string; displayName: string | null } | null {
  const blocks = xml.split(/<[\w-]*:?response[\s>]/i).slice(1);

  for (const block of blocks) {
    if (!/<[\w-]*:?calendar[\s/>]/i.test(block)) continue;
    // A collection that lists components but not VEVENT is a to-do or journal
    // calendar — booking a job into it would silently go nowhere useful.
    const components = /supported-calendar-component-set[^>]*>([\s\S]*?)<\/[\w-]*:?supported-calendar-component-set>/i.exec(block);
    if (components && !/name="VEVENT"/i.test(components[1] as string)) continue;

    const href = extractHrefs(block)[0];
    if (!href) continue;

    const displayName = /<[\w-]*:?displayname[^>]*>([^<]*)<\/[\w-]*:?displayname>/i.exec(block)?.[1]?.trim() || null;
    return { href, displayName };
  }

  return null;
}

