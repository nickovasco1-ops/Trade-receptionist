import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold font-body rounded-btn transition-all duration-300 ease-mechanical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-6 py-3 text-[14px]',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-gradient-to-r from-orange to-orange-glow shadow-orange-glow hover:shadow-orange-glow-lg hover:-translate-y-0.5 active:translate-y-0',
  secondary:
    'text-offwhite bg-white/[0.08] shadow-ring-default hover:bg-white/[0.10] hover:shadow-ring-strong',
  ghost:
    'text-offwhite/60 hover:text-offwhite hover:bg-white/[0.05]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={`${BASE} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';

export default Button;
