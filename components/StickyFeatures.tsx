import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, MessageSquare, ShieldCheck, Calendar,
  ArrowRight, CheckCircle2, XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feature {
  num: string;
  icon: React.FC<{ className?: string }>;
  title: string;
  desc: string;
  outcome: string;
}

// ─── Feature Data ─────────────────────────────────────────────────────────────

const FEATURES: Feature[] = [
  {
    num: '01',
    icon: Phone,
    title: 'Always-On Call Answering',
    desc: "Sarah answers every call 24/7 in a natural British accent. Callers never know it's AI. No voicemail, no missed work — every enquiry gets a real answer.",
    outcome: 'So every enquiry becomes a lead',
  },
  {
    num: '02',
    icon: MessageSquare,
    title: 'Instant WhatsApp Summaries',
    desc: 'Get a WhatsApp message after every call: who called, what they need, what was said. Check it in 10 seconds between jobs — the full picture, instantly.',
    outcome: "So you're always in the loop, even on the tools",
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: 'Smart Spam Filtering',
    desc: 'PPI calls, cold callers, and time-wasters get handled automatically. Sarah deflects them politely before they waste your time — only real customers get through.',
    outcome: 'So you only deal with real customers',
  },
  {
    num: '04',
    icon: Calendar,
    title: 'Diary Integration',
    desc: 'Sarah books jobs directly into your Google Calendar, Outlook, or ServiceM8. The customer gets a confirmation. No double-booking, no admin, no calls back.',
    outcome: 'So you wake up to a full diary',
  },
];

// ─── Phone Preview Screens ────────────────────────────────────────────────────

