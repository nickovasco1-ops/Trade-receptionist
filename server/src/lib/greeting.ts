/**
 * The opening line every receptionist speaks when a call connects.
 *
 * "Hello, this is TAPS, Amy speaking. Calls are recorded. How can I help?"
 *
 * It names the business and the receptionist, and tells the caller the call is
 * recorded (UK GDPR transparency; Privacy §4, Terms §8). It does not say the
 * receptionist is an AI: that changed on 2026-10-01 at a tenant's request, and
 * the Terms were changed with it. The agent is still told never to claim to be
 * a person and to confirm it is an AI whenever a caller asks (prompt-builder).
 *
 * One function, used twice: prompt-builder's buildBeginMessage() sends it to
 * Retell as begin_message, and the system prompt quotes it so the LLM knows
 * what has already been said. They used to be two hand-written copies.
 *
 * Deliberately free of imports so it can be unit-tested without Supabase
 * credentials (prompt-builder pulls in the calendar service, which needs them).
 */

/** The receptionist name used when a tenant has not chosen one. */
export const DEFAULT_RECEPTIONIST_NAME = 'Trade Receptionist';

export function openingGreeting(businessName: string, receptionistName: string): string {
  const name = receptionistName.trim();
  // "Trade Receptionist speaking" is a product name, not a person, so a tenant
  // who never chose a name gets the business alone.
  const who = !name || name === DEFAULT_RECEPTIONIST_NAME ? '' : `, ${name} speaking`;
  return `Hello, this is ${businessName}${who}. Calls are recorded. How can I help?`;
}
