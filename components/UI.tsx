import React, { useRef, useState } from 'react';

// ─── Status Gauge ────────────────────────────────────────────────────────────
interface StatusGaugeProps {
  value: number;       // 0–100
  label: string;       // e.g. "Calls Answered"
  metric: string;      // e.g. "98.7%"
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'blue';
}

export const StatusGauge: React.FC<StatusGaugeProps> = ({
  value,
  label,
  metric,
  size = 'md',
  color = 'orange',
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ≈ 238.8
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - clampedValue / 100);

  const sizeMap = { sm: 80, md: 112, lg: 148 };
  const svgSize = sizeMap[size];
  const fontSizes = { sm: 13, md: 17, lg: 22 };
  const labelSizes = { sm: 9, md: 11, lg: 13 };

  const gradOrange = { from: '#FF6B2B', to: '#FF8C55' };
  const gradBlue   = { from: '#99cbff', to: '#60A5FA' };
  const grad = color === 'orange' ? gradOrange : gradBlue;
  const glowColor = color === 'orange'
    ? 'drop-shadow(0 0 5px rgba(255,107,43,0.7))'
    : 'drop-shadow(0 0 5px rgba(153,203,255,0.7))';

  const id = `sg-${color}-${label.replace(/\s+/g, '')}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 100 100"
          aria-label={`${label}: ${metric}`}
        >
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={grad.from} />
              <stop offset="100%" stopColor={grad.to}   />
            </linearGradient>
          </defs>

          {/* Background ring */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="7"
          />

          {/* Foreground arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{
              transition: 'stroke-dashoffset 800ms cubic-bezier(0.25,0.46,0.45,0.94)',
              filter: glowColor,
            }}
          />

          {/* Metric */}
          <text
            x="50" y="48"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color === 'orange' ? '#FF8C55' : '#99cbff'}
            fontSize={fontSizes[size]}
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
          >
            {metric}
          </text>
        </svg>
      </div>

      <span
        className="text-center font-bold uppercase tracking-[0.10em] text-offwhite/40"
        style={{ fontSize: labelSizes[size] }}
      >
        {label}
      </span>
    </div>
  );
};

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  style,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    setOffset({
      x: (e.clientX - (left + width  / 2)) * 0.08,
      y: (e.clientY - (top  + height / 2)) * 0.08,
    });
  };

  const handleMouseLeave = () => setOffset({ x: 0, y: 0 });

  const base =
    'inline-flex items-center justify-center font-semibold tracking-[-0.015em] ' +
    'disabled:opacity-50 disabled:pointer-events-none select-none relative ' +
    'active:scale-[0.985] will-change-transform';

  const variants: Record<string, string> = {
    primary:
      'rounded-btn text-white ring-1 ring-[#ffc49f]/10 ' +
      'shadow-[0_16px_36px_rgba(249,115,22,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]',
    secondary:
      'rounded-btn bg-[linear-gradient(180deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.06)_100%)] text-accent ' +
      'ring-1 ring-white/10 shadow-[0_12px_26px_rgba(2,13,24,0.22)] hover:bg-white/[0.13] hover:ring-accent/20',
    outline:
      'rounded-btn bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] text-offwhite ' +
      'ring-1 ring-white/10 shadow-[0_10px_24px_rgba(2,13,24,0.18)] hover:bg-white/[0.10] hover:ring-white/18 backdrop-blur-sm',
    ghost:
      'bg-transparent text-offwhite/60 hover:text-offwhite hover:bg-white/[0.06] rounded-btn',
  };

  const sizes: Record<string, string> = {
    sm: 'h-10 px-5 text-[13px]',
    md: 'h-12 px-6 text-[14px]',
    lg: 'h-14 px-8 text-[15px]',
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        handleMouseLeave();
      }}
      style={{
        transform: `translate(${offset.x}px, ${offset.y + (hovered ? -2 : 0)}px)`,
        transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease, opacity 150ms ease',
        background: variant === 'primary'
          ? 'linear-gradient(135deg, #F97316 0%, #F4A261 100%)'
          : style?.background,
        ...style,
      }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ─── Glass Card ───────────────────────────────────────────────────────────────
export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`glass glass-ring glass-ring-hover rounded-card ${className}`}
    style={{ transition: 'transform 300ms cubic-bezier(0.34,1.2,0.64,1), box-shadow 300ms cubic-bezier(0.34,1.2,0.64,1)' }}
  >
    {children}
  </div>
);

// ─── Card (dark elevated surface) ────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`bg-navy-mid rounded-card shadow-[0_2px_8px_rgba(2,13,24,0.30)] ${className}`}>
    {children}
  </div>
);

// ─── Section Wrapper ──────────────────────────────────────────────────────────
export const Section: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
  bg?: 'white' | 'gray' | 'gradient' | 'void';
}> = ({ children, className = '', id, bg = 'white' }) => {
  // Semi-transparent surfaces — the fixed cinematic scene breathes through them.
  // "gray" is slightly more elevated (darker overlay) to differentiate from "white".
  const bgMap: Record<string, string> = {
    white:    'rgba(5, 20, 38, 0.50)',
    gray:     'rgba(9, 29, 54, 0.64)',
    gradient: 'rgba(2, 13, 24, 0.82)',
    void:     'rgba(2, 13, 24, 0.82)',
  };

  return (
    <section
      id={id}
      className={`py-20 md:py-32 ${className}`}
      style={{ backgroundColor: bgMap[bg] }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {children}
      </div>
    </section>
  );
};

// ─── Panel (dashboard flat tonal card — no glass, no backdrop-blur) ──────────
interface PanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'hover';
}

export const Panel: React.FC<PanelProps> = ({ children, className = '', variant = 'default' }) => {
  const variantClasses: Record<string, string> = {
    default: 'bg-white/[0.04] shadow-ring-subtle',
    accent:  'bg-orange/[0.08] shadow-card-accent',
    hover:   'bg-white/[0.04] shadow-ring-subtle hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300 ease-mechanical',
  };
  return (
    <div className={`rounded-card p-5 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};

// ─── Eyebrow Badge ────────────────────────────────────────────────────────────
export const Badge: React.FC<{
  children: React.ReactNode;
  color?: 'orange' | 'blue';
}> = ({ children, color = 'orange' }) => (
  <span
    className={`
      inline-block font-body text-[13px] font-bold tracking-[0.12em] uppercase mb-4
      ${color === 'orange' ? 'text-orange-soft' : 'text-accent'}
    `}
  >
    {children}
  </span>
);
