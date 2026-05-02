import { useEffect, useState } from 'react';
import { CheckCircle2, Mail, Phone, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/Logo';

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{
        background:
          'radial-gradient(ellipse at 20% 20%, rgba(255,107,43,0.09) 0%, transparent 55%), ' +
          'radial-gradient(ellipse at 80% 80%, rgba(153,203,255,0.06) 0%, transparent 50%), ' +
          '#051426',
      }}
    >
      {/* Blueprint grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.4,
        }}
      />

      <div
        className="relative w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >

        {/* Logo — prominent, centred, with ambient glow beneath */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative flex items-center justify-center">
            <div style={{
              position: 'absolute',
              width: '220px', height: '120px',
              background: 'radial-gradient(ellipse, rgba(255,107,43,0.28) 0%, transparent 65%)',
              filter: 'blur(32px)',
              pointerEvents: 'none',
            }} />
            <Logo className="h-[50px] w-auto relative z-10" />
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-card p-8 text-center"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.08), ' +
              '0 40px 80px rgba(2,13,24,0.6), ' +
              '0 0 60px rgba(255,107,43,0.05)',
          }}
        >
          {/* Success icon — on-brand orange */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'rgba(255,107,43,0.12)',
              boxShadow: '0 0 0 1px rgba(255,107,43,0.20), 0 0 32px rgba(255,107,43,0.20)',
            }}
          >
            <CheckCircle2 className="w-8 h-8 text-orange" strokeWidth={2} />
          </div>

          <h1 className="font-display text-[30px] font-bold text-offwhite tracking-tight leading-tight mb-3">
            You're{' '}
            <span
              className="italic"
              style={{
                background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              in!
            </span>
          </h1>

          <p className="text-offwhite/55 text-[14px] leading-relaxed font-body mb-8 max-w-[320px] mx-auto">
            Your receptionist is being set up right now. Check your email — your dedicated UK number and one-click login link will arrive within 2 minutes.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-7 text-left">
            {[
              { icon: Phone,      text: 'Your dedicated UK number is being provisioned' },
              { icon: Mail,       text: 'Welcome email arriving shortly with your login link' },
              { icon: ArrowRight, text: 'Log in and personalise your receptionist' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.15)' }}
                >
                  <Icon className="w-4 h-4 text-orange-soft" strokeWidth={2} aria-hidden="true" />
                </div>
                <span className="text-[13px] text-offwhite/65 font-body">{text}</span>
              </div>
            ))}
          </div>

          {/* Animated status indicator */}
          <div
            role="status"
            aria-live="polite"
            aria-label="Setting up your account"
            className="rounded-[10px] px-4 py-3 flex items-center justify-center gap-2.5"
            style={{
              background: 'rgba(255,107,43,0.07)',
              boxShadow: '0 0 0 1px rgba(255,107,43,0.12)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-orange flex-shrink-0 motion-safe:animate-ping opacity-75" />
            <span className="text-[13px] text-orange-soft font-body font-semibold tracking-[-0.01em]">
              Setting up your account…
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-offwhite/25 font-body mt-6">
          Questions? Email us at{' '}
          <a
            href="mailto:hello@tradereceptionist.co.uk"
            className="text-offwhite/40 hover:text-orange-soft transition-colors duration-200"
          >
            hello@tradereceptionist.co.uk
          </a>
        </p>
      </div>
    </div>
  );
}
