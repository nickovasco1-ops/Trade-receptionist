import React, { useState } from 'react';
import { Banknote, AlertCircle } from 'lucide-react';

export const Calculator: React.FC = () => {
  const [avgJobValue, setAvgJobValue] = useState(150);
  const [missedCalls, setMissedCalls] = useState(5);

  const conversionRate = 0.25;
  const weeklyLoss = Math.round(avgJobValue * missedCalls * conversionRate);
  const yearlyLoss = weeklyLoss * 50;

  return (
    <div
      className="rounded-card overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.05)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.4)',
      }}
    >
      {/* Header strip — tonal elevation separates from body, no border needed */}
      <div
        className="px-8 py-6 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,107,43,0.15)' }}
        >
          <Banknote className="w-5 h-5 text-orange" />
        </div>
        <div>
          <h3 className="font-display font-bold text-[16px] text-offwhite tracking-tight">
            Lost Revenue Calculator
          </h3>
          <p className="text-[12px] text-offwhite/35">How much is voicemail costing you?</p>
        </div>
      </div>

      {/* Sliders */}
      <div className="p-8 space-y-8">
        <div>
          <div className="flex justify-between mb-3">
            <label className="text-[13px] font-bold text-offwhite/60 uppercase tracking-[0.08em]">
              Average Job Value
            </label>
            <span className="font-display font-bold text-[15px] text-orange">£{avgJobValue}</span>
          </div>
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={avgJobValue}
            onChange={e => setAvgJobValue(Number(e.target.value))}
            className="w-full"
            aria-label="Average job value in pounds"
          />
          <div className="flex justify-between text-[11px] text-offwhite/25 mt-2">
            <span>£50</span>
            <span>£1,000+</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-3">
            <label className="text-[13px] font-bold text-offwhite/60 uppercase tracking-[0.08em]">
              Missed Calls / Week
            </label>
            <span className="font-display font-bold text-[15px] text-orange">{missedCalls} calls</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={missedCalls}
            onChange={e => setMissedCalls(Number(e.target.value))}
            className="w-full"
            aria-label="Number of missed calls per week"
          />
          <div className="flex justify-between text-[11px] text-offwhite/25 mt-2">
            <span>1 call</span>
            <span>50 calls</span>
          </div>
        </div>

        {/* Result */}
        <div
          className="rounded-card p-7 text-center relative overflow-hidden"
          style={{
            background: 'rgba(255,107,43,0.08)',
            boxShadow: '0 0 0 1px rgba(255,107,43,0.15)',
          }}
        >
          {/* Atmospheric glow */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(circle, rgba(255,107,43,0.3) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />

          <div className="relative z-10">
            <p className="text-[13px] font-semibold text-offwhite/40 mb-2 tracking-wide uppercase">
              You could be losing
            </p>
            <div className="font-display text-5xl md:text-6xl font-bold text-offwhite tracking-[-0.03em] mb-2">
              £{yearlyLoss.toLocaleString()}
            </div>
            <p className="text-[14px] text-offwhite/40 mb-4">per year to voicemail</p>

            <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-orange-soft px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,107,43,0.12)' }}>
              <AlertCircle className="w-3.5 h-3.5" />
              Based on a conservative 25% conversion rate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
