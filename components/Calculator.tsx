import React, { useMemo, useState } from 'react';

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  prefix = '',
  suffix = '',
  leftLabel,
  middleLabel,
  rightLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  leftLabel: string;
  middleLabel: string;
  rightLabel: string;
}) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-[15px] text-offwhite/88 font-body">{label}</label>
        <span
          className="inline-flex items-center rounded-[10px] px-3 py-1 text-[15px] font-semibold text-offwhite"
          style={{
            background: 'rgba(12, 24, 44, 0.92)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {prefix}
          {value.toLocaleString('en-GB')}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="w-full"
        style={{
          background: `linear-gradient(90deg, #F4A261 0%, #F4A261 ${progress}%, rgba(255,255,255,0.12) ${progress}%, rgba(255,255,255,0.12) 100%)`,
        }}
      />

      <div className="mt-2 grid grid-cols-3 text-[12px] text-offwhite/45 font-body">
        <span>{leftLabel}</span>
        <span className="text-center">{middleLabel}</span>
        <span className="text-right">{rightLabel}</span>
      </div>
    </div>
  );
}

export const Calculator: React.FC = () => {
  const [avgJobValue, setAvgJobValue] = useState(750);
  const [missedCalls, setMissedCalls] = useState(5);

  const yearlyLoss = useMemo(() => {
    const estimated = avgJobValue * missedCalls * 0.05 * 50;
    return Math.round(estimated / 100) * 100;
  }, [avgJobValue, missedCalls]);

  return (
    <div
      className="rounded-[22px] p-5 md:p-6"
      style={{
        background: 'linear-gradient(180deg, rgba(36,49,72,0.92) 0%, rgba(16,32,56,0.96) 100%)',
        boxShadow:
          '0 0 0 1px rgba(244,162,97,0.42), 0 0 0 3px rgba(244,162,97,0.06), 0 28px 70px rgba(2,13,24,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="rounded-[18px] px-5 py-6 md:px-7 md:py-7" style={{ background: 'rgba(10, 25, 47, 0.55)' }}>
        <h3
          className="font-display font-bold text-offwhite text-center mb-6"
          style={{ fontSize: 'clamp(2rem, 3vw, 2.75rem)', lineHeight: 0.95, letterSpacing: '-0.03em' }}
        >
          Lost Revenue
          <br />
          Calculator
        </h3>

        <div className="h-px mb-6" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <div className="space-y-8">
          <SliderField
            label="Average Job Value"
            value={avgJobValue}
            min={50}
            max={1500}
            step={50}
            onChange={setAvgJobValue}
            prefix="£"
            leftLabel="£50"
            middleLabel="£750"
            rightLabel="£1,500+"
          />

          <SliderField
            label="Missed Calls / Week"
            value={missedCalls}
            min={1}
            max={50}
            step={1}
            onChange={setMissedCalls}
            leftLabel="1"
            middleLabel="5"
            rightLabel="50+"
          />
        </div>

        <div
          className="mt-8 rounded-[18px] px-5 py-6 text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(7,18,36,0.94) 0%, rgba(11,24,44,0.98) 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(244,162,97,0.50), 0 14px 40px rgba(2,13,24,0.45)',
          }}
        >
          <p className="text-[14px] font-semibold tracking-[0.08em] uppercase text-offwhite/90 mb-3">
            You could be losing
          </p>
          <div
            className="font-display font-bold mb-2"
            style={{
              fontSize: 'clamp(3rem, 5vw, 4.75rem)',
              lineHeight: 0.92,
              letterSpacing: '-0.05em',
              color: '#F4A261',
              textShadow: '0 0 28px rgba(244,162,97,0.28)',
            }}
          >
            £{yearlyLoss.toLocaleString('en-GB')}
          </div>
          <p className="text-[18px] text-[#F4A261] font-body">per year to voicemail</p>
        </div>

        <p className="mt-5 text-center text-[13px] text-offwhite/55 font-body">
          Based on a conservative 25% conversion rate
        </p>
      </div>
    </div>
  );
};
