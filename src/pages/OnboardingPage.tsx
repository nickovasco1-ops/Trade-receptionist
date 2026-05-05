import { Fragment, useEffect, useRef, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPinned,
  MessageSquareText,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../../components/Logo';
import type { ReceptionistTone } from '../../shared/types';

type Step = 'receptionist' | 'business' | 'services' | 'hours' | 'contact' | 'ready';

interface FormData {
  receptionist_name: string;
  receptionist_tone: ReceptionistTone;
  business_name: string;
  trade_type: string;
  city: string;
  services: string[];
  work_start: string;
  work_end: string;
  working_days: number[];
  owner_name: string;
  owner_mobile: string;
}

const STEPS: { key: Step; label: string; shortLabel: string; icon: ElementType }[] = [
  { key: 'receptionist', label: 'Receptionist', shortLabel: 'Voice', icon: Bot },
  { key: 'business', label: 'Business', shortLabel: 'Business', icon: Briefcase },
  { key: 'services', label: 'Services', shortLabel: 'Services', icon: Wrench },
  { key: 'hours', label: 'Hours', shortLabel: 'Hours', icon: Clock },
  { key: 'contact', label: 'Contact', shortLabel: 'Alerts', icon: User },
  { key: 'ready', label: 'Ready', shortLabel: 'Launch', icon: CheckCircle2 },
];

const STEP_META: Record<
  Step,
  {
    eyebrow: string;
    title: string;
    description: string;
    asideTitle: string;
    asideCopy: string;
    checkpoints: string[];
  }
> = {
  receptionist: {
    eyebrow: 'Voice & first impression',
    title: 'Shape how every caller meets your business.',
    description: 'Pick the name and tone Sarah will use every time the phone rings, so the experience feels human, calm, and professional from the first sentence.',
    asideTitle: 'What callers hear first',
    asideCopy: 'This is the moment that decides whether your business feels trustworthy, rushed, or forgettable.',
    checkpoints: [
      'Natural UK greeting',
      'Matches your brand personality',
      'Sets expectations immediately',
    ],
  },
  business: {
    eyebrow: 'Business identity',
    title: 'Give Sarah the business context she needs.',
    description: 'Your trade, business name, and service area help her sound specific, credible, and useful instead of generic.',
    asideTitle: 'How she introduces the business',
    asideCopy: 'A precise intro tells callers they reached the right trade business before they explain the job.',
    checkpoints: [
      'Correct trade language',
      'Service area handled cleanly',
      'Confident business introduction',
    ],
  },
  services: {
    eyebrow: 'Job qualification',
    title: 'Tell Sarah what work you actually take on.',
    description: 'Choose the jobs you want more of so she can qualify calls properly and stop wasting your time on poor-fit enquiries.',
    asideTitle: 'What she can qualify instantly',
    asideCopy: 'The more accurate this list is, the faster callers get routed and the fewer dead-end calls you see.',
    checkpoints: [
      'Better fit enquiries',
      'Faster qualification',
      'Less time on the wrong jobs',
    ],
  },
  hours: {
    eyebrow: 'Availability & coverage',
    title: 'Set when you work and how after-hours calls are handled.',
    description: 'Sarah uses this to set expectations, protect your evenings, and still capture work when you are off the tools.',
    asideTitle: 'How availability is communicated',
    asideCopy: 'Callers still feel looked after, even when you are on-site, out of hours, or not taking calls directly.',
    checkpoints: [
      'Clear working window',
      'Accurate callback expectations',
      'Out-of-hours covered professionally',
    ],
  },
  contact: {
    eyebrow: 'Alerts & owner details',
    title: 'Choose where the important follow-up lands.',
    description: 'These details control who gets the summaries after each call, so you see the next job at the right moment.',
    asideTitle: 'Where the summaries go',
    asideCopy: 'Your phone becomes the hand-off point between Sarah answering the call and you deciding what to do next.',
    checkpoints: [
      'SMS summaries after every call',
      'Urgent jobs routed clearly',
      'Owner details stored correctly',
    ],
  },
  ready: {
    eyebrow: 'Launch review',
    title: 'Review the setup before Sarah goes live.',
    description: 'One final pass, then your receptionist is activated with the exact business context, service rules, and contact flow you chose.',
    asideTitle: 'What goes live next',
    asideCopy: 'As soon as you confirm, this setup becomes the live logic behind how Sarah answers, qualifies, and reports every call.',
    checkpoints: [
      'Call handling rules locked in',
      'Summaries routed to you',
      'Ready to activate immediately',
    ],
  },
};

const TRADES = [
  'Plumber', 'Electrician', 'HVAC Engineer', 'Builder', 'Plasterer',
  'Tiler', 'Roofer', 'Painter & Decorator', 'Carpenter', 'Gas Engineer', 'Other',
];

const SERVICES_BY_TRADE: Record<string, string[]> = {
  Plumber: ['Boiler repair', 'Boiler installation', 'Bathroom fitting', 'Leak detection', 'Drain unblocking', 'Emergency callouts', 'Central heating', 'Water pressure issues', 'Radiator installation', 'Outdoor tap fitting'],
  Electrician: ['Full rewiring', 'Fuse board upgrade', 'Lighting installation', 'EV charger installation', 'PAT testing', 'Emergency electrical', 'Smart home wiring', 'Garden lighting', 'Socket installation', 'CCTV installation'],
  'HVAC Engineer': ['AC installation', 'AC servicing', 'Boiler service', 'Heat pump installation', 'Ventilation systems', 'Emergency callouts', 'Annual maintenance', 'Duct cleaning', 'Refrigerant recharge'],
  Builder: ['Extensions', 'Loft conversions', 'New builds', 'Renovations', 'Brickwork & blockwork', 'Damp proofing', 'Underpinning', 'Garage conversions', 'Structural repairs'],
  Plasterer: ['Skim coat', 'Full replaster', 'Artex removal', 'Coving installation', 'External render', 'Dry lining', 'Patch repairs'],
  Tiler: ['Bathroom tiling', 'Kitchen tiling', 'Floor tiling', 'Wall tiling', 'Wet room fitting', 'Grout repair', 'Tile removal'],
  Roofer: ['Roof repairs', 'Full re-roof', 'Flat roof installation', 'Guttering', 'Fascia & soffits', 'Chimney repairs', 'Velux windows', 'Lead work'],
  'Painter & Decorator': ['Interior painting', 'Exterior painting', 'Wallpaper hanging', 'Feature walls', 'Wood staining', 'Gloss work', 'Commercial decorating'],
  Carpenter: ['Fitted wardrobes', 'Kitchen fitting', 'Skirting boards', 'Door hanging', 'Decking', 'Fencing', 'Staircase work', 'Bespoke joinery'],
  'Gas Engineer': ['Boiler service', 'Boiler replacement', 'Gas safety certificates', 'Landlord certificates', 'Cooker installation', 'Emergency gas', 'Central heating'],
  Other: ['Emergency callouts', 'General repairs', 'Maintenance', 'Survey & quote'],
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

const TONE_OPTIONS: { value: ReceptionistTone; label: string; description: string; example: string }[] = [
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm and personable. Puts customers at ease.',
    example: '"Hi there! Brilliant to hear from you — how can I help?"',
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Calm and composed. Projects authority.',
    example: '"Good morning. How may I assist you today?"',
  },
  {
    value: 'efficient',
    label: 'Efficient',
    description: 'Direct and concise. Respects the caller’s time.',
    example: '"Thanks for calling. What do you need help with?"',
  },
];

const FIELD_CLASS =
  'w-full min-h-[50px] rounded-field bg-white/[0.05] px-4 py-3 text-[14px] text-offwhite placeholder:text-offwhite/24 outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-200 focus:ring-2 focus:ring-orange/40 focus:shadow-[0_0_0_1px_rgba(255,107,43,0.26),0_0_24px_rgba(255,107,43,0.12)]';

const LABEL_CLASS =
  'mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/38';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatWorkingDays(days: number[]) {
  return DAY_LABELS.filter((_, index) => days.includes(DAY_VALUES[index])).join(', ');
}

function formatToneLabel(tone: ReceptionistTone) {
  return TONE_OPTIONS.find(option => option.value === tone)?.label ?? tone;
}

function ProgressBar({ current }: { current: Step }) {
  const activeIdx = STEPS.findIndex(step => step.key === current);
  const pct = ((activeIdx + 1) / STEPS.length) * 100;

  return (
    <div
      className="overflow-hidden rounded-full"
      style={{ height: '6px', background: 'rgba(255,255,255,0.06)' }}
      aria-hidden="true"
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #FF6B2B 0%, #FF8C55 100%)',
          boxShadow: '0 0 18px rgba(255,107,43,0.30)',
          transition: prefersReducedMotion() ? 'none' : 'width 420ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const activeIdx = STEPS.findIndex(step => step.key === current);

  return (
    <div aria-label="Onboarding progress" role="progressbar" aria-valuenow={activeIdx + 1} aria-valuemax={STEPS.length}>
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-offwhite/34">
        <span>Step {activeIdx + 1} of {STEPS.length}</span>
        <span>{Math.round(((activeIdx + 1) / STEPS.length) * 100)}% complete</span>
      </div>
      <ProgressBar current={current} />
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STEPS.map(({ key, shortLabel, icon: Icon }, index) => {
          const done = index < activeIdx;
          const active = index === activeIdx;
          return (
            <div
              key={key}
              className="min-w-[94px] flex-1 rounded-[16px] px-3 py-3"
              style={{
                background: active
                  ? 'linear-gradient(180deg, rgba(255,107,43,0.12) 0%, rgba(255,107,43,0.06) 100%)'
                  : 'rgba(255,255,255,0.035)',
                boxShadow: active
                  ? '0 0 0 1px rgba(255,107,43,0.24), 0 12px 26px rgba(2,13,24,0.20)'
                  : done
                  ? '0 0 0 1px rgba(134,239,172,0.18)'
                  : '0 0 0 1px rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: done
                      ? 'rgba(134,239,172,0.14)'
                      : active
                      ? 'rgba(255,107,43,0.16)'
                      : 'rgba(255,255,255,0.06)',
                    boxShadow: done
                      ? '0 0 0 1px rgba(134,239,172,0.22)'
                      : active
                      ? '0 0 0 1px rgba(255,107,43,0.26)'
                      : '0 0 0 1px rgba(255,255,255,0.07)',
                  }}
                >
                  {done ? (
                    <CheckCircle size={14} className="text-status-success" aria-hidden="true" />
                  ) : (
                    <Icon size={14} className={active ? 'text-orange-soft' : 'text-offwhite/28'} aria-hidden="true" />
                  )}
                </div>
                <span className={`text-[11px] font-bold ${active ? 'text-orange-soft' : done ? 'text-status-success' : 'text-offwhite/28'}`}>
                  0{index + 1}
                </span>
              </div>
              <p className={`mt-3 text-[12px] font-semibold ${active ? 'text-offwhite' : done ? 'text-offwhite/72' : 'text-offwhite/34'}`}>
                {shortLabel}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GreetingPreview({ name, businessName, tone }: { name: string; businessName: string; tone: ReceptionistTone }) {
  const displayName = name || 'Sarah';
  const displayBiz = businessName || 'your business';
  const greeting =
    tone === 'professional'
      ? `Good morning. You've reached ${displayBiz}, ${displayName} speaking. How may I assist you today?`
      : tone === 'efficient'
      ? `${displayBiz}, ${displayName} speaking. How can I help?`
      : `Hi there! You've reached ${displayBiz}. I'm ${displayName} — how can I help you today?`;

  return (
    <div
      className="rounded-[18px] p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(19,34,58,0.92) 0%, rgba(11,25,44,0.92) 100%)',
        boxShadow: '0 0 0 1px rgba(153,203,255,0.10), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/70">Caller greeting preview</p>
        <div
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-orange-soft"
          style={{ background: 'rgba(255,107,43,0.08)', boxShadow: 'inset 0 0 0 1px rgba(255,107,43,0.14)' }}
        >
          {formatToneLabel(tone)}
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[#08111f]"
          style={{ background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)' }}
        >
          {displayName[0]?.toUpperCase()}
        </div>
        <p className="max-w-[44ch] text-[13px] leading-relaxed text-offwhite/76">
          “{greeting}”
        </p>
      </div>
    </div>
  );
}

function SavingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map(index => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse"
          style={{ animationDelay: `${index * 140}ms` }}
        />
      ))}
    </span>
  );
}

function StepPane({ children, stepKey }: { children: ReactNode; stepKey: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    el.style.opacity = '0';
    el.style.transform = 'translateY(14px)';

    const raf = requestAnimationFrame(() => {
      el.style.transition = 'opacity 360ms cubic-bezier(0.16, 1, 0.3, 1), transform 360ms cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    return () => cancelAnimationFrame(raf);
  }, [stepKey]);

  return <div ref={ref}>{children}</div>;
}

interface PrimaryBtnProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  children: ReactNode;
}

function PrimaryBtn({ onClick, disabled, className = '', type = 'button', children }: PrimaryBtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-btn px-7 py-3.5',
        'text-[15px] font-semibold tracking-[-0.015em] text-white',
        'transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
        className,
      ].join(' ')}
      style={{
        background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
        boxShadow: '0 16px 34px rgba(249,115,22,0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, className = '', children }: { onClick?: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-btn px-6 py-3.5',
        'bg-white/[0.05] text-[14px] font-semibold text-offwhite/72',
        'transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]',
        'hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-offwhite',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]',
        className,
      ].join(' ')}
      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.09), 0 10px 24px rgba(2,13,24,0.18)' }}
    >
      {children}
    </button>
  );
}

