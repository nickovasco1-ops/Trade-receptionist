import React from 'react';

const LOGO_URL =
  'https://www.image2url.com/r2/default/images/1776454445054-287e4920-177a-48d3-84b1-55c800b528d5.png';

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
