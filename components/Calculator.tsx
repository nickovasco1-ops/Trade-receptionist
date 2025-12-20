import React, { useState, useEffect } from 'react';
import { Euro, TrendingUp, AlertCircle } from 'lucide-react';

export const Calculator: React.FC = () => {
  const [avgJobValue, setAvgJobValue] = useState(150);
  const [missedCalls, setMissedCalls] = useState(5);
  // Assuming 20% conversion rate on missed calls if answered instantly
  const conversionRate = 0.25; 
  
  const weeklyLoss = Math.round(avgJobValue * missedCalls * conversionRate);
  const yearlyLoss = weeklyLoss * 50; // 50 working weeks

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-tradeBlue-900 p-6 text-white text-center">
        <h3 className="text-xl font-bold flex items-center justify-center gap-2">
          <Euro className="w-5 h-5 text-brand-500" />
          Lost Revenue Calculator
        </h3>
        <p className="text-slate-400 text-sm mt-1">How much is voicemail costing you?</p>
      </div>

      <div className="p-8">
        {/* Sliders */}
        <div className="space-y-8 mb-10">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-slate-700">Average Job Value</label>
              <span className="text-brand-600 font-bold">£{avgJobValue}</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="1000" 
              step="50"
              value={avgJobValue}
              onChange={(e) => setAvgJobValue(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>£50</span>
              <span>£1,000+</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-slate-700">Missed Calls / Week</label>
              <span className="text-brand-600 font-bold">{missedCalls} calls</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              step="1"
              value={missedCalls}
              onChange={(e) => setMissedCalls(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 call</span>
              <span>50 calls</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 text-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-600 font-medium mb-1">You could be losing</p>
            <div className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 mb-2 tracking-tight">
              £{yearlyLoss.toLocaleString()}
            </div>
            <p className="text-slate-500 text-sm font-medium">per year</p>
            
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Based on a conservative 25% win rate
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-200 rounded-full blur-2xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-brand-200 rounded-full blur-2xl opacity-50"></div>
        </div>
      </div>
    </div>
  );
};