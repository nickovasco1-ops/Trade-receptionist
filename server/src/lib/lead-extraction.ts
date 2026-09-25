/**
 * Turning a finished call into a lead.
 *
 * This lived inside `routes/webhooks/retell.ts` and was reachable only from a
 * live webhook. `POST /admin/sync-calls` — the documented recovery path for a
 * dropped webhook — could not reuse it, so it grew its own cruder copy that
 * guessed the outcome from the first word of the summary and never wrote a
 * lead at all. Two implementations of one rule is how they drift.
 *
 * There are two sources, in order of trust:
 *
 * 1. `custom_analysis_data` — the structured fields Retell extracts after the
 *    call, declared in POST_CALL_ANALYSIS_DATA (services/retell.ts). Field
 *    names here MUST match that list.
 * 2. The freeform `call_summary`, scraped with regexes. This is a fallback for
 *    calls whose structured analysis never arrived, not a design.
 */
import type {
  CallOutcome,
  LeadInsert,
  LeadPropertyType,
  LeadUrgency,
} from '../../../shared/types';

export const VALID_OUTCOMES: CallOutcome[] = [
  'booked', 'lead_captured', 'enquiry', 'spam', 'voicemail', 'emergency', 'transferred', 'no_answer',
];

const VALID_PROPERTY_TYPES: LeadPropertyType[] = ['residential', 'commercial', 'unknown'];
const VALID_URGENCIES: LeadUrgency[] = ['routine', 'urgent', 'emergency'];

/** True when Retell's structured analysis actually carries something usable. */
export function hasStructuredAnalysis(customData?: Record<string, unknown>): boolean {
  if (!customData) return false;
  return Object.values(customData).some(
    (v) => v !== null && v !== undefined && v !== '' && !(typeof v === 'string' && !v.trim()),
  );
}

/**
 * Whether a lead row is still an empty shell — a phone number and nothing else.
 *
 * 17 of the first 20 leads in production looked like this: no name, no job
 * type, no notes, while the transcript plainly said "Tito", "oil boiler, no
 * heat or hot water". Used by the backfill to decide what is worth repairing.
 */
