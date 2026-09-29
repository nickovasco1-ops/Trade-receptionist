// "Start Free Trial" for the SEO pages. Opens the same Stripe checkout modal
// the homepage uses, so pricing, Payment Links and trial copy come from one
// place (src/lib/plans.ts). The modal chunk loads only when someone clicks.

import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

const StripeCheckoutModal = React.lazy(() =>
  import('../../../components/StripeCheckoutModal').then((m) => ({ default: m.StripeCheckoutModal })),
);

interface CheckoutContextValue {
  openCheckout: (planKey?: string) => void;
}

const CheckoutContext = createContext<CheckoutContextValue>({ openCheckout: () => undefined });

interface CheckoutProviderProps {
  children: ReactNode;
}

export function CheckoutProvider({ children }: CheckoutProviderProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [planKey, setPlanKey] = useState<string | null>(null);

  const openCheckout = useCallback((key?: string) => {
    setPlanKey(key ?? null);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openCheckout }), [openCheckout]);

  return (
    <CheckoutContext.Provider value={value}>
      {children}
      {open && (
        <React.Suspense fallback={null}>
          <StripeCheckoutModal isOpen={open} onClose={() => { setOpen(false); setPlanKey(null); }} planKey={planKey} />
        </React.Suspense>
      )}
    </CheckoutContext.Provider>
  );
}

const PRIMARY_CTA =
  'inline-flex items-center justify-center gap-2.5 px-7 min-h-[52px] ' +
  'bg-gradient-to-r from-orange to-orange-glow text-void font-body font-semibold text-[15px] tracking-[-0.01em] ' +
  'rounded-button shadow-orange-glow hover:shadow-orange-glow-lg hover:-translate-y-0.5 active:translate-y-0 ' +
  'transition-all duration-300 ease-mechanical ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]';

export const SECONDARY_CTA =
  'inline-flex items-center justify-center gap-2.5 px-7 min-h-[52px] ' +
  'bg-accent/[0.08] text-accent font-body font-semibold text-[15px] tracking-[-0.01em] ' +
  'rounded-button ring-1 ring-accent/20 hover:bg-accent/[0.14] hover:ring-accent/35 hover:-translate-y-0.5 ' +
  'transition-all duration-300 ease-mechanical ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]';

interface StartTrialButtonProps {
  planKey?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function StartTrialButton({ planKey, label = 'Start Free Trial', className = '', compact = false }: StartTrialButtonProps): React.ReactElement {
  const { openCheckout } = useContext(CheckoutContext);
  const size = compact ? '!min-h-[44px] !px-5 !text-[14px]' : '';
  return (
    <button type="button" onClick={() => openCheckout(planKey)} className={`${PRIMARY_CTA} ${size} ${className}`}>
      {label}
      {!compact && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
