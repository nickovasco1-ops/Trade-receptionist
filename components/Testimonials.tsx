import React from 'react';
import { Section, Badge } from './UI';
import { Star, Quote } from 'lucide-react';
import { Testimonial } from '../types';

export const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      name: 'Dave Miller',
      company: 'Miller Plumbing & Heating',
      role: 'Owner',
      quote: 'My phone used to ring off the hook while I was under a sink. Now I just get a text with the job details. It\'s brilliant.',
      tag: 'Fewer missed calls',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      name: 'Sarah Jenkins',
      company: 'SJ Electrical Services',
      role: 'Director',
      quote: 'The qualification is spot on. It filters out the tyre kickers so I only spend time on genuine quotes.',
      tag: 'Better leads',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359-7013c53bca63?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      name: 'Mike Thompson',
      company: 'Thompson Build Group',
      role: 'Site Manager',
      quote: 'It sounds properly British, not like a robot. My customers actually leave messages now instead of hanging up.',
      tag: 'Professional image',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      name: 'James Wilson',
      company: 'Rapid Roof Repairs',
      role: 'Sole Trader',
      quote: 'Costs me less than a tank of diesel a month and books me about £2k of extra work. Absolute no-brainer.',
      tag: 'High ROI',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      name: 'Emma Clarke',
      company: 'Clarke & Sons Locksmiths',
      role: 'Office Manager',
      quote: 'I used to spend my evenings calling people back. Now I spend them with my kids. The AI handles the bookings.',
      tag: 'Work-life balance',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      name: 'Robert Hughes',
      company: 'RH Gas Services',
      role: 'Engineer',
      quote: 'Set it up in 5 minutes between jobs. Didn\'t need to change my number or anything complex.',
      tag: 'Easy setup',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200&h=200',
    },
  ];

  return (
    <Section bg="gray" className="relative overflow-hidden">
      {/* Atmospheric glows */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,43,0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(153,203,255,0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="text-center max-w-2xl mx-auto mb-14 relative z-10">
        <Badge>What UK Tradespeople Say</Badge>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite mb-4 tracking-[-0.02em]">
          Trusted by trades across the UK.
        </h2>
        <p className="text-[17px] text-offwhite/50">
          Join 500+ professionals who have stopped missing calls and started booking more work.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="rounded-card p-7 flex flex-col transition-all duration-300 hover:-translate-y-1"
            style={{
              background: 'rgba(255,255,255,0.05)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
              transitionTimingFunction: 'cubic-bezier(0.34,1.2,0.64,1)',
            }}
          >
            {/* Stars + quote icon */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, k) => (
                  <Star key={k} className="w-4 h-4 fill-current text-orange" />
                ))}
              </div>
              <Quote className="w-7 h-7 text-orange/15 fill-current" />
            </div>

            <p className="text-offwhite/65 leading-relaxed text-[15px] mb-6 flex-grow">
              "{t.quote}"
            </p>

            {/* Tag */}
            <span
              className="inline-block self-start text-[11px] font-bold uppercase tracking-[0.10em] px-3 py-1 rounded-full mb-5 text-orange-soft"
              style={{ background: 'rgba(255,107,43,0.10)' }}
            >
              {t.tag}
            </span>

            {/* Avatar + name */}
            <div className="flex items-center gap-3 pt-5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <img
                src={t.avatarUrl}
                alt={t.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                style={{ border: '2px solid rgba(255,107,43,0.20)' }}
                loading="lazy"
              />
              <div>
                <p className="font-display font-bold text-[14px] text-offwhite">{t.name}</p>
                <p className="text-[12px] text-offwhite/35">{t.company}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};
