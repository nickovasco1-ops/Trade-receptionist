import React from 'react';
import { ArrowRight, Calendar, Check, MessageSquare, Phone, ShieldCheck } from 'lucide-react';

interface FeaturesGridProps {
  onWaitlist?: () => void;
}

function PhoneFrame({
  children,
  width = 248,
}: {
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      className="relative mx-auto rounded-[30px] overflow-hidden"
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        background: '#0B1629',
        border: '5px solid #111827',
        boxShadow: '0 24px 50px rgba(2,13,24,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      <div className="absolute top-0 left-1/2 z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-black/90" />
      <div className="absolute left-1.5 top-24 h-12 w-1 rounded-full bg-white/10" />
      <div className="absolute right-1.5 top-20 h-16 w-1 rounded-full bg-white/10" />
      <div className="min-h-[420px] bg-[linear-gradient(180deg,#111827_0%,#1e293b_100%)] pt-8">
        {children}
      </div>
    </div>
  );
}

function CallAnsweringMockup() {
  return (
    <PhoneFrame width={228}>
      <div className="px-5">
        <div className="mb-3 text-center text-[11px] text-offwhite/45">Incoming Call</div>
        <div className="text-center font-display text-[18px] font-bold text-offwhite">Dave Hendricks</div>
        <div className="mb-8 text-center text-[12px] text-offwhite/40">- Plumbing</div>

        <div className="mx-auto mb-6 flex h-[72px] w-full max-w-[148px] items-center justify-center gap-1.5">
          {[24, 38, 56, 40, 28, 44, 62, 46, 26, 34, 58, 36, 22, 18, 30].map((height, index) => (
            <span
              key={index}
              className="block rounded-full"
              style={{
                width: '3px',
                height: `${height}px`,
                background: index > 9 ? '#E5E7EB' : height > 50 ? '#F4A261' : '#D97745',
              }}
            />
          ))}
        </div>

        <div className="text-center">
          <div className="text-[18px] text-offwhite">Sarah&apos;s Voice</div>
          <div className="mt-1 text-[14px] text-offwhite/45">00:42</div>
        </div>

        <div className="my-6 flex justify-center">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #F4A261 100%)' }}
          >
            <Phone className="h-4 w-4 text-white" />
          </div>
        </div>

        <div
          className="mx-auto w-fit rounded-full px-4 py-2 text-[12px] text-offwhite"
          style={{ background: 'rgba(255,255,255,0.10)' }}
        >
          Live – answering in real-time
        </div>
      </div>
    </PhoneFrame>
  );
}

