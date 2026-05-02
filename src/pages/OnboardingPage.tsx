import { Fragment, useEffect, useRef, useState } from 'react';
import type { ElementType } from 'react';
import {
  CheckCircle, ArrowRight, User, Briefcase, Clock,
  Loader2, Bot, Wrench, CheckCircle2, Plus, X, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../../components/Logo';
import type { ReceptionistTone } from '../../shared/types';

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 'receptionist' | 'business' | 'services' | 'hours' | 'contact' | 'ready';

interface FormData {
  receptionist_name: string;
  receptionist_tone: ReceptionistTone;
  business_name:     string;
  trade_type:        string;
  city:              string;
  services:          string[];
  work_start:        string;
  work_end:          string;
  working_days:      number[];
  owner_name:        string;
  owner_mobile:      string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string; icon: ElementType }[] = [
  { key: 'receptionist', label: 'Receptionist', icon: Bot },
  { key: 'business',     label: 'Business',     icon: Briefcase },
  { key: 'services',     label: 'Services',     icon: Wrench },
  { key: 'hours',        label: 'Hours',        icon: Clock },
  { key: 'contact',      label: 'Contact',      icon: User },
  { key: 'ready',        label: 'Ready',        icon: CheckCircle2 },
];

const TRADES = [
  'Plumber', 'Electrician', 'HVAC Engineer', 'Builder', 'Plasterer',
  'Tiler', 'Roofer', 'Painter & Decorator', 'Carpenter', 'Gas Engineer', 'Other',
];

const SERVICES_BY_TRADE: Record<string, string[]> = {
  'Plumber':             ['Boiler repair', 'Boiler installation', 'Bathroom fitting', 'Leak detection', 'Drain unblocking', 'Emergency callouts', 'Central heating', 'Water pressure issues', 'Radiator installation', 'Outdoor tap fitting'],
  'Electrician':         ['Full rewiring', 'Fuse board upgrade', 'Lighting installation', 'EV charger installation', 'PAT testing', 'Emergency electrical', 'Smart home wiring', 'Garden lighting', 'Socket installation', 'CCTV installation'],
  'HVAC Engineer':       ['AC installation', 'AC servicing', 'Boiler service', 'Heat pump installation', 'Ventilation systems', 'Emergency callouts', 'Annual maintenance', 'Duct cleaning', 'Refrigerant recharge'],
  'Builder':             ['Extensions', 'Loft conversions', 'New builds', 'Renovations', 'Brickwork & blockwork', 'Damp proofing', 'Underpinning', 'Garage conversions', 'Structural repairs'],
  'Plasterer':           ['Skim coat', 'Full replaster', 'Artex removal', 'Coving installation', 'External render', 'Dry lining', 'Patch repairs'],
  'Tiler':               ['Bathroom tiling', 'Kitchen tiling', 'Floor tiling', 'Wall tiling', 'Wet room fitting', 'Grout repair', 'Tile removal'],
  'Roofer':              ['Roof repairs', 'Full re-roof', 'Flat roof installation', 'Guttering', 'Fascia & soffits', 'Chimney repairs', 'Velux windows', 'Lead work'],
  'Painter & Decorator': ['Interior painting', 'Exterior painting', 'Wallpaper hanging', 'Feature walls', 'Wood staining', 'Gloss work', 'Commercial decorating'],
  'Carpenter':           ['Fitted wardrobes', 'Kitchen fitting', 'Skirting boards', 'Door hanging', 'Decking', 'Fencing', 'Staircase work', 'Bespoke joinery'],
  'Gas Engineer':        ['Boiler service', 'Boiler replacement', 'Gas safety certificates', 'Landlord certificates', 'Cooker installation', 'Emergency gas', 'Central heating'],
  'Other':               ['Emergency callouts', 'General repairs', 'Maintenance', 'Survey & quote'],
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // ISO weekday mapping (0 = Sun)

const TONE_OPTIONS: { value: ReceptionistTone; label: string; description: string; example: string }[] = [
  {
    value:       'friendly',
    label:       'Friendly',
    description: 'Warm and personable. Puts customers at ease.',
    example:     '"Hi there! Brilliant to hear from you — how can I help?"',
  },
  {
    value:       'professional',
    label:       'Professional',
    description: 'Formal and composed. Projects authority.',
    example:     '"Good morning. How may I assist you today?"',
  },
  {
    value:       'efficient',
    label:       'Efficient',
    description: 'Direct and brief. Respects the caller\'s time.',
    example:     '"Thanks for calling. What do you need help with?"',
  },
];

// ── Styles ─────────────────────────────────────────────────────────────────────

const FIELD_CLASS =
  'w-full px-3.5 py-2.5 rounded-field text-[14px] font-body text-offwhite placeholder:text-offwhite/25 outline-none bg-white/[0.06] shadow-ring-default focus:shadow-ring-strong focus:ring-2 focus:ring-orange/40 transition-shadow duration-200';

const LABEL_CLASS =
  'block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body';

// ── Reduced motion helper ──────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ current }: { current: Step }) {
  const activeIdx = STEPS.findIndex(s => s.key === current);
  const pct = ((activeIdx + 1) / STEPS.length) * 100;
  return (
    <div
      className="absolute top-0 left-0 right-0 rounded-t-card overflow-hidden"
      style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}
      aria-hidden="true"
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #FF6B2B, #FF8C55)',
          transition: prefersReducedMotion() ? 'none' : 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  );
}

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const activeIdx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0 mb-10" aria-label="Onboarding progress" role="progressbar" aria-valuenow={activeIdx + 1} aria-valuemax={STEPS.length}>
      {STEPS.map(({ key, label, icon: Icon }, i) => {
        const done   = i < activeIdx;
        const active = i === activeIdx;
        return (
          <Fragment key={key}>
            <div className="flex flex-col items-center relative">
              {/* Pulse ring on active — only shown, never animated if reduced motion */}
              {active && (
                <span
                  className="absolute inset-0 rounded-full motion-safe:animate-step-pulse"
                  style={{ boxShadow: '0 0 0 4px rgba(255,107,43,0.18)' }}
                  aria-hidden="true"
                />
              )}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative z-10"
                style={
                  done
                    ? { background: 'rgba(134,239,172,0.15)', boxShadow: '0 0 0 1px rgba(134,239,172,0.30)' }
                    : active
                    ? { background: 'rgba(255,107,43,0.18)', boxShadow: '0 0 0 1.5px rgba(255,107,43,0.50), 0 0 12px rgba(255,107,43,0.20)' }
                    : { background: 'rgba(255,255,255,0.06)', boxShadow: '0 0 0 1px rgba(255,255,255,0.09)' }
                }
              >
                {done
                  ? <CheckCircle size={14} className="text-status-success" aria-hidden="true" />
                  : <Icon size={13} className={active ? 'text-orange' : 'text-offwhite/30'} aria-hidden="true" />
                }
              </div>
              <span
                className={`text-[9px] font-body mt-1 font-semibold tracking-wide hidden sm:block transition-colors duration-300 ${
                  active ? 'text-orange' : done ? 'text-status-success' : 'text-offwhite/30'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-px flex-1 mb-4 mx-1.5 transition-all duration-500"
                style={{ background: done ? 'rgba(134,239,172,0.30)' : 'rgba(255,255,255,0.08)' }}
                aria-hidden="true"
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── Greeting Preview ───────────────────────────────────────────────────────────

function GreetingPreview({ name, businessName, tone }: { name: string; businessName: string; tone: ReceptionistTone }) {
  const displayName = name || 'Sarah';
  const displayBiz  = businessName || 'your business';
  const greeting =
    tone === 'professional' ? `Good morning. You've reached ${displayBiz}, ${displayName} speaking. How may I assist you today?` :
    tone === 'efficient'    ? `${displayBiz}, ${displayName} speaking. How can I help?` :
                              `Hi there! You've reached ${displayBiz}. I'm ${displayName} — how can I help you today?`;

  return (
    <div className="mt-5 rounded-[12px] p-4" style={{ background: 'rgba(153,203,255,0.06)', boxShadow: '0 0 0 1px rgba(153,203,255,0.12)' }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-accent/70 font-body mb-2">Live preview</p>
      <div className="flex gap-3 items-start">
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-navy font-body"
          style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)' }}
        >
          {displayName[0]?.toUpperCase()}
        </div>
        <p className="text-[13px] text-offwhite/80 font-body leading-relaxed italic">"{greeting}"</p>
      </div>
    </div>
  );
}

// ── Step content wrapper (fade + slide in) ─────────────────────────────────────

function StepPane({ children, stepKey }: { children: React.ReactNode; stepKey: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    return () => cancelAnimationFrame(raf);
  }, [stepKey]);

  return <div ref={ref}>{children}</div>;
}

// ── Primary CTA button (full design-system recipe) ─────────────────────────────

interface PrimaryBtnProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  children: React.ReactNode;
}

function PrimaryBtn({ onClick, disabled, className = '', type = 'button', children }: PrimaryBtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2.5
        w-full px-7 py-3.5
        bg-gradient-to-r from-orange to-orange-glow
        text-white font-semibold text-[15px] tracking-[-0.01em]
        rounded-btn
        shadow-orange-glow
        hover:shadow-orange-glow-lg hover:-translate-y-0.5
        active:translate-y-0
        transition-all duration-300 ease-mechanical
        font-body
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-orange-glow
        ${className}
      `}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, className = '', children }: { onClick?: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2
        px-6 py-3.5
        bg-white/[0.06]
        text-offwhite/70 font-semibold text-[14px]
        rounded-btn
        shadow-[0_0_0_1px_rgba(255,255,255,0.09)]
        hover:bg-white/[0.10] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.16)] hover:text-offwhite hover:-translate-y-0.5
        transition-all duration-300 ease-mechanical
        font-body
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep]     = useState<Step>('receptionist');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [customService, setCustomService] = useState('');

  const [form, setForm] = useState<FormData>({
    receptionist_name: 'Sarah',
    receptionist_tone: 'friendly',
    business_name:     '',
    trade_type:        '',
    city:              '',
    services:          [],
    work_start:        '08:00',
    work_end:          '18:00',
    working_days:      [1, 2, 3, 4, 5],
    owner_name:        '',
    owner_mobile:      '',
  });

  useEffect(() => {
    async function prefill() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { data: client } = await supabase
        .from('clients')
        .select('id, owner_name, owner_mobile, business_name, onboarding_complete')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!client) return;
      if (client.onboarding_complete) { navigate('/dashboard', { replace: true }); return; }

      setClientId(client.id as string);
      setForm(prev => ({
        ...prev,
        owner_name:    (client.owner_name as string) || prev.owner_name,
        owner_mobile:  (client.owner_mobile as string) || prev.owner_mobile,
        business_name: (client.business_name as string) || prev.business_name,
      }));
    }
    prefill();
  }, [navigate]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleService(service: string) {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service],
    }));
  }

  function toggleDay(day: number) {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }));
  }

  function addCustomService() {
    const trimmed = customService.trim();
    if (!trimmed || form.services.includes(trimmed)) return;
    setForm(prev => ({ ...prev, services: [...prev.services, trimmed] }));
    setCustomService('');
  }

  async function complete() {
    if (!clientId) { setError('Session error — please refresh the page.'); return; }
    setSaving(true);
    setError(null);

    try {
      const { error: clientErr } = await supabase
        .from('clients')
        .update({
          business_name:       form.business_name,
          owner_name:          form.owner_name,
          owner_mobile:        form.owner_mobile,
          onboarding_complete: true,
          updated_at:          new Date().toISOString(),
        })
        .eq('id', clientId);

      if (clientErr) throw new Error(clientErr.message);

      const { error: configErr } = await supabase
        .from('business_config')
        .update({
          receptionist_name:    form.receptionist_name,
          receptionist_tone:    form.receptionist_tone,
          services:             form.services,
          service_areas:        form.city ? [form.city] : [],
          business_hours_start: form.work_start,
          business_hours_end:   form.work_end,
          working_days:         form.working_days,
        })
        .eq('client_id', clientId);

      if (configErr) throw new Error(configErr.message);

      // Rebuild Retell agent prompt with all new personalisation data
      fetch('/api/clients/rebuild-agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clientId }),
      }).catch(() => {});

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
      setSaving(false);
    }
  }

  const suggestedServices = SERVICES_BY_TRADE[form.trade_type] ?? SERVICES_BY_TRADE['Other'];

  return (
    <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-10 font-body"
        style={{
          background:
            'radial-gradient(ellipse at 20% 30%, rgba(255,107,43,0.07) 0%, transparent 55%), ' +
            'radial-gradient(ellipse at 80% 70%, rgba(153,203,255,0.05) 0%, transparent 50%), ' +
            '#051426',
        }}
      >
        {/* Blueprint grid */}
        <div
          className="fixed inset-0 pointer-events-none opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative w-full max-w-lg">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative flex items-center justify-center">
              <div style={{
                position: 'absolute',
                width: '220px', height: '120px',
                background: 'radial-gradient(ellipse, rgba(255,107,43,0.26) 0%, transparent 65%)',
                filter: 'blur(28px)',
                pointerEvents: 'none',
              }} />
              <Logo className="h-[50px] w-auto relative z-10" />
            </div>
          </div>

          {/* Page header */}
          <div className="text-center mb-8">
            <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-orange-soft font-body mb-2">
              PERSONALISE YOUR AI RECEPTIONIST
            </span>
            <h1 className="font-display text-[26px] font-bold text-offwhite tracking-tight">
              Let's set up your receptionist
            </h1>
            <p className="text-[13px] text-offwhite/40 font-body mt-1.5">
              Takes about 3 minutes. Every detail makes her better at her job.
            </p>
          </div>

          <StepIndicator current={step} />

          {/* Card */}
          <div
            className="relative rounded-card p-7 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.08), ' +
                '0 20px 60px rgba(2,13,24,0.5), ' +
                '0 0 40px rgba(255,107,43,0.04)',
            }}
          >
            {/* Animated progress bar at top of card */}
            <ProgressBar current={step} />

            {/* ── Step 1: Receptionist ─────────────────────────────────────── */}
            {step === 'receptionist' && (
              <StepPane stepKey="receptionist">
                <h2 className="text-[20px] font-bold text-offwhite font-display mb-1">Meet your receptionist</h2>
                <p className="text-[13px] text-offwhite/50 font-body mb-6">Give her a name and a personality. This is how every caller will experience your business.</p>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="onb-rname" className={LABEL_CLASS}>Receptionist name</label>
                    <input
                      id="onb-rname"
                      className={FIELD_CLASS}
                      value={form.receptionist_name}
                      onChange={e => set('receptionist_name', e.target.value)}
                      placeholder="Sarah"
                      maxLength={24}
                    />
                    <p className="text-[11px] text-offwhite/30 font-body mt-1.5">This is what she'll call herself on every call.</p>
                  </div>

                  <fieldset>
                    <legend className={LABEL_CLASS}>Personality</legend>
                    <div className="space-y-2.5">
                      {TONE_OPTIONS.map(opt => {
                        const isSelected = form.receptionist_tone === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => set('receptionist_tone', opt.value)}
                            aria-pressed={isSelected}
                            className="w-full text-left rounded-[12px] p-3.5 cursor-pointer transition-all duration-300 ease-mechanical hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                            style={isSelected
                              ? {
                                  background: 'rgba(255,107,43,0.10)',
                                  boxShadow: '0 0 0 1.5px rgba(255,107,43,0.40), 0 8px 24px rgba(2,13,24,0.30)',
                                }
                              : {
                                  background: 'rgba(255,255,255,0.04)',
                                  boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                                }
                            }
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-[14px] font-bold font-body transition-colors duration-200 ${isSelected ? 'text-orange' : 'text-offwhite'}`}>
                                {opt.label}
                              </span>
                              <span
                                className="transition-all duration-200"
                                style={{
                                  opacity: isSelected ? 1 : 0,
                                  transform: isSelected ? 'scale(1)' : 'scale(0.6)',
                                }}
                              >
                                <CheckCircle size={14} className="text-orange" aria-hidden="true" />
                              </span>
                            </div>
                            <p className="text-[12px] text-offwhite/45 font-body">{opt.description}</p>
                            <p className="text-[11px] text-offwhite/30 font-body mt-1 italic">{opt.example}</p>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                <GreetingPreview name={form.receptionist_name} businessName={form.business_name} tone={form.receptionist_tone} />

                <PrimaryBtn
                  onClick={() => setStep('business')}
                  disabled={!form.receptionist_name.trim()}
                  className="mt-6"
                >
                  Next <ArrowRight size={15} aria-hidden="true" />
                </PrimaryBtn>
              </StepPane>
            )}

            {/* ── Step 2: Business ──────────────────────────────────────────── */}
            {step === 'business' && (
              <StepPane stepKey="business">
                <h2 className="text-[20px] font-bold text-offwhite font-display mb-1">Your business</h2>
                <p className="text-[13px] text-offwhite/50 font-body mb-6">
                  {form.receptionist_name || 'Your receptionist'} will introduce your business by name on every call.
                </p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="onb-biz" className={LABEL_CLASS}>Business name</label>
                    <input
                      id="onb-biz"
                      className={FIELD_CLASS}
                      value={form.business_name}
                      onChange={e => set('business_name', e.target.value)}
                      placeholder="Mark Thomas Plumbing Ltd"
                    />
                  </div>
                  <div>
                    <label htmlFor="onb-trade" className={LABEL_CLASS}>Trade type</label>
                    <div className="relative">
                      <select
                        id="onb-trade"
                        className={`${FIELD_CLASS} appearance-none cursor-pointer pr-9`}
                        value={form.trade_type}
                        onChange={e => { set('trade_type', e.target.value); set('services', []); }}
                      >
                        <option value="">Select your trade…</option>
                        {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <svg
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-offwhite/30"
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="onb-city" className={LABEL_CLASS}>City / area you serve</label>
                    <input
                      id="onb-city"
                      className={FIELD_CLASS}
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      placeholder="South London"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <SecondaryBtn onClick={() => setStep('receptionist')} className="flex-1">Back</SecondaryBtn>
                  <PrimaryBtn
                    onClick={() => setStep('services')}
                    disabled={!form.business_name || !form.trade_type}
                    className="flex-[2]"
                  >
                    Next <ArrowRight size={15} aria-hidden="true" />
                  </PrimaryBtn>
                </div>
              </StepPane>
            )}

            {/* ── Step 3: Services ──────────────────────────────────────────── */}
            {step === 'services' && (
              <StepPane stepKey="services">
                <h2 className="text-[20px] font-bold text-offwhite font-display mb-1">What do you offer?</h2>
                <p className="text-[13px] text-offwhite/50 font-body mb-5">
                  {form.receptionist_name || 'Your receptionist'} will tell callers exactly what jobs you take on. Pick everything that applies.
                </p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {suggestedServices.map(service => {
                    const selected = form.services.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className="px-3 rounded-[8px] text-[12px] font-semibold font-body cursor-pointer transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                        style={{
                          minHeight: '44px',
                          paddingTop: '10px',
                          paddingBottom: '10px',
                          ...(selected
                          ? {
                              background: 'rgba(255,107,43,0.15)',
                              boxShadow: '0 0 0 1.5px rgba(255,107,43,0.45), 0 4px 12px rgba(255,107,43,0.12)',
                              color: '#FF8C55',
                              transform: 'scale(1)',
                            }
                          : {
                              background: 'rgba(255,255,255,0.05)',
                              boxShadow: '0 0 0 1px rgba(255,255,255,0.09)',
                              color: 'rgba(240,244,248,0.55)',
                            }),
                        }}
                      >
                        {selected && (
                          <CheckCircle
                            size={10}
                            className="inline mr-1.5 -mt-0.5"
                            aria-hidden="true"
                            style={{
                              transition: prefersReducedMotion() ? 'none' : 'transform 200ms cubic-bezier(0.16,1,0.3,1), opacity 200ms',
                            }}
                          />
                        )}
                        {service}
                      </button>
                    );
                  })}
                </div>

                {/* Custom service input */}
                <div className="flex gap-2 mb-4">
                  <label htmlFor="onb-custom-service" className="sr-only">Add a custom service</label>
                  <input
                    id="onb-custom-service"
                    className={`${FIELD_CLASS} flex-1`}
                    value={customService}
                    onChange={e => setCustomService(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomService())}
                    placeholder="Add a custom service…"
                    maxLength={60}
                  />
                  <button
                    type="button"
                    onClick={addCustomService}
                    disabled={!customService.trim()}
                    className="px-3 rounded-field bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.09)] hover:bg-white/[0.10] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.16)] transition-all duration-200 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                    aria-label="Add service"
                  >
                    <Plus size={15} className="text-offwhite/60" aria-hidden="true" />
                  </button>
                </div>

                {/* Custom (non-preset) services selected */}
                {form.services.filter(s => !suggestedServices.includes(s)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {form.services.filter(s => !suggestedServices.includes(s)).map(s => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-[12px] font-semibold font-body text-orange-soft"
                        style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.25)' }}
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => toggleService(s)}
                          aria-label={`Remove ${s}`}
                          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[2px] rounded-sm"
                        >
                          <X size={11} aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-offwhite/25 font-body mb-1">
                  {form.services.length} service{form.services.length !== 1 ? 's' : ''} selected
                </p>

                <div className="flex gap-3 mt-5">
                  <SecondaryBtn onClick={() => setStep('business')} className="flex-1">Back</SecondaryBtn>
                  <PrimaryBtn onClick={() => setStep('hours')} className="flex-[2]">
                    Next <ArrowRight size={15} aria-hidden="true" />
                  </PrimaryBtn>
                </div>
              </StepPane>
            )}

            {/* ── Step 4: Hours ─────────────────────────────────────────────── */}
            {step === 'hours' && (
              <StepPane stepKey="hours">
                <h2 className="text-[20px] font-bold text-offwhite font-display mb-1">Working hours</h2>
                <p className="text-[13px] text-offwhite/50 font-body mb-6">
                  {form.receptionist_name || 'Your receptionist'} will handle out-of-hours calls differently — taking a message and setting expectations correctly.
                </p>

                <div className="space-y-5">
                  <fieldset>
                    <legend className={LABEL_CLASS}>Working days</legend>
                    {/* Horizontal scroll on very small viewports, wrap on larger */}
                    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
                      {DAY_LABELS.map((label, i) => {
                        const val = DAY_VALUES[i];
                        const active = form.working_days.includes(val);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleDay(val)}
                            aria-pressed={active}
                            className="flex-shrink-0 sm:flex-1 rounded-[8px] text-[12px] font-bold font-body transition-all duration-200 ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                            style={{
                              minWidth: '44px',
                              minHeight: '48px',
                              padding: '4px 8px',
                              ...(active
                                ? {
                                    background: 'rgba(255,107,43,0.15)',
                                    boxShadow: '0 0 0 1.5px rgba(255,107,43,0.40), 0 4px 12px rgba(255,107,43,0.12)',
                                    color: '#FF8C55',
                                  }
                                : {
                                    background: 'rgba(255,255,255,0.05)',
                                    boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                                    color: 'rgba(240,244,248,0.35)',
                                  }
                              ),
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="onb-start" className={LABEL_CLASS}>Start time</label>
                      <input
                        id="onb-start"
                        type="time"
                        className={FIELD_CLASS}
                        value={form.work_start}
                        onChange={e => set('work_start', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="onb-end" className={LABEL_CLASS}>End time</label>
                      <input
                        id="onb-end"
                        type="time"
                        className={FIELD_CLASS}
                        value={form.work_end}
                        onChange={e => set('work_end', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-[10px] p-3.5" style={{ background: 'rgba(153,203,255,0.05)', boxShadow: '0 0 0 1px rgba(153,203,255,0.10)' }}>
                    <p className="text-[12px] text-accent/70 font-body leading-relaxed">
                      <span className="font-semibold text-accent">Outside these hours</span> — {form.receptionist_name || 'your receptionist'} will tell callers you're not available, take a full message, and promise a callback on the next working day.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <SecondaryBtn onClick={() => setStep('services')} className="flex-1">Back</SecondaryBtn>
                  <PrimaryBtn onClick={() => setStep('contact')} className="flex-[2]">
                    Next <ArrowRight size={15} aria-hidden="true" />
                  </PrimaryBtn>
                </div>
              </StepPane>
            )}

            {/* ── Step 5: Contact ───────────────────────────────────────────── */}
            {step === 'contact' && (
              <StepPane stepKey="contact">
                <h2 className="text-[20px] font-bold text-offwhite font-display mb-1">Your details</h2>
                <p className="text-[13px] text-offwhite/50 font-body mb-6">
                  {form.receptionist_name || 'Your receptionist'} will mention your name to callers and send you SMS alerts after every call.
                </p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="onb-name" className={LABEL_CLASS}>Your name</label>
                    <input
                      id="onb-name"
                      autoComplete="name"
                      className={FIELD_CLASS}
                      value={form.owner_name}
                      onChange={e => set('owner_name', e.target.value)}
                      placeholder="Mark Thomas"
                    />
                  </div>
                  <div>
                    <label htmlFor="onb-mobile" className={LABEL_CLASS}>Mobile (for SMS alerts after calls)</label>
                    <input
                      id="onb-mobile"
                      type="tel"
                      autoComplete="tel"
                      className={FIELD_CLASS}
                      value={form.owner_mobile}
                      onChange={e => set('owner_mobile', e.target.value)}
                      placeholder="+44 7700 900000"
                    />
                    <p className="text-[11px] text-offwhite/30 font-body mt-1.5">
                      We'll text you a summary after every call — job type, caller name, urgency.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <SecondaryBtn onClick={() => setStep('hours')} className="flex-1">Back</SecondaryBtn>
                  <PrimaryBtn
                    onClick={() => setStep('ready')}
                    disabled={!form.owner_name || !form.owner_mobile}
                    className="flex-[2]"
                  >
                    Review setup <ArrowRight size={15} aria-hidden="true" />
                  </PrimaryBtn>
                </div>
              </StepPane>
            )}

            {/* ── Step 6: Ready ─────────────────────────────────────────────── */}
            {step === 'ready' && (
              <StepPane stepKey="ready">
                <div
                  className="flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-5"
                  style={{
                    background: 'rgba(255,107,43,0.12)',
                    boxShadow: '0 0 0 1px rgba(255,107,43,0.20), 0 0 32px rgba(255,107,43,0.18)',
                  }}
                >
                  <CheckCircle2 size={26} className="text-orange" aria-hidden="true" />
                </div>

                <h2 className="text-[20px] font-bold text-offwhite font-display text-center mb-1">
                  {form.receptionist_name} is ready to go
                </h2>
                <p className="text-[13px] text-offwhite/50 font-body text-center mb-6">
                  Here's everything we've set up. You can change any of this from Settings later.
                </p>

                <div className="space-y-1.5 mb-6">
                  {[
                    { label: 'Receptionist', value: `${form.receptionist_name} · ${TONE_OPTIONS.find(t => t.value === form.receptionist_tone)?.label}` },
                    { label: 'Business',     value: form.business_name },
                    { label: 'Trade',        value: `${form.trade_type}${form.city ? ` · ${form.city}` : ''}` },
                    { label: 'Services',     value: form.services.length ? `${form.services.slice(0,3).join(', ')}${form.services.length > 3 ? ` +${form.services.length - 3} more` : ''}` : 'Not specified' },
                    { label: 'Hours',        value: `${form.work_start}–${form.work_end} · ${DAY_LABELS.filter((_, i) => form.working_days.includes(DAY_VALUES[i])).join(', ')}` },
                    { label: 'SMS alerts to', value: form.owner_mobile },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between items-start gap-4 py-2.5 px-3.5 rounded-[8px] transition-all duration-200 hover:bg-white/[0.055]"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-offwhite/35 font-body flex-shrink-0">{label}</span>
                      <span className="text-[13px] text-offwhite/80 font-body text-right">{value}</span>
                    </div>
                  ))}
                </div>

                <GreetingPreview name={form.receptionist_name} businessName={form.business_name} tone={form.receptionist_tone} />

                {error && (
                  <div
                    className="flex items-start gap-2 mt-4 rounded-[10px] px-3.5 py-3"
                    style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.20)' }}
                    role="alert"
                  >
                    <AlertCircle size={15} className="text-orange-soft flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-[13px] text-orange-soft font-body">{error}</p>
                  </div>
                )}

                <PrimaryBtn onClick={complete} disabled={saving} className="mt-6">
                  {saving
                    ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Activating {form.receptionist_name}…</>
                    : <>Activate {form.receptionist_name} <ArrowRight size={15} aria-hidden="true" /></>
                  }
                </PrimaryBtn>

                <button
                  type="button"
                  onClick={() => setStep('contact')}
                  className="mt-3 w-full text-center text-[12px] text-offwhite/30 hover:text-offwhite/50 font-body transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px] rounded"
                >
                  Go back and edit
                </button>
              </StepPane>
            )}
          </div>
        </div>
      </div>
  );
}
