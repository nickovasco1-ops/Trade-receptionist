import React, { useMemo, useState } from 'react';

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  prefix = '',
  suffix = '',
  help,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  prefix?: string;
  suffix?: string;
  help: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-offwhite/84">{label}</span>
      <div
        className="flex items-center rounded-[16px] px-4 py-3"
        style={{
          background: 'rgba(7, 17, 31, 0.84)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {prefix && <span className="mr-2 text-[16px] font-semibold text-orange-soft">{prefix}</span>}
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => {
            const raw = event.target.value.trim();
            const next = Number(raw);

            if (raw === '' || !Number.isFinite(next)) {
              return;
            }

            onChange(Math.min(max, Math.max(min, next)));
          }}
          className="w-full bg-transparent text-[18px] font-semibold text-offwhite outline-none"
        />
        {suffix && <span className="ml-2 text-[14px] font-semibold text-offwhite/45">{suffix}</span>}
      </div>
      <span className="mt-2 block text-[12px] leading-relaxed text-offwhite/40">{help}</span>
    </label>
  );
}

export const Calculator: React.FC = () => {
  const [missedCallsPerWeek, setMissedCallsPerWeek] = useState(6);
  const [averageJobValue, setAverageJobValue] = useState(280);
  const [conversionRate, setConversionRate] = useState(35);

  const potentialLostMonthly = useMemo(() => {
    const estimated = missedCallsPerWeek * averageJobValue * (conversionRate / 100) * 4.33;
    return Math.round(estimated / 10) * 10;
  }, [averageJobValue, conversionRate, missedCallsPerWeek]);

  const yearlyView = potentialLostMonthly * 12;

  return (
    <div
      className="rounded-[24px] p-5 md:p-6"
      style={{
        background: 'linear-gradient(180deg, rgba(20,29,43,0.96) 0%, rgba(10,18,30,0.98) 100%)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.08), 0 28px 60px rgba(2,13,24,0.40), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="grid gap-4">
        <NumberField
          label="Missed calls per week"
          value={missedCallsPerWeek}
          onChange={setMissedCallsPerWeek}
          min={1}
          max={50}
          help="How many genuine callers usually hit voicemail or no answer?"
        />

        <NumberField
          label="Average job value"
          value={averageJobValue}
          onChange={setAverageJobValue}
          min={50}
          max={5000}
          prefix="£"
          help="Use your typical job, quote, or call-out value."
        />

        <NumberField
          label="Estimated conversion rate"
          value={conversionRate}
          onChange={setConversionRate}
          min={5}
          max={100}
          suffix="%"
          help="Roughly how many of those callers would turn into paid work?"
        />
      </div>

      <div
        className="mt-5 rounded-[20px] px-5 py-5"
        style={{
          background: 'linear-gradient(180deg, rgba(255,107,43,0.10) 0%, rgba(255,107,43,0.05) 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,107,43,0.16)',
        }}
      >
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-offwhite/48">
          Potential work lost each month
        </p>
        <div
          className="mt-2 font-display font-bold leading-none text-orange-soft"
          style={{ fontSize: 'clamp(2.8rem, 4vw, 4.5rem)', letterSpacing: '-0.05em' }}
        >
          £{potentialLostMonthly.toLocaleString('en-GB')}
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-offwhite/58">
          That’s around £{yearlyView.toLocaleString('en-GB')} a year in work that could have been booked.
        </p>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-offwhite/48">
        One recovered job could pay for Trade Receptionist.
      </p>
    </div>
  );
};
