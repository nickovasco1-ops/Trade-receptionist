import { Fragment, useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { CheckCircle, ArrowRight, User, Briefcase, Clock, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../../components/Logo';
import Button from '../components/dashboard/ui/Button';
import { PLANS } from '../lib/plans';
import type { Plan } from '../../shared/types';

type Step = 'business' | 'contact' | 'hours' | 'plan';

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

const STEPS: { key: Step; label: string; icon: ElementType }[] = [
  { key: 'business', label: 'Business', icon: Briefcase },
  { key: 'contact',  label: 'Contact',  icon: User },
  { key: 'hours',    label: 'Hours',    icon: Clock },
  { key: 'plan',     label: 'Plan',     icon: Zap },
];

const TRADES = [
  'Plumber', 'Electrician', 'HVAC Engineer', 'Builder', 'Plasterer',
  'Tiler', 'Roofer', 'Painter & Decorator', 'Carpenter', 'Gas Engineer', 'Other',
];

const FIELD_CLASS =
  'w-full px-3.5 py-2.5 rounded-field text-[14px] font-body text-offwhite placeholder:text-offwhite/25 outline-none bg-white/[0.06] shadow-ring-default focus:shadow-ring-strong focus:ring-2 focus:ring-orange/40 transition-shadow duration-200';

const LABEL_CLASS =
  'block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body';

function StepIndicator({ current }: { current: Step }) {
  const activeIdx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0 mb-10" aria-label="Onboarding progress">
      {STEPS.slice(0, 3).map(({ key, label, icon: Icon }, i) => {
        const done   = i < activeIdx;
        const active = i === activeIdx;
        const dotClasses = done
          ? 'bg-status-success/15 shadow-[0_0_0_1px_rgba(134,239,172,0.30)]'
          : active
          ? 'bg-orange/15 shadow-[0_0_0_1px_rgba(255,107,43,0.40)]'
          : 'bg-white/[0.06] shadow-ring-default';
        const labelColor = active ? 'text-orange' : done ? 'text-status-success' : 'text-offwhite/30';
        return (
          <Fragment key={key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${dotClasses}`}
              >
                {done
                  ? <CheckCircle size={14} className="text-status-success" aria-hidden="true" />
                  : <Icon size={13} className={active ? 'text-orange' : 'text-offwhite/30'} aria-hidden="true" />
                }
              </div>
              <span className={`text-[10px] font-body mt-1 font-semibold tracking-wide ${labelColor}`}>
                {label}
              </span>
            </div>
            {i < 3 && (
              <div
                className={`h-px flex-1 mb-5 mx-2 transition-all duration-300 ${done ? 'bg-status-success/30' : 'bg-white/[0.08]'}`}
                aria-hidden="true"
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const meta = session.user.user_metadata as Record<string, string> | undefined;
      const name = meta?.full_name ?? meta?.name ?? '';
      if (name) setForm(prev => ({ ...prev, owner_name: prev.owner_name || name }));
    });
  }, []);

  function set(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function goToStripe(plan: Plan) {
    const config = PLANS.find(p => p.key === plan);
    if (config) window.location.href = config.stripeUrl;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 font-body bg-[radial-gradient(ellipse_at_30%_30%,rgba(255,107,43,0.07)_0%,transparent_60%)] bg-navy">
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Logo className="h-7 w-auto" />
        </div>

        <StepIndicator current={step} />

        <div className="rounded-card p-8 bg-white/[0.06] backdrop-blur-[24px] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(2,13,24,0.5)]">

          {step === 'business' && (
            <>
              <h1 className="text-[22px] font-bold text-offwhite font-display mb-1">Your business</h1>
              <p className="text-[14px] text-offwhite/50 font-body mb-6">Tell us about your trade so we can personalise your receptionist.</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="onb-biz" className={LABEL_CLASS}>Business name</label>
                  <input id="onb-biz" className={FIELD_CLASS} value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Mark Thomas Plumbing Ltd" />
                </div>
                <div>
                  <label htmlFor="onb-trade" className={LABEL_CLASS}>Trade type</label>
                  <select id="onb-trade" className={`${FIELD_CLASS} appearance-none cursor-pointer`} value={form.trade_type} onChange={e => set('trade_type', e.target.value)}>
                    <option value="">Select your trade…</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="onb-city" className={LABEL_CLASS}>City / area</label>
                  <input id="onb-city" className={FIELD_CLASS} value={form.city} onChange={e => set('city', e.target.value)} placeholder="South London" />
                </div>
              </div>
              <Button
                onClick={() => setStep('contact')}
                disabled={!form.business_name || !form.trade_type}
                className="mt-6 w-full"
              >
                Next <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </>
          )}

          {step === 'contact' && (
            <>
              <h1 className="text-[22px] font-bold text-offwhite font-display mb-1">Your contact details</h1>
              <p className="text-[14px] text-offwhite/50 font-body mb-6">We'll send call summaries and alerts here.</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="onb-name" className={LABEL_CLASS}>Your name</label>
                  <input id="onb-name" className={FIELD_CLASS} value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Mark Thomas" />
                </div>
                <div>
                  <label htmlFor="onb-mobile" className={LABEL_CLASS}>Mobile number (for SMS alerts)</label>
                  <input id="onb-mobile" type="tel" className={FIELD_CLASS} value={form.owner_mobile} onChange={e => set('owner_mobile', e.target.value)} placeholder="+44 7700 900000" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setStep('business')} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep('hours')}
                  disabled={!form.owner_name || !form.owner_mobile}
                  className="flex-[2]"
                >
                  Next <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </div>
            </>
          )}

          {step === 'hours' && (
            <>
              <h1 className="text-[22px] font-bold text-offwhite font-display mb-1">Working hours</h1>
              <p className="text-[14px] text-offwhite/50 font-body mb-6">Your AI receptionist knows when you're open.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="onb-start" className={LABEL_CLASS}>Start time</label>
                  <input id="onb-start" type="time" className={FIELD_CLASS} value={form.work_start} onChange={e => set('work_start', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="onb-end" className={LABEL_CLASS}>End time</label>
                  <input id="onb-end" type="time" className={FIELD_CLASS} value={form.work_end} onChange={e => set('work_end', e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setStep('contact')} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep('plan')} className="flex-[2]">
                  Choose a plan <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </div>
            </>
          )}

          {step === 'plan' && (
            <>
              <h1 className="text-[22px] font-bold text-offwhite font-display mb-1">Choose your plan</h1>
              <p className="text-[14px] text-offwhite/50 font-body mb-5">
                14-day free trial on every plan. No card charge today.
              </p>
              <div className="space-y-3 mb-5">
                {PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    onClick={() => goToStripe(plan.key)}
                    className="w-full text-left rounded-[14px] p-4 transition-all duration-300 hover:-translate-y-0.5"
                    style={
                      plan.popular
                        ? {
                            background: 'rgba(255,107,43,0.08)',
                            boxShadow: '0 0 0 1.5px rgba(255,107,43,0.35)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.05)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                          }
                    }
                  >
                    {plan.popular && (
                      <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-orange mb-2 font-body">
                        ★ Most popular
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-[17px] text-offwhite">{plan.name}</span>
                        {plan.popular && <Zap size={13} className="text-orange" aria-hidden="true" />}
                      </div>
                      <div>
                        <span className="font-display font-bold text-[20px] text-offwhite">£{plan.price}</span>
                        <span className="text-[12px] text-offwhite/40 font-body">/mo</span>
                      </div>
                    </div>
                    <p className="text-[12px] text-offwhite/40 font-body mb-2">{plan.calls}</p>
                    <ul className="space-y-1">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-1.5 text-[12px] text-offwhite/55 font-body">
                          <CheckCircle size={11} className="text-orange-soft/60 flex-shrink-0" aria-hidden="true" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <div
                      className="mt-3 w-full h-10 rounded-[10px] flex items-center justify-center gap-1.5 text-[13px] font-bold font-body"
                      style={
                        plan.popular
                          ? { background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)', color: '#fff' }
                          : { background: 'rgba(255,255,255,0.07)', color: 'rgba(240,244,248,0.75)' }
                      }
                    >
                      Start free trial <ArrowRight size={13} aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
              <Button type="button" variant="secondary" onClick={() => setStep('hours')} className="w-full">
                Back
              </Button>
              <p className="text-center text-[12px] text-offwhite/25 font-body mt-3">
                Cancel anytime · No setup fees · 14-day free trial
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
