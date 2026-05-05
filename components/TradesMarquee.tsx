import React, { useRef, useState } from 'react';
import {
  Zap, Droplets, Hammer, Wind, Home,
  Maximize2, Paintbrush, Leaf, Bath, Wrench,
} from 'lucide-react';

const TRADES = [
  { icon: Zap,         label: 'Electricians' },
  { icon: Droplets,    label: 'Plumbers' },
  { icon: Hammer,      label: 'Carpenters' },
  { icon: Wind,        label: 'HVAC' },
  { icon: Home,        label: 'Roofers' },
  { icon: Maximize2,   label: 'Glaziers' },
  { icon: Paintbrush,  label: 'Painters' },
  { icon: Leaf,        label: 'Landscapers' },
  { icon: Bath,        label: 'Bathroom Fitters' },
  { icon: Wrench,      label: 'Builders' },
];

// Duplicate for seamless loop
const ITEMS = [...TRADES, ...TRADES];

export default function TradesMarquee() {
  const [paused, setPaused] = useState(false);
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  return (
    <section
      aria-label="Built for every trade"
      style={{ background: 'var(--color-navy)', padding: '56px 0' }}
    >
      {/* Title */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 mb-8">
        <p
          className="font-display font-bold text-offwhite"
          style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)', letterSpacing: '-0.01em' }}
        >
          Built for every trade
        </p>
      </div>

      {/* Track wrapper — fade masks on edges */}
      <div
        className="relative overflow-hidden"
        style={{ maxHeight: '54px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Left fade */}
        <div
          className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, var(--color-navy), transparent)' }}
        />
        {/* Right fade */}
        <div
          className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, var(--color-navy), transparent)' }}
        />

        {prefersReduced ? (
          /* Static grid fallback */
          <div className="flex flex-wrap gap-3 px-6">
            {TRADES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 rounded-full flex-shrink-0"
                style={{
                  height: '38px',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                }}
              >
                <Icon className="w-[14px] h-[14px] text-offwhite/40" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-[13px] font-semibold text-offwhite/55 font-body whitespace-nowrap">
                  {label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex gap-3"
            style={{
              width: 'max-content',
              animation: 'marquee-scroll 28s linear infinite',
              animationPlayState: paused ? 'paused' : 'running',
              paddingLeft: '24px',
            }}
          >
            {ITEMS.map(({ icon: Icon, label }, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 rounded-full flex-shrink-0"
                style={{
                  height: '38px',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                }}
              >
                <Icon className="w-[14px] h-[14px] text-offwhite/40" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-[13px] font-semibold text-offwhite/55 font-body whitespace-nowrap">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
