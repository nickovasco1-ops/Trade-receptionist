import React from 'react';
import { X, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWaitlist: () => void;
}

interface Plan {
  name: string;
  price: number;
  calls: string;
  features: string[];
  stripeUrl: string;
  popular: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: 29,
    calls: 'Up to 100 calls/month',
    features: ['AI call answering 24/7', 'WhatsApp job summaries', 'Call transcripts'],
    stripeUrl: 'https://buy.stripe.com/STARTER',
    popular: false,
  },
  {
    name: 'Pro',
    price: 59,
    calls: 'Up to 300 calls/month',
    features: ['Everything in Starter', 'Diary integration', 'Priority routing', 'Custom greetings'],
    stripeUrl: 'https://buy.stripe.com/PRO',
    popular: true,
  },
  {
    name: 'Agency',
    price: 119,
    calls: 'Unlimited calls',
    features: ['Everything in Pro', 'Multiple numbers', 'Team management', 'Dedicated support'],
    stripeUrl: 'https://buy.stripe.com/AGENCY',
    popular: false,
  },
];

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({ isOpen, onClose, onWaitlist }) => {
  if (!isOpen) return null;

  const handlePlanClick = (stripeUrl: string) => {
    window.open(stripeUrl, '_blank');
  };

  const handleWaitlist = () => {
    onClose();
    onWaitlist();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(2,13,24,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-card overflow-hidden"
        style={{
          background: '#0A2340',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(2,13,24,0.7)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-offwhite/30 hover:text-offwhite/70 transition-colors z-10 p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Orange top accent strip */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #FF6B2B, #FF8C55)' }} />

        <div className="p-8">
          {/* Header */}
          <div className="mb-7 pr-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-orange-soft font-body">
                14-day free trial
              </span>
            </div>
            <h3 className="font-display text-[26px] font-bold text-offwhite mb-2 tracking-tight leading-tight">
              Start your free trial —{' '}
              <span className="text-offwhite/50">no charge today</span>
            </h3>
            <p className="text-offwhite/40 text-[14px] leading-relaxed">
              Choose a plan. Your card won't be charged until after your trial ends.
            </p>
          </div>

          {/* Plans */}
          <div className="space-y-3 mb-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="relative rounded-[14px] p-5"
                style={
                  plan.popular
                    ? {
                        background: 'rgba(255,107,43,0.08)',
                        boxShadow: '0 0 0 1.5px rgba(255,107,43,0.35)',
                        transform: 'scale(1.02)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.05)',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                      }
                }
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.10em] text-white"
                    style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)' }}
                  >
                    Most Popular
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-display font-bold text-[18px] text-offwhite tracking-tight">
                        {plan.name}
                      </p>
                      {plan.popular && (
                        <Zap className="w-3.5 h-3.5 text-orange" />
                      )}
                    </div>
                    <p className="text-[12px] text-offwhite/40 font-body">{plan.calls}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-display font-bold text-[24px] text-offwhite tracking-tight">
                      £{plan.price}
                    </span>
                    <span className="text-[12px] text-offwhite/40 font-body">/mo</span>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-[13px] text-offwhite/60 font-body">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-orange-soft/70" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanClick(plan.stripeUrl)}
                  className="w-full h-11 rounded-[12px] font-bold font-body text-[14px] flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
                  style={
                    plan.popular
                      ? {
                          background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)',
                          color: '#fff',
                          boxShadow: '0 0 20px rgba(255,107,43,0.35)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.07)',
                          color: 'rgba(240,244,248,0.75)',
                          boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                        }
                  }
                >
                  Start Free — Pay After Trial
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-5 text-[12px] text-offwhite/30 font-body">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-orange-soft/50" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-orange-soft/50" />
              No setup fees
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-orange-soft/50" />
              14-day free trial
            </span>
          </div>

          {/* Fallback link to waitlist */}
          <p className="text-center text-[13px] text-offwhite/30 font-body">
            Not ready to start yet?{' '}
            <button
              onClick={handleWaitlist}
              className="text-offwhite/50 hover:text-orange-soft underline underline-offset-2 transition-colors"
            >
              Join the waitlist instead →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
