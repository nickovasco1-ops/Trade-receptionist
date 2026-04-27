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
    <div className="rounded-card p-10 text-center bg-white/[0.04] shadow-ring-subtle">
      <Icon size={24} className="text-offwhite/20 mx-auto mb-3" strokeWidth={1.5} />
      <p className="text-[14px] font-semibold text-offwhite/60 font-display mb-1">{title}</p>
      <p className="text-[13px] text-offwhite/30 font-body mb-4">{description}</p>
      {action && (
        <Link
          to={action.href}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-orange hover:text-orange-glow transition-colors duration-200 font-body"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
