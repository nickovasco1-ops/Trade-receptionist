import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Phone, User, Briefcase, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../../components/Logo';

type Step = 'business' | 'contact' | 'hours' | 'provisioning' | 'done';

interface FormData {
  business_name: string;
  trade_type:    string;
  owner_name:    string;
  owner_mobile:  string;
  owner_email:   string;
  city:          string;
  work_start:    string;
  work_end:      string;
  timezone:      string;
}

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'business',     label: 'Business',    icon: Briefcase },
  { key: 'contact',      label: 'Contact',     icon: User },
  { key: 'hours',        label: 'Hours',       icon: Clock },
  { key: 'provisioning', label: 'Setting up',  icon: Phone },
];

const TRADES = [
  'Plumber', 'Electrician', 'HVAC Engineer', 'Builder', 'Plasterer',
  'Tiler', 'Roofer', 'Painter & Decorator', 'Carpenter', 'Gas Engineer', 'Other',
];

function StepIndicator({ current }: { current: Step }) {
  const activeIdx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.slice(0, 3).map(({ key, label, icon: Icon }, i) => {
        const done   = i < activeIdx;
        const active = i === activeIdx;
        return (
          <React.Fragment key={key}>
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: done
                    ? 'rgba(34,197,94,0.15)'
                    : active
                    ? 'rgba(255,107,43,0.15)'
                    : 'rgba(255,255,255,0.06)',
                  border: active ? '1px solid rgba(255,107,43,0.4)' : done ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {done
                  ? <CheckCircle size={14} className="text-green-400" />
                  : <Icon size={13} className={active ? 'text-orange' : 'text-offwhite/30'} />
                }
              </div>
              <span className={`text-[10px] font-body mt-1 font-semibold tracking-wide ${active ? 'text-orange' : done ? 'text-green-400' : 'text-offwhite/30'}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className="h-px flex-1 mb-5 mx-2 transition-all duration-300"
                style={{ background: done ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('business');
  const [form, setForm] = useState<FormData>({
    business_name: '',
    trade_type:    '',
    owner_name:    '',
    owner_mobile:  '',
    owner_email:   '',
    city:          '',
    work_start:    '08:00',
    work_end:      '18:00',
    timezone:      'Europe/London',
  });
  const [provisionError, setProvisionError] = useState('');

  function set(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function provision() {
    setStep('provisioning');
    setProvisionError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const res  = await fetch('/api/clients/provision', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, owner_email: user.email }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Provisioning failed');
      }

      setStep('done');
    } catch (err: unknown) {
      setProvisionError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('hours'); // go back so user can retry
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-[10px] text-[14px] font-body text-offwhite placeholder-offwhite/25 outline-none transition-all duration-200";
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' };

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,107,43,0.4)';
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(255,107,43,0.07) 0%, transparent 60%), #051426', fontFamily: 'Manrope, sans-serif' }}
    >
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: 'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Logo className="h-7 w-auto" />
        </div>

        {step !== 'done' && step !== 'provisioning' && <StepIndicator current={step} />}

        <div className="rounded-card p-8" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(2,13,24,0.5)' }}>

          {/* ── Step: Business ───────────────────────── */}
          {step === 'business' && (
            <>
              <h1 className="text-[22px] font-bold text-offwhite font-display mb-1">Your business</h1>
              <p className="text-[14px] text-offwhite/50 font-body mb-6">Tell us about your trade so we can personalise your receptionist.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body">Business name</label>
                  <input className={inputClass} style={inputStyle} value={form.business_name} onChange={e => set('business_name', e.target.value)} onFocus={handleFocus} onBlur={handleBlur} placeholder="Mark Thomas Plumbing Ltd" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body">Trade type</label>
                  <select className={inputClass} style={inputStyle} value={form.trade_type} onChange={e => set('trade_type', e.target.value)} onFocus={handleFocus} onBlur={handleBlur}>
                    <option value="">Select your trade…</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body">City / area</label>
                  <input className={inputClass} style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} onFocus={handleFocus} onBlur={handleBlur} placeholder="South London" />
                </div>
              </div>
              <button
                onClick={() => setStep('contact')}
                disabled={!form.business_name || !form.trade_type}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-btn font-semibold text-[15px] text-white font-body transition-all duration-300 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)', boxShadow: '0 0 24px rgba(255,107,43,0.35)' }}
              >
                Next <ArrowRight size={15} />
              </button>
            </>
          )}

          {/* ── Step: Contact ────────────────────────── */}
          {step === 'contact' && (
            <>
              <h1 className="text-[22px] font-bold text-offwhite font-display mb-1">Your contact details</h1>
              <p className="text-[14px] text-offwhite/50 font-body mb-6">We'll send call summaries and alerts here.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body">Your name</label>
                  <input className={inputClass} style={inputStyle} value={form.owner_name} onChange={e => set('owner_name', e.target.value)} onFocus={handleFocus} onBlur={handleBlur} placeholder="Mark Thomas" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body">Mobile number (for SMS alerts)</label>
                  <input type="tel" className={inputClass} style={inputStyle} value={form.owner_mobile} onChange={e => set('owner_mobile', e.target.value)} onFocus={handleFocus} onBlur={handleBlur} placeholder="+44 7700 900000" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep('business')} className="flex-1 py-3 rounded-btn font-semibold text-[14px] text-offwhite/50 font-body transition-all duration-200" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  Back
                </button>
                <button
                  onClick={() => setStep('hours')}
                  disabled={!form.owner_name || !form.owner_mobile}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-btn font-semibold text-[15px] text-white font-body transition-all duration-300 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)', boxShadow: '0 0 24px rgba(255,107,43,0.35)' }}
                >
                  Next <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── Step: Hours ──────────────────────────── */}
          {step === 'hours' && (
            <>
              <h1 className="text-[22px] font-bold text-offwhite font-display mb-1">Working hours</h1>
              <p className="text-[14px] text-offwhite/50 font-body mb-6">Your AI receptionist knows when you're open.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body">Start time</label>
                  <input type="time" className={inputClass} style={inputStyle} value={form.work_start} onChange={e => set('work_start', e.target.value)} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body">End time</label>
                  <input type="time" className={inputClass} style={inputStyle} value={form.work_end} onChange={e => set('work_end', e.target.value)} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
              </div>

              {provisionError && (
                <p className="mt-4 text-[13px] text-red-400 font-body">{provisionError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep('contact')} className="flex-1 py-3 rounded-btn font-semibold text-[14px] text-offwhite/50 font-body transition-all duration-200" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  Back
                </button>
                <button
                  onClick={provision}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-btn font-semibold text-[15px] text-white font-body transition-all duration-300"
                  style={{ background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)', boxShadow: '0 0 24px rgba(255,107,43,0.35)' }}
                >
                  Launch my receptionist <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── Step: Provisioning ───────────────────── */}
          {step === 'provisioning' && (
            <div className="text-center py-6">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,107,43,0.12)' }}>
                  <Phone className="text-orange w-6 h-6 animate-pulse" />
                </div>
              </div>
              <h2 className="text-[20px] font-bold text-offwhite font-display mb-3">Setting up your receptionist…</h2>
              <div className="space-y-2 text-left max-w-xs mx-auto">
                {[
                  'Creating your AI agent',
                  'Assigning a UK phone number',
                  'Configuring your business profile',
                  'Running final checks',
                ].map((msg, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[13px] text-offwhite/50 font-body">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse flex-shrink-0" style={{ animationDelay: `${i * 200}ms` }} />
                    {msg}
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-offwhite/30 font-body mt-6">This usually takes under 30 seconds.</p>
            </div>
          )}

          {/* ── Step: Done ───────────────────────────── */}
          {step === 'done' && (
            <div className="text-center">
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
                  <CheckCircle className="text-green-400 w-7 h-7" strokeWidth={1.5} />
                </div>
              </div>
              <h2 className="text-[22px] font-bold text-offwhite font-display mb-2">Your receptionist is live!</h2>
              <p className="text-[14px] text-offwhite/50 font-body mb-6 leading-relaxed">
                Your AI receptionist is now answering calls 24/7. We've sent your new phone number to <strong className="text-offwhite/70">{form.owner_mobile}</strong>.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-btn font-semibold text-[15px] text-white font-body transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)', boxShadow: '0 0 24px rgba(255,107,43,0.35)' }}
              >
                Go to dashboard <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
