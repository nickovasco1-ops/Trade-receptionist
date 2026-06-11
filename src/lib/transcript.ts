/**
 * Transcript embed normalisation.
 *
 * `transcripts.call_id` has a UNIQUE constraint, so PostgREST treats the
 * relationship as one-to-one and embeds the transcript as a SINGLE OBJECT, not
 * an array. Reading `embed[0]` on an object returns `undefined`, which silently
 * blanked every call summary/transcript on the dashboard (the bug this module
 * exists to prevent recurring).
 *
 * Always read embedded transcripts through `transcriptOf()` — never index `[0]`
 * directly — so the UI is robust whether PostgREST returns an object or an array.
 */

export interface TranscriptRow {
  summary: string | null;
  full_text: string | null;
}

export type TranscriptEmbed = TranscriptRow | TranscriptRow[] | null | undefined;

/** Normalise an embedded transcript whether PostgREST returns it as an object or an array. */
export function transcriptOf(embed: TranscriptEmbed): TranscriptRow | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

/**
 * Detect a structurally-unexpected embed shape so we can alert on it.
 * Returns a short anomaly code if the shape is wrong, otherwise null.
 *
 * A one-to-one embed must be an object, an empty/single-element array, or null.
 * Anything else (multi-row array, missing keys, primitive) means PostgREST's
 * relationship detection changed — exactly the silent failure we want flagged.
 */
export function transcriptEmbedAnomaly(embed: TranscriptEmbed): string | null {
  if (embed === null || embed === undefined) return null;

  if (Array.isArray(embed)) {
    return embed.length > 1 ? `array_with_${embed.length}_rows` : null;
  }

  if (typeof embed === 'object') {
    return 'summary' in embed || 'full_text' in embed ? null : 'object_missing_expected_keys';
  }

  return `unexpected_type_${typeof embed}`;
}
