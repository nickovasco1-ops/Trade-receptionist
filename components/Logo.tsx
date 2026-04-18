import React from 'react';

interface LogoProps {
  className?: string;
}

/**
 * Inline SVG logo — no CDN dependency.
 * Logo mark: orange gradient rounded square + white phone icon
 * Wordmark: "TRADE" (display weight) + "RECEPTIONIST" (condensed)
 */
export const Logo: React.FC<LogoProps> = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 280 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Trade Receptionist"
    role="img"
  >
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF6B2B" />
        <stop offset="1" stopColor="#FF8C55" />
      </linearGradient>
    </defs>

    {/* ── Logo mark: orange rounded square ── */}
    <rect x="0" y="4" width="40" height="40" rx="10" fill="url(#logo-grad)" />

    {/* Phone icon (scaled from favicon path: original viewBox 36x36 → fits in 40x40 at offset 0,4) */}
    <g transform="translate(2.2, 6.2) scale(1.11)">
      <path
        d="M23.5 20.17v2.08a1.39 1.39 0 01-1.51 1.39 13.76 13.76 0 01-6-2.13A13.56 13.56 0 0111.83 17a13.76 13.76 0 01-2.14-6.02 1.39 1.39 0 011.39-1.52h2.08a1.39 1.39 0 011.39 1.2c.088.666.25 1.32.485 1.95a1.39 1.39 0 01-.313 1.47l-.88.88a11.11 11.11 0 004.17 4.17l.88-.88a1.39 1.39 0 011.47-.313c.63.235 1.284.398 1.95.486a1.39 1.39 0 011.2 1.4z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>

    {/* ── Wordmark ── */}
    {/* "Trade" — large, bold, display */}
    <text
      x="54"
      y="30"
      fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
      fontSize="26"
      fontWeight="800"
      fill="#F0F4F8"
      letterSpacing="-0.5"
    >
      TRADE
    </text>

    {/* "Receptionist" — smaller, medium weight */}
    <text
      x="54"
      y="44"
      fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
      fontSize="13"
      fontWeight="500"
      fill="rgba(240,244,248,0.45)"
      letterSpacing="1.8"
    >
      RECEPTIONIST
    </text>
  </svg>
);

export const LogoMark: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Trade Receptionist"
    role="img"
  >
    <defs>
      <linearGradient id="mark-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF6B2B" />
        <stop offset="1" stopColor="#FF8C55" />
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="9" fill="url(#mark-grad)" />
    <path
      d="M23.5 20.17v2.08a1.39 1.39 0 01-1.51 1.39 13.76 13.76 0 01-6-2.13A13.56 13.56 0 0111.83 17a13.76 13.76 0 01-2.14-6.02 1.39 1.39 0 011.39-1.52h2.08a1.39 1.39 0 011.39 1.2c.088.666.25 1.32.485 1.95a1.39 1.39 0 01-.313 1.47l-.88.88a11.11 11.11 0 004.17 4.17l.88-.88a1.39 1.39 0 011.47-.313c.63.235 1.284.398 1.95.486a1.39 1.39 0 011.2 1.4z"
      stroke="white"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
