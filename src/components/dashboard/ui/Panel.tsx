import type { HTMLAttributes, ReactNode } from 'react';

type PanelVariant = 'default' | 'accent' | 'hover';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
  as?: 'div' | 'article' | 'section';
  children: ReactNode;
}

const VARIANT_CLASSES: Record<PanelVariant, string> = {
  default: 'bg-white/[0.04] shadow-ring-subtle',
  accent: 'bg-orange/[0.08] shadow-card-accent',
  hover:
    'bg-white/[0.04] shadow-ring-subtle transition-all duration-300 ease-mechanical hover:-translate-y-1 hover:shadow-card-hover',
};

export default function Panel({
  variant = 'default',
  as: Component = 'div',
  className = '',
  children,
  ...rest
}: PanelProps) {
  return (
    <Component
      className={`rounded-card p-5 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
