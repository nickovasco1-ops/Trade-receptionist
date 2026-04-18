import React, { useEffect } from 'react';
import { Section, Badge } from './UI';
import { CheckCircle2, Calendar, ShieldCheck } from 'lucide-react';

export const BookDemo: React.FC = () => {
  useEffect(() => {
    const head = document.querySelector('head');
    const script = document.createElement('script');
    script.setAttribute('src', 'https://assets.calendly.com/assets/external/widget.js');
    script.setAttribute('async', 'true');
    head?.appendChild(script);

    return () => {
      head?.removeChild(script);
    };
  }, []);

  const TRUST_ITEMS = [
    { icon: CheckCircle2, text: 'Hear live audio examples' },
    { icon: Calendar,     text: 'See how it syncs with your diary' },
    { icon: ShieldCheck,  text: 'No hard sell. Cancel anytime.' },
  ];

  return (
    <div className="pt-36 min-h-screen flex flex-col bg-navy">
      <Section bg="white" className="flex-grow">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge>Live Demo</Badge>
          <h1
            className="font-display font-bold text-offwhite mb-5"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
          >
            See Trade Receptionist{' '}
            <span style={{ color: '#FF6B2B', fontStyle: 'italic' }}>in action.</span>
          </h1>
          <p className="text-[18px] text-offwhite/55 leading-relaxed max-w-xl mx-auto">
            A quick 15-minute walkthrough. Hear a real call flow, see the setup, and get a tailored recommendation for your trade.
          </p>
        </div>

        {/* Trust icons */}
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
          {TRUST_ITEMS.map(({ icon: Icon, text }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-card px-5 py-4"
              style={{
                background: 'rgba(255,255,255,0.05)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,107,43,0.12)' }}
              >
                <Icon className="w-4 h-4 text-orange-soft" />
              </div>
              <span className="font-body font-semibold text-[14px] text-offwhite/70">{text}</span>
            </div>
          ))}
        </div>

        {/* Calendly container */}
        <div
          className="rounded-card overflow-hidden mx-auto max-w-5xl"
          style={{
            background: '#ffffff',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(2,13,24,0.5)',
            minHeight: '750px',
          }}
        >
          <div
            className="calendly-inline-widget w-full h-full"
            data-url="https://calendly.com/nick-autonosphere?hide_gdpr_banner=1"
            style={{ minWidth: '320px', height: '750px' }}
          />
        </div>

        {/* Footer note */}
        <div className="text-center mt-10">
          <p className="text-[13px] text-offwhite/30 mb-2">Prefer to email?</p>
          <a
            href="mailto:hello@tradereceptionist.co.uk"
            className="text-orange-soft font-semibold text-[14px] hover:text-orange transition-colors duration-200"
          >
            hello@tradereceptionist.co.uk
          </a>
        </div>
      </Section>
    </div>
  );
};
