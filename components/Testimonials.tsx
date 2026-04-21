import React from 'react';
import { Section, Badge } from './UI';
import { Star, Quote } from 'lucide-react';

interface TestimonialData {
  name: string;
  company: string;
  role: string;
  quote: string;
  tag: string;
  initials: string;
  avatarColor: string;
}

// Avatar colours using the design system palette
const AVATAR_COLORS = [
  'linear-gradient(135deg, #FF6B2B, #FF8C55)',
  'linear-gradient(135deg, #0F3060, #99cbff)',
  'linear-gradient(135deg, #FF8C55, #ffb59a)',
  'linear-gradient(135deg, #0A2340, #60A5FA)',
  'linear-gradient(135deg, #FF6B2B, #0F3060)',
  'linear-gradient(135deg, #99cbff, #60A5FA)',
];

export const Testimonials: React.FC = () => {
  const testimonials: TestimonialData[] = [
    {
      name: 'Mario Alidor',
      company: 'Maz Handyman · Fleet',
      role: 'Owner',
      quote: 'I used to miss calls constantly while up on roofs or in lofts. By the time I\'d ring back, the job had gone to someone else. Since the AI receptionist started answering for me, my diary\'s fuller than it\'s ever been. Customers comment on how professional we sound now too. Genuinely surprised at the difference it\'s made.',
      tag: 'Diary fully booked',
      initials: 'MA',
      avatarColor: AVATAR_COLORS[0],
    },
    {
      name: 'Dean Kowalski',
      company: 'DK Electrical Services · Tamworth',
      role: 'Owner',
      quote: 'Honestly, I was sceptical. Thought it\'d sound robotic and put people off. But the feedback from customers has been brilliant — they don\'t even realise it\'s not a real person. I\'m an electrician, I can\'t answer mid-job. No more evenings spent returning calls. Worth every penny.',
      tag: 'Works mid-job',
      initials: 'DK',
      avatarColor: AVATAR_COLORS[1],
    },
    {
      name: 'Alfred Charles',
      company: 'Alfred & Alfred Carpenters · Bristol',
      role: 'Owner',
      quote: 'We were losing work and didn\'t even know it. Calls going unanswered, voicemails nobody listened to. The AI receptionist picks up every single time, books the enquiry in, and sends us the details. Our bookings are up and the admin headache has basically gone.',
      tag: 'Bookings up',
      initials: 'AC',
      avatarColor: AVATAR_COLORS[2],
    },
    {
      name: 'Zahir Akram',
      company: 'Akram Yoga Studio · Addlestone',
      role: 'Owner',
      quote: 'Running a yoga studio means I\'m teaching back-to-back classes most of the day. I couldn\'t keep stepping out to answer the phone. New clients were slipping through the net. Now every call gets answered professionally and my schedule fills itself.',
      tag: 'Schedule fills itself',
      initials: 'ZA',
      avatarColor: AVATAR_COLORS[3],
    },
    {
      name: 'Craig Donnelly',
      company: 'Donnelly Plumbing & Heating · Wigan',
      role: 'Owner',
      quote: 'My missus was fed up of me spending every evening returning calls. It was eating into family time and I was still dropping the ball on some enquiries. The AI receptionist sorts it all out during the day. I come off-site, the jobs are already logged. Stress levels are down.',
      tag: 'Family time back',
      initials: 'CD',
      avatarColor: AVATAR_COLORS[4],
    },
    {
      name: 'Priya Nair',
      company: 'Nair Decorating & Interiors · Leicester',
      role: 'Owner',
      quote: 'I\'d been meaning to hire someone to help with the phones for ages but couldn\'t justify the cost. This does the job for a fraction of that. Customers get answered straight away, I get the details sent through, and nothing falls through the cracks anymore. For a one-man operation, it\'s been a proper game changer.',
      tag: 'Game changer',
      initials: 'PN',
      avatarColor: AVATAR_COLORS[5],
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

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 relative z-10">
        <div>
          <Badge>What UK Tradespeople Say</Badge>
          <h2
            className="font-display font-bold text-offwhite"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
          >
            Trusted by trades across the UK.
          </h2>
        </div>
        <p className="text-[15px] text-offwhite/45 max-w-xs md:text-right leading-relaxed flex-shrink-0">
          500+ professionals who've stopped missing calls and started booking more work.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="rounded-card p-7 flex flex-col hover:-translate-y-1 spotlight-card overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.05)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
              transition: 'transform 280ms cubic-bezier(0.34,1.2,0.64,1), box-shadow 280ms ease',
            }}
            onMouseMove={e => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
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
            <div className="flex items-center gap-3 pt-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-display font-bold text-[13px]"
                style={{ background: t.avatarColor }}
                aria-hidden="true"
              >
                {t.initials}
              </div>
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
