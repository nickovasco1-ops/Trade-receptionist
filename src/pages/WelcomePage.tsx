import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, Phone, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/Logo';

export default function WelcomePage() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: 'linear-gradient(135deg, #020D18 0%, #051426 60%, #0A2340 100%)' }}
    >
      {/* Blueprint grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo className="h-8 w-auto" />
        </div>

        {/* Card */}
        <div
          className="rounded-card p-8 text-center"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(2,13,24,0.6)',
          }}
        >
          {/* Success icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(34,197,94,0.12)', boxShadow: '0 0 32px rgba(34,197,94,0.2)' }}
          >
            <CheckCircle2 className="w-8 h-8 text-green-400" strokeWidth={2} />
          </div>

          <h1 className="font-display text-[28px] font-bold text-offwhite tracking-tight leading-tight mb-3">
            You're in!
          </h1>
          <p className="text-offwhite/60 text-[15px] leading-relaxed font-body mb-8">
            Sarah is being set up right now. You'll receive a welcome email within 2 minutes with your dedicated phone number and a one-click login link.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-8 text-left">
            {[
              { icon: Phone, text: 'Your dedicated UK number is being provisioned' },
              { icon: Mail,  text: 'Welcome email arriving shortly with your login link' },
              { icon: ArrowRight, text: 'Log in and customise Sarah for your business' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,107,43,0.12)' }}
                >
                  <Icon className="w-4 h-4 text-orange-soft" strokeWidth={2} />
                </div>
                <span className="text-[13px] text-offwhite/70 font-body">{text}</span>
              </div>
            ))}
          </div>

          {/* Animated setting up indicator */}
          <div
            className="rounded-[10px] px-4 py-3 flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,107,43,0.08)' }}
          >
            <div className="w-2 h-2 rounded-full bg-orange animate-pulse" />
            <span className="text-[13px] text-orange-soft font-body font-semibold">
              Setting up your account{dots}
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-offwhite/25 font-body mt-6">
          Questions? Email us at{' '}
          <a href="mailto:hello@tradereceptionist.com" className="text-offwhite/40 hover:text-orange-soft transition-colors">
            hello@tradereceptionist.com
          </a>
        </p>
      </div>
    </div>
  );
}
