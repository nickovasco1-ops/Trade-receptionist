import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Calendar, MessageSquare, ShieldCheck,
  Menu, X, CheckCircle2, ArrowRight,
  Clock, Banknote, Smartphone,
  Wrench, Zap, Hammer, Droplets,
  ChevronDown, Star, XCircle,
  Instagram, Facebook, Mic, Play,
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
  onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
}> = ({ children, delay = 0, className = '', onMouseMove }) => {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMouseMove}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 600ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms, transform 600ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ─── Animated Counter ────────────────────────────────────────────────────────
const AnimatedCounter: React.FC<{
  endValue: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}> = ({ endValue, suffix = '', decimals = 0, duration = 1600 }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(decimals > 0 ? (0).toFixed(decimals) : '0');
  const startedRef = useRef(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || startedRef.current) return;
      startedRef.current = true;
      const startTime = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = eased * endValue;
        setDisplay(decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString());
        if (progress < 1) requestAnimationFrame(tick);
        else setDisplay(decimals > 0 ? endValue.toFixed(decimals) : endValue.toString());
      };
      requestAnimationFrame(tick);
      obs.disconnect();
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [endValue, duration, decimals]);

  return <span ref={spanRef}>{display}{suffix}</span>;
};

import { Button, Section, Badge, Card, StatusGauge } from './components/UI';
import { BlueprintGrid } from './components/BlueprintGrid';
import { Logo } from './components/Logo';
import { WaitlistModal } from './components/WaitlistModal';
import { FAQItem, PricingTier } from './types';

// Lazy-loaded below-fold components — keeps initial JS bundle lean
const AudioPlayer  = React.lazy(() => import('./components/AudioPlayer').then(m => ({ default: m.AudioPlayer })));
const Calculator   = React.lazy(() => import('./components/Calculator').then(m => ({ default: m.Calculator })));
const Testimonials = React.lazy(() => import('./components/Testimonials').then(m => ({ default: m.Testimonials })));
const BookDemo     = React.lazy(() => import('./components/BookDemo').then(m => ({ default: m.BookDemo })));
const ContactUs    = React.lazy(() => import('./components/ContactUs').then(m => ({ default: m.ContactUs })));

