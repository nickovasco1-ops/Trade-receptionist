/**
 * UK call-divert (USSD/MMI) helpers.
 *
 * **The bug this exists to prevent.** UK networks take the divert destination in
 * *national* format with the leading zero — `**004*07700900123#`. We store
 * numbers in E.164 (`+447700900123`), and every call site built the code by
 * string-interpolating the stored value directly, producing
 * `**004*+447700900123#`. That is not a valid MMI string: the handset either
 * rejects it or the network refuses the registration, and in both cases the
 * customer sees something that looks like it worked and gets no calls.
 *
 * It shipped in five places — the welcome email, the dashboard Settings panel,
 * the activation-code endpoint, the public preview page and the support
 * auto-replies — so no customer has ever been given a code that could work.
 *
 * Sources: UK network divert-code documentation is unanimous that the
 * destination is entered "including the leading zero (e.g. 07700900123)".
 */

/** Ofcom's reserved drama range, safe to show in examples and tests. */
export const EXAMPLE_UK_MOBILE = '07700900123';

/** Cancel every divert of every type. Safer than `##004#`, which clears only the conditional set. */
export const DIVERT_CANCEL_ALL = '##002#';

/** Interrogate the current divert status — lets a customer confirm it registered. */
export const DIVERT_CHECK = '*#004#';

/**
 * Convert a UK number to the national dialling format a divert code requires.
 * Returns `null` for anything that is not a UK number, so callers emit no code
 * at all rather than a broken one.
 */
export function toNationalDialling(input: string | null | undefined): string | null {
  if (!input) return null;

  const cleaned = String(input).replace(/[^\d+]/g, '');

  // +447…, 00447…, 447… → 07…
  const international = /^(?:\+44|0044|44)(\d{9,10})$/.exec(cleaned);
  if (international) return `0${international[1]}`;

  // Already national.
  if (/^0\d{9,10}$/.test(cleaned)) return cleaned;

  return null;
}

/**
 * The "divert all conditional calls" activation code for a tenant's number,
 * or `null` if the number cannot be expressed in national format.
 */
export function divertActivationCode(twilioNumber: string | null | undefined): string | null {
  const national = toNationalDialling(twilioNumber);
  return national ? `**004*${national}#` : null;
}

// ── Contact numbers ───────────────────────────────────────────────────────────
//
// Nothing validated a phone number before these existed. The booking tool
// preferred the number the LLM transcribed over the caller ID, so when it
// dropped a digit ("+44 7786 8XXXX" — nine digits where a UK mobile has ten)
// the confirmation SMS failed with Twilio 21211 *and* the short number was
// written into the tradesperson's diary event, while the caller ID on the same
// request was correct all along. First seen on a live booking, 2026-09-25.
//
// Deliberately stricter than `toNationalDialling`, which accepts 9 or 10 digits
// for any prefix: a mobile (07…) always has exactly ten after the zero.

/**
 * Normalise a phone number to E.164, or return `null` when it cannot be a real
 * number. UK numbers are length-checked by their leading digit; a number that
 * already carries another country code is accepted on shape alone.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Only digits, spaces, dashes, dots, brackets and a leading + make a number.
  // "anonymous", "withheld" and anything else Retell or the LLM might pass do not.
  if (!/^\+?[\d\s\-().]+$/.test(trimmed)) return null;

  // "+44 (0)7700 900123" — the bracketed trunk zero must go, not survive as a digit.
  const withoutTrunk = trimmed.replace(/\(0\)/g, '');
  const hasPlus = withoutTrunk.startsWith('+');
  let digits = withoutTrunk.replace(/\D/g, '');

  let national: string;
  if (hasPlus || digits.startsWith('00')) {
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (!digits.startsWith('44')) {
      // Another country: E.164 allows up to 15 digits including the country code.
      return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
    }
    national = digits.slice(2);
  } else if (digits.startsWith('44') && digits.length >= 11) {
    national = digits.slice(2);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    return null;
  }

  return isValidUkNational(national) ? `+44${national}` : null;
}

/** A UK national significant number: the digits after +44 (or the leading 0). */
function isValidUkNational(national: string): boolean {
  if (!/^\d+$/.test(national)) return false;
  switch (national[0]) {
    case '7': // mobiles, personal numbers
    case '2': // London, Cardiff, Belfast…
    case '3': // non-geographic 03
    case '5': // corporate / VoIP 05
    case '9': // premium 09
      return national.length === 10;
    case '1': // geographic — a handful of areas (e.g. 016977) have nine digits
    case '8': // 0800/0808 — some legacy freephone numbers have nine digits
      return national.length === 9 || national.length === 10;
    default:
      return false;
  }
}

export type CallerNumberSource = 'heard' | 'caller_id' | 'none';

export interface ChosenCallerNumber {
  number: string | null;
  source: CallerNumberSource;
}

/**
 * Pick the number to contact a caller on.
 *
 * The number the caller *said* still wins when it is valid — someone ringing
 * from a work phone may ask to be texted on their own. But a number that
 * cannot exist is a transcription error, not a preference, and the caller ID
 * is then the only trustworthy number on the call.
 */
export function chooseCallerNumber(
  heard: string | null | undefined,
  callerId: string | null | undefined,
): ChosenCallerNumber {
  const fromHeard = toE164(heard);
  if (fromHeard) return { number: fromHeard, source: 'heard' };

  const fromCallerId = toE164(callerId);
  if (fromCallerId) return { number: fromCallerId, source: 'caller_id' };

  return { number: null, source: 'none' };
}
