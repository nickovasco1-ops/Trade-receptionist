import React, { useState } from 'react';
import { X, ArrowRight, ShieldCheck, Phone, Zap, Building2 } from 'lucide-react';
import { PLANS } from '../src/lib/plans';
import type { PlanConfig } from '../src/lib/plans';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If set, opens directly to this plan's confirmation view */
  planKey?: string | null;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  starter:  Phone,
  pro:      Zap,
  business: Building2,
  agency:   ShieldCheck,
};

const PLAN_TAGLINE: Record<string, string> = {
  starter:  'For solo traders who want every call captured while they work.',
  pro:      'The best balance of automation and control for busy trades businesses.',
  business: 'For growing teams running multiple numbers or job types.',
  agency:   'Built for multi-van operators running multiple departments or brands.',
};

function PlanConfirmation({ plan, onClose }: { plan: PlanConfig; onClose: () => void }) {
  const Icon = PLAN_ICONS[plan.key] ?? Phone;

  return (
    <>
      {/* Plan identity */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{
              background: plan.popular ? 'rgba(255,107,43,0.14)' : 'rgba(255,255,255,0.06)',
              boxShadow: plan.popular
                ? '0 0 0 1px rgba(255,107,43,0.22)'
                : '0 0 0 1px rgba(255,255,255,0.10)',
            }}
          >
            <Icon size={18} className={plan.popular ? 'text-orange-soft' : 'text-offwhite/56'} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">
                14-day free trial
              </p>
            </div>
            <p id="stripe-checkout-title" className="text-[18px] font-bold font-display text-offwhite tracking-tight">{plan.name} plan</p>
          </div>
          {plan.popular && (
            <span
              className="ml-auto rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.10em] text-white"
              style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)' }}
            >
              Most Popular
            </span>
          )}
        </div>

        {/* Price hero */}
        <div
          className="rounded-[20px] px-6 py-5"
          style={{
            background: plan.popular
              ? 'radial-gradient(circle at 80% 30%, rgba(255,107,43,0.10) 0%, transparent 60%), linear-gradient(180deg, rgba(17,31,53,0.90) 0%, rgba(9,22,38,0.96) 100%)'
              : 'linear-gradient(180deg, rgba(17,31,53,0.84) 0%, rgba(9,22,38,0.90) 100%)',
            boxShadow: plan.popular
              ? '0 0 0 1px rgba(255,107,43,0.18), 0 16px 40px rgba(2,13,24,0.30)'
              : '0 0 0 1px rgba(255,255,255,0.08), 0 16px 40px rgba(2,13,24,0.28)',
          }}
        >
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-[52px] font-bold text-offwhite leading-none tracking-[-0.04em]">
              £{plan.price}
            </span>
            <span className="text-[14px] text-offwhite/36 font-body">/mo after trial</span>
          </div>
          <p className="text-[13px] leading-relaxed text-offwhite/48">{PLAN_TAGLINE[plan.key]}</p>
          <p className="mt-2 text-[11px] font-bold text-orange-soft/70">{plan.calls}</p>
        </div>
      </div>

      {/* Primary CTA */}
      <a
        href={plan.stripeUrl}
        data-testid="stripe-checkout-cta"
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2.5 rounded-[18px] px-6 py-4 text-[15px] font-bold text-white transition-all duration-300 ease-mechanical hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
          boxShadow: '0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.20)',
        }}
        onClick={onClose}
      >
        Start Free Trial — No Charge Today
        <ArrowRight size={16} />
      </a>

      {/* Trust micro-copy */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-offwhite/30 font-body">
        <span>14-day free trial</span>
        <span aria-hidden="true">·</span>
        <span>No card required</span>
        <span aria-hidden="true">·</span>
        <span>Cancel anytime</span>
      </div>
    </>
  );
}

function PlanSelector({ onSelect }: { onSelect: (plan: PlanConfig) => void }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft mb-3">
          Choose your plan
        </p>
        <h3 id="stripe-checkout-title" className="font-display text-[28px] font-bold text-offwhite leading-tight tracking-[-0.03em]">
          Start your <em className="not-italic bg-gradient-to-br from-orange to-orange-glow bg-clip-text text-transparent">free</em> trial
        </h3>
        <p className="mt-2 text-[13px] text-offwhite/44 font-body">
          No charge today. Pick the plan that fits your call volume.
        </p>
      </div>

      <div className="space-y-2.5">
        {PLANS.map((plan) => (
          <button
            key={plan.key}
            data-testid={`stripe-plan-${plan.key}`}
            onClick={() => onSelect(plan)}
            className="group w-full rounded-[16px] px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5"
            style={
              plan.popular
                ? {
                    background: 'linear-gradient(180deg, rgba(255,107,43,0.09) 0%, rgba(255,107,43,0.04) 100%)',
                    boxShadow: '0 0 0 1px rgba(255,107,43,0.20)',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                  }
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-bold font-display text-offwhite">{plan.name}</p>
                  {plan.popular && (
                    <span className="rounded-full bg-orange/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.10em] text-orange-soft">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-offwhite/36 font-body mt-0.5">{plan.calls}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="font-display text-[22px] font-bold text-offwhite leading-none tracking-tight">£{plan.price}</p>
                  <p className="text-[10px] text-offwhite/30 font-body">/mo</p>
                </div>
                <ArrowRight size={14} className="text-offwhite/24 transition-colors group-hover:text-orange-soft" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] text-offwhite/26 font-body">
        14-day free trial · No card required · Cancel anytime
      </p>
    </>
  );
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  isOpen,
  onClose,
  planKey,
}) => {
  const initialPlan = PLANS.find(p => p.key === planKey) ?? null;
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(initialPlan);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Sync when planKey prop changes (modal re-opened with different plan)
  React.useEffect(() => {
    setSelectedPlan(PLANS.find(p => p.key === planKey) ?? null);
  }, [planKey, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    requestAnimationFrame(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      firstFocusable?.focus();
    });

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !modalRef.current) return;

    const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter(element => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(2,13,24,0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stripe-checkout-title"
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-[420px] rounded-[32px] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(16,29,50,0.98) 0%, rgba(8,21,36,0.99) 100%)',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.08),' +
            '0 40px 80px rgba(2,13,24,0.70),' +
            'inset 0 1px 0 rgba(255,255,255,0.05)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Orange top accent */}
        <div
          className="h-[2px] w-full"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #FF6B2B 40%, #FF8C55 60%, transparent 100%)' }}
        />

        {/* Blueprint grid ambient */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(153,203,255,1) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(153,203,255,1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 p-7">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-offwhite/30 transition-all duration-200 hover:bg-white/[0.06] hover:text-offwhite/70"
            aria-label="Close"
          >
            <X size={17} />
          </button>

          {selectedPlan ? (
            <>
              <PlanConfirmation plan={selectedPlan} onClose={onClose} />
              {/* Switch plan */}
              <button
                onClick={() => setSelectedPlan(null)}
                className="mt-4 w-full text-center text-[12px] text-offwhite/30 font-body transition-colors hover:text-offwhite/56"
              >
                Not {selectedPlan.name}? Switch plan
              </button>
            </>
          ) : (
            <PlanSelector onSelect={setSelectedPlan} />
          )}
        </div>
      </div>
    </div>
  );
};
