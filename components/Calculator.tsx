import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// ── StepInput ─────────────────────────────────────────────────────────────────
// Free-type input with ± stepper buttons. Uses string state internally so users
// can type any number without mid-entry clamping. Commits on blur or Enter.

interface StepInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  hint: string;
}

function StepInput({ label, value, onChange, min, max, step, prefix, suffix, hint }: StepInputProps) {
  const [raw, setRaw] = useState(String(value));

  // Keep raw in sync when parent drives a change (e.g. from ± buttons)
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = useCallback(
    (str: string) => {
      const cleaned = str.replace(/[£%,\s]/g, '');
      const parsed = parseInt(cleaned, 10);
      const clamped = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min;
      setRaw(String(clamped));
      onChange(clamped);
    },
    [min, max, onChange],
  );

  const decrement = () => {
    const next = Math.max(min, value - step);
    setRaw(String(next));
    onChange(next);
  };

  const increment = () => {
    const next = Math.min(max, value + step);
    setRaw(String(next));
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-offwhite/50 leading-none">
          {label}
        </span>
        <span className="text-right text-[11px] leading-snug text-offwhite/25 shrink-0 max-w-[140px]">
          {hint}
        </span>
      </div>
      <div
        className="flex items-center overflow-hidden"
        style={{
          borderRadius: '10px',
          background: 'rgba(2,10,22,0.75)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
        }}
      >
        {/* Decrement */}
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-[20px] font-light text-offwhite/35 disabled:opacity-20"
          style={{ transition: 'background 150ms ease, color 150ms ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,244,248,0.85)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = ''; }}
        >
          −
        </button>

        {/* Input */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center px-1">
          {prefix && (
            <span
              className="mr-0.5 select-none text-[15px] font-semibold leading-none"
              style={{ color: '#ffb59a' }}
            >
              {prefix}
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(raw);
              if (e.key === 'ArrowUp') { e.preventDefault(); increment(); }
              if (e.key === 'ArrowDown') { e.preventDefault(); decrement(); }
            }}
            className="w-full min-w-0 bg-transparent text-center text-[17px] font-semibold text-offwhite outline-none"
            style={{ fontFeatureSettings: '"tnum"', letterSpacing: '-0.01em' }}
          />
          {suffix && (
            <span className="ml-0.5 select-none text-[13px] font-semibold text-offwhite/35">
              {suffix}
            </span>
          )}
        </div>

        {/* Increment */}
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-[20px] font-light text-offwhite/35 disabled:opacity-20"
          style={{ transition: 'background 150ms ease, color 150ms ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,244,248,0.85)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = ''; }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      className="h-px w-full"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }}
    />
  );
}

// ── Calculator ─────────────────────────────────────────────────────────────────

const STARTER_MONTHLY = 49;

export function Calculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(6);
  const [jobValue, setJobValue] = useState(280);
  const [conversionPct, setConversionPct] = useState(35);

  const monthly = useMemo(() => {
    const raw = missedPerWeek * jobValue * (conversionPct / 100) * 4.33;
    return Math.round(raw / 10) * 10;
  }, [missedPerWeek, jobValue, conversionPct]);

  const weekly = useMemo(() => Math.round(monthly / 4.33 / 10) * 10, [monthly]);
  const annual = monthly * 12;

  const roiMultiple = monthly > 0 ? Math.round(monthly / STARTER_MONTHLY) : null;
  const breakEven = useMemo(() => {
    const perCall = jobValue * (conversionPct / 100);
    if (perCall <= 0) return null;
    return Math.ceil(STARTER_MONTHLY / perCall);
  }, [jobValue, conversionPct]);

  // Subscription bar: what fraction of the monthly loss is the TR subscription?
  const subBarPct = monthly > 0 ? Math.min(100, Math.round((STARTER_MONTHLY / monthly) * 100)) : 0;

  // Animate the annual number on change
  const annualRef = useRef<HTMLDivElement>(null);
  const prevAnnual = useRef(annual);
  useEffect(() => {
    if (prevAnnual.current !== annual && annualRef.current) {
      const el = annualRef.current;
      el.style.opacity = '0.45';
      el.style.transform = 'translateY(-4px)';
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }),
      );
      prevAnnual.current = annual;
    }
  }, [annual]);

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: '20px',
        background: 'linear-gradient(160deg, rgba(6,18,36,0.97) 0%, rgba(3,12,24,0.99) 100%)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.07), 0 40px 80px rgba(2,13,24,0.55), 0 8px 16px rgba(2,13,24,0.30)',
      }}
    >
      {/* Header strip */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ background: 'rgba(2,10,22,0.55)' }}
      >
        <div
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: '#FF6B2B', boxShadow: '0 0 6px rgba(255,107,43,0.6)' }}
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-offwhite/30">
          Income loss calculator
        </span>
      </div>

      <Divider />

      <div className="grid md:grid-cols-[1.1fr_1fr]">
        {/* ── Left: Inputs ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 p-5">
          <StepInput
            label="Missed calls / week"
            value={missedPerWeek}
            onChange={setMissedPerWeek}
            min={1}
            max={60}
            step={1}
            hint="Genuine callers who went unanswered"
          />
          <StepInput
            label="Average job value"
            value={jobValue}
            onChange={setJobValue}
            min={20}
            max={10000}
            step={10}
            prefix="£"
            hint="Quote, call-out, or typical job fee"
          />
          <StepInput
            label="Calls that convert"
            value={conversionPct}
            onChange={setConversionPct}
            min={5}
            max={100}
            step={5}
            suffix="%"
            hint="Enquiries that become paid work"
          />

          {/* Formula note */}
          <p
            className="mt-auto text-[11px] leading-relaxed"
            style={{ color: 'rgba(240,244,248,0.22)' }}
          >
            {missedPerWeek} calls × £{jobValue} × {conversionPct}% × 52&nbsp;weeks
          </p>
        </div>

        {/* Vertical separator on desktop, horizontal on mobile */}
        <div
          className="hidden md:block w-px self-stretch"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.06), transparent)' }}
        />
        <div
          className="h-px md:hidden"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
        />

        {/* ── Right: Results ──────────────────────────────────────────────── */}
        <div
          className="flex flex-col p-5"
          style={{ background: 'rgba(255,107,43,0.025)' }}
        >
          {/* Annual — dominant */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(240,244,248,0.32)' }}>
              Annual loss estimate
            </p>
            <div
              ref={annualRef}
              className="mt-1 font-display font-bold leading-[1] tabular-nums"
              style={{
                fontSize: 'clamp(2.8rem, 5vw, 4.8rem)',
                letterSpacing: '-0.04em',
                color: '#ffb59a',
                fontFeatureSettings: '"tnum"',
                transition: 'opacity 280ms cubic-bezier(0.16, 1, 0.3, 1), transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              £{annual.toLocaleString('en-GB')}
            </div>
          </div>

          {/* Monthly + weekly */}
          <div className="mt-4 flex gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.10em]" style={{ color: 'rgba(240,244,248,0.28)' }}>
                Monthly
              </p>
              <p
                className="mt-0.5 font-display font-semibold tabular-nums"
                style={{ fontSize: '1.35rem', letterSpacing: '-0.03em', color: 'rgba(240,244,248,0.75)', fontFeatureSettings: '"tnum"' }}
              >
                £{monthly.toLocaleString('en-GB')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.10em]" style={{ color: 'rgba(240,244,248,0.28)' }}>
                Weekly
              </p>
              <p
                className="mt-0.5 font-display font-semibold tabular-nums"
                style={{ fontSize: '1.35rem', letterSpacing: '-0.03em', color: 'rgba(240,244,248,0.75)', fontFeatureSettings: '"tnum"' }}
              >
                £{weekly.toLocaleString('en-GB')}
              </p>
            </div>
          </div>

          <Divider />
          <div className="my-4" />

          {/* Subscription comparison */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(240,244,248,0.28)' }}>
              vs Trade Receptionist
            </p>

            {/* Proportion bar */}
            {monthly > 0 && (
              <div className="mt-2.5 mb-3">
                <div
                  className="h-1.5 w-full overflow-hidden"
                  style={{ borderRadius: '99px', background: 'rgba(255,107,43,0.15)' }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${subBarPct}%`,
                      minWidth: '4px',
                      borderRadius: '99px',
                      background: '#99cbff',
                      transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between">
                  <span className="text-[10px]" style={{ color: '#99cbff' }}>
                    TR: £{STARTER_MONTHLY}/mo
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,107,43,0.6)' }}>
                    Loss: £{monthly.toLocaleString('en-GB')}/mo
                  </span>
                </div>
              </div>
            )}

            {roiMultiple !== null && roiMultiple > 0 && (
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(240,244,248,0.55)' }}>
                You're losing{' '}
                <strong style={{ color: 'rgba(240,244,248,0.85)' }}>{roiMultiple}×</strong> more than
                the subscription costs each month.
              </p>
            )}
            {breakEven !== null && (
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'rgba(240,244,248,0.35)' }}>
                {breakEven <= 1
                  ? 'One recovered call covers the subscription.'
                  : `${breakEven} recovered calls covers the month.`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
