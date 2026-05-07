import React from 'react';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Siren,
  StickyNote,
} from 'lucide-react';

import { Button } from './UI';

interface FeaturesGridProps {
  onWaitlist?: () => void;
}

const TIMELINE_STEPS = [
  {
    title: 'They call while you’re busy',
    description: 'You’re on the tools, driving, quoting, or with another customer.',
    icon: Clock3,
  },
  {
    title: 'Trade Receptionist answers',
    description: 'A natural British voice answers professionally in your business name.',
    icon: PhoneCall,
  },
  {
    title: 'It captures the job',
    description: 'Name, number, postcode, job type, urgency, and preferred time.',
    icon: StickyNote,
  },
  {
    title: 'You get the summary',
    description: 'The full enquiry lands in WhatsApp so you can scan it in seconds.',
    icon: MessageSquareText,
  },
  {
    title: 'Real jobs get booked',
    description: 'Qualified enquiries go into your diary. Spam and time-wasters stay out of your day.',
    icon: CalendarDays,
  },
];

const FEATURE_CARDS = [
  {
    title: 'Answers calls 24/7',
    description: 'Customers hear a professional answer even when you’re driving or on-site.',
    icon: PhoneCall,
  },
  {
    title: 'Sends WhatsApp job summaries',
    description: 'Every real enquiry lands back in WhatsApp with the details you need.',
    icon: MessageSquareText,
  },
  {
    title: 'Filters spam and sales calls',
    description: 'Cold callers and time-wasters stay away from your working day.',
    icon: ShieldCheck,
  },
  {
    title: 'Books into your diary',
    description: 'The right enquiries can be pushed straight into your calendar.',
    icon: CalendarDays,
  },
  {
    title: 'Handles urgent enquiries',
    description: 'Emergency jobs can be prioritised so the right calls reach you fast.',
    icon: Siren,
  },
  {
    title: 'Keeps call records and transcripts',
    description: 'You can check what was said without listening back to voicemails.',
    icon: StickyNote,
  },
];

function TimelineStep({
  index,
  title,
  description,
  icon: Icon,
}: {
  index: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <article
      className="public-surface-soft relative rounded-[24px] px-5 py-5 md:px-5 md:py-6"
      style={{
        boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 18px 38px rgba(2,13,24,0.22)',
      }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[14px]"
          style={{
            background: 'linear-gradient(180deg, rgba(255,107,43,0.18) 0%, rgba(255,107,43,0.08) 100%)',
            boxShadow: '0 0 0 1px rgba(255,107,43,0.12)',
          }}
        >
          <Icon className="h-4 w-4 text-orange-soft" />
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/52"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          Step {index + 1}
        </span>
      </div>

      <h3
        className="font-display text-offwhite"
        style={{ fontSize: 'clamp(1.08rem, 1.6vw, 1.25rem)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em' }}
      >
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.65] text-offwhite/60">{description}</p>
    </article>
  );
}

export default function FeaturesGrid({ onWaitlist }: FeaturesGridProps) {
  return (
    <section id="features" className="relative overflow-hidden py-14 md:py-18">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60"
        style={{ background: 'radial-gradient(circle at 78% 12%, rgba(96,165,250,0.14) 0%, transparent 38%)' }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-soft">
                What happens when a customer calls?
              </p>
              <h2
                className="font-display font-bold text-offwhite"
                style={{ fontSize: 'clamp(2.15rem, 4.6vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.045em' }}
              >
                We answer, qualify, summarise, and help you book the job before they ring someone else.
              </h2>
            </div>

            <p className="max-w-md text-[15px] leading-[1.75] text-offwhite/52">
              Built to make missed calls feel manageable again, without adding more admin to your day.
            </p>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute left-0 right-0 top-[2.25rem] hidden h-px md:block"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,107,43,0.22) 16%, rgba(96,165,250,0.18) 50%, rgba(255,107,43,0.22) 84%, rgba(255,255,255,0.02) 100%)',
              }}
            />

            <div className="grid gap-4 md:grid-cols-5">
              {TIMELINE_STEPS.map((step, index) => (
                <TimelineStep key={step.title} index={index} {...step} />
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-[24px] px-5 py-5 public-surface-soft md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <p className="text-[15px] font-semibold text-offwhite">That’s the whole job path, compressed into one clean handover.</p>
              <p className="mt-1 text-[13px] leading-relaxed text-offwhite/48">You stay focused on the work. The enquiry still gets answered properly.</p>
            </div>

            {onWaitlist && (
              <Button variant="primary" onClick={onWaitlist}>
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Workflow proof panel */}
          <div
            className="mt-8 rounded-[22px] p-5 md:p-6"
            style={{
              background: 'rgba(255,255,255,0.03)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 12px 28px rgba(2,13,24,0.18)',
            }}
          >
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-offwhite/28">
              What happens on every answered call
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {([
                { label: 'Call comes in', sub: "You're busy or on the tools", icon: PhoneCall, step: '01' },
                { label: 'AI answers', sub: "Natural British voice, your business name", icon: MessageSquareText, step: '02' },
                { label: 'Job captured', sub: "Name, number, job type, urgency", icon: StickyNote, step: '03' },
                { label: 'Summary sent', sub: "Full details straight to your WhatsApp", icon: CalendarDays, step: '04' },
              ] as const).map(({ label, sub, icon: Icon, step }) => (
                <div key={step} className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,107,43,0.16), rgba(255,107,43,0.07))',
                        boxShadow: '0 0 0 1px rgba(255,107,43,0.12)',
                      }}
                    >
                      <Icon className="h-4 w-4 text-orange-soft" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-offwhite/25">{step}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold leading-tight text-offwhite">{label}</p>
                    <p className="mt-0.5 text-[12px] leading-[1.55] text-offwhite/40">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-offwhite/34">
                  Everything you need to stop missing work
                </p>
                <h3
                  className="font-display font-bold text-offwhite"
                  style={{ fontSize: 'clamp(1.8rem, 3.6vw, 2.9rem)', lineHeight: 0.98, letterSpacing: '-0.04em' }}
                >
                  Practical tools, not bloated features.
                </h3>
              </div>

              <p className="max-w-md text-[14px] leading-[1.7] text-offwhite/48">
                The essentials for answering faster, qualifying better, and getting real jobs back into your diary.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {FEATURE_CARDS.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="public-surface rounded-[20px] px-5 py-5"
                  style={{
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 14px 30px rgba(2,13,24,0.18)',
                  }}
                >
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px]"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon className="h-4 w-4 text-orange-soft" />
                  </div>
                  <h4 className="font-display text-[1.05rem] font-bold leading-tight text-offwhite">{title}</h4>
                  <p className="mt-2 text-[14px] leading-[1.65] text-offwhite/55">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