const LazyFallback = () => (
  <div className="flex justify-center items-center py-16">
    <div className="w-8 h-8 rounded-full" style={{ boxShadow: '0 0 0 2px rgba(255,107,43,0.3)', animation: 'spin 1s linear infinite' }} />
  </div>
);

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
      className="fixed top-0 w-full z-50"
      style={{
        background: scrolled
          ? 'rgba(5,20,38,0.92)'
          : 'rgba(5,20,38,0.70)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,0.05)' : 'none',
        transition: 'background 300ms ease, box-shadow 300ms ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between h-36 items-center">
          {/* Logo */}
          <button
            className="flex-shrink-0 flex items-center focus:outline-none"
            onClick={() => handleNav('hero')}
            aria-label="Trade Receptionist home"
          >
            <Logo height={120} className="hidden md:block" />
            <Logo height={90} className="md:hidden" />
          </button>

          {/* Desktop nav */}
          <div className="hidden xl:flex items-center gap-8">
            {navLinks.map(({ label, target }) => {
              const isActive = currentView === 'book-demo' && target === 'book-demo';
              return (
                <button
                  key={target}
                  onClick={() => handleNav(target)}
                  className={`relative font-semibold text-[14px] tracking-wide pb-1 ${
                    isActive ? 'text-orange-soft' : 'text-offwhite/60 hover:text-offwhite'
                  }`}
                  style={{ transition: 'color 200ms ease' }}
                >
                  {label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-orange-soft"
                    />
                  )}
                </button>
              );
            })}
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
            background: 'rgba(5,20,38,0.98)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(2,13,24,0.6)',
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
      className="relative pt-44 pb-24 md:pt-56 md:pb-36 overflow-hidden"
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
            <div className="hero-fade" style={{ animationDelay: '0ms' }}>
              <div className="inline-flex items-center gap-2 mb-7 px-4 py-2 rounded-full glass-deep ring-1 ring-orange-soft/20">
                <div className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
                <span className="text-[12px] font-bold tracking-[0.14em] uppercase text-orange-soft">
                  <span>⭐</span> 4.9/5 · 500+ UK Tradespeople
                </span>
              </div>
            </div>

            <h1
              className="font-display font-bold text-offwhite mb-7"
              style={{ fontSize: 'clamp(3.5rem, 8.5vw, 8.5rem)', lineHeight: 0.90, letterSpacing: '-0.025em' }}
            >
              <span className="line-reveal-wrapper">
                <span className="line-reveal" style={{ animationDelay: '80ms' }}>
                  Never miss a{' '}
                  <span style={{ color: '#FF6B2B', fontStyle: 'italic' }}>call.</span>
                </span>
              </span>
              <span className="line-reveal-wrapper">
                <span className="line-reveal" style={{ animationDelay: '230ms' }}>
                  Never lose a{' '}
                  <span style={{ color: '#FF6B2B', fontStyle: 'italic' }}>job.</span>
                </span>
              </span>
            </h1>

            <div className="hero-fade" style={{ animationDelay: '390ms' }}>
              <p className="text-lg md:text-xl text-offwhite/65 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10 font-body">
                Your AI receptionist answers every call, qualifies every lead, and books jobs straight into your diary — 24/7, while you're on the tools.
              </p>
            </div>

            {/* CTAs */}
            <div className="hero-fade" style={{ animationDelay: '510ms' }}>
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
            </div>

            {/* Trust badges */}
            <div className="hero-fade" style={{ animationDelay: '630ms' }}>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-[13px] font-semibold text-offwhite/50">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-orange-soft/70" />
                  14-day free trial
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-orange-soft/70" />
                  No card required
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-orange-soft/70" />
                  Setup in 14 minutes
                </div>
              </div>
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div
            className="relative mx-auto lg:ml-auto w-full max-w-[340px] lg:max-w-full z-20 cursor-pointer hero-fade"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: '1000px', animationDelay: '150ms' }}
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
          {/* Live calls counter */}
          <div className="lg:col-span-2 hero-fade flex justify-center mt-6 lg:mt-10" style={{ animationDelay: '700ms' }}>
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full" style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.15)' }}>
              <div className="w-2 h-2 rounded-full bg-orange animate-pulse" />
              <span className="font-body text-[13px] text-offwhite/50">Calls answered today:</span>
              <span className="font-mono text-[14px] font-bold text-orange-soft"><AnimatedCounter endValue={14293} duration={2000} /></span>
            </div>
          </div>

        </div>

      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 pointer-events-none">
        <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-offwhite/25">Scroll</span>
        <div className="scroll-cue w-px h-10 bg-gradient-to-b from-offwhite/25 to-transparent" />
      </div>

    </section>
  );
};

