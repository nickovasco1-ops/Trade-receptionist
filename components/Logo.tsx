import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'color' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'color' }) => {
  const isWhite = variant === 'white';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon mark — inline SVG, no external dependencies */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="tr-logo-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6B2B" />
            <stop offset="1" stopColor="#FF8C55" />
          </linearGradient>
        </defs>

        {/* App-icon rounded square */}
        <rect
          width="36"
          height="36"
          rx="9"
          fill={isWhite ? 'rgba(255,255,255,0.15)' : 'url(#tr-logo-grad)'}
        />

        {/* Phone handset — clean geometric path */}
        <path
          d="M23.5 20.17v2.08a1.39 1.39 0 01-1.51 1.39 13.76 13.76 0 01-6-2.13A13.56 13.56 0 0111.83 17a13.76 13.76 0 01-2.14-6.02 1.39 1.39 0 011.39-1.52h2.08a1.39 1.39 0 011.39 1.2c.088.666.25 1.32.485 1.95a1.39 1.39 0 01-.313 1.47l-.88.88a11.11 11.11 0 004.17 4.17l.88-.88a1.39 1.39 0 011.47-.313c.63.235 1.284.398 1.95.486a1.39 1.39 0 011.2 1.4z"
          stroke="white"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Signal arc — small */}
        <path
          d="M20.5 12c.6.6 1.1 1.5 1.1 2.5"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Signal arc — large */}
        <path
          d="M22.5 10c1.1 1.1 1.9 2.7 1.9 4.5"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Wordmark — HTML text so font always loads correctly */}
      <div className="leading-none">
        <div
          className="font-display font-bold text-[17px] leading-none tracking-[-0.02em]"
          style={{ color: isWhite ? '#ffffff' : '#F0F4F8' }}
        >
          Trade
        </div>
        <div
          className="font-display font-semibold text-[10px] leading-none tracking-[0.09em] uppercase mt-[3px]"
          style={{ color: isWhite ? 'rgba(255,255,255,0.5)' : 'rgba(240,244,248,0.45)' }}
        >
          Receptionist
        </div>
      </div>
    </div>
  );
};

// ─── Icon-only mark (for favicon, app icon contexts) ─────────────────────────
export const LogoMark: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="tr-mark-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF6B2B" />
        <stop offset="1" stopColor="#FF8C55" />
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="9" fill="url(#tr-mark-grad)" />
    <path
      d="M23.5 20.17v2.08a1.39 1.39 0 01-1.51 1.39 13.76 13.76 0 01-6-2.13A13.56 13.56 0 0111.83 17a13.76 13.76 0 01-2.14-6.02 1.39 1.39 0 011.39-1.52h2.08a1.39 1.39 0 011.39 1.2c.088.666.25 1.32.485 1.95a1.39 1.39 0 01-.313 1.47l-.88.88a11.11 11.11 0 004.17 4.17l.88-.88a1.39 1.39 0 011.47-.313c.63.235 1.284.398 1.95.486a1.39 1.39 0 011.2 1.4z"
      stroke="white"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M20.5 12c.6.6 1.1 1.5 1.1 2.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    <path d="M22.5 10c1.1 1.1 1.9 2.7 1.9 4.5" stroke="rgba(255,255,255,0.38)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);