export function isLeadEmpty(lead: {
  caller_name?: string | null;
  job_type?: string | null;
  notes?: string | null;
  postcode?: string | null;
}): boolean {
  return !lead.caller_name && !lead.job_type && !lead.notes && !lead.postcode;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // The model is told to answer "" when a field was not discussed, but it also
  // reaches for these when pushed. Treat them as absent rather than storing the
  // word "unknown" as a caller's name.
  if (/^(unknown|n\/?a|none|not given|not provided|not specified|null)$/i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function fromStructured(customData: Record<string, unknown>): Partial<LeadInsert> {
  const str = (key: string) => cleanString(customData[key]);

  const propertyRaw = str('property_type')?.toLowerCase();
  const property_type = propertyRaw && VALID_PROPERTY_TYPES.includes(propertyRaw as LeadPropertyType)
    ? (propertyRaw as LeadPropertyType)
    : undefined;

  const urgencyRaw = str('urgency')?.toLowerCase();
  const urgency = urgencyRaw && VALID_URGENCIES.includes(urgencyRaw as LeadUrgency)
    ? (urgencyRaw as LeadUrgency)
    : undefined;

  return {
    caller_name:           str('caller_name'),
    caller_number:         str('caller_number'),
    caller_email:          str('caller_email'),
    postcode:              str('postcode'),
    job_type:              str('job_type'),
    urgency,
    property_type,
    customer_availability: str('customer_availability'),
    notes:                 str('notes'),
  };
}

/**
 * Scrape the freeform summary.
 *
 * The name pattern used to require two capitalised words, so every caller who
 * gave one name — "Tito", "Nick" — was dropped on the floor. It now accepts a
 * single name but still demands a preceding label ("caller: Tito"), because an
 * unanchored capitalised word matches the trade's own name in almost every
 * summary Retell writes.
 */
function fromSummary(summary: string): Partial<LeadInsert> {
  const get = (re: RegExp): string | undefined => cleanString(summary.match(re)?.[1]);

  const property_type: LeadPropertyType | undefined =
    /\b(commercial|office|shop|warehouse|site)\b/i.test(summary) ? 'commercial'
      : /\b(residential|house|flat|HMO|domestic)\b/i.test(summary) ? 'residential'
        : undefined;

  const urgency: LeadUrgency =
    /\bemergency\b/i.test(summary) ? 'emergency'
      : /\burgent|same.day|asap\b/i.test(summary) ? 'urgent'
        : 'routine';

  return {
    // The label alternation is spelled with explicit case classes rather than
    // the /i flag: the original was lowercase-only with no flag, so a summary
    // beginning "Caller: Tito" — how Retell actually writes them — never
    // matched. The captured name must stay case-sensitive, or /i would let it
    // swallow ordinary lowercase words.
    caller_name:           get(/(?:[Cc]ustomer|[Cc]aller|[Nn]ame)(?:'s name)?[:\s|]+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/),
    // Must end on a digit, or a trailing full stop is captured as part of it.
    caller_number:         get(/(?:number|mobile|phone|tel)[:\s|]+([+\d][\d\s().-]{5,13}\d)/i),
    caller_email:          get(/([\w.+-]+@[\w-]+\.[\w.]{2,})/),
    postcode:              get(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i),
    job_type:              get(/(?:job|trade|work|repair|service|issue|problem)[:\s|]+([^|.\n]{3,40})/i),
    urgency,
    property_type,
    customer_availability: get(/(?:available|availability|free|best.time)[:\s|]+([^|.\n]{5,60})/i),
    notes:                 summary.trim().length > 20 ? summary.trim().slice(0, 1000) : undefined,
  };
}

/**
 * Build the lead fields for a call.
 *
 * Structured analysis wins field by field rather than wholesale: a run where
 * Retell returned a `job_type` but no `caller_name` should still pick the name
 * out of the summary rather than discard it.
 */
export function extractLeadData(
  summary: string,
  customData?: Record<string, unknown>,
): Partial<LeadInsert> {
  const scraped = summary ? fromSummary(summary) : {};
  if (!hasStructuredAnalysis(customData)) return scraped;

  const structured = fromStructured(customData as Record<string, unknown>);
  const merged: Partial<LeadInsert> = { ...scraped };
  for (const [key, value] of Object.entries(structured)) {
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

/**
 * Derive the call outcome.
 *
 * `POST /admin/sync-calls` used to uppercase the summary's first word and look
 * it up in a map, which meant a summary beginning "The caller..." was recorded
 * as an enquiry no matter what happened on the call.
 */
export function deriveOutcome(summary: string, customData?: Record<string, unknown>): CallOutcome {
  const fromAnalysis = customData?.['call_outcome'];
  if (typeof fromAnalysis === 'string') {
    const v = fromAnalysis.trim().toLowerCase() as CallOutcome;
    if (VALID_OUTCOMES.includes(v)) return v;
  }

  // Then the leading status token: the agent is prompted to open its summary
  // with the outcome, e.g. "LEAD_CAPTURED: Jane needs a boiler repair". This
  // is a deliberate convention, not a hack — it is precise where the prose
  // matching below is a guess, so it goes first. Dropping it in favour of the
  // regexes alone turned every such summary into `enquiry`.
  const leading = summary.trim().split(/[\s|:\n]/)[0]?.toLowerCase() as CallOutcome | undefined;
  if (leading && VALID_OUTCOMES.includes(leading)) return leading;

  // Finally, read the prose. The backfill used to have only the token parse,
  // so a summary written as a sentence was always filed as `enquiry`.
  const text = summary.toLowerCase();
  if (/\bspam|robocall|sales call|cold call\b/.test(text)) return 'spam';
  if (/\bemergency|gas leak|flooding|burst\b/.test(text)) return 'emergency';
  if (/\bbooked|appointment (?:is )?confirmed|slot confirmed\b/.test(text)) return 'booked';
  if (/\btransferred|put through\b/.test(text)) return 'transferred';
  if (/\bvoicemail|left a message\b/.test(text)) return 'voicemail';
  if (/\bno answer|silence|disconnected|hung up\b/.test(text)) return 'no_answer';
  if (/\bname and number|details taken|contact details\b/.test(text)) return 'lead_captured';
  return 'enquiry';
}

/**
 * The outcome to store, given what the analysis says and whether a booking row
 * exists for the call. A booking the agent actually made outranks the LLM's
 * reading of the transcript — it is a fact, not an inference. Emergency status
 * is not lost by this: it lives in `calls.is_emergency`, which is decided
 * separately, and escalation runs off that.
 */
export function resolveOutcome(derived: CallOutcome, hasBooking: boolean): CallOutcome {
  return hasBooking ? 'booked' : derived;
}