// ───Social Proof Strip ───────────────────────────────────────────────────────
const SocialProof = () => (
  <div className="relative py-12 overflow-hidden"
    style={{
      background: 'linear-gradient(180deg, #051426 0%, #0A2340 15%, #0A2340 85%, #051426 100%)',
    }}
  >

    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">

        <p className="text-[13px] font-bold tracking-[0.12em] uppercase text-offwhite/30 whitespace-nowrap flex-shrink-0 font-body">
          Trusted by tradespeople across the UK
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 flex-1">
          {['Gas Safe Registered', 'NICEIC Approved', 'FMB Member', 'TrustMark Certified', 'CHAS Registered'].map((badge) => (
            <span key={badge} className="text-[12px] font-bold tracking-[0.08em] uppercase text-offwhite/25 whitespace-nowrap font-display">
              {badge}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 flex-shrink-0">
          {[
            { metric: '98.7%', label: 'Calls answered' },
            { metric: '£4,200', label: 'Avg. revenue recovered' },
            { metric: '14 min', label: 'Avg. setup time' },
          ].map(({ metric, label }) => (
            <div key={metric} className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
              <span className="font-mono text-[14px] font-bold text-orange-soft">{metric}</span>
              <span className="text-[11px] text-offwhite/35 font-body">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  </div>
);

// ─── Pain Points ──────────────────────────────────────────────────────────────
const PainPoints = () => (
  <Section bg="gray" id="pain">
    <FadeUp className="mb-16 max-w-3xl">
      <Badge>The Cost of Doing Nothing</Badge>
      <h2
        className="font-display font-bold text-offwhite"
        style={{ fontSize: 'clamp(2.5rem, 5.5vw, 5rem)', letterSpacing: '-0.025em', lineHeight: 0.95 }}
      >
        Every missed call is money{' '}
        <span className="text-offwhite/30">walking out the door.</span>
      </h2>
    </FadeUp>

    <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-start">

      <FadeUp delay={0} className="md:col-span-1">
        <div className="relative rounded-card p-8 overflow-hidden h-full min-h-[280px]" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.4)' }}>
          <div className="absolute -bottom-4 -right-4 opacity-[0.07] pointer-events-none">
            <StatusGauge value={67} label="" metric="" size="lg" color="orange" />
          </div>
          <div className="relative z-10">
            <div className="font-display font-bold mb-3 leading-none" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', color: '#FF6B2B', letterSpacing: '-0.03em' }}>£4,200</div>
            <p className="text-[13px] font-bold uppercase tracking-[0.10em] text-orange-soft/60 mb-3 font-body">Per year, per tradesperson</p>
            <p className="text-offwhite/50 text-[15px] leading-relaxed">Average annual revenue lost to missed calls. That's nearly £350 every single month walking straight to your competitor.</p>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={80} className="md:col-span-1 md:mt-10">
        <div className="relative rounded-card p-8 overflow-hidden min-h-[280px]" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.4)' }}>
          <div className="absolute -bottom-4 -right-4 opacity-[0.07] pointer-events-none">
            <StatusGauge value={27} label="" metric="" size="lg" color="orange" />
          </div>
          <div className="relative z-10">
            <div className="font-display font-bold mb-3 leading-none" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', color: '#FF6B2B', letterSpacing: '-0.03em' }}>27%</div>
            <p className="text-[13px] font-bold uppercase tracking-[0.10em] text-orange-soft/60 mb-3 font-body">Never ring back</p>
            <p className="text-offwhite/50 text-[15px] leading-relaxed">Of callers who reach voicemail don't leave a message — and never ring back. They're already calling someone else.</p>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={160} className="md:col-span-1 md:mt-20">
        <div className="relative rounded-card p-8 overflow-hidden min-h-[280px]" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.4)' }}>
          <div className="absolute -bottom-4 -right-4 opacity-[0.07] pointer-events-none">
            <StatusGauge value={60} label="" metric="" size="lg" color="orange" />
          </div>
          <div className="relative z-10">
            <div className="font-display font-bold mb-3 leading-none" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', color: '#FF6B2B', letterSpacing: '-0.03em' }}>3 in 5</div>
            <p className="text-[13px] font-bold uppercase tracking-[0.10em] text-orange-soft/60 mb-3 font-body">Jobs go to first answer</p>
            <p className="text-offwhite/50 text-[15px] leading-relaxed">Jobs are booked by whoever answers first. Speed isn't a nice-to-have — it's the difference between winning and losing the job.</p>
          </div>
        </div>
      </FadeUp>

    </div>
  </Section>
);

// ─── How It Works ─────────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    num: '01',
    icon: Phone,
    title: 'Divert Your Number',
    desc: "Forward your calls to Trade Receptionist when you're busy or on-site. Takes two minutes — no new number, no new SIM.",
  },
  {
    num: '02',
    icon: Mic,
    title: 'We Answer Every Call',
    desc: 'Our AI answers instantly in a natural British voice. It qualifies the lead, checks your availability, and books the job.',
  },
  {
    num: '03',
    icon: MessageSquare,
    title: 'You Get a WhatsApp Summary',
    desc: 'Seconds after every call, you receive a WhatsApp with the caller\'s name, job type, postcode, and urgency. Nothing slips through.',
  },
];

const HowItWorks = () => (
  <Section id="how-it-works" bg="white">
    <FadeUp className="mb-16 max-w-2xl">
      <Badge>Three Steps to Zero Missed Calls</Badge>
      <h2
        className="font-display font-bold text-offwhite"
        style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.02em', lineHeight: 0.97 }}
      >
        Up and running in{' '}
        <span style={{ color: '#FF6B2B', fontStyle: 'italic' }}>14 minutes.</span>
      </h2>
    </FadeUp>

    <div className="relative">
      {/* Step connector — dotted path, not a solid line */}
      <div className="hidden md:block absolute top-[52px] left-[16.66%] right-[16.66%] pointer-events-none"
        style={{ height: '2px', background: 'repeating-linear-gradient(90deg, rgba(255,107,43,0.35) 0px, rgba(255,107,43,0.35) 4px, transparent 4px, transparent 12px)' }} />

      <div className="grid md:grid-cols-3 gap-12 md:gap-8 lg:gap-14 relative z-10">
        {HOW_STEPS.map((step, i) => (
          <FadeUp key={i} delay={i * 100} className="flex flex-col items-start">
            <div
              className="w-[56px] h-[56px] rounded-full flex items-center justify-center mb-8 relative"
              style={{
                background: i === 0 ? 'linear-gradient(135deg, #FF6B2B, #FF8C55)' : 'rgba(255,255,255,0.06)',
                boxShadow: i === 0 ? '0 0 24px rgba(255,107,43,0.4)' : '0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="font-display font-bold leading-none"
                style={{ fontSize: '20px', color: i === 0 ? '#ffffff' : 'rgba(255,107,43,0.7)', letterSpacing: '-0.02em' }}
              >
                {step.num}
              </span>
            </div>

            <step.icon className="w-6 h-6 text-orange-soft/50 mb-4" />

            <h3
              className="font-display font-bold text-offwhite mb-3"
              style={{ fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', letterSpacing: '-0.01em' }}
            >
              {step.title}
            </h3>
            <p className="text-offwhite/50 leading-relaxed text-[15px] max-w-xs">{step.desc}</p>
          </FadeUp>
        ))}
      </div>
    </div>
  </Section>
);

// ─── ROI Section ──────────────────────────────────────────────────────────────
const ROISection = () => (
  <Section id="roi" bg="gray">
    <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
      <FadeUp className="order-2 lg:order-1">
        <React.Suspense fallback={<LazyFallback />}>
          <Calculator />
        </React.Suspense>
      </FadeUp>
      <FadeUp delay={80} className="order-1 lg:order-2">
        <Badge>Calculate Your Losses</Badge>
        <h2
          className="font-display font-bold text-offwhite mb-6"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
        >
          See exactly what you're{' '}
          <span className="text-offwhite/35">losing every month.</span>
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
    <div className="text-center mb-14">
      <Badge color="blue">The Honest Comparison</Badge>
      <h2
        className="font-display font-bold text-offwhite"
        style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
      >
        Trade Receptionist vs. the alternatives.
      </h2>
      <p className="text-[17px] text-offwhite/45 mt-4 max-w-xl mx-auto">
        Why pay more, or lose jobs to voicemail, when you can have a 24/7 expert for less than a tank of diesel?
      </p>
    </div>

    <div className="overflow-x-auto pb-4">
      <div className="min-w-[760px] rounded-card overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(2,13,24,0.4)' }}>
        <div className="grid grid-cols-5 gap-0">
          <div className="p-5" style={{ background: 'rgba(255,255,255,0.02)' }} />
          <div className="p-5 text-center" style={{ background: 'rgba(255,107,43,0.10)' }}>
            <span className="font-display font-bold text-[15px] text-offwhite block">Trade Receptionist</span>
            <span className="text-[11px] text-orange-soft/60 font-body">from £29/mo</span>
          </div>
          {['Live Receptionist', 'Virtual PA', 'Voicemail'].map((col) => (
            <div key={col} className="p-5 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <span className="font-display font-bold text-[14px] text-offwhite/30 block">{col}</span>
            </div>
          ))}
        </div>

        {[
          { label: 'Always available',    us: true,            them1: false,           them2: false,          them3: true  },
          { label: 'Monthly cost',         us: '£29–£119',      them1: '£800–£2,000',  them2: '£300–£600',    them3: '£0*' },
          { label: 'WhatsApp summaries',   us: true,            them1: false,           them2: false,          them3: false },
          { label: 'Trade knowledge',      us: true,            them1: false,           them2: false,          them3: false },
          { label: 'Setup time',           us: '14 minutes',    them1: '2–4 weeks',     them2: '1–2 weeks',    them3: 'Instant' },
          { label: 'Spam filtering',       us: true,            them1: false,           them2: false,          them3: false },
          { label: 'No contract',          us: true,            them1: false,           them2: false,          them3: true  },
          { label: 'UK-based voice',       us: true,            them1: true,            them2: true,           them3: false },
        ].map((row, i) => {
          const cells = [row.us, row.them1, row.them2, row.them3];
          const bg = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)';
          return (
            <div key={i} className="grid grid-cols-5 gap-0 items-center">
              <div className="p-4 pl-5 font-body text-[14px] text-offwhite/55" style={{ background: bg }}>{row.label}</div>
              {cells.map((val, j) => (
                <div key={j} className="p-4 flex justify-center items-center" style={{ background: j === 0 ? 'rgba(255,107,43,0.06)' : bg }}>
                  {val === true ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: j === 0 ? 'rgba(255,107,43,0.2)' : 'rgba(255,255,255,0.06)' }}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${j === 0 ? 'text-orange-soft' : 'text-offwhite/25'}`} />
                    </div>
                  ) : val === false ? (
                    <XCircle className="w-4 h-4 text-offwhite/15" />
                  ) : (
                    <span className={`text-[13px] font-semibold font-body ${j === 0 ? 'text-orange-soft' : 'text-offwhite/30'}`}>{val as string}</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>

    <p className="text-[12px] text-offwhite/20 text-center mt-4 font-body">
      * Voicemail appears "free" but costs an average of £4,200/year in missed jobs.
    </p>
  </Section>
);

// ─── Demo Section ─────────────────────────────────────────────────────────────
const DemoSection = () => (
  <Section id="demo" bg="gray">
    <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
      <div>
        <Badge>Hear It in Action</Badge>
        <h2
          className="font-display font-bold text-offwhite mb-5 leading-[1.1]"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', letterSpacing: '-0.02em' }}
        >
          A real call, handled{' '}
          <span style={{ color: '#FF6B2B', fontStyle: 'italic' }}>perfectly.</span>
        </h2>
        <p className="text-[17px] text-offwhite/60 mb-8 leading-relaxed">
          Listen to Trade Receptionist handle a real boiler repair enquiry — from greeting to job booked, in under 90 seconds.
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

        <React.Suspense fallback={<LazyFallback />}>
          <AudioPlayer />
        </React.Suspense>
      </div>
    </div>
  </Section>
);

// ─── Use Cases ────────────────────────────────────────────────────────────────
const TRADE_ITEMS = [
  { icon: Droplets, name: 'Plumbers',      label: 'Emergency triage',       num: '01' },
  { icon: Zap,      name: 'Electricians',  label: 'Quote qualification',    num: '02' },
  { icon: Wrench,   name: 'HVAC',          label: 'Maintenance booking',    num: '03' },
  { icon: Hammer,   name: 'Builders',      label: 'Site coordination',      num: '04' },
];

const UseCases = () => (
  <Section bg="white">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
      <div>
        <Badge>Built for Your Trade</Badge>
        <h2
          className="font-display font-bold text-offwhite"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          Whatever you fix,{' '}
          <span className="text-offwhite/35">we answer.</span>
        </h2>
      </div>
      <p className="text-[15px] text-offwhite/45 max-w-xs md:text-right leading-relaxed">
        Customised for each trade — the AI knows your job types, pricing, and postcode areas.
      </p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {TRADE_ITEMS.map((trade, i) => (
        <FadeUp
          key={i}
          delay={i * 60}
          className="group relative rounded-card p-6 overflow-hidden cursor-default spotlight-card"
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
          }}
        >
          <div
            className="absolute inset-0 rounded-card"
            style={{
              background: 'rgba(255,255,255,0.04)',
              transition: 'background 200ms ease',
            }}
          />
          {/* Hover glow layer */}
          <div
            className="absolute inset-0 rounded-card opacity-0 group-hover:opacity-100"
            style={{
              background: 'rgba(255,107,43,0.05)',
              transition: 'opacity 200ms ease',
            }}
          />

          <div className="relative z-10">
            {/* Number — subtle background anchor */}
            <div
              className="font-display font-bold leading-none select-none mb-4"
              style={{
                fontSize: '3.5rem',
                color: 'rgba(255,255,255,0.06)',
                letterSpacing: '-0.04em',
              }}
              aria-hidden="true"
            >
              {trade.num}
            </div>

            <trade.icon
              className="w-6 h-6 mb-3 text-orange-soft/50 group-hover:text-orange-soft"
              style={{ transition: 'color 200ms ease' }}
            />
            <h3
              className="font-display font-bold text-offwhite mb-1 tracking-tight"
              style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.3rem)' }}
            >
              {trade.name}
            </h3>
            <p className="text-[12px] text-offwhite/35 tracking-wide">{trade.label}</p>
          </div>
        </FadeUp>
      ))}
    </div>
  </Section>
);

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Phone,
    num: '01',
    title: 'Always-On Call Answering',
    outcome: "Never miss a job while you're on-site",
    desc: 'Trade Receptionist answers every call instantly — 24/7, including weekends and bank holidays. No more voicemail, no more missed work.',
    visual: (
      <div className="rounded-card p-6" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-offwhite/30 mb-4 font-body">Calls this week</p>
        <div className="flex items-end gap-1.5 h-16">
          {[40, 65, 45, 80, 55, 90, 72].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 5 ? 'linear-gradient(180deg, #FF8C55, #FF6B2B)' : 'rgba(255,107,43,0.20)' }} />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <span key={i} className="flex-1 text-center text-[10px] text-offwhite/20 font-body">{d}</span>
          ))}
        </div>
        <div className="flex items-baseline gap-1 mt-4">
          <span className="font-display font-bold text-offwhite" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>34</span>
          <span className="text-[12px] text-offwhite/35 font-body">calls answered this week</span>
        </div>
      </div>
    ),
  },
  {
    icon: MessageSquare,
    num: '02',
    title: 'Instant WhatsApp Summaries',
    outcome: 'Wake up to every lead, captured and ready',
    desc: "Within seconds of every call, you'll receive a WhatsApp with the caller's name, job type, postcode, and urgency level. Check it in 10 seconds between jobs.",
    visual: (
      <div className="rounded-card p-6" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-offwhite/30 mb-4 font-body">WhatsApp message</p>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] font-bold text-orange-soft mb-2 font-display">New Job Enquiry · 14:32</p>
          <div className="space-y-1 text-[13px] text-offwhite/60 font-body">
            <p><span className="text-offwhite/30">Name:</span> Mrs. Helen Briggs</p>
            <p><span className="text-offwhite/30">Job:</span> Boiler service + repair</p>
            <p><span className="text-offwhite/30">Area:</span> SW11 3RL</p>
            <p><span className="text-offwhite/30">Urgency:</span> <span className="text-orange-soft">This week</span></p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    num: '03',
    title: 'Smart Spam Filtering',
    outcome: 'Only real jobs reach your diary',
    desc: 'Cold callers, PPI claims, and insurance scams are politely deflected before they waste your time. You only hear about genuine job enquiries.',
    visual: (
      <div className="rounded-card p-6" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-offwhite/30 mb-4 font-body">Today's calls</p>
        <div className="space-y-2">
          {[
            { type: 'Job Enquiry', caller: 'Tom Baker', passed: true },
            { type: 'Spam call', caller: 'Marketing Co.', passed: false },
            { type: 'Emergency', caller: 'Mrs. Patel', passed: true },
            { type: 'Cold call', caller: 'Insurance Ltd', passed: false },
          ].map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <p className="text-[12px] font-bold text-offwhite/70 font-display">{c.caller}</p>
                <p className="text-[10px] text-offwhite/25 font-body">{c.type}</p>
              </div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: c.passed ? 'rgba(255,107,43,0.15)' : 'rgba(255,255,255,0.04)' }}>
                {c.passed
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-orange-soft" />
                  : <XCircle className="w-3.5 h-3.5 text-offwhite/15" />
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Calendar,
    num: '04',
    title: 'Diary Integration',
    outcome: 'Bookings confirmed without lifting a finger',
    desc: 'Syncs with Google Calendar, Outlook, and ServiceM8. Jobs are booked into your actual free slots — no double-booking, no admin.',
    visual: (
      <div className="rounded-card p-6" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-offwhite/30 mb-4 font-body">This Thursday</p>
        <div className="space-y-2">
          {[
            { time: '08:00', job: 'Boiler service — Mrs. Andrews', confirmed: true },
            { time: '10:30', job: 'Emergency leak — SW4 9HE', confirmed: true },
            { time: '13:00', job: 'Bathroom quote — Tom H.', confirmed: true },
          ].map((slot, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="font-mono text-[11px] text-orange-soft/60 flex-shrink-0">{slot.time}</span>
              <span className="text-[12px] text-offwhite/60 font-body flex-1 truncate">{slot.job}</span>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,107,43,0.15)' }}>
                <CheckCircle2 className="w-3 h-3 text-orange-soft" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const Features = ({ onWaitlist }: { onWaitlist: () => void }) => (
  <Section bg="gray" id="features">
    <FadeUp className="mb-20 max-w-xl">
      <Badge>Built for Tradespeople</Badge>
      <h2
        className="font-display font-bold text-offwhite"
        style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
      >
        What you actually get.
      </h2>
    </FadeUp>

    <div className="space-y-24">
      {FEATURES.map((feat, i) => (
        <FadeUp key={i} delay={0} className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
            <div className="flex items-center gap-3 mb-5">
              <span className="font-display font-bold text-[13px] tracking-[0.08em]" style={{ color: 'rgba(255,107,43,0.45)' }}>{feat.num}</span>
              <feat.icon className="w-5 h-5 text-orange-soft/60" />
            </div>
            <h3
              className="font-display font-bold text-offwhite mb-2"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
            >
              {feat.title}
            </h3>
            <p className="text-orange-soft text-[14px] font-semibold mb-4 font-body">{feat.outcome}</p>
            <p className="text-offwhite/50 leading-relaxed text-[16px] mb-8 max-w-md font-body">{feat.desc}</p>
          </div>
          <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
            {feat.visual}
          </div>
        </FadeUp>
      ))}
    </div>

    <FadeUp className="text-center mt-20">
      <Button variant="primary" size="lg" onClick={onWaitlist}>
        Start Free Trial
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </FadeUp>
  </Section>
);

// ─── Pricing ──────────────────────────────────────────────────────────────────
const Pricing = ({ onWaitlist }: { onWaitlist: () => void }) => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const plans: PricingTier[] = [
    {
      name: 'Starter',
      price: billing === 'monthly' ? '£29' : '£24',
      period: 'per month (+VAT)',
      description: 'Solo traders',
      features: ['Up to 100 Calls/Month', '24/7 Answering', 'SMS Summaries', 'Google Calendar Sync'],
      buttonText: 'Start Free Trial',
    },
    {
      name: 'Pro',
      price: billing === 'monthly' ? '£59' : '£49',
      period: 'per month (+VAT)',
      description: 'Busy professionals',
      isPopular: true,
      features: ['Up to 300 Calls/Month', 'Everything in Starter', 'Call Transfer Logic', 'CRM Integration', 'Priority Support'],
      buttonText: 'Start Free Trial',
    },
    {
      name: 'Agency',
      price: billing === 'monthly' ? '£119' : '£99',
      period: 'per month (+VAT)',
      description: 'Growing teams',
      features: ['Unlimited Calls', 'Everything in Pro', 'Multiple Departments', 'White-Label Dashboard', 'Dedicated Account Mgr'],
      buttonText: 'Start Free Trial',
    },
  ];

  return (
    <Section id="pricing" bg="white">
      <div className="text-center mb-14">
        <Badge>Simple, Honest Pricing</Badge>
        <h2
          className="font-display font-bold text-offwhite mb-4"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
        >
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
              className={`px-7 py-2.5 rounded-full text-[13px] font-bold transition-colors duration-300 ${
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
            className={`snap-center flex-shrink-0 w-[82vw] md:w-auto relative flex flex-col rounded-card p-8 ${
              plan.isPopular
                ? 'popular-ring md:scale-[1.04]'
                : 'hover:-translate-y-1'
            }`}
            style={{
              background: plan.isPopular
                ? 'linear-gradient(160deg, rgba(255,107,43,0.12) 0%, rgba(255,107,43,0.04) 100%)'
                : 'rgba(255,255,255,0.05)',
              transition: 'transform 300ms cubic-bezier(0.34,1.2,0.64,1), box-shadow 300ms cubic-bezier(0.34,1.2,0.64,1)',
            }}
          >
            {/* Popular badge */}
            {plan.isPopular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.10em] text-white"
                style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)', boxShadow: '0 4px 16px rgba(255,107,43,0.4)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
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
        <h2
          className="font-display font-bold text-offwhite"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
        >
          Frequently asked questions
        </h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-card overflow-hidden"
            style={{
              background: openIndex === i ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
              boxShadow: openIndex === i
                ? '0 0 0 1px rgba(255,107,43,0.15)'
                : '0 0 0 1px rgba(255,255,255,0.05)',
              transition: 'background-color 300ms ease, box-shadow 300ms ease',
            }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-6 text-left focus:outline-none group"
              aria-expanded={openIndex === i}
            >
              <span className="font-display font-semibold text-[16px] text-offwhite pr-8 leading-snug">
                {faq.question}
              </span>
              <ChevronDown
                className={`w-5 h-5 flex-shrink-0 transition-[transform,color] duration-300 ${
                  openIndex === i
                    ? 'rotate-180 text-orange-soft'
                    : 'text-offwhite/30 group-hover:text-offwhite/60'
                }`}
              />
            </button>

            <div
              className="accordion-body"
              style={{ maxHeight: openIndex === i ? '400px' : '0' }}
            >
              <div className="px-6 pb-6 text-[15px] text-offwhite/55 leading-relaxed">
                {faq.answer}
              </div>
            </div>
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

      <Badge color="blue">Your Competition Is Already Using This</Badge>

      <h2
        className="font-display font-bold text-offwhite mb-6 leading-[1.0] mt-4"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.03em' }}
      >
        Every call you miss today{' '}
        <span style={{ color: '#FF6B2B', fontStyle: 'italic' }}>is a job they book tomorrow.</span>
      </h2>

      <p className="text-[18px] md:text-xl text-offwhite/50 mb-10 leading-relaxed max-w-2xl mx-auto">
        Join 500+ UK tradespeople who stopped losing money to voicemail. While you're reading this, a competitor is answering their calls.
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

      <div className="flex flex-wrap justify-center gap-6 mt-6 text-[13px] text-offwhite/25 font-body">
        {['⭐ 4.9/5 rating', 'Setup in 14 minutes', 'Cancel anytime', 'No card required'].map(t => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  </section>
);

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = ({ onWaitlist }: { onWaitlist: () => void }) => (
  <footer className="bg-void pt-20 pb-12">
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
      <div className="grid md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-2">
          <div className="mb-6">
            <Logo height={100} />
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
          &copy; 2026 Trade Receptionist Ltd. All rights reserved. Registered in England & Wales.
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
      <div className="grain" aria-hidden="true" />
      <Header currentView={currentView} onViewChange={handleViewChange} onWaitlist={toggleWaitlist} />

      <main>
        {currentView === 'home' ? (
          <>
            <Hero onWaitlist={toggleWaitlist} />
            <SocialProof />
            <PainPoints />
            <ROISection />
            <ComparisonSection />
            <DemoSection />
            <HowItWorks />
            <UseCases />
            <Features onWaitlist={toggleWaitlist} />
            <React.Suspense fallback={<LazyFallback />}>
              <Testimonials />
            </React.Suspense>
            <Pricing onWaitlist={toggleWaitlist} />
            <FAQ />
            <React.Suspense fallback={<LazyFallback />}>
              <ContactUs />
            </React.Suspense>
            <FinalCTA onWaitlist={toggleWaitlist} />
          </>
        ) : (
          <React.Suspense fallback={<LazyFallback />}>
            <BookDemo />
          </React.Suspense>
        )}
      </main>

      <Footer onWaitlist={toggleWaitlist} />
      <StickyBottomBar onWaitlist={toggleWaitlist} />
      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
    </div>
  );
};

export default App;
