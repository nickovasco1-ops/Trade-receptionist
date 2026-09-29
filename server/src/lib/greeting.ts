/**
 * The opening line every receptionist speaks when a call connects.
 *
 * It tells the caller two things up front: that they are speaking to an AI
 * receptionist, and that the call may be recorded. The Terms of Service (§8)
 * promise exactly that disclosure "at the start of each call"; until
 * 2026-09-29 the greeting gave neither, and the system prompt told the agent
 * never to volunteer that it was an AI.
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
  // "You're through to Trade Receptionist, the AI receptionist" reads badly,
  // so the default name is dropped rather than repeated.
  const who = !name || name === DEFAULT_RECEPTIONIST_NAME
    ? 'the AI receptionist'
    : `${name}, the AI receptionist`;
  return `Hello, thanks for calling ${businessName}. You're through to ${who}. This call may be recorded. How can I help?`;
}
