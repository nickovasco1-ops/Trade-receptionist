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
      className={`inline-flex min-h-[24px] items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] font-body shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] ${TONE_CLASSES[info.tone]} ${className}`}
    >
      {info.label}
    </span>
  );
}
