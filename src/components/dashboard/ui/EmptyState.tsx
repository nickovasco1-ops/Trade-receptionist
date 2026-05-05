import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="rounded-[30px] px-6 py-8 text-center sm:px-8 sm:py-10"
      style={{
        background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.08),' +
          '0 24px 54px rgba(2,13,24,0.34),' +
          'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: 'rgba(255,107,43,0.10)',
          boxShadow: '0 0 0 1px rgba(255,107,43,0.18), 0 0 26px rgba(255,107,43,0.10)',
        }}
      >
        <Icon size={22} className="text-orange-soft" strokeWidth={1.7} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Ready when you are</p>
      <p className="mt-3 text-[20px] font-bold text-offwhite font-display tracking-[-0.03em]">{title}</p>
      <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-offwhite/46 font-body">{description}</p>
      {action && (
        <Link
          to={action.href}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-orange-soft transition-all duration-200 font-body hover:-translate-y-0.5"
          style={{
            background: 'rgba(255,107,43,0.08)',
            boxShadow: '0 0 0 1px rgba(255,107,43,0.18)',
          }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
