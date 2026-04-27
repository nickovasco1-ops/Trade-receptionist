import type { CallOutcome } from '../../../../shared/types';
import { OUTCOME_TONE, FALLBACK_OUTCOME, type Tone } from './outcomeTone';

const TONE_CLASSES: Record<Tone, string> = {
  success:  'bg-status-success/15 text-status-success',
  warn:     'bg-status-warn/15 text-status-warn',
  danger:   'bg-status-danger/15 text-status-danger',
  muted:    'bg-status-muted/10 text-status-muted',
  'muted-2':'bg-status-muted-2/10 text-status-muted-2',
  accent:   'bg-accent/15 text-accent',
  orange:   'bg-orange/15 text-orange-soft',
};

interface StatusBadgeProps {
  outcome: CallOutcome | null | undefined;
  className?: string;
}

export default function StatusBadge({ outcome, className = '' }: StatusBadgeProps) {
  const info = outcome ? (OUTCOME_TONE[outcome] ?? FALLBACK_OUTCOME) : FALLBACK_OUTCOME;
  return (
    <span
      className={`px-2 py-0.5 rounded-badge text-[11px] font-semibold font-body ${TONE_CLASSES[info.tone]} ${className}`}
    >
      {info.label}
    </span>
  );
}
