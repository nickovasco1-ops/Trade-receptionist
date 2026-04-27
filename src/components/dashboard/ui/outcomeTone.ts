import type { CallOutcome } from '../../../../shared/types';

export type Tone = 'success' | 'warn' | 'danger' | 'accent' | 'orange' | 'muted' | 'muted-2';

export interface OutcomeInfo {
  label: string;
  tone: Tone;
}

export const OUTCOME_TONE: Record<NonNullable<CallOutcome>, OutcomeInfo> = {
  booked:        { label: 'Booked',      tone: 'success' },
  lead_captured: { label: 'Lead',        tone: 'accent' },
  enquiry:       { label: 'Enquiry',     tone: 'muted' },
  spam:          { label: 'Spam',        tone: 'muted-2' },
  voicemail:     { label: 'Voicemail',   tone: 'muted-2' },
  emergency:     { label: 'Emergency',   tone: 'orange' },
  transferred:   { label: 'Transferred', tone: 'muted' },
  no_answer:     { label: 'Missed',      tone: 'danger' },
};

export const FALLBACK_OUTCOME: OutcomeInfo = { label: 'Enquiry', tone: 'muted' };