function SupportPanel({ step, form }: { step: Step; form: FormData }) {
  const meta = STEP_META[step];
  const activeDays = formatWorkingDays(form.working_days);
  const selectedTone = formatToneLabel(form.receptionist_tone);
  const displayServices = form.services.length ? form.services.slice(0, 4) : (SERVICES_BY_TRADE[form.trade_type] ?? SERVICES_BY_TRADE.Other).slice(0, 4);

  return (
    <div
      className="overflow-hidden rounded-[28px] p-5 sm:p-6"
      style={{
        background: 'linear-gradient(180deg, rgba(16,29,50,0.90) 0%, rgba(9,22,38,0.94) 100%)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 56px rgba(2,13,24,0.34)',
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-soft">{meta.asideTitle}</p>
          <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-offwhite/58">{meta.asideCopy}</p>
        </div>
        <div
          className="hidden h-10 w-10 items-center justify-center rounded-full sm:flex"
          style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
        >
          <Sparkles size={16} className="text-orange-soft" aria-hidden="true" />
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {meta.checkpoints.map(item => (
          <div
            key={item}
            className="rounded-[16px] px-4 py-3 text-[13px] font-semibold text-offwhite/72"
            style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
          >
            {item}
          </div>
        ))}
      </div>

      {step === 'receptionist' && (
        <GreetingPreview name={form.receptionist_name} businessName={form.business_name} tone={form.receptionist_tone} />
      )}

      {step === 'business' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className="rounded-[20px] p-4"
            style={{ background: 'rgba(255,255,255,0.045)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent/70">Business introduction</p>
            <p className="font-display text-[24px] font-bold leading-[1.05] text-offwhite">
              {form.business_name || 'Your business'}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[13px] text-offwhite/56">
              <Briefcase size={14} className="text-orange-soft" aria-hidden="true" />
              <span>{form.trade_type || 'Trade type pending'}</span>
            </div>
          </div>
          <div
            className="rounded-[20px] p-4"
            style={{ background: 'rgba(255,255,255,0.045)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent/70">Service area</p>
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
              >
                <MapPinned size={15} className="text-orange-soft" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-offwhite/80">{form.city || 'Area not set yet'}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-offwhite/48">
                  Sarah uses this to explain where you work and whether the caller is in range.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'services' && (
        <div
          className="rounded-[20px] p-4"
          style={{ background: 'rgba(255,255,255,0.045)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/70">Current service shortlist</p>
            <div
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-orange-soft"
              style={{ background: 'rgba(255,107,43,0.08)', boxShadow: 'inset 0 0 0 1px rgba(255,107,43,0.14)' }}
            >
              {form.services.length || displayServices.length} captured
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayServices.map(service => (
              <span
                key={service}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-offwhite/70"
                style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
              >
                <CheckCircle2 size={12} className="text-orange-soft" aria-hidden="true" />
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {step === 'hours' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className="rounded-[20px] p-4"
            style={{ background: 'rgba(255,255,255,0.045)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent/70">Working week</p>
            <p className="text-[16px] font-semibold text-offwhite/78">{activeDays || 'No days selected yet'}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-offwhite/48">
              Your caller messaging changes automatically outside these days.
            </p>
          </div>
          <div
            className="rounded-[20px] p-4"
            style={{ background: 'rgba(255,255,255,0.045)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent/70">Working window</p>
            <div className="flex items-center gap-2 text-[16px] font-semibold text-offwhite/78">
              <CalendarDays size={15} className="text-orange-soft" aria-hidden="true" />
              <span>{form.work_start} - {form.work_end}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-offwhite/48">
              Urgent calls can still be handled differently when you are not taking direct calls.
            </p>
          </div>
        </div>
      )}

      {step === 'contact' && (
        <div
          className="rounded-[20px] p-4"
          style={{ background: 'rgba(255,255,255,0.045)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
        >
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
            >
              <MessageSquareText size={16} className="text-orange-soft" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/70">Summary delivery preview</p>
              <p className="text-[14px] text-offwhite/72">SMS after every answered call</p>
            </div>
          </div>
          <div
            className="rounded-[16px] p-4 text-[13px] leading-relaxed text-offwhite/72"
            style={{ background: 'rgba(8,22,39,0.84)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }}
          >
            <p><span className="font-semibold text-orange-soft">Sarah:</span> Boiler repair enquiry in {form.city || 'your area'}.</p>
            <p className="mt-1">Caller wants the next available slot. Summary will go to <span className="font-semibold text-offwhite/86">{form.owner_mobile || 'your mobile'}</span>.</p>
          </div>
        </div>
      )}

      {step === 'ready' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Receptionist', value: `${form.receptionist_name} · ${selectedTone}` },
            { label: 'Trade & area', value: `${form.trade_type || 'Trade pending'}${form.city ? ` · ${form.city}` : ''}` },
            { label: 'Working hours', value: `${form.work_start} - ${form.work_end}` },
            { label: 'SMS alerts', value: form.owner_mobile || 'Mobile pending' },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-[18px] p-4"
              style={{ background: 'rgba(255,255,255,0.045)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent/70">{item.label}</p>
              <p className="mt-2 text-[15px] leading-snug text-offwhite/78">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return <OnboardingFlow />;
}

const PREVIEW_FORM: FormData = {
  receptionist_name: 'Sarah',
  receptionist_tone: 'friendly',
  business_name: 'Hendricks Plumbing & Heating',
  trade_type: 'Plumber',
  city: 'South London',
  services: ['Boiler repair', 'Emergency callouts', 'Bathroom fitting'],
  work_start: '08:00',
  work_end: '18:00',
  working_days: [1, 2, 3, 4, 5],
  owner_name: 'Dave Hendricks',
  owner_mobile: '+44 7700 900123',
};

export function OnboardingFlow({ preview = false }: { preview?: boolean }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('receptionist');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [customService, setCustomService] = useState('');

  const [form, setForm] = useState<FormData>({
    ...(preview
      ? PREVIEW_FORM
      : {
          receptionist_name: 'Sarah',
          receptionist_tone: 'friendly',
          business_name: '',
          trade_type: '',
          city: '',
          services: [],
          work_start: '08:00',
          work_end: '18:00',
          working_days: [1, 2, 3, 4, 5],
          owner_name: '',
          owner_mobile: '',
        }),
  });

  useEffect(() => {
    if (preview) {
      setClientId('preview-client');
      return;
    }

    async function prefill() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { data: client } = await supabase
        .from('clients')
        .select('id, owner_name, owner_mobile, business_name, onboarding_complete')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!client) return;
      if (client.onboarding_complete) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setClientId(client.id as string);
      setForm(prev => ({
        ...prev,
        owner_name: (client.owner_name as string) || prev.owner_name,
        owner_mobile: (client.owner_mobile as string) || prev.owner_mobile,
        business_name: (client.business_name as string) || prev.business_name,
      }));
    }

    prefill();
  }, [navigate, preview]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleService(service: string) {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(item => item !== service)
        : [...prev.services, service],
    }));
  }

  function toggleDay(day: number) {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(item => item !== day)
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
    if (preview) {
      setSaving(true);
      setError(null);
      window.setTimeout(() => {
        navigate('/welcome', { replace: true });
      }, 900);
      return;
    }

    if (!clientId) {
      setError('Session error — please refresh the page.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: clientErr } = await supabase
        .from('clients')
        .update({
          business_name: form.business_name,
          owner_name: form.owner_name,
          owner_mobile: form.owner_mobile,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (clientErr) throw new Error(clientErr.message);

      const { error: configErr } = await supabase
        .from('business_config')
        .update({
          receptionist_name: form.receptionist_name,
          receptionist_tone: form.receptionist_tone,
          services: form.services,
          service_areas: form.city ? [form.city] : [],
          business_hours_start: form.work_start,
          business_hours_end: form.work_end,
          working_days: form.working_days,
        })
        .eq('client_id', clientId);

      if (configErr) throw new Error(configErr.message);

      fetch('/api/clients/rebuild-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      }).catch(() => {});

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
      setSaving(false);
    }
  }

  const currentStepIndex = STEPS.findIndex(item => item.key === step);
  const currentMeta = STEP_META[step];
  const suggestedServices = SERVICES_BY_TRADE[form.trade_type] ?? SERVICES_BY_TRADE.Other;

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden px-4 py-6 font-body sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      style={{
        background:
          'radial-gradient(circle at 14% 18%, rgba(255,107,43,0.12) 0%, transparent 32%),' +
          'radial-gradient(circle at 82% 26%, rgba(153,203,255,0.10) 0%, transparent 34%),' +
          'radial-gradient(circle at 66% 82%, rgba(255,138,72,0.08) 0%, transparent 30%),' +
          '#051426',
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div
        className="pointer-events-none absolute left-[-10%] top-[6%] h-[360px] w-[360px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.22) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-6%] right-[-3%] h-[360px] w-[360px] rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 72%)' }}
      />

      <div className="relative mx-auto w-full max-w-[1280px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="rounded-[16px] px-3 py-2"
              style={{
                background: 'rgba(255,255,255,0.06)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 10px 24px rgba(2,13,24,0.22)',
              }}
            >
              <Logo height={24} />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-soft">Trade Receptionist setup</p>
              <p className="mt-1 text-[13px] text-offwhite/44">Built for UK tradespeople who need every call covered.</p>
            </div>
          </div>
          <div
            className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
            style={{
              background: preview ? 'rgba(255,107,43,0.08)' : 'rgba(255,255,255,0.04)',
              boxShadow: preview
                ? '0 0 0 1px rgba(255,107,43,0.18)'
                : '0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            {preview ? 'Preview mode' : 'About 3 minutes'}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] xl:gap-10">
          <section className="order-2 lg:order-1">
            <div className="lg:sticky lg:top-8">
              <div className="mb-6 max-w-[42rem]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">{currentMeta.eyebrow}</p>
                <h1
                  className="mt-3 max-w-[12ch] font-display text-[clamp(2.5rem,4vw,4.8rem)] font-bold leading-[0.94] tracking-[-0.05em] text-offwhite"
                >
                  {currentMeta.title}
                </h1>
                <p className="mt-5 max-w-[48ch] text-[16px] leading-relaxed text-offwhite/58 sm:text-[17px]">
                  {currentMeta.description}
                </p>
              </div>

                <div className="mb-5 flex flex-wrap gap-3">
                  {[
                    'Natural UK voice',
                    'Books jobs faster',
                    'Summaries after every call',
                ].map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                    }}
                  >
                    <ShieldCheck size={13} className="text-orange-soft" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>

              {preview ? (
                <div
                  className="mb-5 rounded-[18px] px-4 py-3"
                  style={{
                    background: 'rgba(255,107,43,0.08)',
                    boxShadow: '0 0 0 1px rgba(255,107,43,0.18)',
                  }}
                >
                  <p className="text-[13px] leading-relaxed text-orange-soft">
                    This is a safe dummy walkthrough. You can click through every onboarding screen without signing in or saving anything.
                  </p>
                </div>
              ) : null}

              <SupportPanel step={step} form={form} />
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div
              className="relative overflow-hidden rounded-[30px] p-5 sm:p-6 lg:p-7"
              style={{
                background: 'linear-gradient(180deg, rgba(17,31,53,0.92) 0%, rgba(10,23,39,0.96) 100%)',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.08),' +
                  '0 28px 70px rgba(2,13,24,0.46),' +
                  'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-[16%] top-[-12%] h-40 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.14) 0%, transparent 72%)' }}
              />

              <div className="relative z-10">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-soft">Step {currentStepIndex + 1}</p>
                    <p className="mt-2 text-[15px] leading-relaxed text-offwhite/52">
                      {currentMeta.asideCopy}
                    </p>
                  </div>
                  <div
                    className="hidden rounded-[18px] px-4 py-3 text-right sm:block"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-offwhite/30">Current stage</p>
                    <p className="mt-2 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">
                      0{currentStepIndex + 1}
                    </p>
                  </div>
                </div>

                <StepIndicator current={step} />

                <div className="mt-8">
                  {step === 'receptionist' && (
                    <StepPane stepKey="receptionist">
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="onb-rname" className={LABEL_CLASS}>Receptionist name</label>
                          <input
                            id="onb-rname"
                            className={FIELD_CLASS}
                            value={form.receptionist_name}
                            onChange={event => set('receptionist_name', event.target.value)}
                            placeholder="Sarah"
                            maxLength={24}
                          />
                          <p className="mt-2 text-[12px] leading-relaxed text-offwhite/34">
                            This is the name she uses every time she answers a call for your business.
                          </p>
                        </div>

                        <fieldset>
                          <legend className={LABEL_CLASS}>Personality</legend>
                          <div className="grid gap-3">
                            {TONE_OPTIONS.map(option => {
                              const selected = form.receptionist_tone === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => set('receptionist_tone', option.value)}
                                  aria-pressed={selected}
                                  className="w-full rounded-[18px] p-4 text-left transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                                  style={{
                                    background: selected
                                      ? 'linear-gradient(180deg, rgba(255,107,43,0.11) 0%, rgba(255,107,43,0.05) 100%)'
                                      : 'rgba(255,255,255,0.035)',
                                    boxShadow: selected
                                      ? '0 0 0 1px rgba(255,107,43,0.28), 0 18px 34px rgba(2,13,24,0.20)'
                                      : '0 0 0 1px rgba(255,255,255,0.07)',
                                  }}
                                >
                                  <div className="mb-1 flex items-center justify-between gap-3">
                                    <span className={`font-display text-[18px] font-bold ${selected ? 'text-offwhite' : 'text-offwhite/82'}`}>
                                      {option.label}
                                    </span>
                                    {selected ? (
                                      <div
                                        className="flex h-8 w-8 items-center justify-center rounded-full"
                                        style={{ background: 'rgba(255,107,43,0.14)', boxShadow: '0 0 0 1px rgba(255,107,43,0.20)' }}
                                      >
                                        <CheckCircle size={14} className="text-orange-soft" aria-hidden="true" />
                                      </div>
                                    ) : null}
                                  </div>
                                  <p className="text-[13px] text-offwhite/48">{option.description}</p>
                                  <p className="mt-2 text-[12px] italic leading-relaxed text-offwhite/34">{option.example}</p>
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>

                        <div className="flex gap-3 pt-2">
                          <div className="hidden flex-1 sm:block" />
                          <PrimaryBtn
                            onClick={() => setStep('business')}
                            disabled={!form.receptionist_name.trim()}
                            className="sm:max-w-[240px]"
                          >
                            Continue
                            <ArrowRight size={15} aria-hidden="true" />
                          </PrimaryBtn>
                        </div>
                      </div>
                    </StepPane>
                  )}

                  {step === 'business' && (
                    <StepPane stepKey="business">
                      <div className="space-y-5">
                        <div>
                          <label htmlFor="onb-biz" className={LABEL_CLASS}>Business name</label>
                          <input
                            id="onb-biz"
                            className={FIELD_CLASS}
                            value={form.business_name}
                            onChange={event => set('business_name', event.target.value)}
                            placeholder="Mark Thomas Plumbing Ltd"
                          />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-[1.15fr_0.85fr]">
                          <div>
                            <label htmlFor="onb-trade" className={LABEL_CLASS}>Trade type</label>
                            <div className="relative">
                              <select
                                id="onb-trade"
                                className={`${FIELD_CLASS} cursor-pointer appearance-none pr-10`}
                                value={form.trade_type}
                                onChange={event => {
                                  set('trade_type', event.target.value);
                                  set('services', []);
                                }}
                              >
                                <option value="">Select your trade…</option>
                                {TRADES.map(trade => <option key={trade} value={trade}>{trade}</option>)}
                              </select>
                              <svg
                                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-offwhite/30"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="onb-city" className={LABEL_CLASS}>City / area</label>
                            <input
                              id="onb-city"
                              className={FIELD_CLASS}
                              value={form.city}
                              onChange={event => set('city', event.target.value)}
                              placeholder="South London"
                            />
                          </div>
                        </div>

                        <div
                          className="rounded-[18px] p-4"
                          style={{ background: 'rgba(153,203,255,0.05)', boxShadow: '0 0 0 1px rgba(153,203,255,0.10)' }}
                        >
                          <p className="text-[13px] leading-relaxed text-accent/74">
                            Sarah will use this to answer with the right trade language and tell callers whether they are in your service area.
                          </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <SecondaryBtn onClick={() => setStep('receptionist')} className="flex-1">
                            Back
                          </SecondaryBtn>
                          <PrimaryBtn
                            onClick={() => setStep('services')}
                            disabled={!form.business_name.trim() || !form.trade_type}
                            className="flex-[1.3]"
                          >
                            Continue
                            <ArrowRight size={15} aria-hidden="true" />
                          </PrimaryBtn>
                        </div>
                      </div>
                    </StepPane>
                  )}

                  {step === 'services' && (
                    <StepPane stepKey="services">
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/32">
                              Suggested for {form.trade_type || 'your trade'}
                            </p>
                            <p className="mt-1 text-[14px] text-offwhite/50">
                              Pick everything Sarah should confidently discuss on a live call.
                            </p>
                          </div>
                          <div
                            className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-soft"
                            style={{ background: 'rgba(255,107,43,0.08)', boxShadow: 'inset 0 0 0 1px rgba(255,107,43,0.16)' }}
                          >
                            {form.services.length} selected
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          {suggestedServices.map(service => {
                            const selected = form.services.includes(service);
                            return (
                              <button
                                key={service}
                                type="button"
                                onClick={() => toggleService(service)}
                                className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                                style={{
                                  background: selected
                                    ? 'rgba(255,107,43,0.13)'
                                    : 'rgba(255,255,255,0.045)',
                                  boxShadow: selected
                                    ? '0 0 0 1px rgba(255,107,43,0.32), 0 10px 22px rgba(255,107,43,0.10)'
                                    : '0 0 0 1px rgba(255,255,255,0.08)',
                                  color: selected ? '#ffb59a' : 'rgba(240,244,248,0.68)',
                                }}
                              >
                                {selected ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
                                {service}
                              </button>
                            );
                          })}
                        </div>

                        <div
                          className="rounded-[20px] p-4"
                          style={{ background: 'rgba(255,255,255,0.03)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
                        >
                          <label htmlFor="onb-custom-service" className={LABEL_CLASS}>Add a custom service</label>
                          <div className="flex gap-2">
                            <input
                              id="onb-custom-service"
                              className={`${FIELD_CLASS} flex-1`}
                              value={customService}
                              onChange={event => setCustomService(event.target.value)}
                              onKeyDown={event => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  addCustomService();
                                }
                              }}
                              placeholder="Add a custom service…"
                              maxLength={60}
                            />
                            <button
                              type="button"
                              onClick={addCustomService}
                              disabled={!customService.trim()}
                              className="inline-flex min-h-[50px] min-w-[50px] items-center justify-center rounded-field bg-white/[0.06] text-offwhite/65 transition-all duration-200 hover:bg-white/[0.10] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.09)' }}
                              aria-label="Add service"
                            >
                              <Plus size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {form.services.filter(service => !suggestedServices.includes(service)).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {form.services.filter(service => !suggestedServices.includes(service)).map(service => (
                              <span
                                key={service}
                                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-orange-soft"
                                style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.24)' }}
                              >
                                {service}
                                <button
                                  type="button"
                                  onClick={() => toggleService(service)}
                                  aria-label={`Remove ${service}`}
                                  className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[2px]"
                                >
                                  <X size={11} aria-hidden="true" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <SecondaryBtn onClick={() => setStep('business')} className="flex-1">
                            Back
                          </SecondaryBtn>
                          <PrimaryBtn onClick={() => setStep('hours')} className="flex-[1.3]">
                            Continue
                            <ArrowRight size={15} aria-hidden="true" />
                          </PrimaryBtn>
                        </div>
                      </div>
                    </StepPane>
                  )}

                  {step === 'hours' && (
                    <StepPane stepKey="hours">
                      <div className="space-y-6">
                        <fieldset>
                          <legend className={LABEL_CLASS}>Working days</legend>
                          <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible no-scrollbar">
                            {DAY_LABELS.map((label, index) => {
                              const value = DAY_VALUES[index];
                              const active = form.working_days.includes(value);
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => toggleDay(value)}
                                  aria-pressed={active}
                                  className="min-h-[50px] min-w-[56px] rounded-[16px] px-3 py-3 text-[13px] font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                                  style={{
                                    background: active
                                      ? 'rgba(255,107,43,0.13)'
                                      : 'rgba(255,255,255,0.04)',
                                    boxShadow: active
                                      ? '0 0 0 1px rgba(255,107,43,0.32), 0 10px 22px rgba(255,107,43,0.10)'
                                      : '0 0 0 1px rgba(255,255,255,0.08)',
                                    color: active ? '#ffb59a' : 'rgba(240,244,248,0.45)',
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="onb-start" className={LABEL_CLASS}>Start time</label>
                            <input
                              id="onb-start"
                              type="time"
                              className={FIELD_CLASS}
                              value={form.work_start}
                              onChange={event => set('work_start', event.target.value)}
                            />
                          </div>
                          <div>
                            <label htmlFor="onb-end" className={LABEL_CLASS}>End time</label>
                            <input
                              id="onb-end"
                              type="time"
                              className={FIELD_CLASS}
                              value={form.work_end}
                              onChange={event => set('work_end', event.target.value)}
                            />
                          </div>
                        </div>

                        <div
                          className="rounded-[18px] p-4"
                          style={{ background: 'rgba(153,203,255,0.05)', boxShadow: '0 0 0 1px rgba(153,203,255,0.10)' }}
                        >
                          <p className="text-[13px] leading-relaxed text-accent/74">
                            Outside these hours, Sarah can still capture the full enquiry, explain your availability properly, and set the right callback expectation for the next working day.
                          </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <SecondaryBtn onClick={() => setStep('services')} className="flex-1">
                            Back
                          </SecondaryBtn>
                          <PrimaryBtn onClick={() => setStep('contact')} className="flex-[1.3]">
                            Continue
                            <ArrowRight size={15} aria-hidden="true" />
                          </PrimaryBtn>
                        </div>
                      </div>
                    </StepPane>
                  )}

                  {step === 'contact' && (
                    <StepPane stepKey="contact">
                      <div className="space-y-5">
                        <div>
                          <label htmlFor="onb-name" className={LABEL_CLASS}>Your name</label>
                          <input
                            id="onb-name"
                            autoComplete="name"
                            className={FIELD_CLASS}
                            value={form.owner_name}
                            onChange={event => set('owner_name', event.target.value)}
                            placeholder="Mark Thomas"
                          />
                        </div>

                        <div>
                          <label htmlFor="onb-mobile" className={LABEL_CLASS}>Mobile for summaries</label>
                          <input
                            id="onb-mobile"
                            type="tel"
                            autoComplete="tel"
                            className={FIELD_CLASS}
                            value={form.owner_mobile}
                            onChange={event => set('owner_mobile', event.target.value)}
                            placeholder="+44 7700 900000"
                          />
                          <p className="mt-2 text-[12px] leading-relaxed text-offwhite/34">
                            You’ll get the caller name, job type, urgency, and next action after every answered call.
                          </p>
                        </div>

                        <div
                          className="rounded-[18px] p-4"
                          style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-full"
                              style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
                            >
                              <Phone size={15} className="text-orange-soft" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-[14px] font-semibold text-offwhite/76">Critical for urgent call-outs</p>
                              <p className="mt-1 text-[13px] leading-relaxed text-offwhite/46">
                                This number is where urgent follow-up and post-call summaries will land, so it should be the phone you actually check between jobs.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <SecondaryBtn onClick={() => setStep('hours')} className="flex-1">
                            Back
                          </SecondaryBtn>
                          <PrimaryBtn
                            onClick={() => setStep('ready')}
                            disabled={!form.owner_name.trim() || !form.owner_mobile.trim()}
                            className="flex-[1.3]"
                          >
                            Review setup
                            <ArrowRight size={15} aria-hidden="true" />
                          </PrimaryBtn>
                        </div>
                      </div>
                    </StepPane>
                  )}

                  {step === 'ready' && (
                    <StepPane stepKey="ready">
                      <div className="space-y-5">
                        <div
                          className="rounded-[22px] p-5"
                          style={{
                            background: 'linear-gradient(180deg, rgba(255,107,43,0.08) 0%, rgba(255,107,43,0.04) 100%)',
                            boxShadow: '0 0 0 1px rgba(255,107,43,0.18)',
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-full"
                              style={{ background: 'rgba(255,107,43,0.12)', boxShadow: '0 0 0 1px rgba(255,107,43,0.20)' }}
                            >
                              <CheckCircle2 size={18} className="text-orange-soft" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-[18px] font-display font-bold text-offwhite">
                                {form.receptionist_name} is ready to go live
                              </p>
                              <p className="mt-2 text-[14px] leading-relaxed text-offwhite/56">
                                Review the configuration below. You can still update any of this later in Settings, but this is what activates now.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          {[
                            {
                              label: 'Receptionist',
                              value: `${form.receptionist_name} · ${formatToneLabel(form.receptionist_tone)}`,
                            },
                            {
                              label: 'Business',
                              value: form.business_name || 'Not set',
                            },
                            {
                              label: 'Trade & area',
                              value: `${form.trade_type || 'Not set'}${form.city ? ` · ${form.city}` : ''}`,
                            },
                            {
                              label: 'Services',
                              value: form.services.length
                                ? `${form.services.slice(0, 3).join(', ')}${form.services.length > 3 ? ` +${form.services.length - 3} more` : ''}`
                                : 'Not specified',
                            },
                            {
                              label: 'Hours',
                              value: `${form.work_start} - ${form.work_end} · ${formatWorkingDays(form.working_days)}`,
                            },
                            {
                              label: 'SMS alerts',
                              value: form.owner_mobile || 'Not set',
                            },
                          ].map(row => (
                            <div
                              key={row.label}
                              className="grid gap-2 rounded-[18px] px-4 py-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center"
                              style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
                            >
                              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                                {row.label}
                              </span>
                              <span className="text-[14px] leading-relaxed text-offwhite/76 sm:text-right">
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        {error ? (
                          <div
                            className="flex items-start gap-2 rounded-[16px] px-4 py-3.5"
                            style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.20)' }}
                            role="alert"
                          >
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-orange-soft" aria-hidden="true" />
                            <p className="text-[13px] leading-relaxed text-orange-soft">{error}</p>
                          </div>
                        ) : null}

                        <PrimaryBtn onClick={complete} disabled={saving} className="mt-2">
                          {saving ? (
                            <>
                              <SavingDots />
                              Activating {form.receptionist_name}…
                            </>
                          ) : (
                            <>
                              Activate {form.receptionist_name}
                              <ArrowRight size={15} aria-hidden="true" />
                            </>
                          )}
                        </PrimaryBtn>

                        <button
                          type="button"
                          onClick={() => setStep('contact')}
                          className="w-full rounded text-center text-[13px] text-offwhite/32 transition-colors duration-200 hover:text-offwhite/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                        >
                          Go back and edit details
                        </button>
                      </div>
                    </StepPane>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[12px] text-offwhite/28 lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {[
              'No passwords to manage',
              'You can edit everything later',
              'Built for sole traders and small teams',
            ].map(item => (
              <span key={item} className="inline-flex items-center gap-2">
                <CheckCircle2 size={12} className="text-orange-soft/70" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-2">
            <ChevronRight size={12} className="text-offwhite/20" aria-hidden="true" />
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
        </div>
      </div>
    </div>
  );
}
