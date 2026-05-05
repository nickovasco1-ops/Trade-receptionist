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
  'inline-flex min-h-[46px] items-center justify-center gap-2.5 font-semibold font-body rounded-btn transition-all duration-300 ease-mechanical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2.5 text-[13px]',
  md: 'px-6 py-3 text-[14px]',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-[linear-gradient(135deg,#FF6B2B_0%,#FF8C55_100%)] shadow-[0_16px_34px_rgba(249,115,22,0.26),inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(249,115,22,0.30),inset_0_1px_0_rgba(255,255,255,0.16)] active:translate-y-0',
  secondary:
    'text-offwhite/84 bg-white/[0.05] shadow-[0_0_0_1px_rgba(255,255,255,0.09),0_12px_24px_rgba(2,13,24,0.18)] hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-offwhite',
  ghost:
    'text-offwhite/56 hover:text-offwhite hover:bg-white/[0.05]',
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