function WhatsAppMockup() {
  return (
    <PhoneFrame width={240}>
      <div className="rounded-t-[24px] bg-[#f5efe4] px-4 pb-6 pt-5 text-[#0f172a]">
        <div className="mb-4 flex items-center justify-between text-[12px]">
          <span className="font-semibold text-slate-500">9:41</span>
          <div className="flex items-center gap-2 text-slate-400">
            <span>⌂</span>
            <span>◦</span>
            <span>⌕</span>
          </div>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22384f] text-[12px] font-bold text-white">TR</div>
          <div className="text-[13px] font-semibold text-slate-700">Trade Receptionist</div>
        </div>
        <div
          className="rounded-[18px] rounded-tl-[6px] bg-white px-4 py-3 text-left text-[12px] leading-relaxed shadow-[0_18px_30px_rgba(15,23,42,0.08)]"
        >
          Sarah: “Dave, I&apos;ve just spoken to Mrs. Miller. She needs a bathroom renovation quote. Available for a callback today after 4 PM.
          Address: 123 High St.
          Contact: 07890 123456.
          Summary: Full bathroom refit including tiling. Budget approx £5k.”
        </div>
        <div className="mt-6 flex justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#65c466] text-white shadow-[0_10px_20px_rgba(101,196,102,0.25)]">
            <Check className="h-4 w-4" />
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function SpamFilterMockup() {
  const blocked = [
    ['0121 496 0000', 'Spam'],
    ['0800 123 4567', 'Telemarketing'],
    ['0330 058 8000', 'Sales'],
  ];
  const leads = [
    ['07911 123456', 'Real Enquiry'],
    ['07800 987654', 'Job Booking'],
    ['07555 321654', 'Urgent Repair'],
  ];

  return (
    <div
      className="mx-auto grid max-w-[280px] grid-cols-2 gap-3 rounded-[18px] bg-white p-3 shadow-[0_16px_40px_rgba(2,13,24,0.18)]"
    >
      <div className="rounded-[14px] bg-[#fff4f3] p-4 text-[#1f2937]">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffd9d5] text-[#cc5b50]">×</div>
        </div>
        <div className="mb-3 text-center text-[14px] font-semibold">Blocked Calls</div>
        <div className="space-y-3 text-[12px]">
          {blocked.map(([number, reason]) => (
            <div key={number}>
              <div className="font-semibold">{number}</div>
              <div className="text-slate-500">({reason})</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[14px] bg-[#eefaf0] p-4 text-[#1f2937]">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d2f2d9] text-[#2f8f52]">✓</div>
        </div>
        <div className="mb-3 text-center text-[14px] font-semibold">Customer Leads</div>
        <div className="space-y-3 text-[12px]">
          {leads.map(([number, reason]) => (
            <div key={number}>
              <div className="font-semibold">{number}</div>
              <div className="text-slate-500">({reason})</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarMockup() {
  const rows = [
    ['31', '1', '2', '3', '4', '5', '6'],
    ['7', '8', '9', '10', '11', '12', '13'],
    ['14', '15', '16', '17', '18', '19', '20'],
    ['21', '22', '23', '24', '25', '26', '27'],
    ['28', '29', '30', '31', '1', '2', '3'],
  ];

  return (
    <div className="mx-auto max-w-[320px]">
      <div className="rounded-[18px] bg-white p-4 text-[#0f172a] shadow-[0_18px_40px_rgba(2,13,24,0.16)]">
        <div className="mb-4 flex items-center justify-between text-[12px] text-slate-400">
          <span>‹</span>
          <div className="text-[16px] font-semibold text-slate-700">October 2024</div>
          <span>›</span>
        </div>
        <div className="mb-2 grid grid-cols-7 text-center text-[10px] text-slate-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="space-y-1 text-center text-[12px] text-slate-700">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-7 gap-1">
              {row.map((day) => {
                const isHighlight = day === '24';
                const isLight = day === '10';
                return (
                  <div
                    key={`${rowIndex}-${day}`}
                    className="rounded-[8px] px-0 py-2"
                    style={{
                      background: isHighlight ? '#F97316' : isLight ? '#fff1e6' : 'transparent',
                      color: isHighlight ? '#fff' : '#334155',
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div
          className="mt-3 ml-auto w-fit rounded-full px-3 py-1 text-[10px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #F97316 0%, #F4A261 100%)' }}
        >
          10:00 AM: Bathroom Renovation Quote
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-3">
        {[
          ['24', '#e9f1ff', '#2f5bd8'],
          ['O', '#edf5ff', '#1d4ed8'],
          ['S', '#eef9e8', '#5d8d24'],
        ].map(([label, bg, fg], index) => (
          <div
            key={index}
            className="flex h-11 w-11 items-center justify-center rounded-[12px] text-[16px] font-bold shadow-[0_10px_20px_rgba(2,13,24,0.12)]"
            style={{ background: bg, color: fg }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  footer,
  mockup,
}: {
  title: string;
  description: string;
  footer: string;
  mockup: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[26px] px-7 pb-7 pt-8"
      style={{
        background: 'linear-gradient(180deg, rgba(8,25,53,0.98) 0%, rgba(10,30,62,0.98) 100%)',
        boxShadow: '0 0 0 1px rgba(244,162,97,0.55), 0 18px 50px rgba(2,13,24,0.28)',
      }}
    >
      <h3
        className="font-display font-bold text-offwhite mb-3"
        style={{ fontSize: 'clamp(2rem, 2.8vw, 2.7rem)', lineHeight: 0.94, letterSpacing: '-0.04em' }}
      >
        {title}
      </h3>
      <p className="mb-6 max-w-[28rem] text-[15px] leading-relaxed text-offwhite/82 font-body">
        {description}
      </p>
      <div className="min-h-[300px] md:min-h-[350px]">{mockup}</div>
      <p className="mt-6 text-center text-[15px] text-offwhite/88 font-body">{footer}</p>
    </div>
  );
}

export default function FeaturesGrid({ onWaitlist }: FeaturesGridProps) {
  return (
    <section
      id="features"
      className="relative overflow-hidden py-20 md:py-28"
      style={{
        background:
          'radial-gradient(circle at top, rgba(255,255,255,0.95) 0%, rgba(240,244,248,0.96) 32%, rgba(228,236,244,0.98) 100%)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: 'radial-gradient(circle at 50% 15%, rgba(255,255,255,0.95) 0%, transparent 45%)' }} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div
          className="mx-auto max-w-[1180px] rounded-[38px] px-8 pb-12 pt-12 md:px-12 md:pb-14 md:pt-16"
          style={{
            background: 'linear-gradient(180deg, #071b3c 0%, #0a2344 100%)',
            boxShadow: '0 24px 70px rgba(2,13,24,0.12)',
          }}
        >
          <div className="mb-12 text-center">
            <h2
              className="font-display font-bold text-offwhite"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 0.94, letterSpacing: '-0.045em' }}
            >
              Product Features &amp; Capabilities
            </h2>
            <p className="mt-4 text-[18px] text-offwhite/72 font-body">What you actually get.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FeatureCard
              title="Always-On Call Answering"
              description="Sarah answers every call 24/7 in a natural British accent. Callers never know it&apos;s AI. No voicemail, no missed work - every enquiry gets a real answer."
              footer="So every enquiry becomes a lead."
              mockup={<CallAnsweringMockup />}
            />
            <FeatureCard
              title="Instant WhatsApp Summaries"
              description="Get a WhatsApp message after every call - who called, what they need, what was said. Check in in 10 seconds between jobs - the full picture, instantly."
              footer="So you&apos;re always in the loop, even on the tools."
              mockup={<WhatsAppMockup />}
            />
            <FeatureCard
              title="Smart Spam Filtering"
              description="PPI calls, cold callers, and time-wasters get handled automatically. Sarah deflects them politely before they waste your time - only real customers get through."
              footer="So you only deal with real customers."
              mockup={<SpamFilterMockup />}
            />
            <FeatureCard
              title="Diary Integration"
              description="Sarah books jobs directly into your Google Calendar, Outlook, or ServiceM8. The customer gets a confirmation. No double-booking, no admin, no calls back."
              footer="So you wake up to a full diary."
              mockup={<CalendarMockup />}
            />
          </div>

          {onWaitlist && (
            <div className="mt-12 text-center">
              <button
                onClick={onWaitlist}
                className="inline-flex items-center gap-2 rounded-[14px] px-7 py-3.5 text-[17px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #F97316 0%, #F4A261 100%)',
                  boxShadow: '0 18px 36px rgba(249,115,22,0.28)',
                }}
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
