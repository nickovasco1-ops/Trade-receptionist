/**
 * Which voice an agent speaks with. Pure, so every rule is tested.
 *
 * The voice comes from the plan (§8.4b): Starter gets Retell's own voice, paid
 * plans get ElevenLabs. A single tenant can be given a different voice without
 * changing their plan. The first was Orrell Park Heating Solutions (2026-10-09),
 * on Starter, whose callers heard `retell-Willa` as Australian.
 *
 * Overrides live in `agent_overrides`, a service-role-only table, never on
 * `clients` or `business_config`: owners can write their own rows in those two
 * under RLS, so a Starter tenant could hand themselves a paid voice.
 *
 * Only voices listed here are accepted. A typo in the table must not publish an
 * agent with a voice Retell rejects, because an agent that fails to publish
 * answers nothing.
 */

export interface VoiceChoice {
  voiceId:     string;
  voiceModel?: string;
}

/** Voices we have run in production, with the voice model each needs. */
export const KNOWN_VOICES: Readonly<Record<string, string | undefined>> = {
  'retell-Willa': undefined,
  '11labs-Amy':   'eleven_flash_v2_5',
};

export type VoiceResolution =
  | { voice: VoiceChoice; source: 'plan' | 'override' }
  | { voice: VoiceChoice; source: 'plan'; ignoredOverride: string };

/** The plan's voice, or the tenant's override when it is one we know. */
export function resolveVoice(planVoice: VoiceChoice, override: string | null | undefined): VoiceResolution {
  const wanted = override?.trim();
  if (!wanted) return { voice: planVoice, source: 'plan' };
  if (!(wanted in KNOWN_VOICES)) return { voice: planVoice, source: 'plan', ignoredOverride: wanted };
  const voiceModel = KNOWN_VOICES[wanted];
  return { voice: { voiceId: wanted, ...(voiceModel ? { voiceModel } : {}) }, source: 'override' };
}
