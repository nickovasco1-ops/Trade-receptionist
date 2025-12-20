import React, { useEffect } from 'react';
import { Section, Badge, Button } from './UI';
import { CheckCircle2, Calendar, ShieldCheck } from 'lucide-react';

export const BookDemo: React.FC = () => {
  useEffect(() => {
    const head = document.querySelector('head');
    const script = document.createElement('script');
    script.setAttribute('src', 'https://assets.calendly.com/assets/external/widget.js');
    script.setAttribute('async', 'true');
    head?.appendChild(script);

    return () => {
      // Cleanup not strictly necessary for simple script append, 
      // but good practice to remove if we were doing more complex DOM manipulation
      head?.removeChild(script);
    };
  }, []);

  return (
    <div className="pt-24 min-h-screen flex flex-col">
      <Section bg="white" className="flex-grow">
        <div className="max-w-4xl mx-auto text-center mb-10">
           <Badge>Live Demo</Badge>
           <h1 className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 mb-6">See Trade Receptionist in action.</h1>
           <p className="text-xl text-slate-600 max-w-2xl mx-auto">
             A quick 15-minute walkthrough. Hear a real call flow, see the setup, and get a tailored recommendation for your trade.
           </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
            {[
                { icon: CheckCircle2, text: "Hear live audio examples" },
                { icon: Calendar, text: "See how it syncs with your diary" },
                { icon: ShieldCheck, text: "No hard sell. Cancel anytime." }
            ].map((item, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-brand-600">
                        <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-tradeBlue-900">{item.text}</span>
                </div>
            ))}
        </div>

        {/* Calendly Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden mx-auto max-w-5xl" style={{ minHeight: '750px' }}>
            <div 
                className="calendly-inline-widget w-full h-full" 
                data-url="https://calendly.com/nick-autonosphere?hide_gdpr_banner=1" 
                style={{ minWidth: '320px', height: '750px' }} 
            />
        </div>

        <div className="text-center mt-12">
            <p className="text-sm text-slate-500 mb-4">Prefer to email?</p>
            <a href="mailto:hello@tradereceptionist.co.uk" className="text-brand-600 font-semibold hover:underline">
                hello@tradereceptionist.co.uk
            </a>
        </div>
      </Section>
    </div>
  );
};