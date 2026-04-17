import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Calendar, MessageSquare, ShieldCheck,
  Menu, X, CheckCircle2, ArrowRight,
  Clock, Banknote, Smartphone,
  Wrench, Zap, Hammer, Droplets,
  ChevronDown, ChevronUp, Star, XCircle,
  Instagram, Facebook, Mic, Play, Shield, Award,
} from 'lucide-react';

// ─── Scroll Animation Hook ────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If element is already visible on mount (above fold), mark as in view immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) { setInView(true); return; }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); obs.unobserve(el); }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ─── Fade-Up Wrapper ─────────────────────────────────────────────────────────
const FadeUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity 500ms cubic-bezier(0,0,0.2,1) ${delay}ms, transform 500ms cubic-bezier(0,0,0.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};
import { Button, Section, GlassCard, Badge, Card, StatusGauge } from './components/UI';
import { AudioPlayer } from './components/AudioPlayer';
import { Calculator } from './components/Calculator';
import { BlueprintGrid } from './components/BlueprintGrid';
import { Testimonials } from './components/Testimonials';
import { BookDemo } from './components/BookDemo';
import { Logo } from './components/Logo';
import { ContactUs } from './components/ContactUs';
import { WaitlistModal } from './components/WaitlistModal';
import { Feature, FAQItem, PricingTier } from './types';

type View = 'home' | 'book-demo';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
  </svg>
);

