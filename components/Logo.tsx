import React from 'react';

const LOGO_URL = '/assets/logo.png';

interface LogoProps {
  /** Explicit pixel height — controls how large the logo renders */
  height?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ height, className = '' }) => (
  <img
    src={LOGO_URL}
    alt="Trade Receptionist"
    height={height}
    className={className}
    style={{ height: height !== undefined ? height : undefined, width: 'auto', display: 'block' }}
    draggable={false}
  />
);
