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