const CallScreen = () => (
  <div className="flex flex-col h-full">
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pt-8">
      {/* Incoming call ring animation */}
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'rgba(255,107,43,0.12)',
            animation: 'incomingPulse 1.5s ease-in-out infinite',
            transform: 'scale(1.6)',
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'rgba(255,107,43,0.08)',
            animation: 'incomingPulse 1.5s ease-in-out 0.5s infinite',
            transform: 'scale(2.1)',
          }}
        />
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)' }}
        >
          <Phone className="w-7 h-7 text-white" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase mb-1 font-body"
           style={{ color: 'rgba(240,244,248,0.35)' }}>
          Answering call
        </p>
        <p className="font-display font-semibold text-[18px] text-[#F0F4F8]"
           style={{ letterSpacing: '-0.01em' }}>
          Dave Hendricks
        </p>
        <p className="text-[13px] mt-1 font-body" style={{ color: 'rgba(240,244,248,0.4)' }}>
          +44 7700 900142
        </p>
      </div>

      {/* Waveform visualiser */}
      <div className="flex items-center gap-[3px] h-8">
        {[3, 6, 10, 14, 10, 7, 12, 16, 10, 6, 4, 8, 13, 9, 5].map((h, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${h}px`,
              background: 'linear-gradient(180deg, #FF8C55, #FF6B2B)',
              animation: `waveBar ${0.6 + (i % 5) * 0.1}s ease-in-out ${i * 0.05}s infinite alternate`,
              opacity: 0.7 + (i % 3) * 0.1,
            }}
          />
        ))}
      </div>

      <div className="w-full px-2">
        <div
          className="rounded-2xl p-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[11px] font-body" style={{ color: 'rgba(240,244,248,0.5)' }}>
            <span style={{ color: '#ffb59a' }}>Sarah: </span>
            "Good morning, you've reached Hendricks Plumbing. How can I help you today?"
          </p>
        </div>
      </div>
    </div>

    <div className="px-6 pb-6">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(255,107,43,0.08)', border: '1px solid rgba(255,107,43,0.15)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-orange-glow animate-pulse" />
        <p className="text-[11px] font-semibold font-body" style={{ color: '#FF8C55' }}>
          Live — answering in real time
        </p>
      </div>
    </div>
  </div>
);

const WhatsAppScreen = () => (
  <div className="flex flex-col h-full">
    <div className="px-4 pt-6 pb-3 flex items-center gap-3 border-b border-white/[0.06]">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)' }}
      >
        <MessageSquare className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[#F0F4F8] font-display">Trade Receptionist</p>
        <p className="text-[10px] font-body" style={{ color: 'rgba(240,244,248,0.35)' }}>New job summary</p>
      </div>
    </div>

    <div className="flex-1 px-4 py-4 space-y-3 overflow-hidden">
      {/* Timestamp */}
      <div className="text-center">
        <span
          className="text-[10px] px-3 py-1 rounded-full font-body"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,244,248,0.3)' }}
        >
          Today, 14:32
        </span>
      </div>

      {/* Message bubble */}
      <div
        className="rounded-2xl rounded-tl-sm p-4 space-y-2"
        style={{ background: 'rgba(255,107,43,0.10)', border: '1px solid rgba(255,107,43,0.15)' }}
      >
        <p className="text-[12px] font-bold text-[#ffb59a] font-display">📞 New Job Enquiry</p>
        <div className="space-y-1.5 text-[12px] font-body">
          <div className="flex gap-2">
            <span style={{ color: 'rgba(240,244,248,0.3)', minWidth: '56px' }}>Name</span>
            <span style={{ color: 'rgba(240,244,248,0.75)' }}>Mrs. Helen Briggs</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: 'rgba(240,244,248,0.3)', minWidth: '56px' }}>Job</span>
            <span style={{ color: 'rgba(240,244,248,0.75)' }}>Boiler service + repair</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: 'rgba(240,244,248,0.3)', minWidth: '56px' }}>Area</span>
            <span style={{ color: 'rgba(240,244,248,0.75)' }}>SW11 3RL</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: 'rgba(240,244,248,0.3)', minWidth: '56px' }}>Urgency</span>
            <span style={{ color: '#ffb59a' }}>This week</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: 'rgba(240,244,248,0.3)', minWidth: '56px' }}>Phone</span>
            <span style={{ color: 'rgba(240,244,248,0.75)' }}>07700 900381</span>
          </div>
        </div>
      </div>

      {/* Reply prompt */}
      <div
        className="rounded-2xl rounded-tl-sm p-3"
        style={{ background: 'rgba(255,107,43,0.10)', border: '1px solid rgba(255,107,43,0.15)' }}
      >
        <p className="text-[12px] font-body" style={{ color: 'rgba(240,244,248,0.6)' }}>
          Call back to confirm booking? Reply YES to add to diary.
        </p>
      </div>
    </div>
  </div>
);

const SpamScreen = () => (
  <div className="flex flex-col h-full">
    <div className="px-4 pt-6 pb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] font-body mb-4"
         style={{ color: 'rgba(240,244,248,0.3)' }}>
        Today's calls
      </p>
      <div className="space-y-2">
        {[
          { type: 'Job Enquiry', caller: 'Tom Baker', sub: 'SW3 — Boiler repair', passed: true },
          { type: 'Spam', caller: 'Marketing Co.', sub: 'Telemarketing', passed: false },
          { type: 'Emergency', caller: 'Mrs. Patel', sub: 'SE1 — Leak, urgent', passed: true },
          { type: 'Cold Call', caller: 'Insurance Ltd', sub: 'PPI claim', passed: false },
          { type: 'Job Enquiry', caller: 'James Hunt', sub: 'N1 — Rewire quote', passed: true },
        ].map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-[12px] font-semibold truncate font-display"
                 style={{ color: c.passed ? 'rgba(240,244,248,0.75)' : 'rgba(240,244,248,0.3)' }}>
                {c.caller}
              </p>
              <p className="text-[10px] truncate font-body"
                 style={{ color: 'rgba(240,244,248,0.25)' }}>
                {c.sub}
              </p>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: c.passed ? 'rgba(255,107,43,0.15)' : 'rgba(255,255,255,0.04)' }}
            >
              {c.passed
                ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#ffb59a' }} />
                : <XCircle className="w-3.5 h-3.5" style={{ color: 'rgba(240,244,248,0.2)' }} />
              }
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="px-4 mt-auto pb-6">
      <div
        className="rounded-2xl p-3 flex items-center gap-3"
        style={{ background: 'rgba(255,107,43,0.07)', border: '1px solid rgba(255,107,43,0.12)' }}
      >
        <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: '#FF8C55' }} />
        <div>
          <p className="text-[11px] font-bold font-body" style={{ color: '#ffb59a' }}>2 spam calls blocked today</p>
          <p className="text-[10px] font-body" style={{ color: 'rgba(240,244,248,0.3)' }}>3 genuine leads forwarded</p>
        </div>
      </div>
    </div>
  </div>
);

const DiaryScreen = () => (
  <div className="flex flex-col h-full">
    <div className="px-4 pt-5 pb-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-semibold font-display text-[#F0F4F8]">This Thursday</p>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-body font-semibold"
          style={{ background: 'rgba(255,107,43,0.12)', color: '#ffb59a' }}
        >
          3 booked
        </span>
      </div>
      <div className="space-y-2">
        {[
          { time: '08:00', job: 'Boiler service', client: 'Mrs. Andrews — SW4', new: false },
          { time: '10:30', job: 'Emergency leak', client: 'SW4 9HE — Urgent', new: true },
          { time: '13:00', job: 'Bathroom quote', client: 'Tom H. — N1', new: true },
          { time: '15:30', job: 'Annual check', client: 'Davies Family — SE1', new: false },
        ].map((slot, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
            style={{ background: slot.new ? 'rgba(255,107,43,0.06)' : 'rgba(255,255,255,0.03)' }}
          >
            <span
              className="font-mono text-[11px] flex-shrink-0"
              style={{ color: slot.new ? '#FF8C55' : 'rgba(240,244,248,0.25)' }}
            >
              {slot.time}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate font-display"
                 style={{ color: slot.new ? 'rgba(240,244,248,0.85)' : 'rgba(240,244,248,0.5)' }}>
                {slot.job}
              </p>
              <p className="text-[10px] truncate font-body" style={{ color: 'rgba(240,244,248,0.25)' }}>
                {slot.client}
              </p>
            </div>
            {slot.new && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-body font-bold flex-shrink-0"
                style={{ background: 'rgba(255,107,43,0.15)', color: '#FF8C55' }}
              >
                NEW
              </span>
            )}
          </div>
        ))}
      </div>
    </div>

    <div className="px-4 mt-auto pb-5">
      <div
        className="rounded-2xl p-3"
        style={{ background: 'rgba(255,107,43,0.07)', border: '1px solid rgba(255,107,43,0.12)' }}
      >
        <p className="text-[11px] font-body" style={{ color: '#ffb59a' }}>
          ✓ 2 new bookings added by Sarah while you were on-site
        </p>
      </div>
    </div>
  </div>
);

const SCREENS = [CallScreen, WhatsAppScreen, SpamScreen, DiaryScreen];

// ─── Phone Preview Panel ──────────────────────────────────────────────────────

interface PhonePreviewPanelProps {
  activeIndex: number;
}

const PhonePreviewPanel: React.FC<PhonePreviewPanelProps> = ({ activeIndex }) => {
  const [displayedIndex, setDisplayedIndex] = useState(activeIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (activeIndex === displayedIndex) return;
    setIsTransitioning(true);
    const t = setTimeout(() => {
      setDisplayedIndex(activeIndex);
      setIsTransitioning(false);
    }, 220);
    return () => clearTimeout(t);
  }, [activeIndex]);

  const ActiveScreen = SCREENS[displayedIndex];

  return (
    <div className="flex items-center justify-center h-full">
      {/* Phone frame */}
      <div
        className="relative w-[240px] rounded-[36px] overflow-hidden"
        style={{
          height: '480px',
          background: 'rgba(10,35,64,0.95)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.6), 0 0 40px rgba(255,107,43,0.06)',
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-2xl z-10"
             style={{ background: '#020D18' }} />

        {/* Screen content */}
        <div
          className="absolute inset-0 pt-6"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(-12px)' : 'translateY(0)',
            transition: 'opacity 280ms cubic-bezier(0.16, 1, 0.3, 1), transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <ActiveScreen />
        </div>

        {/* Bottom home bar */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full"
             style={{ background: 'rgba(240,244,248,0.15)' }} />
      </div>
    </div>
  );
};

// ─── Feature Block ────────────────────────────────────────────────────────────

interface FeatureBlockProps {
  feature: Feature;
  index: number;
  isActive: boolean;
  onActivate: (index: number) => void;
}

const FeatureBlock: React.FC<FeatureBlockProps> = ({ feature, index, isActive, onActivate }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onActivate(index);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index, onActivate]);

  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className="rounded-2xl p-6 cursor-default"
      style={{
        borderLeft: isActive ? '2px solid #FF6B2B' : '2px solid transparent',
        background: isActive ? 'rgba(255,107,43,0.04)' : 'transparent',
        transition: 'background 300ms ease, border-color 300ms ease',
      }}
    >
      {/* Number + icon row */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="font-display font-bold text-[13px] tracking-[0.08em]"
          style={{ color: isActive ? 'rgba(255,107,43,0.7)' : 'rgba(255,107,43,0.3)' }}
        >
          {feature.num}
        </span>
        <Icon
          className="w-4 h-4"
          style={{ color: isActive ? '#ffb59a' : 'rgba(240,244,248,0.2)' }}
        />
      </div>

      {/* Title */}
      <h3
        className="font-display font-semibold text-[#F0F4F8] mb-3"
        style={{
          fontSize: '1.375rem',
          letterSpacing: '-0.015em',
          lineHeight: 1.2,
          opacity: isActive ? 1 : 0.5,
          transition: 'opacity 300ms ease',
        }}
      >
        {feature.title}
      </h3>

      {/* Description */}
      <p
        className="font-body leading-relaxed mb-4 text-[15px]"
        style={{
          color: 'rgba(240,244,248,0.55)',
          opacity: isActive ? 1 : 0.6,
          transition: 'opacity 300ms ease',
        }}
      >
        {feature.desc}
      </p>

      {/* Outcome badge */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: isActive ? 'rgba(255,107,43,0.10)' : 'rgba(255,255,255,0.04)',
          border: isActive ? '1px solid rgba(255,107,43,0.2)' : '1px solid rgba(255,255,255,0.05)',
          transition: 'background 300ms ease, border-color 300ms ease',
        }}
      >
        <CheckCircle2
          className="w-3 h-3 flex-shrink-0"
          style={{ color: isActive ? '#FF8C55' : 'rgba(240,244,248,0.2)' }}
        />
        <span
          className="text-[12px] font-semibold font-body"
          style={{ color: isActive ? '#ffb59a' : 'rgba(240,244,248,0.3)' }}
        >
          {feature.outcome}
        </span>
      </div>
    </div>
  );
};

// ─── Mobile Feature Card ──────────────────────────────────────────────────────

interface MobileFeatureCardProps {
  feature: Feature;
  screenIndex: number;
}

const MobileFeatureCard: React.FC<MobileFeatureCardProps> = ({ feature, screenIndex }) => {
  const Icon = feature.icon;
  const Screen = SCREENS[screenIndex];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.3)',
      }}
    >
      {/* Feature text */}
      <div className="p-5" style={{ borderLeft: '2px solid #FF6B2B' }}>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="font-display font-bold text-[12px] tracking-[0.08em]"
            style={{ color: 'rgba(255,107,43,0.6)' }}
          >
            {feature.num}
          </span>
          <Icon className="w-4 h-4" style={{ color: '#ffb59a' }} />
        </div>
        <h3
          className="font-display font-semibold text-[#F0F4F8] mb-2"
          style={{ fontSize: '1.2rem', letterSpacing: '-0.015em' }}
        >
          {feature.title}
        </h3>
        <p className="text-[14px] font-body leading-relaxed mb-3"
           style={{ color: 'rgba(240,244,248,0.5)' }}>
          {feature.desc}
        </p>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,107,43,0.10)',
            border: '1px solid rgba(255,107,43,0.2)',
          }}
        >
          <CheckCircle2 className="w-3 h-3" style={{ color: '#FF8C55' }} />
          <span className="text-[12px] font-semibold font-body" style={{ color: '#ffb59a' }}>
            {feature.outcome}
          </span>
        </div>
      </div>

      {/* Mini phone preview */}
      <div
        className="mx-5 mb-5 rounded-2xl overflow-hidden"
        style={{
          height: '200px',
          background: 'rgba(10,35,64,0.8)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        <Screen />
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface StickyFeaturesProps {
  onWaitlist: () => void;
}

const StickyFeatures: React.FC<StickyFeaturesProps> = ({ onWaitlist }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section
      id="features"
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0A2340 0%, #051426 50%, #0A2340 100%)',
        padding: 'clamp(5rem, 10vw, 9rem) 0',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-16 max-w-2xl">
          <p
            className="text-[13px] font-bold tracking-[0.12em] uppercase font-body mb-4"
            style={{ color: '#ffb59a' }}
          >
            Built for Tradespeople
          </p>
          <h2
            className="font-display font-bold text-[#F0F4F8]"
            style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            What you actually get.
          </h2>
        </div>

        {/* Desktop: sticky layout */}
        <div className="hidden lg:flex gap-16 items-start">
          {/* Left: scrollable feature list */}
          <div className="flex flex-col gap-4" style={{ width: '55%' }}>
            {/* Top spacer so first feature activates mid-viewport */}
            <div style={{ height: '15vh' }} />

            {FEATURES.map((feature, i) => (
              <FeatureBlock
                key={i}
                feature={feature}
                index={i}
                isActive={activeIndex === i}
                onActivate={setActiveIndex}
              />
            ))}

            {/* Bottom spacer */}
            <div style={{ height: '20vh' }} />
          </div>

          {/* Right: sticky phone preview */}
          <div
            style={{
              width: '45%',
              position: 'sticky',
              top: '10vh',
              height: '80vh',
            }}
          >
            <PhonePreviewPanel activeIndex={activeIndex} />
          </div>
        </div>

        {/* Mobile: stacked cards */}
        <div className="lg:hidden flex flex-col gap-6">
          {FEATURES.map((feature, i) => (
            <MobileFeatureCard key={i} feature={feature} screenIndex={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button
            onClick={onWaitlist}
            className="inline-flex items-center gap-2.5 font-semibold font-body"
            style={{
              padding: '1rem 1.75rem',
              background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
              color: '#fff',
              fontSize: '15px',
              letterSpacing: '-0.01em',
              borderRadius: '14px',
              boxShadow: '0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.2)',
              transition: 'transform 300ms cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 300ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(255,107,43,0.5), 0 8px 24px rgba(255,107,43,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = '';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.2)';
            }}
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Wave bar keyframe (injected inline for the call screen animation) */}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </section>
  );
};

export default StickyFeatures;