// ─── Sticky Mobile Bar ────────────────────────────────────────────────────────
const StickyBottomBar = ({ onWaitlist }: { onWaitlist: () => void }) => (
  <div
    className="fixed bottom-0 left-0 right-0 p-3 pb-safe z-50 md:hidden"
    style={{
      background: 'rgba(5,20,38,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 -1px 0 rgba(255,255,255,0.04)',
    }}
  >
    <div className="flex gap-3 max-w-md mx-auto">
      <Button variant="outline" fullWidth size="md"
        onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
        Hear Demo
      </Button>
      <Button variant="primary" fullWidth size="md" onClick={onWaitlist}>
        Start Free Trial
      </Button>
    </div>
  </div>
);

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ currentView, onViewChange, onWaitlist }: {
  currentView: View;
  onViewChange: (view: View) => void;
  onWaitlist: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleNav = (target: string) => {
    if (target === 'book-demo') {
      onViewChange('book-demo');
    } else {
      onViewChange('home');
      setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    setIsOpen(false);
  };

  const navLinks = [
    { label: 'How It Works',  target: 'how-it-works' },
    { label: 'Calculator',    target: 'roi' },
    { label: 'Pricing',       target: 'pricing' },
    { label: 'Book a Demo',   target: 'book-demo' },
  ];

  return (
    <nav
      className="fixed top-0 w-full z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? 'rgba(5,20,38,0.92)'
          : 'rgba(5,20,38,0.70)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.05)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <button
            className="flex-shrink-0 h-full py-4 flex items-center focus:outline-none"
            onClick={() => handleNav('hero')}
            aria-label="Trade Receptionist home"
          >
            <div className="h-full w-[150px] md:w-[180px] flex items-center">
              <Logo className="h-full w-full" />
            </div>
          </button>

          {/* Desktop nav */}
          <div className="hidden xl:flex items-center gap-8">
            {navLinks.map(({ label, target }) => (
              <button
                key={target}
                onClick={() => handleNav(target)}
                className={`font-semibold text-[14px] tracking-wide transition-colors duration-200 ${
                  currentView === 'book-demo' && target === 'book-demo'
                    ? 'text-orange-soft'
                    : 'text-offwhite/60 hover:text-offwhite'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden xl:flex items-center gap-3">
            <Button variant="ghost" size="sm">Log in</Button>
            <Button variant="primary" size="sm" onClick={onWaitlist}>
              Start Free Trial
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="xl:hidden text-offwhite/70 hover:text-offwhite p-2 transition-colors"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div
          className="xl:hidden absolute w-full px-6 py-8"
          style={{
            background: 'rgba(10,35,64,0.97)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex flex-col gap-6">
            {navLinks.map(({ label, target }) => (
              <button
                key={target}
                className="text-xl font-bold text-left text-offwhite/80 hover:text-offwhite transition-colors"
                onClick={() => handleNav(target)}
              >
                {label}
              </button>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={() => {
                setIsOpen(false);
                setTimeout(() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}>
                Hear Live Demo
              </Button>
              <Button variant="primary" fullWidth onClick={() => { onWaitlist(); setIsOpen(false); }}>
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
const Hero = ({ onWaitlist }: { onWaitlist: () => void }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const isTouchDevice = useRef(false);

  useEffect(() => {
    isTouchDevice.current = ('ontouchstart' in window);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rotateY = ((e.clientX - rect.left  - rect.width  / 2) / (rect.width  / 2)) * 5;
    const rotateX = ((rect.height / 2 - (e.clientY - rect.top)) / (rect.height / 2)) * 5;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  return (
    <section
      id="hero"
      className="relative pt-36 pb-24 md:pt-48 md:pb-36 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 15% 60%, rgba(255,107,43,0.09) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 85% 15%, rgba(153,203,255,0.07) 0%, transparent 50%),' +
          '#051426',
      }}
    >
      <BlueprintGrid />

      {/* Atmospheric glow blobs */}
      <div className="absolute top-1/3 right-[5%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-0 left-[10%] w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(153,203,255,0.2) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">

          {/* Left: Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full glass-deep ring-1 ring-orange-soft/20">
              <div className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
              <span className="text-[12px] font-bold tracking-[0.14em] uppercase text-orange-soft">
                UK's #1 AI Receptionist for Trades
              </span>
            </div>

            <h1 className="font-display text-[2.8rem] sm:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-[-0.025em] text-offwhite mb-6">
              Never miss a{' '}
              <span className="relative inline-block">
                <span className="text-gradient-orange">call.</span>
              </span>
              <br />
              Never lose a{' '}
              <span className="text-gradient-orange">job.</span>
            </h1>

            <p className="text-lg md:text-xl text-offwhite/65 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10 font-body">
              Your AI receptionist answers every call, qualifies every lead, and books jobs straight into your diary — 24/7, while you're on the tools.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button variant="primary" size="lg" onClick={onWaitlist} className="animate-pulse-glow">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="secondary" size="lg"
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-4 h-4 mr-2 text-accent" />
                Hear a Live Demo
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-[13px] font-semibold text-offwhite/50">
              {[
                { icon: CheckCircle2, text: 'Works 24/7' },
                { icon: CheckCircle2, text: 'Natural UK Accent' },
                { icon: CheckCircle2, text: 'Setup in 5 Minutes' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4 text-orange-soft/70" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div
            className="relative mx-auto lg:ml-auto w-full max-w-[340px] lg:max-w-full z-20 cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: '1000px' }}
          >
            {/* Floating glow behind phone */}
            <div className="absolute inset-0 rounded-[2.5rem] opacity-40 pointer-events-none"
              style={{ filter: 'blur(40px)', background: 'radial-gradient(ellipse, rgba(255,107,43,0.25) 0%, transparent 70%)' }} />

            <div
              className="relative z-10 rounded-[2.5rem] overflow-hidden aspect-[9/19] max-h-[680px] mx-auto"
              style={{
                transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                transition: 'transform 100ms ease-out',
                background: '#0A2340',
                border: '6px solid #0F3060',
                boxShadow: `${-rotate.y * 1.5}px ${rotate.x * 1.5 + 20}px 60px rgba(2,13,24,0.6), 0 0 0 1px rgba(255,255,255,0.06)`,
              }}
            >
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-7 rounded-b-xl w-32 mx-auto z-20 bg-navy" />

              <div className="w-full h-full flex flex-col pt-10 select-none pointer-events-none">
                {/* App header */}
                <div className="px-5 mb-5">
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-8 w-8 rounded-full bg-navy-high" />
                    <div className="h-3.5 w-16 rounded-full bg-navy-high" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-offwhite mb-0.5 tracking-tight">
                    Good morning, Dave
                  </h3>
                  <p className="text-[12px] text-offwhite/40 font-body">3 new jobs booked today</p>
                </div>

                {/* Job card 1 */}
                <div className="flex-1 px-4 space-y-3 overflow-hidden">
                  <div className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.07)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-orange bg-orange/10">
                        Just Now
                      </span>
                      <span className="text-[11px] text-offwhite/30">09:42</span>
                    </div>
                    <p className="font-display font-bold text-[15px] text-offwhite leading-tight mb-1">Emergency Boiler Repair</p>
                    <p className="text-[12px] text-offwhite/45 mb-3">SE15 4TW · Mrs. Higgins</p>
                    <div className="flex gap-2">
                      <div className="flex-1 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-offwhite/50"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        View Notes
                      </div>
                      <div className="flex-1 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)' }}>
                        Call Back
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 opacity-50"
                    style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-accent bg-accent/10">
                        Quote
                      </span>
                      <span className="text-[11px] text-offwhite/25">08:15</span>
                    </div>
                    <p className="font-display font-bold text-[15px] text-offwhite leading-tight mb-1">Bathroom Renovation</p>
                    <p className="text-[12px] text-offwhite/35">SW4 9HE · Tom Baker</p>
                  </div>
                </div>

                {/* Incoming call notification */}
                <div className="absolute bottom-5 left-3 right-3 rounded-2xl p-4"
                  style={{
                    background: 'rgba(10,35,64,0.96)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 0 0 1px rgba(255,107,43,0.25), 0 0 24px rgba(255,107,43,0.15)',
                    animation: 'incomingPulse 2s ease-in-out infinite',
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse-glow"
                      style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)' }}>
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-[14px] text-offwhite">Incoming Call…</p>
                      <p className="text-[11px] text-accent/70">AI is answering now</p>
                    </div>
                    <div className="ml-auto">
                      <div className="flex gap-0.5 items-end">
                        {[3,5,8,5,3].map((h, i) => (
                          <div key={i} className="w-1 rounded-full bg-orange/60"
                            style={{ height: h * 3, animation: `floatUp ${0.6 + i * 0.1}s ease-in-out infinite alternate` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '24/7', label: 'Always Answering' },
            { value: '98%', label: 'Calls Handled' },
            { value: '£4.2k', label: 'Avg. Saved / Year' },
            { value: '5 min', label: 'Setup Time' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-card p-5 text-center glass-deep animate-fade-up"
              style={{
                animationDelay: `${i * 80}ms`,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              <div className="font-display text-2xl md:text-3xl font-bold text-offwhite mb-1 tracking-[-0.02em]">
                {stat.value}
              </div>
              <div className="text-[12px] font-semibold tracking-[0.08em] uppercase text-offwhite/35">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Social Proof Marquee ─────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: Star, text: '4.9 / 5 Rating', highlight: true },
  { icon: CheckCircle2, text: 'Gas Safe Partner' },
  { icon: CheckCircle2, text: 'NICEIC Approved' },
  { icon: CheckCircle2, text: 'FMB Member' },
  { icon: CheckCircle2, text: '24 / 7 Answering' },
  { icon: CheckCircle2, text: 'Natural UK Voice' },
  { icon: CheckCircle2, text: '5-Minute Setup' },
  { icon: Shield,       text: 'No Contracts' },
  { icon: CheckCircle2, text: 'Google Calendar Sync' },
  { icon: Award,        text: '500+ UK Trades' },
  { icon: CheckCircle2, text: 'WhatsApp Summaries' },
  { icon: CheckCircle2, text: 'Emergency Routing' },
];

const SocialProof = () => {
  // Duplicate for seamless loop
  const items = [...TRUST_ITEMS, ...TRUST_ITEMS];

  return (
    <div
      className="bg-navy-mid py-6 overflow-hidden"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(255,255,255,0.04)' }}
    >
      <div
        className="flex gap-10 w-max animate-marquee"
        style={{ animationDuration: '40s' }}
      >
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 flex-shrink-0">
            <item.icon
              className={`w-3.5 h-3.5 flex-shrink-0 ${item.highlight ? 'fill-current text-orange' : 'text-orange-soft/60'}`}
            />
            <span
              className={`text-[13px] font-semibold whitespace-nowrap tracking-[0.02em] ${
                item.highlight ? 'text-offwhite/70' : 'text-offwhite/35'
              }`}
            >
              {item.text}
            </span>
            <span className="text-offwhite/10 ml-4">·</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Pain Points ──────────────────────────────────────────────────────────────
const PAIN_ITEMS = [
  {
    icon: Banknote,
    title: 'Lost Revenue',
    stat: '£4,200/yr',
    desc: '67% of callers hang up on voicemail. They ring the next tradesperson on the list. That job is gone.',
  },
  {
    icon: Clock,
    title: 'Admin Overload',
    stat: '8 hrs/week',
    desc: 'Evenings spent returning calls, chasing leads, and organising your diary — instead of resting.',
  },
  {
    icon: Star,
    title: 'Reputation Damage',
    stat: '#1 complaint',
    desc: 'Slow response time is the top reason customers leave negative reviews. Speed wins high-value jobs.',
  },
];

const PainPoints = () => (
  <Section bg="gray">
    <FadeUp className="text-center max-w-2xl mx-auto mb-16">
      <Badge>The Cost of Silence</Badge>
      <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite tracking-[-0.02em] leading-[1.1]">
        Missed calls cost you jobs.{' '}
        <span className="text-offwhite/40">It's that simple.</span>
      </h2>
    </FadeUp>

    <div className="grid md:grid-cols-3 gap-6">
      {PAIN_ITEMS.map((item, i) => (
        <FadeUp key={i} delay={i * 90}>
          <div
            className="glass glass-ring glass-ring-hover rounded-card p-8 group transition-all duration-300 h-full"
            style={{ transitionTimingFunction: 'cubic-bezier(0.34,1.2,0.64,1)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300"
              style={{ background: 'rgba(255,107,43,0.10)' }}
            >
              <item.icon className="w-6 h-6 text-orange" />
            </div>
            <div className="font-display text-3xl font-bold text-orange-soft mb-2 tracking-[-0.02em]">
              {item.stat}
            </div>
            <h3 className="font-display text-xl font-bold text-offwhite mb-3 tracking-tight">
              {item.title}
            </h3>
            <p className="text-offwhite/55 leading-relaxed text-[15px]">{item.desc}</p>
          </div>
        </FadeUp>
      ))}
    </div>
  </Section>
);

// ─── How It Works ─────────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    step: '01',
    title: 'Download the App',
    desc: 'Available on iOS and Android. Create your account in under 5 minutes — no IT skills needed.',
  },
  {
    step: '02',
    title: 'Divert Your Calls',
    desc: "Forward calls to your dedicated Trade Receptionist number when you're on-site or busy.",
  },
  {
    step: '03',
    title: 'Never Miss Work',
    desc: 'We answer instantly, qualify the lead by your rules, and drop the job details straight into your diary.',
  },
];

const HowItWorks = () => (
  <Section id="how-it-works" bg="white">
    <FadeUp className="text-center mb-16">
      <Badge>Simple Process</Badge>
      <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite tracking-[-0.02em]">
        Three steps to zero missed calls
      </h2>
    </FadeUp>

    <div className="grid md:grid-cols-3 gap-8 relative">
      {/* Connector line — desktop only */}
      <div
        className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(255,107,43,0.25) 0%, rgba(255,107,43,0.5) 50%, rgba(255,107,43,0.25) 100%)',
        }}
      />

      {HOW_STEPS.map((item, i) => (
        <FadeUp key={i} delay={i * 100} className="flex flex-col items-center text-center group">
          <div className="relative mb-8">
            {/* Step number circle */}
            <div
              className="w-24 h-24 rounded-card flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1.5"
              style={{
                background: 'rgba(255,107,43,0.07)',
                boxShadow: '0 0 0 1px rgba(255,107,43,0.18), 0 0 24px rgba(255,107,43,0.06)',
                transitionTimingFunction: 'cubic-bezier(0.34,1.2,0.64,1)',
              }}
            >
              <span className="font-display text-4xl font-bold tracking-tight text-gradient-orange">
                {item.step}
              </span>
            </div>
            {/* Connector dot */}
            {i < 2 && (
              <div
                className="hidden md:block absolute top-12 -right-8 w-3 h-3 rounded-full"
                style={{
                  background: 'rgba(255,107,43,0.4)',
                  transform: 'translateX(50%)',
                  boxShadow: '0 0 6px rgba(255,107,43,0.4)',
                }}
              />
            )}
          </div>
          <h3 className="font-display text-xl font-bold text-offwhite mb-3 tracking-tight">{item.title}</h3>
          <p className="text-offwhite/55 leading-relaxed text-[15px] max-w-xs">{item.desc}</p>
        </FadeUp>
      ))}
    </div>
  </Section>
);

// ─── ROI Section ──────────────────────────────────────────────────────────────
const ROISection = () => (
  <Section id="roi" bg="gray">
    <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
      <FadeUp className="order-2 lg:order-1">
        <Calculator />
      </FadeUp>
      <FadeUp delay={80} className="order-1 lg:order-2">
        <Badge>ROI Calculator</Badge>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite mb-6 tracking-[-0.02em] leading-[1.1]">
          Do the maths.{' '}
          <span className="text-offwhite/40">It pays for itself.</span>
        </h2>
        <p className="text-[17px] text-offwhite/60 mb-8 leading-relaxed">
          Missing just 5 calls a week adds up to over £4,000 in lost revenue. Trade Receptionist costs less than a single small job per month.
        </p>
        <ul className="space-y-5">
          {[
            'Captures every lead, even when you\'re on the tools.',
            'Filters timewasters so you only quote for real work.',
            'Cheaper than a human VA — and works round the clock.',
          ].map((point, i) => (
            <li key={i} className="flex gap-3 text-offwhite/70 text-[15px]">
              <CheckCircle2 className="w-5 h-5 text-orange-soft flex-shrink-0 mt-0.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </FadeUp>
    </div>
  </Section>
);

// ─── Comparison ───────────────────────────────────────────────────────────────
const ComparisonSection = () => (
  <Section bg="white" id="comparison">
    <div className="text-center mb-16">
      <Badge>Side by Side</Badge>
      <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite tracking-[-0.02em]">
        Stop overpaying for help.
      </h2>
      <p className="text-[17px] text-offwhite/50 mt-4">
        Why hire a temp or lose jobs to voicemail when you can have a 24/7 expert?
      </p>
    </div>

    <div className="overflow-x-auto pb-4">
      <div
        className="min-w-[720px] rounded-card p-8"
        style={{
          background: 'rgba(255,255,255,0.04)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
        }}
      >
        {/* Column headers — tonal background separates from rows */}
        <div className="grid grid-cols-4 gap-4 mb-6 pb-6 rounded-xl px-2"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div />
          <div className="text-center">
            <span className="font-display font-bold text-lg text-offwhite">Trade Receptionist</span>
          </div>
          <div className="text-center">
            <span className="font-display font-bold text-lg text-offwhite/35">Virtual Assistant</span>
          </div>
          <div className="text-center">
            <span className="font-display font-bold text-lg text-offwhite/35">Voicemail</span>
          </div>
        </div>

        {[
          { label: 'Cost per month',       us: '£29 fixed',    them: '£500+',     bad: '£0 (costly)' },
          { label: 'Availability',         us: '24/7/365',     them: '9am–5pm',   bad: 'Always on' },
          { label: 'Response time',        us: 'Instant',      them: 'Variable',  bad: 'Hours later' },
          { label: 'Books appointments',   us: true,           them: true,        bad: false },
          { label: 'Natural UK accent',    us: true,           them: 'Variable',  bad: 'N/A' },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 items-center py-4 table-row-alt rounded-lg px-2">
            <div className="font-semibold text-[15px] text-offwhite/60 pl-2">{row.label}</div>

            <div className="text-center flex justify-center">
              {row.us === true ? (
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,107,43,0.12)' }}>
                  <CheckCircle2 className="w-4 h-4 text-orange-soft" />
                </div>
              ) : (
                <span className="font-bold text-orange-soft bg-orange/10 px-3 py-1 rounded-full text-[13px] tracking-wide">
                  {row.us}
                </span>
              )}
            </div>

            <div className="text-center flex justify-center">
              {row.them === true ? (
                <CheckCircle2 className="w-5 h-5 text-offwhite/20" />
              ) : (
                <span className="text-[14px] text-offwhite/30">{row.them}</span>
              )}
            </div>

            <div className="text-center flex justify-center">
              {row.bad === false ? (
                <XCircle className="w-5 h-5 text-offwhite/15" />
              ) : (
                <span className="text-[14px] text-offwhite/30">{row.bad}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

// ─── Demo Section ─────────────────────────────────────────────────────────────
const DemoSection = () => (
  <Section id="demo" bg="gray">
    <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
      <div>
        <Badge>Live Demo</Badge>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite mb-5 tracking-[-0.02em] leading-[1.1]">
          Not a robot.{' '}
          <span className="text-gradient-orange">A receptionist.</span>
        </h2>
        <p className="text-[17px] text-offwhite/60 mb-8 leading-relaxed">
          Trade Receptionist speaks naturally, handles UK accents, and knows your business rules. It qualifies callers, checks your calendar, and books the job — all in one call.
        </p>

        <div className="space-y-6">
          {[
            { title: 'Handles Qualification', text: 'Asks for postcode, job type, and urgency before booking.' },
            { title: 'Checks Your Calendar', text: 'Only books slots you\'re actually free — syncs with Google and Outlook.' },
            { title: 'Emergency Routing',     text: 'Patches urgent calls straight through to your mobile, instantly.' },
          ].map((feat, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(255,107,43,0.12)' }}>
                <CheckCircle2 className="w-4 h-4 text-orange-soft" />
              </div>
              <div>
                <h4 className="font-display font-bold text-[16px] text-offwhite mb-0.5">{feat.title}</h4>
                <p className="text-[14px] text-offwhite/50 leading-relaxed">{feat.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* Floating transcript card */}
        <div
          className="absolute -left-8 top-8 max-w-[260px] rounded-card p-6 z-20 hidden xl:block glass-elevated animate-float"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(2,13,24,0.5)' }}
        >
          <p className="text-[10px] font-bold text-offwhite/30 mb-3 uppercase tracking-[0.12em]">Live Transcript</p>
          <div className="space-y-3 text-[13px] leading-relaxed">
            <p><span className="font-bold text-orange-soft">AI:</span> <span className="text-offwhite/60">"Trade Receptionist for Dave's Plumbing. How can I help?"</span></p>
            <p><span className="font-bold text-accent">Caller:</span> <span className="text-offwhite/60">"My boiler's making a banging noise."</span></p>
            <p><span className="font-bold text-orange-soft">AI:</span> <span className="text-offwhite/60">"Is it urgent or just looking for a quote?"</span></p>
          </div>
        </div>

        <AudioPlayer />
      </div>
    </div>
  </Section>
);

// ─── Use Cases ────────────────────────────────────────────────────────────────
const UseCases = () => (
  <Section bg="white">
    <div className="text-center mb-14">
      <Badge>Built for Your Trade</Badge>
      <h2 className="font-display text-3xl md:text-4xl font-bold text-offwhite tracking-[-0.02em]">
        Whatever you fix, we answer.
      </h2>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { icon: Droplets, name: 'Plumbers',      label: 'Emergency triage' },
        { icon: Zap,      name: 'Electricians',  label: 'Quote qualification' },
        { icon: Wrench,   name: 'HVAC',          label: 'Maintenance booking' },
        { icon: Hammer,   name: 'Builders',      label: 'Site coordination' },
      ].map((trade, i) => (
        <div
          key={i}
          className="group rounded-card p-7 text-center cursor-default transition-all duration-300 glass-deep"
          style={{
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
            transitionTimingFunction: 'cubic-bezier(0.34,1.2,0.64,1)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,107,43,0.20), 0 8px 32px rgba(2,13,24,0.4)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.05)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <trade.icon className="w-9 h-9 mx-auto mb-4 text-offwhite/20 group-hover:text-orange-soft transition-colors duration-300" />
          <h3 className="font-display font-bold text-[16px] text-offwhite mb-1">{trade.name}</h3>
          <p className="text-[13px] text-offwhite/35">{trade.label}</p>
        </div>
      ))}
    </div>
  </Section>
);

// ─── Features ─────────────────────────────────────────────────────────────────
const Features = ({ onWaitlist }: { onWaitlist: () => void }) => {
  const features = [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      desc: 'Integrates with Google Calendar, Outlook, and ServiceM8 to book slots only when you\'re actually free — so you wake up to a full diary.',
    },
    {
      icon: ShieldCheck,
      title: 'Spam Blocking',
      desc: 'Politely filters out sales calls and nuisance callers before they reach you. You only hear about real jobs.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Summaries',
      desc: 'Get a concise WhatsApp message immediately after every call — job type, caller name, postcode, and urgency.',
    },
    {
      icon: Smartphone,
      title: 'Custom Knowledge',
      desc: 'Teach it your pricing ranges, service areas (postcodes), and out-of-hours fees. It answers customer questions as if it knows your business cold.',
    },
  ];

  return (
    <Section bg="gray">
      <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div className="order-2 lg:order-1">
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <GlassCard key={i} className="p-7">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(255,107,43,0.10)' }}>
                  <f.icon className="w-5 h-5 text-orange" />
                </div>
                <h3 className="font-display font-bold text-[17px] text-offwhite mb-2 tracking-tight">{f.title}</h3>
                <p className="text-[14px] text-offwhite/50 leading-relaxed">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <Badge>What You Get</Badge>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite mb-6 tracking-[-0.02em] leading-[1.1]">
            Run your business from your pocket.
          </h2>
          <p className="text-[17px] text-offwhite/60 mb-8 leading-relaxed">
            Stop playing phone tag. Let Trade Receptionist handle the admin while you handle the tools. It's like having an office manager who never sleeps, never takes holidays, and never has a bad day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="primary" size="lg" onClick={onWaitlist}>
              Start Free Trial
            </Button>
            <Button variant="ghost" className="text-accent gap-2">
              View all integrations <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
};

// ─── Pricing ──────────────────────────────────────────────────────────────────
const Pricing = ({ onWaitlist }: { onWaitlist: () => void }) => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const plans: PricingTier[] = [
    {
      name: 'Starter',
      price: billing === 'monthly' ? '£29' : '£24',
      period: 'per month (+VAT)',
      description: 'Solo traders',
      features: ['60 AI Minutes (~25 Calls)', '24/7 Answering', 'SMS Summaries', 'Google Calendar Sync'],
      buttonText: 'Start Free Trial',
    },
    {
      name: 'Pro',
      price: billing === 'monthly' ? '£59' : '£49',
      period: 'per month (+VAT)',
      description: 'Busy professionals',
      isPopular: true,
      features: ['150 AI Minutes (~65 Calls)', 'Everything in Starter', 'Call Transfer Logic', 'CRM Integration', 'Priority Support'],
      buttonText: 'Start Free Trial',
    },
    {
      name: 'Agency',
      price: billing === 'monthly' ? '£119' : '£99',
      period: 'per month (+VAT)',
      description: 'Growing teams',
      features: ['350 AI Minutes (~150 Calls)', 'Everything in Pro', 'Multiple Departments', 'White-Label Dashboard', 'Dedicated Account Mgr'],
      buttonText: 'Start Free Trial',
    },
  ];

  return (
    <Section id="pricing" bg="white">
      <div className="text-center mb-14">
        <Badge>Simple, Honest Pricing</Badge>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite mb-4 tracking-[-0.02em]">
          No contracts. Cancel anytime.
        </h2>
        <p className="text-[17px] text-offwhite/50 mb-8">
          Early access available now. Prices locked for life when you join.
        </p>

        {/* Toggle */}
        <div className="inline-flex rounded-full p-1.5"
          style={{ background: 'rgba(255,255,255,0.06)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}>
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-7 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 ${
                billing === b
                  ? 'bg-orange text-white shadow-orange-glow'
                  : 'text-offwhite/40 hover:text-offwhite/70'
              }`}
            >
              {b === 'monthly' ? 'Monthly' : 'Yearly'}
              {b === 'yearly' && (
                <span className="ml-1.5 text-[10px] font-extrabold text-orange-soft">−20%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory pb-6 md:pb-0 px-4 md:px-0 -mx-4 md:mx-0 no-scrollbar pt-4">
        {plans.map((plan, i) => (
          <div
            key={i}
            className={`snap-center flex-shrink-0 w-[82vw] md:w-auto relative flex flex-col rounded-card p-8 transition-all duration-300 ${
              plan.isPopular
                ? 'popular-ring md:scale-[1.04]'
                : 'hover:-translate-y-1'
            }`}
            style={{
              background: plan.isPopular
                ? 'linear-gradient(160deg, rgba(255,107,43,0.12) 0%, rgba(255,107,43,0.04) 100%)'
                : 'rgba(255,255,255,0.05)',
              transitionTimingFunction: 'cubic-bezier(0.34,1.2,0.64,1)',
            }}
          >
            {/* Popular badge */}
            {plan.isPopular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.10em] text-white"
                style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)', boxShadow: '0 4px 16px rgba(255,107,43,0.4)' }}>
                <StatusGauge value={97} label="" metric="" size="sm" color="orange" />
                Most Popular
              </div>
            )}

            <h3 className="font-display text-2xl font-bold text-offwhite mb-1">{plan.name}</h3>
            <p className="text-[13px] text-offwhite/35 mb-7">{plan.description}</p>

            <div className="flex items-baseline gap-1.5 mb-7">
              <span className="font-display text-5xl font-bold text-offwhite tracking-[-0.03em]">
                {plan.price}
              </span>
              <span className="text-offwhite/30 text-[13px]">{plan.period}</span>
            </div>

            {billing === 'yearly' && (
              <p className="text-[12px] font-bold text-orange-soft mb-4 -mt-3">
                Save £{plan.name === 'Starter' ? '60' : plan.name === 'Pro' ? '120' : '240'}/year
              </p>
            )}

            <ul className="space-y-3.5 mb-8 flex-1">
              {plan.features.map((feat, k) => (
                <li key={k} className="flex items-start gap-2.5 text-[14px] text-offwhite/60">
                  <CheckCircle2 className="w-4 h-4 text-orange-soft flex-shrink-0 mt-0.5" />
                  {feat}
                </li>
              ))}
            </ul>

            <p className="text-[11px] text-offwhite/25 text-center mb-4">
              14-day free trial · No card required · Cancel anytime
            </p>

            <Button
              variant={plan.isPopular ? 'primary' : 'outline'}
              fullWidth
              onClick={onWaitlist}
            >
              {plan.buttonText}
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'Do I need to change my phone number?',
      answer: "No. You set up call forwarding on your existing mobile or landline — it takes about 2 minutes. Calls go to your Trade Receptionist number when you're busy, then straight back to you the rest of the time.",
    },
    {
      question: 'How does call diverting work?',
      answer: "You dial a short code on your phone (e.g. **21* then your Trade Receptionist number) to activate divert when you're on-site. You can also set it to auto-divert on busy or no-answer. Your network does the rest.",
    },
    {
      question: "What if I'm on a job and can\'t check messages?",
      answer: "You'll get a WhatsApp message immediately after every call with the key details: caller name, job type, postcode, urgency. Check it between jobs in 10 seconds. No voicemail back-log.",
    },
    {
      question: 'What accent and voice does the AI use?',
      answer: 'Natural, neutral British English — like a professional office receptionist based in the UK. Not robotic, not American. You can hear an example in the Live Demo section above.',
    },
    {
      question: 'Can I customise what it says about my business?',
      answer: 'Yes. During onboarding you build a simple knowledge base: your service areas (postcodes), pricing ranges, common job types, and out-of-hours rules. The AI uses this to answer caller questions accurately.',
    },
    {
      question: 'Does it work with my trade management software?',
      answer: 'We integrate with Google Calendar, Outlook, and ServiceM8. Jobs booked via Trade Receptionist appear directly in your diary. More integrations are rolling out continuously.',
    },
    {
      question: 'What happens in an emergency?',
      answer: 'You set keywords (e.g. "no heating", "flooding") that trigger immediate call transfer to your mobile. Emergency calls are patched straight through — they never hit voicemail.',
    },
    {
      question: 'Is there a contract or lock-in?',
      answer: 'No contract. Cancel any time from your account — no notice period, no cancellation fee. We earn your business every month.',
    },
  ];

  return (
    <Section bg="gray" id="faq">
      <div className="text-center mb-14">
        <Badge>Got Questions?</Badge>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-offwhite tracking-[-0.02em]">
          Frequently asked questions
        </h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-card overflow-hidden transition-all duration-300"
            style={{
              background: openIndex === i ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
              boxShadow: openIndex === i
                ? '0 0 0 1px rgba(255,107,43,0.15)'
                : '0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-6 text-left focus:outline-none group"
            >
              <span className="font-display font-semibold text-[16px] text-offwhite pr-8 leading-snug">
                {faq.question}
              </span>
              <span className="flex-shrink-0">
                {openIndex === i
                  ? <ChevronUp className="w-5 h-5 text-orange-soft" />
                  : <ChevronDown className="w-5 h-5 text-offwhite/30 group-hover:text-offwhite/60 transition-colors" />
                }
              </span>
            </button>

            {openIndex === i && (
              <div className="px-6 pb-6 text-[15px] text-offwhite/55 leading-relaxed">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
};

// ─── Final CTA ────────────────────────────────────────────────────────────────
const FinalCTA = ({ onWaitlist }: { onWaitlist: () => void }) => (
  <section className="bg-void py-24 md:py-36 relative overflow-hidden">
    {/* Atmospheric glows */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.12) 0%, transparent 65%)', filter: 'blur(60px)' }} />
    <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-30"
      style={{ background: 'radial-gradient(circle, rgba(153,203,255,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-20"
      style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />

    <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 text-center relative z-10">
      {/* Status gauges */}
      <div className="flex justify-center gap-12 mb-12">
        <StatusGauge value={98} label="Calls Handled" metric="98%" size="md" color="orange" />
        <StatusGauge value={94} label="Customer Satisfaction" metric="4.9★" size="md" color="blue" />
        <StatusGauge value={100} label="Always Online" metric="24/7" size="md" color="orange" />
      </div>

      <h2 className="font-display text-4xl md:text-6xl font-bold text-offwhite mb-6 tracking-[-0.03em] leading-[1.05]">
        Ready to never miss{' '}
        <span className="text-gradient-orange">another call?</span>
      </h2>

      <p className="text-[18px] md:text-xl text-offwhite/50 mb-10 leading-relaxed max-w-2xl mx-auto">
        Join 500+ UK trades businesses saving 10+ hours a week. While you're reading this, a competitor is answering their calls.
      </p>

      <div className="flex flex-col sm:flex-row justify-center gap-5 mb-6">
        <Button variant="primary" size="lg" onClick={onWaitlist} className="animate-pulse-glow">
          Start Free Trial — No Card Required
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button variant="secondary" size="lg"
          onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
          <Mic className="w-4 h-4 mr-2" />
          Hear a Demo First
        </Button>
      </div>

      <p className="text-[13px] text-offwhite/25">
        14-day free trial · No contract · Cancel anytime · Prices in GBP + VAT
      </p>
    </div>
  </section>
);

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = ({ onWaitlist }: { onWaitlist: () => void }) => (
  <footer className="bg-void pt-20 pb-12">
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
      <div className="grid md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-2">
          <div className="w-[140px] mb-6">
            <Logo className="w-full" />
          </div>
          <p className="text-[15px] text-offwhite/35 leading-relaxed max-w-xs">
            The UK's #1 AI receptionist for tradespeople. Never miss a call. Never lose a job.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-[12px] tracking-[0.12em] uppercase text-offwhite/30 mb-5">Product</h4>
          <ul className="space-y-3 text-[14px] text-offwhite/45">
            <li>
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="hover:text-offwhite transition-colors"
              >
                Pricing
              </button>
            </li>
            <li>
              <button onClick={onWaitlist} className="hover:text-offwhite transition-colors text-left">
                Start Free Trial
              </button>
            </li>
            <li>
              <button
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="hover:text-offwhite transition-colors"
              >
                Live Demo
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8">
        <p className="text-[13px] text-offwhite/25">
          &copy; 2025 Trade Receptionist Ltd. All rights reserved. Registered in England & Wales.
        </p>
        <div className="flex gap-5 items-center text-offwhite/25">
          <a href="https://instagram.com/tradereceptionist" target="_blank" rel="noopener noreferrer"
            className="hover:text-orange-soft transition-colors">
            <Instagram className="w-5 h-5" />
          </a>
          <a href="https://tiktok.com/@tradereceptionist" target="_blank" rel="noopener noreferrer"
            className="hover:text-orange-soft transition-colors">
            <TikTokIcon className="w-5 h-5" />
          </a>
          <a href="https://www.facebook.com/share/16QddwsMk8/" target="_blank" rel="noopener noreferrer"
            className="hover:text-orange-soft transition-colors">
            <Facebook className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  </footer>
);

// ─── App Root ─────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const handleViewChange = (view: View) => {
    window.scrollTo(0, 0);
    setCurrentView(view);
  };

  const toggleWaitlist = () => setIsWaitlistOpen(v => !v);

  return (
    <div className="min-h-screen bg-navy font-body text-offwhite">
      <Header currentView={currentView} onViewChange={handleViewChange} onWaitlist={toggleWaitlist} />

      <main>
        {currentView === 'home' ? (
          <>
            <Hero onWaitlist={toggleWaitlist} />
            <SocialProof />
            <PainPoints />
            <HowItWorks />
            <ROISection />
            <ComparisonSection />
            <DemoSection />
            <Testimonials />
            <Features onWaitlist={toggleWaitlist} />
            <UseCases />
            <Pricing onWaitlist={toggleWaitlist} />
            <FAQ />
            <ContactUs />
            <FinalCTA onWaitlist={toggleWaitlist} />
          </>
        ) : (
          <BookDemo />
        )}
      </main>

      <Footer onWaitlist={toggleWaitlist} />
      <StickyBottomBar onWaitlist={toggleWaitlist} />
      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
    </div>
  );
};

export default App;
