import React from 'react';
import { Quote, Star } from 'lucide-react';

import { Section } from './UI';

interface TestimonialData {
  name: string;
  company: string;
  location: string;
  quote: string;
  tag: string;
  initials: string;
  avatarTone: 'orange' | 'blue' | 'peach';
}

const TESTIMONIALS: TestimonialData[] = [
  {
    name: 'Mario Alidor',
    company: 'Maz Handyman',
    location: 'Fleet',
    quote:
      "I used to miss calls constantly while up on roofs or in lofts. By the time I'd ring back, the job had gone to someone else. Since the AI receptionist started answering for me, my diary's fuller than it's ever been. Customers comment on how professional we sound now too. Genuinely surprised at the difference it's made.",
    tag: 'Diary fully booked',
    initials: 'MA',
    avatarTone: 'orange',
  },
  {
    name: 'Dean Kowalski',
    company: 'DK Electrical Services',
    location: 'Tamworth',
    quote:
      "Honestly, I was sceptical. Thought it'd sound robotic and put people off. But the feedback from customers has been brilliant — they don't even realise it's not a real person. I'm an electrician, I can't answer mid-job. No more evenings spent returning calls. Worth every penny.",
    tag: 'Works mid-job',
    initials: 'DK',
    avatarTone: 'blue',
  },
  {
    name: 'Alfred Charles',
    company: 'Alfred & Alfred Carpenters',
    location: 'Bristol',
    quote:
      "We were losing work and didn't even know it. Calls going unanswered, voicemails nobody listened to. The AI receptionist picks up every single time, books the enquiry in, and sends us the details. Our bookings are up and the admin headache has basically gone.",
    tag: 'Bookings up',
    initials: 'AC',
    avatarTone: 'peach',
  },
  {
    name: 'Zahir Akram',
    company: 'Akram Yoga Studio',
    location: 'Addlestone',
    quote:
      "Running a yoga studio means I'm teaching back-to-back classes most of the day. I couldn't keep stepping out to answer the phone. New clients were slipping through the net. Now every call gets answered professionally and my schedule fills itself.",
    tag: 'Schedule fills itself',
    initials: 'ZA',
    avatarTone: 'blue',
  },
  {
    name: 'Craig Donnelly',
    company: 'Donnelly Plumbing & Heating',
    location: 'Wigan',
    quote:
      'My missus was fed up of me spending every evening returning calls. It was eating into family time and I was still dropping the ball on some enquiries. The AI receptionist sorts it all out during the day. I come off-site, the jobs are already logged. Stress levels are down.',
    tag: 'Family time back',
    initials: 'CD',
    avatarTone: 'orange',
  },
  {
    name: 'Priya Nair',
    company: 'Nair Decorating & Interiors',
    location: 'Leicester',
    quote:
      "I'd been meaning to hire someone to help with the phones for ages but couldn't justify the cost. This does the job for a fraction of that. Customers get answered straight away, I get the details sent through, and nothing falls through the cracks anymore. For a one-man operation, it's been a proper game changer.",
    tag: 'Game changer',
    initials: 'PN',
    avatarTone: 'blue',
  },
];

const TESTIMONIAL_ROWS = [
  TESTIMONIALS.slice(0, 3),
  TESTIMONIALS.slice(3),
];

function TestimonialCard({ testimonial }: { testimonial: TestimonialData }) {
  return (
    <article className="testimonial-card public-surface-soft">
      <div className="testimonial-card__stars" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className="h-3.5 w-3.5 fill-current" />
        ))}
      </div>

      <Quote className="testimonial-card__quote-mark h-7 w-7" aria-hidden="true" />

      <p className="testimonial-card__body">"{testimonial.quote}"</p>

      <span className="testimonial-card__tag">{testimonial.tag}</span>

      <div className="testimonial-card__footer">
        <div
          className={`testimonial-card__avatar testimonial-card__avatar--${testimonial.avatarTone}`}
          aria-hidden="true"
        >
          {testimonial.initials}
        </div>

        <div className="min-w-0">
          <p className="testimonial-card__name">{testimonial.name}</p>
          <p className="testimonial-card__meta">
            {testimonial.company} <span aria-hidden="true">·</span> {testimonial.location}
          </p>
        </div>
      </div>
    </article>
  );
}

function MarqueeRow({
  testimonials,
  direction = 'left',
}: {
  testimonials: TestimonialData[];
  direction?: 'left' | 'right';
}) {
  const items = [...testimonials, ...testimonials];

  return (
    <div className="testimonial-marquee" data-direction={direction}>
      <div className="testimonial-marquee__track">
        {items.map((testimonial, index) => (
          <div
            key={`${testimonial.name}-${index}`}
            className="testimonial-marquee__item"
            aria-hidden={index >= testimonials.length}
          >
            <TestimonialCard testimonial={testimonial} />
          </div>
        ))}
      </div>
    </div>
  );
}

export const Testimonials: React.FC = () => {
  return (
    <Section id="testimonials" bg="gray" className="testimonial-section overflow-hidden">
      <div className="testimonial-section__glow testimonial-section__glow--blue" aria-hidden="true" />
      <div className="testimonial-section__glow testimonial-section__glow--orange" aria-hidden="true" />

      <div className="testimonial-section__header">
        <div className="testimonial-section__header-copy">
          <p className="testimonial-section__eyebrow">What UK tradespeople say</p>
          <h2 className="testimonial-section__title">Trusted by trades across the UK.</h2>
        </div>

        <p className="testimonial-section__intro">
          500+ professionals who&apos;ve stopped missing calls and started booking more work.
        </p>
      </div>

      <div className="testimonial-section__mobile-scroller" aria-label="Testimonials">
        {TESTIMONIALS.map(testimonial => (
          <div key={testimonial.name} className="testimonial-section__mobile-item">
            <TestimonialCard testimonial={testimonial} />
          </div>
        ))}
      </div>

      <div className="testimonial-section__desktop-stack" aria-label="Testimonials">
        <MarqueeRow testimonials={TESTIMONIAL_ROWS[0]} direction="left" />
        <MarqueeRow testimonials={TESTIMONIAL_ROWS[1]} direction="right" />
      </div>
    </Section>
  );
};
