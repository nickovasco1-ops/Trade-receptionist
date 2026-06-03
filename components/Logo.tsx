import React from 'react';

const LOCKUP_URL = '/assets/logo.png';   // Full vertical lockup: glyph + "Trade Receptionist" wordmark
const MARK_URL = '/assets/logo-mark.png'; // Icon-only mark: house + phone glyph (use in tight horizontal bars)

type LogoVariant = 'lockup' | 'mark';

interface LogoProps {
  /** Which asset to render. 'lockup' (default) includes the wordmark; 'mark' is the glyph only. */
  variant?: LogoVariant;
  /** Explicit pixel height — controls how large the logo renders */
  height?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'lockup', height, className = '' }) => (
  <img
    src={variant === 'mark' ? MARK_URL : LOCKUP_URL}
    alt="Trade Receptionist"
    height={height}
    className={className}
    style={{ height: height !== undefined ? height : undefined, width: 'auto', display: 'block' }}
    draggable={false}
  />
);
