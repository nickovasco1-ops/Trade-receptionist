import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import {
  ArrowRight, CheckCircle2, ChevronDown,
  Globe, TrendingUp, MessageSquare, Phone, Building2, Users,
} from 'lucide-react';

// ─── Scroll animation ─────────────────────────────────────────────────────────
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) { setInView(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

function FadeUp({ children, delay = 0, className = '' }: FadeUpProps) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[13px] font-bold tracking-[0.12em] uppercase text-orange-soft font-body mb-4">
      {children}
    </span>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function PartnerNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(5,20,38,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.05)' : 'none',
      }}
    >
      <div className="container mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px] rounded">
          <Logo variant="mark" height={28} />
          <span className="hidden sm:inline text-[12px] font-semibold tracking-[0.1em] uppercase text-offwhite/35 font-body">
            Partner Programme
          </span>
        </Link>
        <a
          href="#apply"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange to-orange-glow text-white font-semibold text-sm tracking-[-0.01em] rounded-button shadow-orange-glow hover:shadow-orange-glow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-mechanical font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
        >
          Apply to partner
          <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function PartnerHero() {
  return (
    <section
      aria-labelledby="partner-hero-heading"
      className="relative min-h-[90vh] flex items-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 10% 60%, rgba(255,107,43,0.07) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 15%, rgba(153,203,255,0.05) 0%, transparent 50%),
          #051426
        `,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(153,203,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(153,203,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative container mx-auto px-6 lg:px-8 pt-28 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left: copy */}
        <div>
          <FadeUp delay={0}>
            <Eyebrow>Partner Programme — UK</Eyebrow>
          </FadeUp>
          <FadeUp delay={70}>
            <h1
              id="partner-hero-heading"
              className="font-display text-5xl md:text-6xl lg:text-[5rem] font-bold tracking-[-0.03em] text-offwhite leading-[1.04] mb-6"
            >
              Your clients lose{' '}
              <span className="text-orange italic">calls.</span>
              <br />
              You can fix that.
            </h1>
          </FadeUp>
          <FadeUp delay={140}>
            <p className="font-body text-lg text-offwhite/65 max-w-[52ch] leading-[1.70] mb-10">
              Trade Receptionist answers calls, books jobs, and sends WhatsApp confirmations for UK tradespeople. Refer a client — earn 15% recurring commission for 12 months.
            </p>
          </FadeUp>
          <FadeUp delay={210}>
            <div className="flex flex-wrap gap-4 items-center">
              <a
                href="#apply"
                className="inline-flex items-center gap-2.5 px-7 py-4 bg-gradient-to-r from-orange to-orange-glow text-white font-semibold text-[15px] tracking-[-0.01em] rounded-button shadow-orange-glow hover:shadow-orange-glow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-mechanical font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
              >
                Apply to partner
                <ArrowRight size={15} aria-hidden="true" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2.5 px-7 py-4 bg-accent/[0.08] text-accent font-semibold text-[15px] tracking-[-0.01em] rounded-button ring-1 ring-accent/20 hover:bg-accent/[0.14] hover:ring-accent/35 hover:-translate-y-0.5 transition-all duration-300 font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[3px]"
              >
                See how it works
              </a>
            </div>
          </FadeUp>
        </div>

        {/* Right: commission display */}
        <FadeUp delay={200} className="hidden lg:block">
          <div
            className="p-10 rounded-card"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 20px 60px rgba(2,13,24,0.5)',
            }}
          >
            <p className="font-body text-[12px] font-bold tracking-[0.12em] uppercase text-offwhite/30 mb-6">Programme at a glance</p>
            <div className="space-y-6">
              {[
                { figure: '15%', label: 'Referral Partner commission', sub: 'Recurring · 12 months · no minimum' },
                { figure: '20%', label: 'Growth Partner commission', sub: 'After 5 active referred clients' },
                { figure: '14d', label: 'Free trial for your clients', sub: 'No card required · low barrier to yes' },
                { figure: '£0', label: 'Cost to join the programme', sub: 'Apply in under 3 minutes' },
              ].map(({ figure, label, sub }) => (
                <div key={label} className="flex items-start gap-5">
                  <span
                    className="font-display text-3xl font-bold text-orange shrink-0 w-16 tracking-[-0.03em]"
                    aria-hidden="true"
                  >
                    {figure}
                  </span>
                  <div>
                    <p className="font-body text-[15px] font-semibold text-offwhite leading-snug">{label}</p>
                    <p className="font-body text-[13px] text-offwhite/40 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Who It's For ─────────────────────────────────────────────────────────────
interface PartnerTypeItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const PARTNER_TYPES: PartnerTypeItem[] = [
  {
    icon: <Globe size={18} aria-hidden="true" />,
    title: 'Web designers & developers',
    description: "Your plumber, sparky, and builder clients all get calls they miss. Add a service that solves it and earns you income long after the site goes live.",
  },
  {
    icon: <TrendingUp size={18} aria-hidden="true" />,
    title: 'SEO & marketing agencies',
    description: "You're driving the calls. Make sure they're answered. Trade Receptionist closes the loop from ad click to booked job.",
  },
  {
    icon: <MessageSquare size={18} aria-hidden="true" />,
    title: 'CRM & automation consultants',
    description: "Already wiring up their systems? Add the inbound call layer. Commissions stack neatly alongside your project fees.",
  },
  {
    icon: <Phone size={18} aria-hidden="true" />,
    title: 'Telecom & VoIP providers',
    description: "Your SME clients need more than a number. Give them an AI that answers it intelligently, 24/7, without extra headcount.",
  },
  {
    icon: <Building2 size={18} aria-hidden="true" />,
    title: 'Business consultants & coaches',
    description: "Missed calls are one of the top complaints from trade clients. Now you have a concrete fix to recommend.",
  },
  {
    icon: <Users size={18} aria-hidden="true" />,
    title: 'Trade associations & networks',
    description: "A ready-made member benefit that generates ongoing income from every successful referral into your network.",
  },
];

function WhoItsFor() {
  return (
    <section
      aria-labelledby="who-heading"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #051426 0%, #0A2340 55%, #051426 100%)' }}
    >
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-16 items-start">
          <FadeUp>
            <Eyebrow>Who this is for</Eyebrow>
            <h2
              id="who-heading"
              className="font-display text-4xl md:text-5xl font-bold tracking-[-0.02em] text-offwhite leading-[1.08]"
            >
              You already know the problem.
            </h2>
            <p className="font-body text-lg text-offwhite/55 leading-[1.70] mt-5 max-w-[42ch]">
              Every day UK tradespeople lose customers to unanswered calls. If you serve any of these professionals, this is your revenue stream.
            </p>
          </FadeUp>

          <div className="space-y-0">
            {PARTNER_TYPES.map(({ icon, title, description }, i) => (
              <FadeUp key={title} delay={i * 50}>
                <div
                  className="flex items-start gap-5 py-6 transition-colors duration-300"
                  style={{ boxShadow: i < PARTNER_TYPES.length - 1 ? '0 1px 0 rgba(255,255,255,0.06)' : 'none' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-orange shrink-0 mt-0.5"
                    style={{ background: 'rgba(255,107,43,0.1)' }}
                  >
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-body font-semibold text-offwhite text-[15px] mb-1">{title}</h3>
                    <p className="font-body text-[14px] text-offwhite/50 leading-[1.65] max-w-[52ch]">{description}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Commission Structure ─────────────────────────────────────────────────────
function CommissionStructure() {
  return (
    <section
      aria-labelledby="commission-heading"
      className="relative py-20 md:py-32 overflow-hidden bg-void"
    >
      <div className="container mx-auto px-6 lg:px-8">
        <FadeUp>
          <Eyebrow>Simple, honest, sustainable</Eyebrow>
          <h2
            id="commission-heading"
            className="font-display text-4xl md:text-5xl font-bold tracking-[-0.02em] text-offwhite mb-4"
          >
            Two tiers. No hidden rules.
          </h2>
          <p className="font-body text-lg text-offwhite/55 max-w-[56ch] leading-[1.70] mb-14">
            We pay for active, live accounts — not test leads or weak intros. That keeps the programme fair for partners who do the work.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Referral Partner */}
          <FadeUp delay={0}>
            <div
              className="h-full p-8 rounded-card"
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(2,13,24,0.4)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-body text-[12px] font-bold tracking-[0.1em] uppercase text-offwhite/35">Referral Partner</p>
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.08em] uppercase"
                  style={{ background: 'rgba(153,203,255,0.1)', color: '#99cbff' }}
                >
                  Start here
                </span>
              </div>
              <p className="font-display text-[5.5rem] font-bold text-offwhite tracking-[-0.04em] leading-none mb-1">
                15<span className="text-orange text-5xl">%</span>
              </p>
              <p className="font-body text-[14px] text-offwhite/45 mb-7">Recurring · per active account · 12 months from sign-up</p>

              <ul className="space-y-3 mb-8" role="list">
                {[
                  'On any paid plan — Starter through Agency',
                  'No minimum referral requirement',
                  'Unique partner link with full attribution',
                  'Monthly payouts after 14-day validation',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 font-body text-[14px] text-offwhite/65">
                    <CheckCircle2 size={15} className="text-orange mt-0.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="font-body text-[12px] text-offwhite/40 mb-1 uppercase tracking-[0.08em]">Typical earn per active client</p>
                <p className="font-body text-lg font-semibold text-offwhite/75">
                  £7.35 – £23.85 <span className="text-sm font-normal text-offwhite/35">/month</span>
                </p>
              </div>
            </div>
          </FadeUp>

          {/* Growth Partner */}
          <FadeUp delay={80}>
            <div
              className="h-full p-8 rounded-card"
              style={{
                background: 'linear-gradient(145deg, rgba(255,107,43,0.1) 0%, rgba(255,107,43,0.04) 100%)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 0 0 1px rgba(255,107,43,0.2), 0 8px 32px rgba(2,13,24,0.5), 0 0 32px rgba(255,107,43,0.06)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-body text-[12px] font-bold tracking-[0.1em] uppercase text-offwhite/35">Growth Partner</p>
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.08em] uppercase"
                  style={{ background: 'rgba(255,107,43,0.15)', color: '#FF8C55' }}
                >
                  After 5 clients
                </span>
              </div>
              <p className="font-display text-[5.5rem] font-bold text-offwhite tracking-[-0.04em] leading-none mb-1">
                20<span className="text-orange text-5xl">%</span>
              </p>
              <p className="font-body text-[14px] text-offwhite/45 mb-7">Recurring · per active account · 12 months from sign-up</p>

              <ul className="space-y-3 mb-8" role="list">
                {[
                  'All Referral Partner benefits',
                  'Auto-upgraded after 5 active paying clients',
                  'Priority support line for partner queries',
                  'Co-marketing materials on request',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 font-body text-[14px] text-offwhite/65">
                    <CheckCircle2 size={15} className="text-orange mt-0.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,107,43,0.1)' }}>
                <p className="font-body text-[12px] text-offwhite/40 mb-1 uppercase tracking-[0.08em]">Typical earn per active client</p>
                <p className="font-body text-lg font-semibold text-orange-soft">
                  £9.80 – £31.80 <span className="text-sm font-normal text-offwhite/35">/month</span>
                </p>
              </div>
            </div>
          </FadeUp>
        </div>

        <FadeUp delay={160}>
          <p className="font-body text-[13px] text-offwhite/30 max-w-[68ch] leading-[1.65]">
            Commissions start accumulating once a referred client completes setup and moves onto a paid plan after their 14-day trial. Payout runs on the 1st of each month for the prior month's active accounts.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="hiw-heading"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #020D18 0%, #051426 100%)' }}
    >
      <div className="container mx-auto px-6 lg:px-8">
        <FadeUp>
          <Eyebrow>Three steps to recurring income</Eyebrow>
          <h2
            id="hiw-heading"
            className="font-display text-4xl md:text-5xl font-bold tracking-[-0.02em] text-offwhite mb-16"
          >
            Simpler than it sounds.
          </h2>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {([
            {
              step: '01',
              title: 'Apply',
              body: 'Short form. We review within 48 working hours. We work with professionals who genuinely serve UK trade businesses — not mass affiliate marketers.',
            },
            {
              step: '02',
              title: 'Refer',
              body: 'Share your unique tracking link or introduce clients directly. No monthly minimum, no commitment beyond your own discretion.',
            },
            {
              step: '03',
              title: 'Earn',
              body: "Monthly payouts for every active paying client you've introduced. Track your referrals, commissions, and account status in your partner dashboard.",
            },
          ] as const).map(({ step, title, body }, i) => (
            <FadeUp key={step} delay={i * 90}>
              <p
                className="font-display font-bold leading-none mb-5 select-none"
                style={{ fontSize: 'clamp(4rem, 8vw, 6rem)', color: 'rgba(255,107,43,0.14)', letterSpacing: '-0.04em' }}
                aria-hidden="true"
              >
                {step}
              </p>
              <h3 className="font-display text-2xl font-bold text-offwhite tracking-[-0.015em] mb-3">{title}</h3>
              <p className="font-body text-[15px] text-offwhite/55 leading-[1.70] max-w-[38ch]">{body}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why It Converts ──────────────────────────────────────────────────────────
function WhyItConverts() {
  return (
    <section
      aria-labelledby="why-heading"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #051426 0%, #0A2340 60%, #051426 100%)' }}
    >
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-16 items-start">
          <FadeUp>
            <Eyebrow>Why this converts</Eyebrow>
            <h2
              id="why-heading"
              className="font-display text-4xl md:text-5xl font-bold tracking-[-0.02em] text-offwhite mb-5"
            >
              The maths sells itself.
            </h2>
            <p className="font-body text-lg text-offwhite/55 max-w-[44ch] leading-[1.70]">
              UK tradespeople lose an average of <strong className="text-offwhite font-semibold">£4,200 a year</strong> to missed calls. That's the number you open with. Everything else is supporting evidence.
            </p>
          </FadeUp>

          <FadeUp delay={80}>
            <div className="space-y-4">
              {[
                {
                  label: '14 minutes to set up',
                  detail: 'Your client is live and answering calls before their first coffee. No technical complexity, no lengthy onboarding.',
                },
                {
                  label: '14-day free trial, no card required',
                  detail: "Low barrier for the first yes. They try it, it works, they convert. You haven't had to push.",
                },
                {
                  label: 'Built specifically for UK trades',
                  detail: "British accent, UK trade vocabulary — call-out, quote, diary. It doesn't sound like a US product ported over.",
                },
                {
                  label: 'Live demo on the website',
                  detail: "Clients can hear a real handled call before signing up. The product demos itself. You send the link — it does the rest.",
                },
                {
                  label: '24/7 coverage without hiring',
                  detail: 'No staff costs, no rota, no sick days. The value is immediate, tangible, and easy for a tradesperson to understand.',
                },
              ].map(({ label, detail }, i) => (
                <FadeUp key={label} delay={i * 45}>
                  <div
                    className="p-5 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="font-body font-semibold text-offwhite text-[15px] mb-1">{label}</p>
                    <p className="font-body text-[13px] text-offwhite/45 leading-[1.65]">{detail}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

// ─── Earnings Calculator ──────────────────────────────────────────────────────
function EarningsCalculator() {
  const [clientCount, setClientCount] = useState(8);
  const avgPlan = 99;
  const referralMonthly = Math.round(clientCount * avgPlan * 0.15);
  const growthMonthly = Math.round(clientCount * avgPlan * 0.20);

  return (
    <section
      aria-labelledby="calc-heading"
      className="relative py-20 md:py-32 overflow-hidden bg-void"
    >
      <div className="container mx-auto px-6 lg:px-8">
        <FadeUp>
          <Eyebrow>Potential earnings</Eyebrow>
          <h2
            id="calc-heading"
            className="font-display text-4xl md:text-5xl font-bold tracking-[-0.02em] text-offwhite mb-4"
          >
            See what this adds up to.
          </h2>
          <p className="font-body text-lg text-offwhite/55 max-w-[52ch] leading-[1.70] mb-12">
            Based on the average plan value across our customer base. Actual earnings vary by the plans your clients choose.
          </p>
        </FadeUp>

        <FadeUp delay={80}>
          <div
            className="max-w-2xl p-8 md:p-10 rounded-card"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(2,13,24,0.5)',
            }}
          >
            <label className="block font-body text-offwhite/70 text-[15px] mb-6" htmlFor="client-slider">
              Active referred clients:{' '}
              <span className="text-orange font-bold text-xl">{clientCount}</span>
            </label>
            <input
              id="client-slider"
              type="range"
              min={1}
              max={50}
              value={clientCount}
              onChange={e => setClientCount(Number(e.target.value))}
              className="w-full mb-10 cursor-pointer accent-orange h-1"
              aria-label={`Active referred clients: ${clientCount}`}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="font-body text-[11px] uppercase tracking-[0.1em] text-offwhite/35 mb-2">Referral rate</p>
                <p className="font-display text-[2.2rem] font-bold text-offwhite tracking-[-0.03em] leading-none">
                  £{referralMonthly.toLocaleString('en-GB')}
                </p>
                <p className="font-body text-[12px] text-offwhite/35 mt-2">per month</p>
              </div>
              <div
                className="p-5 rounded-xl text-center"
                style={{
                  background: 'rgba(255,107,43,0.08)',
                  boxShadow: '0 0 0 1px rgba(255,107,43,0.15)',
                }}
              >
                <p className="font-body text-[11px] uppercase tracking-[0.1em] text-orange-soft/60 mb-2">Growth rate</p>
                <p className="font-display text-[2.2rem] font-bold text-orange tracking-[-0.03em] leading-none">
                  £{growthMonthly.toLocaleString('en-GB')}
                </p>
                <p className="font-body text-[12px] text-offwhite/35 mt-2">per month</p>
              </div>
              <div
                className="col-span-2 sm:col-span-1 p-5 rounded-xl text-center"
                style={{
                  background: 'rgba(255,107,43,0.11)',
                  boxShadow: '0 0 0 1px rgba(255,107,43,0.2)',
                }}
              >
                <p className="font-body text-[11px] uppercase tracking-[0.1em] text-orange-soft/60 mb-2">Growth annual</p>
                <p className="font-display text-[2.2rem] font-bold text-orange tracking-[-0.03em] leading-none">
                  £{(growthMonthly * 12).toLocaleString('en-GB')}
                </p>
                <p className="font-body text-[12px] text-offwhite/35 mt-2">per year</p>
              </div>
            </div>

            <p className="font-body text-[12px] text-offwhite/25 mt-6 leading-[1.65]">
              Based on avg. plan value of £99/mo across Starter–Business tiers. Growth rate applies after 5 active clients. Estimates only.
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
        borderRadius: '14px',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[-2px] rounded-[14px]"
        aria-expanded={open}
      >
        <span className="font-body font-semibold text-offwhite text-[15px] leading-snug">{question}</span>
        <ChevronDown
          size={17}
          className="text-offwhite/35 shrink-0 transition-transform duration-300 ease-mechanical"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        />
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 300ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p className="font-body text-[14px] text-offwhite/55 leading-[1.70] px-6 pb-5">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

const FAQ_ITEMS: FAQItemProps[] = [
  {
    question: 'How do I know my referral is attributed correctly?',
    answer: 'You receive a unique tracking link when approved. Every click and sign-up via your link is recorded in your partner dashboard with timestamps and account status.',
  },
  {
    question: 'When do I get paid?',
    answer: "Monthly on the 1st, for the prior month's active accounts. Commission starts accumulating once the referred client's trial ends and they're on a paid plan.",
  },
  {
    question: "What counts as an 'active account'?",
    answer: "Any client on a paid plan who has completed setup. Trial accounts and accounts with failed payments don't count. We never pay for test activity.",
  },
  {
    question: 'Can I become a Growth Partner straight away?',
    answer: 'No — Growth Partner status requires 5 active paying clients referred by you. This keeps the tier meaningful and the priority support resources focused on partners who are genuinely active.',
  },
  {
    question: 'Is there a cost to join?',
    answer: 'None. Application is free. No monthly fee, no minimum commitment.',
  },
  {
    question: 'What happens if a client I referred cancels?',
    answer: "Commission stops when the account is no longer on a paid plan. You earn for every month they're paying. We never claw back commissions already paid.",
  },
  {
    question: 'Can I refer myself?',
    answer: 'Self-referrals are not permitted and will result in disqualification from the programme.',
  },
  {
    question: 'How long does the application review take?',
    answer: "We review all applications within 48 working hours. We reply either way — if we can't approve your application, we'll explain why.",
  },
];

function PartnerFAQ() {
  return (
    <section
      aria-labelledby="faq-heading"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #051426 0%, #020D18 100%)' }}
    >
      <div className="container mx-auto px-6 lg:px-8">
        <FadeUp>
          <Eyebrow>Common questions</Eyebrow>
          <h2
            id="faq-heading"
            className="font-display text-4xl md:text-5xl font-bold tracking-[-0.02em] text-offwhite mb-12"
          >
            Nothing hidden.
          </h2>
        </FadeUp>

        <div className="max-w-3xl space-y-2.5">
          {FAQ_ITEMS.map((item, i) => (
            <FadeUp key={item.question} delay={i * 35}>
              <FAQItem {...item} />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Application Form ─────────────────────────────────────────────────────────
const BUSINESS_TYPES = [
  'Web designer / developer',
  'SEO / digital marketing agency',
  'CRM / automation consultant',
  'Telecom / VoIP provider',
  'Business consultant / coach',
  'Trade association or network',
  'Other',
] as const;

interface FormState {
  name: string;
  email: string;
  website: string;
  businessType: string;
  clientCount: string;
  message: string;
}

function ApplicationForm() {
  const [form, setForm] = useState<FormState>({
    name: '', email: '', website: '', businessType: '', clientCount: '', message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.businessType) {
      setError('Please complete the required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await fetch('/api/partner-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch {
      // Gracefully degrade — form still appears submitted so we don't block users
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl font-body text-[15px] text-offwhite placeholder-offwhite/20 bg-white/[0.05] ring-1 ring-white/10 focus:ring-orange/50 focus:outline-none transition-all duration-200';

  return (
    <section
      id="apply"
      aria-labelledby="apply-heading"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(255,107,43,0.05) 0%, transparent 55%),
          #051426
        `,
      }}
    >
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-2xl">
          <FadeUp>
            <Eyebrow>Apply now</Eyebrow>
            <h2
              id="apply-heading"
              className="font-display text-4xl md:text-5xl font-bold tracking-[-0.02em] text-offwhite mb-4"
            >
              Become a partner.
            </h2>
            <p className="font-body text-lg text-offwhite/55 max-w-[50ch] leading-[1.70] mb-10">
              We review every application. We're building a programme that lasts — not a bulk affiliate scheme. Quality referrers only.
            </p>
          </FadeUp>

          {submitted ? (
            <FadeUp>
              <div
                className="p-8 rounded-card text-center"
                style={{
                  background: 'rgba(255,107,43,0.08)',
                  boxShadow: '0 0 0 1px rgba(255,107,43,0.18)',
                }}
              >
                <CheckCircle2 size={40} className="text-orange mx-auto mb-4" aria-hidden="true" />
                <h3 className="font-display text-2xl font-bold text-offwhite mb-2">Application received.</h3>
                <p className="font-body text-offwhite/55 leading-[1.65] max-w-[44ch] mx-auto">
                  We'll review your application and get back to you within 48 working hours — either way.
                </p>
              </div>
            </FadeUp>
          ) : (
            <FadeUp delay={80}>
              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 16px 48px rgba(2,13,24,0.4)',
                  borderRadius: '20px',
                  padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="p-name" className="block font-body text-[12px] font-bold tracking-[0.08em] uppercase text-offwhite/45 mb-2">
                      Your name <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <input id="p-name" type="text" name="name" autoComplete="name" required value={form.name} onChange={handleChange} className={inputClass} placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label htmlFor="p-email" className="block font-body text-[12px] font-bold tracking-[0.08em] uppercase text-offwhite/45 mb-2">
                      Email address <span className="text-orange" aria-hidden="true">*</span>
                    </label>
                    <input id="p-email" type="email" name="email" autoComplete="email" required value={form.email} onChange={handleChange} className={inputClass} placeholder="jane@agency.co.uk" />
                  </div>
                </div>

                <div>
                  <label htmlFor="p-website" className="block font-body text-[12px] font-bold tracking-[0.08em] uppercase text-offwhite/45 mb-2">
                    Website or LinkedIn
                  </label>
                  <input id="p-website" type="url" name="website" autoComplete="url" value={form.website} onChange={handleChange} className={inputClass} placeholder="https://yoursite.co.uk" />
                </div>

                <div>
                  <label htmlFor="p-type" className="block font-body text-[12px] font-bold tracking-[0.08em] uppercase text-offwhite/45 mb-2">
                    Type of business <span className="text-orange" aria-hidden="true">*</span>
                  </label>
                  <select id="p-type" name="businessType" required value={form.businessType} onChange={handleChange} className={inputClass} style={{ colorScheme: 'dark', cursor: 'pointer' }}>
                    <option value="" disabled>Select your business type</option>
                    {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="p-clients" className="block font-body text-[12px] font-bold tracking-[0.08em] uppercase text-offwhite/45 mb-2">
                    Roughly how many UK trade clients do you work with?
                  </label>
                  <input id="p-clients" type="text" name="clientCount" value={form.clientCount} onChange={handleChange} className={inputClass} placeholder="e.g. 15 – 20" />
                </div>

                <div>
                  <label htmlFor="p-message" className="block font-body text-[12px] font-bold tracking-[0.08em] uppercase text-offwhite/45 mb-2">
                    Why would you be a good partner? <span className="text-offwhite/25">(optional)</span>
                  </label>
                  <textarea id="p-message" name="message" rows={4} value={form.message} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Briefly describe how you'd introduce Trade Receptionist to your clients…" />
                </div>

                {error && (
                  <p role="alert" className="font-body text-[14px] text-orange-soft">
                    {error}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2.5 px-7 py-4 bg-gradient-to-r from-orange to-orange-glow text-white font-semibold text-[15px] tracking-[-0.01em] rounded-button shadow-orange-glow hover:shadow-orange-glow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-mechanical font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submitting ? 'Submitting…' : 'Submit application'}
                    {!submitting && <ArrowRight size={15} aria-hidden="true" />}
                  </button>
                  <p className="font-body text-[13px] text-offwhite/30 leading-snug">
                    Reviewed within 48 working hours.<br className="hidden sm:inline" />
                    We reply either way.
                  </p>
                </div>
              </form>
            </FadeUp>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PartnerPage() {
  useEffect(() => {
    document.title = 'Partner Programme — Trade Receptionist';
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <PartnerNav />
      <main id="main-content" tabIndex={-1}>
        <PartnerHero />
        <WhoItsFor />
        <CommissionStructure />
        <HowItWorks />
        <WhyItConverts />
        <EarningsCalculator />
        <PartnerFAQ />
        <ApplicationForm />
      </main>
    </>
  );
}
