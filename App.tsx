import React, { useState, useEffect, useRef } from 'react';
import { useParallax } from './src/hooks/useParallax';
import { useScrollAnimation } from './src/hooks/useScrollAnimation';
const FeaturesGrid      = React.lazy(() => import('./components/FeaturesGrid'));
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
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ─── Animated Counter ────────────────────────────────────────────────────────
const AnimatedCounter: React.FC<{
  endValue: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}> = ({ endValue, prefix = '', suffix = '', decimals = 0, duration = 1600 }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(prefix + (decimals > 0 ? (0).toFixed(decimals) : '0') + suffix);
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
        const formatted = decimals > 0
          ? current.toFixed(decimals)
          : Math.round(current).toLocaleString('en-GB');
        setDisplay(prefix + formatted + suffix);
        if (progress < 1) requestAnimationFrame(tick);
        else {
          const final = decimals > 0 ? endValue.toFixed(decimals) : endValue.toLocaleString('en-GB');
          setDisplay(prefix + final + suffix);
        }
      };
      requestAnimationFrame(tick);
      obs.disconnect();
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [endValue, duration, decimals, prefix, suffix]);

  return <span ref={spanRef}>{display}</span>;
};

import { Button, Section, Badge, Card } from './components/UI';
import { BlueprintGrid } from './components/BlueprintGrid';
import { Logo } from './components/Logo';
const WaitlistModal     = React.lazy(() => import('./components/WaitlistModal').then(m => ({ default: m.WaitlistModal })));
const StripeCheckoutModal = React.lazy(() => import('./components/StripeCheckoutModal').then(m => ({ default: m.StripeCheckoutModal })));
import { FAQItem, PricingTier } from './types';

// Lazy-loaded below-fold components — keeps initial JS bundle lean
const AudioPlayer  = React.lazy(() => import('./components/AudioPlayer').then(m => ({ default: m.AudioPlayer })));
const Calculator   = React.lazy(() => import('./components/Calculator').then(m => ({ default: m.Calculator })));
const Testimonials = React.lazy(() => import('./components/Testimonials').then(m => ({ default: m.Testimonials })));
const BookDemo     = React.lazy(() => import('./components/BookDemo').then(m => ({ default: m.BookDemo })));

const LazyFallback = ({ height = 200 }: { height?: number }) => (
  <div className="flex justify-center items-center" style={{ height }}>
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
    { label: 'Calculator',  target: 'roi' },
    { label: 'Features',    target: 'features' },
    { label: 'Proof',       target: 'comparison' },
    { label: 'Pricing',     target: 'pricing' },
    { label: 'Book a Demo', target: 'book-demo' },
  ];

  const showFullChrome = currentView !== 'home' || scrolled;

  return (
    <nav
      className="fixed top-0 w-full z-50"
      style={{
        background: showFullChrome
          ? 'rgba(5,20,38,0.82)'
          : 'transparent',
        backdropFilter: showFullChrome ? 'blur(24px)' : 'none',
        WebkitBackdropFilter: showFullChrome ? 'blur(24px)' : 'none',
        boxShadow: showFullChrome ? '0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(2,13,24,0.3)' : 'none',
        transition: 'background 300ms ease, box-shadow 300ms ease, backdrop-filter 300ms ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between h-14 xl:h-16 items-center">
          {/* Logo */}
          <button
            className="flex-shrink-0 flex items-center focus:outline-none"
            onClick={() => handleNav('hero')}
            aria-label="Trade Receptionist home"
            style={{
              opacity: showFullChrome ? 1 : 0,
              pointerEvents: showFullChrome ? 'auto' : 'none',
              transition: 'opacity 220ms ease',
            }}
          >
            <Logo className="h-20 xl:h-24" />
          </button>

          {/* Desktop nav */}
          <div className={`${showFullChrome ? 'hidden xl:flex' : 'hidden'} items-center gap-8`}>
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
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-orange-soft"
                    style={{ opacity: isActive ? 1 : 0, transition: 'opacity 200ms ease' }}
                  />
                </button>
              );
            })}
          </div>

          {/* Desktop CTAs */}
          <div className={`${showFullChrome ? 'hidden xl:flex' : 'hidden'} items-center gap-3`}>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/login'}>Log in</Button>
            <Button variant="primary" size="sm" onClick={onWaitlist}>
              Start Free Trial
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`xl:hidden text-offwhite/70 hover:text-offwhite p-3 transition-all ${showFullChrome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div
          className="xl:hidden absolute w-full px-6 py-8 menu-slide-down"
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
                className="text-xl font-bold text-left text-offwhite/80 hover:text-offwhite transition-colors w-full py-2"
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
              <Button variant="ghost" fullWidth onClick={() => window.location.href = '/login'}>
                Log in
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
  const { primary: parallax, secondary: cardParallax } = useParallax();

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-24 pb-20 md:pt-36 md:pb-28 xl:pt-40 xl:pb-36"
      style={{
        background:
          'radial-gradient(circle at 18% 42%, rgba(255,166,82,0.08) 0%, transparent 34%),' +
          'radial-gradient(circle at 83% 22%, rgba(255,166,82,0.07) 0%, transparent 28%),' +
          'radial-gradient(circle at 70% 55%, rgba(76,117,182,0.10) 0%, transparent 35%)',
      }}
    >
      <BlueprintGrid />

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, transparent 63%, rgba(100,130,175,0.18) 63%, transparent 64%, transparent 100%),' +
            'linear-gradient(0deg, transparent 0%, transparent 71%, rgba(100,130,175,0.10) 71%, transparent 72%, transparent 100%)',
          maskImage: 'radial-gradient(circle at 70% 38%, black 0%, black 38%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle at 70% 38%, black 0%, black 38%, transparent 72%)',
        }}
      />

      <div className="absolute right-[14%] top-[18%] h-[360px] w-[360px] rounded-full opacity-45 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,155,72,0.22) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="absolute left-[8%] bottom-[12%] h-[320px] w-[320px] rounded-full opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(44,86,148,0.16) 0%, transparent 72%)', filter: 'blur(60px)' }} />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <div className="max-w-[42rem]">
            <div className="mb-10 flex items-center gap-3">
              <div
                className="rounded-[14px] px-3 py-2"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 10px 24px rgba(2,13,24,0.28)',
                }}
              >
                <Logo height={24} />
              </div>
              <div>
                <div className="font-display text-[22px] font-bold leading-tight text-offwhite">Trade Receptionist</div>
                <div className="text-[13px] text-offwhite/45 font-body">The UK&apos;s #1 AI Trade Receptionist</div>
              </div>
            </div>

            <h1
              className="font-display font-bold text-offwhite"
              style={{ fontSize: 'clamp(3.4rem, 6.8vw, 5.65rem)', lineHeight: 0.92, letterSpacing: '-0.055em' }}
            >
              <span className="block whitespace-nowrap">Never miss a call.</span>
              <span className="block whitespace-nowrap">Never lose a job.</span>
            </h1>

            <p className="mt-6 max-w-[34rem] text-[clamp(1.15rem,2vw,1.75rem)] leading-[1.38] text-offwhite/78 font-body">
              Meet Sarah, the AI receptionist that answers every call, books every job, and sends you a WhatsApp summary 24/7. Never miss a lead again.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button variant="primary" size="lg" onClick={onWaitlist} className="animate-pulse-glow">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Hear Sarah in Action
                <Play className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-2 text-[14px] text-offwhite/48 font-body">
              <ShieldCheck className="h-4 w-4 text-offwhite/40" />
              <span>14-day free trial. No card required. Setup in 14 minutes.</span>
            </div>

            <div className="mt-10 max-w-[31rem]">
              <div className="mb-3 text-[62px] leading-none text-[#A46C42] font-display">&ldquo;</div>
              <p className="mt-[-10px] text-[clamp(1.1rem,1.55vw,1.45rem)] leading-[1.45] text-offwhite/85 font-body">
                “Sarah answered 4 calls while I was under a sink last Tuesday. Got 3 jobs booked. Unreal.”
              </p>
              <p className="mt-4 text-[15px] text-offwhite/45 font-body">- Mark T., Plumber, South London</p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[650px]">
            <div className="absolute right-[10%] top-[12%] h-[320px] w-[320px] rounded-full opacity-55 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,166,82,0.26) 0%, transparent 70%)', filter: 'blur(54px)' }} />

            <div className="relative mx-auto h-[640px] w-full max-w-[540px] md:h-[720px]">
              <div
                className="absolute right-[8%] top-[8%] z-20"
                style={{
                  transform: `translate(${parallax.x}px, ${parallax.y}px) rotate(9deg)`,
                  transition: 'transform 100ms ease-out',
                }}
              >
                <div
                  className="relative overflow-hidden rounded-[42px]"
                  style={{
                    width: 'min(100vw - 5rem, 350px)',
                    background: '#0B1629',
                    border: '7px solid rgba(19,26,40,0.96)',
                    boxShadow: '0 34px 80px rgba(2,13,24,0.72), 0 0 0 1px rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="absolute inset-x-0 top-0 z-20 mx-auto h-8 w-36 rounded-b-[20px] bg-[#05080f]" />
                  <div className="min-h-[560px] bg-[linear-gradient(180deg,#0f1727_0%,#1d2738_100%)] px-7 pb-7 pt-12">
                    <div className="flex items-center justify-between text-[12px] text-offwhite/72">
                      <span>9:41</span>
                      <div className="flex gap-1 text-offwhite/50">
                        <span>◦</span>
                        <span>◦</span>
                        <span>◦</span>
                      </div>
                    </div>

                    <div className="mt-11 text-center">
                      <h3 className="font-display text-[31px] font-medium leading-[1.15] text-offwhite">
                        Emergency Boiler Repair
                        <br />
                        - Dave Hendricks
                      </h3>
                    </div>

                    <div
                      className="mx-auto mt-10 rounded-[24px] px-6 py-7 text-center"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.08) 100%)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
                      }}
                    >
                      <div className="relative mx-auto mb-5 h-24 w-24">
                        <img
                          src="/assets/generated/testimonials/avatar-3.png"
                          alt="Caller avatar"
                          className="h-full w-full rounded-full object-cover"
                        />
                        <div className="absolute bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1d2738] bg-[#31c95d]">
                          <Phone className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <div className="text-[33px] leading-none text-offwhite">Incoming Call...</div>
                      <div className="mt-5 flex items-center justify-center gap-3">
                        <div className="rounded-full bg-white/12 px-4 py-2 text-[14px] text-offwhite/88">View Notes</div>
                        <div className="rounded-full bg-white/12 px-4 py-2 text-[14px] text-offwhite/88">Call Back</div>
                      </div>
                    </div>

                    <div className="mt-9 space-y-3">
                      <button
                        className="w-full rounded-full px-5 py-4 text-[18px] font-semibold text-[#1b1b1b]"
                        style={{ background: 'linear-gradient(135deg, #F97316 0%, #F4A261 100%)' }}
                        onClick={onWaitlist}
                      >
                        Start Free Trial
                      </button>
                      <div className="w-full rounded-full bg-white/10 px-5 py-4 text-center text-[18px] text-offwhite/86">
                        Call Back
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute left-[4%] top-[13%] z-30 hidden md:block"
                style={{
                  transform: `translate(${cardParallax.x}px, ${cardParallax.y}px) rotate(-6deg)`,
                  transition: 'transform 100ms ease-out',
                }}
              >
                <div
                  className="rounded-[22px] px-4 py-4 backdrop-blur-xl"
                  style={{
                    width: '208px',
                    background: 'rgba(130,143,165,0.28)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 14px 30px rgba(2,13,24,0.38)',
                  }}
                >
                  <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-white">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#32d05f]">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    WhatsApp
                  </div>
                  <p className="text-[13px] leading-[1.45] text-offwhite/88 font-body">
                    Sarah answered!
                    <br />
                    Dave Hendricks: Emergency Boiler Repair.
                    <br />
                    He&apos;s available Tuesday 9am.
                    <br />
                    Confirmed via calendar.
                  </p>
                </div>
              </div>

              <div
                className="absolute left-[0%] top-[47%] z-30 hidden md:block"
                style={{
                  transform: `translate(${cardParallax.x}px, ${cardParallax.y}px) rotate(-8deg)`,
                  transition: 'transform 100ms ease-out',
                }}
              >
                <div
                  className="rounded-[22px] px-4 py-4 backdrop-blur-xl"
                  style={{
                    width: '214px',
                    background: 'rgba(130,143,165,0.24)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 14px 30px rgba(2,13,24,0.38)',
                  }}
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/10 text-offwhite/80">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="text-[18px] leading-tight text-offwhite">Emergency Boiler Repair</div>
                  <div className="mt-3 text-[13px] leading-[1.45] text-offwhite/60 font-body">
                    Wednesday, Jowguler St, 2021
                    <br />
                    3:00 - 3:30 pm
                  </div>
                  <div className="mt-3 h-1 w-12 rounded-full bg-[#F4A261]" />
                </div>
              </div>

              <div className="absolute bottom-[17%] right-[2%] z-30 hidden md:block">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-[26px]"
                  style={{
                    background: 'linear-gradient(135deg, #42e96a 0%, #20c14e 100%)',
                    boxShadow: '0 18px 48px rgba(66,233,106,0.36), 0 0 26px rgba(66,233,106,0.28)',
                  }}
                >
                  <MessageSquare className="h-11 w-11 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Social Proof Strip ───────────────────────────────────────────────────────
const SOCIAL_STATS = [
  { endValue: 98.7, decimals: 1, suffix: '%', label: 'Answer rate', icon: Phone },
  { endValue: 4200, prefix: '£', label: 'Revenue recovered/yr', icon: Banknote },
  { endValue: 500,  suffix: '+', label: 'UK tradespeople', icon: Wrench },
  { endValue: 14,   suffix: ' min', label: 'Avg. setup time', icon: Clock },
];

const SocialProof = () => (
  <div
    className="relative py-14 overflow-hidden"
    style={{
      background:
        'linear-gradient(180deg, rgba(5,20,38,0) 0%, rgba(9,29,54,0.80) 20%, rgba(9,29,54,0.80) 80%, rgba(5,20,38,0) 100%)',
    }}
  >
    {/* Subtle blueprint grid overlay */}
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.025]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(153,203,255,1) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(153,203,255,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />

    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">

      {/* Label */}
      <p className="text-center text-[11px] font-bold tracking-[0.14em] uppercase text-offwhite/25 mb-10 font-body">
        Trusted by UK tradespeople
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {SOCIAL_STATS.map(({ endValue, decimals, prefix, suffix, label, icon: Icon }, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 py-6 px-4 rounded-card"
            style={{
              background: 'rgba(255,255,255,0.04)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 4px 24px rgba(2,13,24,0.3)',
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(255,107,43,0.12)',
                boxShadow: '0 0 0 1px rgba(255,107,43,0.18)',
              }}
            >
              <Icon className="w-4 h-4 text-orange-soft" />
            </div>
            <div className="text-center">
              <div
                className="font-mono font-bold leading-none mb-1"
                style={{
                  fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)',
                  letterSpacing: '-0.02em',
                  color: '#FF8C55',
                  filter: 'drop-shadow(0 0 12px rgba(255,107,43,0.4))',
                }}
              >
                <AnimatedCounter
                  endValue={endValue}
                  decimals={decimals}
                  prefix={prefix}
                  suffix={suffix}
                  duration={1200}
                />
              </div>
              <p className="text-[11px] font-semibold text-offwhite/35 font-body leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  </div>
);

// ─── Pain Points ──────────────────────────────────────────────────────────────
const PAIN_STATS = [
  {
    value: '£4,200',
    label: 'lost every year to missed calls',
    sub: 'avg. UK tradesperson',
    detail: "That's a van service, a week's holiday, or new tools. Gone.",
  },
  {
    value: '27%',
    label: 'of callers never ring back',
    sub: 'when they hit voicemail',
    detail: 'They called your competitor instead. You never knew.',
  },
  {
    value: '3 in 5',
    label: 'jobs go to whoever answers first',
    sub: 'speed wins the work',
    detail: "Being on a job costs you the next one. Not anymore.",
  },
];

// ─── Use Cases ────────────────────────────────────────────────────────────────
const USE_CASES = [
  {
    trade: 'Plumbers',
    headline: 'Never lose a call from under the sink.',
    desc: "You can't answer mid-job. Sarah does. Every enquiry captured, every booking confirmed — while your hands stay clean.",
    image: '/assets/generated/use-cases/plumber.webp',
  },
  {
    trade: 'Electricians',
    headline: 'Answer every call from the fuseboard.',
    desc: "Working in a live panel? Sarah picks up. She qualifies the job, books the slot, sends you the details when you're clear.",
    image: '/assets/generated/use-cases/electrician.webp',
  },
  {
    trade: 'Builders',
    headline: 'Jobs fill your diary while you fill the skip.',
    desc: "On-site noise means missed calls. Sarah handles every enquiry professionally — you get a full diary without the phone tag.",
    image: '/assets/generated/use-cases/builder.webp',
  },
  {
    trade: 'HVAC',
    headline: 'Emergency call-outs answered instantly.',
    desc: "Boiler breakdowns don't wait for you to finish the current job. Sarah routes urgent calls to you and books the rest in.",
    image: '/assets/generated/use-cases/hvac.webp',
  },
];

const UseCases = () => {
  const ref = useScrollAnimation();
  return (
    <Section bg="white" id="trades">
      <div ref={ref} data-animate>
        <FadeUp className="mb-14 max-w-2xl">
          <Badge>Built for Every Trade</Badge>
          <h2
            className="font-display font-bold text-offwhite"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
          >
            Works on every{' '}
            <span style={{
              background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontStyle: 'italic',
            }}>job site.</span>
          </h2>
        </FadeUp>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {USE_CASES.map(({ trade, headline, desc, image }, i) => (
            <FadeUp key={i} delay={i * 80}>
              <div
                className="rounded-card overflow-hidden flex flex-col h-full"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.5)',
                  transition: 'transform 300ms cubic-bezier(0.34,1.2,0.64,1), box-shadow 300ms ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(255,107,43,0.20), 0 20px 50px rgba(2,13,24,0.6)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.5)';
                }}
              >
                {/* Photo */}
                <div className="relative overflow-hidden" style={{ paddingBottom: '65%' }}>
                  <img
                    src={image}
                    alt={trade}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: 'brightness(0.85) saturate(0.9)' }}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(9,29,54,0.9) 100%)' }}
                  />
                  <span
                    className="absolute bottom-3 left-4 font-display font-bold text-[11px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,107,43,0.20)', color: '#ffb59a', boxShadow: '0 0 0 1px rgba(255,107,43,0.25)' }}
                  >
                    {trade}
                  </span>
                </div>

                {/* Text */}
                <div className="p-5 flex flex-col gap-2 flex-1">
                  <h3 className="font-display font-bold text-offwhite text-[15px] leading-snug">{headline}</h3>
                  <p className="text-[13px] text-offwhite/45 font-body leading-relaxed flex-1">{desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </Section>
  );
};

const PainPoints = () => (
  <Section bg="gray" id="pain">
    <FadeUp className="mb-14 max-w-2xl">
      <Badge>The Cost of Doing Nothing</Badge>
      <h2
        className="font-display font-bold text-offwhite"
        style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
      >
        Every missed call is{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontStyle: 'italic',
          }}
        >
          money
        </span>{' '}
        walking out the door.
      </h2>
    </FadeUp>

    <div className="grid md:grid-cols-3 gap-5">
      {PAIN_STATS.map(({ value, label, sub, detail }, i) => (
        <FadeUp key={i} delay={i * 80}>
          <div
            className="rounded-card p-8 flex flex-col gap-4 h-full"
            style={{
              background: 'rgba(255,255,255,0.04)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.4)',
              transition: 'box-shadow 300ms cubic-bezier(0.34,1.2,0.64,1), transform 300ms cubic-bezier(0.34,1.2,0.64,1)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(255,107,43,0.18), 0 20px 60px rgba(2,13,24,0.5)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.4)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            {/* Big stat number */}
            <div
              className="font-display font-bold leading-none"
              style={{
                fontSize: 'clamp(2.75rem, 5vw, 4.25rem)',
                color: '#FF6B2B',
                letterSpacing: '-0.03em',
                filter: 'drop-shadow(0 0 20px rgba(255,107,43,0.45))',
              }}
            >
              {value}
            </div>

            <div>
              <p className="text-offwhite font-semibold text-[16px] mb-1 font-display leading-snug">{label}</p>
              <p className="text-offwhite/30 text-[11px] font-body uppercase tracking-[0.10em]">{sub}</p>
            </div>

            {/* Separator */}
            <div
              className="w-full h-px"
              style={{ background: 'linear-gradient(90deg, rgba(255,107,43,0.25) 0%, transparent 100%)' }}
            />

            <p className="text-[14px] text-offwhite/45 font-body leading-relaxed flex-1">{detail}</p>
          </div>
        </FadeUp>
      ))}
    </div>
  </Section>
);

// ─── How It Works ─────────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    num: '01',
    label: 'Build',
    icon: Phone,
    title: 'Build Your Profile',
    desc: 'Give Sarah your business name, services, pricing, and availability. 14 minutes. No technical knowledge needed.',
    image: '/assets/generated/how-it-works/step-1.webp',
  },
  {
    num: '02',
    label: 'Divert',
    icon: Mic,
    title: 'Divert Your Calls',
    desc: 'Forward your business number to Sarah — or get a dedicated number. She answers every call instantly, 24/7.',
    image: '/assets/generated/how-it-works/step-2.webp',
  },
  {
    num: '03',
    label: 'Focus',
    icon: MessageSquare,
    title: 'Focus on the Job',
    desc: 'Get on with the work. Sarah handles every call, books every appointment, and sends you a WhatsApp summary.',
    image: '/assets/generated/how-it-works/step-3.webp',
  },
];

const HowItWorksStep = ({ step, index }: { step: typeof HOW_STEPS[number]; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          // Slight stagger per step
          setTimeout(() => setFilled(true), index * 200);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  const Icon = step.icon;

  return (
    <div ref={ref} className="flex flex-col items-start">
      {/* Step image */}
      {step.image && (
        <div
          className="w-full rounded-[14px] overflow-hidden mb-6"
          style={{
            boxShadow: filled
              ? '0 0 0 1px rgba(255,107,43,0.25), 0 12px 40px rgba(2,13,24,0.6)'
              : '0 0 0 1px rgba(255,255,255,0.07), 0 8px 24px rgba(2,13,24,0.4)',
            transition: 'box-shadow 600ms ease',
          }}
        >
          <img
            src={step.image}
            alt={step.title}
            loading="lazy"
            width={480}
            height={270}
            className="w-full object-cover"
            style={{ aspectRatio: '16/9', display: 'block' }}
          />
        </div>
      )}

      {/* Step number + icon row */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: filled ? 'linear-gradient(135deg, #FF6B2B, #FF8C55)' : 'rgba(255,255,255,0.06)',
            boxShadow: filled ? '0 0 20px rgba(255,107,43,0.4)' : '0 0 0 1px rgba(255,255,255,0.08)',
            transition: 'background 600ms ease, box-shadow 600ms ease',
          }}
        >
          <span
            className="font-display font-bold leading-none"
            style={{
              fontSize: '16px',
              color: filled ? '#ffffff' : 'rgba(255,107,43,0.6)',
              letterSpacing: '-0.02em',
              transition: 'color 600ms ease',
            }}
          >
            {step.num}
          </span>
        </div>
        <Icon className="w-5 h-5" style={{ color: filled ? '#ffb59a' : 'rgba(240,244,248,0.2)', transition: 'color 400ms ease' }} />
      </div>

      <h3
        className="font-display font-bold text-offwhite mb-3"
        style={{ fontSize: 'clamp(1.2rem, 2vw, 1.5rem)', letterSpacing: '-0.01em', lineHeight: 1.15 }}
      >
        {step.title}
      </h3>

      {/* Animated progress bar */}
      <div className="step-progress-bar w-full mb-4">
        <div className={`step-progress-fill${filled ? ' is-filled' : ''}`} />
      </div>

      <p className="text-offwhite/50 leading-relaxed text-[15px] max-w-xs font-body">{step.desc}</p>
    </div>
  );
};

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
      {/* Step connector */}
      <div className="hidden md:block absolute top-[26px] left-[16.66%] right-[16.66%] pointer-events-none"
        style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(255,107,43,0.15) 15%, rgba(255,107,43,0.45) 50%, rgba(255,107,43,0.15) 85%, transparent 100%)', filter: 'drop-shadow(0 0 4px rgba(255,107,43,0.3))' }} />

      <div className="grid md:grid-cols-3 gap-12 md:gap-8 lg:gap-14 relative z-10">
        {HOW_STEPS.map((step, i) => (
          <React.Fragment key={i}>
            <HowItWorksStep step={step} index={i} />
          </React.Fragment>
        ))}
      </div>
    </div>
  </Section>
);

// ─── ROI Section ──────────────────────────────────────────────────────────────
const ROI_STATS = [
  { value: '£4,200', label: 'avg. lost per year', sublabel: 'to missed calls' },
  { value: '27%', label: 'of callers never', sublabel: 'ring back' },
  { value: '3 in 5', label: 'jobs go to whoever', sublabel: 'answers first' },
];

const ROISection = () => (
  <Section id="roi" bg="gray" className="relative overflow-hidden">
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.10]"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 35%, rgba(255,255,255,0.02) 35%, transparent 36%, transparent 100%)',
      }}
    />

    <FadeUp className="mb-14 mx-auto max-w-4xl text-center">
      <h2
        className="font-display font-bold text-offwhite"
        style={{ fontSize: 'clamp(2.8rem, 5.8vw, 5.4rem)', letterSpacing: '-0.055em', lineHeight: 0.95 }}
      >
        Every missed call is money
        <br />
        walking out the door.
      </h2>
    </FadeUp>

    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,280px)] lg:justify-center lg:gap-14">
      <FadeUp className="lg:justify-self-end">
        <React.Suspense fallback={<LazyFallback height={480} />}>
          <Calculator />
        </React.Suspense>
      </FadeUp>

      <FadeUp delay={80} className="flex flex-col gap-5">
        {ROI_STATS.map(({ value, label, sublabel }, i) => (
          <div
            key={i}
            className="rounded-[22px] p-7 text-center lg:p-8"
            style={{
              background: 'linear-gradient(180deg, rgba(255,250,244,0.98) 0%, rgba(255,255,255,0.98) 100%)',
              boxShadow: '0 0 0 1px rgba(244,162,97,0.60), 0 16px 36px rgba(2,13,24,0.18)',
            }}
          >
            <div
              className="font-display font-bold leading-none mb-3"
              style={{
                fontSize: 'clamp(3.2rem, 5vw, 4.5rem)',
                color: '#F08F45',
                letterSpacing: '-0.05em',
              }}
            >
              {value}
            </div>
            <p className="text-[16px] leading-tight text-[#111827] font-body">{label}</p>
            <p className="text-[16px] leading-tight text-[#111827] font-body">{sublabel}</p>
            {i > 0 && (
              <p className="mt-4 text-[11px] tracking-[0.12em] uppercase text-[#111827]/70 font-body">
                {i === 1 ? 'Speed is the key' : 'Speed wins the work'}
              </p>
            )}
          </div>
        ))}
      </FadeUp>
    </div>
  </Section>
);

// ─── Comparison ───────────────────────────────────────────────────────────────
const PROOF_QUOTES = [
  {
    quote: "Running a busy plumbing firm means I can't answer every call. Since we started using Trade Receptionist, our diary's fuller than ever. No more chasing. No more lost time.",
    name: 'John Davies',
    company: 'JD Plumbing & Heating',
    photo: '/assets/generated/testimonials/avatar-5.png',
    badge: 'Safe',
    badgeStyle: {
      background: '#F3DA34',
      color: '#1f2937',
    },
  },
  {
    quote: "The best decision I made for my electrical business. Sounds professional, and actually books jobs. My evenings back. My bookings up.",
    name: 'David Miller',
    company: 'Miller Electrical',
    photo: '/assets/generated/testimonials/avatar-3.png',
    badge: 'Miller Electrical Services',
    badgeStyle: {
      background: '#ffffff',
      color: '#b91c1c',
    },
  },
  {
    quote: "My diary used to be chaotic. Now Trade Receptionist filters and books jobs for me. No more evenings working.",
    name: 'Sarah Lee',
    company: 'SL Carpentry',
    photo: '/assets/generated/testimonials/avatar-4.png',
    badge: 'TradeVoice',
    badgeStyle: {
      background: '#eef2ff',
      color: '#1d4ed8',
    },
  },
];

const ComparisonSection = () => {
  const ref = useScrollAnimation();
  const comparisonRows = [
    { feature: 'Cost', tradeReceptionist: 'Affordable, flat fee', missedCalls: 'Lost Revenue', voicemail: 'Free, but ineffective', traditional: 'High hourly rates' },
    { feature: 'Availability', tradeReceptionist: '24/7, 365 days', missedCalls: 'Zero', voicemail: 'Limited to message', traditional: 'Business Hours Only' },
    { feature: 'Booking Speed', tradeReceptionist: 'Instant', missedCalls: 'Never', voicemail: 'Delayed', traditional: 'Slow, manual' },
    { feature: 'Job Capture', tradeReceptionist: 'Guaranteed', missedCalls: 'None', voicemail: 'Low', traditional: 'Variable' },
    { feature: 'Setup Time', tradeReceptionist: '<15 Minutes', missedCalls: 'N/A', voicemail: 'Instant', traditional: 'Days/Weeks' },
  ];

  return (
    <Section bg="white" id="comparison" className="relative overflow-hidden">
      <div ref={ref} data-animate>
        <div className="mb-24">
          <div className="mb-3 flex items-start justify-between gap-6">
            <p className="pt-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-offwhite/35 font-body">
              Why UK tradespeople stay
            </p>
            <p className="hidden max-w-[15rem] text-right text-[12px] leading-relaxed text-offwhite/30 font-body md:block">
              100+ professionals who stopped tracking calls and started booking more.
            </p>
          </div>

          <h2
            className="font-display font-bold text-offwhite"
            style={{ fontSize: 'clamp(3rem, 5.5vw, 5.25rem)', letterSpacing: '-0.055em', lineHeight: 0.92 }}
          >
            Trusted by trades across
            <br />
            the UK.
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PROOF_QUOTES.map(({ quote, name, company, photo, badge, badgeStyle }, index) => (
              <div
                key={name}
                data-delay={index}
                className="overflow-hidden rounded-[18px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(18,31,56,0.96) 0%, rgba(33,44,67,0.96) 100%)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 18px 42px rgba(2,13,24,0.34)',
                }}
              >
                <img src={photo} alt={name} className="h-[290px] w-full object-cover object-top" loading="lazy" />
                <div className="p-5">
                  <div className="mb-3 text-[42px] leading-none text-[#F29C5C]">&ldquo;</div>
                  <p className="mt-[-10px] min-h-[140px] text-[15px] leading-[1.45] text-offwhite/86 font-body">
                    "{quote}"
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="font-display text-[24px] font-bold leading-none text-offwhite">{name}</div>
                      <div className="mt-1 text-[15px] text-offwhite/45 font-body">{company}</div>
                    </div>
                    <div
                      className="rounded-[10px] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.05em]"
                      style={badgeStyle}
                    >
                      {badge}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-12">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase text-offwhite/35 font-body">
            High-contrast comparison
          </p>
          <h2
            className="font-display font-bold text-offwhite"
            style={{ fontSize: 'clamp(3rem, 5.5vw, 5.15rem)', letterSpacing: '-0.055em', lineHeight: 0.92 }}
          >
            Trade Receptionist vs.
            <br />
            The Alternatives
          </h2>

          <div className="mt-10 overflow-x-auto pb-3">
            <div
              className="min-w-[920px] overflow-hidden rounded-[20px]"
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 18px 40px rgba(2,13,24,0.36)' }}
            >
              <div className="grid grid-cols-[1.15fr_1.3fr_1fr_1fr_1.2fr]">
                <div className="px-5 py-6 text-[17px] font-semibold text-offwhite" style={{ background: 'rgba(255,255,255,0.05)' }}>Feature</div>
                <div
                  className="relative px-5 py-6 text-center"
                  style={{
                    background: 'linear-gradient(180deg, rgba(249,115,22,0.86) 0%, rgba(242,159,87,0.92) 100%)',
                    boxShadow: '0 0 28px rgba(249,115,22,0.34)',
                  }}
                >
                  <div className="font-display text-[28px] font-bold leading-none text-white">Trade</div>
                  <div className="font-display text-[28px] font-bold leading-none text-white">Receptionist</div>
                </div>
                {['Missed Calls', 'Voicemail', 'Traditional Services'].map((label) => (
                  <div key={label} className="px-5 py-6 text-center text-[17px] font-semibold text-offwhite" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {label}
                  </div>
                ))}
              </div>

              {comparisonRows.map((row, rowIndex) => {
                const baseBg = rowIndex % 2 === 0 ? 'rgba(8,18,34,0.82)' : 'rgba(10,22,40,0.88)';
                return (
                  <div key={row.feature} className="grid grid-cols-[1.15fr_1.3fr_1fr_1fr_1.2fr]">
                    <div className="border-t border-white/8 px-5 py-5 text-[16px] text-offwhite/88 font-body" style={{ background: baseBg }}>
                      {row.feature}
                    </div>
                    <div className="border-t border-white/8 px-5 py-5" style={{ background: 'rgba(249,115,22,0.12)' }}>
                      <div className="flex items-center gap-3 text-[16px] text-offwhite font-body">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F29C5C] text-white">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                        {row.tradeReceptionist}
                      </div>
                    </div>
                    {[
                      row.missedCalls,
                      row.voicemail,
                      row.traditional,
                    ].map((cell, index) => {
                      const showCheck = row.feature === 'Setup Time' && index === 1;
                      return (
                        <div key={`${row.feature}-${index}`} className="border-t border-white/8 px-5 py-5" style={{ background: baseBg }}>
                          <div className="flex items-center gap-3 text-[16px] text-offwhite/78 font-body">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${showCheck ? 'bg-[#F29C5C] text-white' : 'text-[#d25967]'}`}>
                              {showCheck ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            </span>
                            {cell}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="mt-14 flex flex-col items-start justify-between gap-6 rounded-[24px] px-8 py-8 md:flex-row md:items-center md:px-10 md:py-10"
            style={{
              background: 'linear-gradient(135deg, rgba(38,28,36,0.55) 0%, rgba(22,36,63,0.88) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 18px 44px rgba(2,13,24,0.30)',
            }}
          >
            <h3
              className="font-display font-bold text-offwhite"
              style={{ fontSize: 'clamp(2.4rem, 4.2vw, 4.5rem)', lineHeight: 0.95, letterSpacing: '-0.05em' }}
            >
              Stop losing jobs today
            </h3>
            <button
              className="inline-flex items-center gap-2 rounded-[16px] px-8 py-4 text-[18px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #F4A261 100%)',
                boxShadow: '0 18px 36px rgba(249,115,22,0.28)',
              }}
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
};

// ─── Demo Section ─────────────────────────────────────────────────────────────
const DemoSection = () => {
  const ref = useScrollAnimation();
  return (
  <Section id="demo" bg="gray">
    <div ref={ref} data-animate className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-14 lg:gap-18 items-center">
      <div className="max-w-xl">
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

        <div className="mb-8 flex flex-wrap gap-3">
          {['Books the slot', 'Calendar-aware', 'Urgency routing'].map((item) => (
            <span
              key={item}
              className="rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.02em] text-offwhite/72"
              style={{
                background: 'rgba(255,255,255,0.05)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="space-y-6">
          {[
            { title: 'Handles Qualification', text: 'Asks for postcode, job type, and urgency before booking.' },
            { title: 'Checks Your Calendar', text: 'Only books slots you\'re actually free — syncs with Google and Outlook.' },
            { title: 'Emergency Routing',     text: 'Patches urgent calls straight through to your mobile, instantly.' },
          ].map((feat, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-[20px] p-5"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.03) 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 14px 30px rgba(2,13,24,0.20)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, rgba(255,107,43,0.26), rgba(255,140,85,0.14))', boxShadow: '0 0 0 1px rgba(255,107,43,0.22), 0 0 16px rgba(255,107,43,0.12)' }}
              >
                <CheckCircle2 className="w-4 h-4 text-orange-soft" />
              </div>
              <div className="pt-0.5">
                <h4 className="font-display font-bold text-[17px] text-offwhite mb-1">{feat.title}</h4>
                <p className="text-[14px] text-offwhite/55 leading-relaxed">{feat.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div
          className="absolute inset-x-6 -top-10 h-44 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,138,72,0.18) 0%, transparent 72%)' }}
        />
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

        <div
          className="rounded-[28px] p-4 md:p-5"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 18px 44px rgba(2,13,24,0.34)',
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-offwhite/30">Sample Call</p>
              <p className="mt-1 text-[15px] font-semibold text-offwhite/78">Boiler repair enquiry, handled end to end</p>
            </div>
            <div
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-soft"
              style={{ background: 'rgba(255,107,43,0.08)', boxShadow: 'inset 0 0 0 1px rgba(255,107,43,0.16)' }}
            >
              90 sec booking flow
            </div>
          </div>

          <React.Suspense fallback={<LazyFallback height={200} />}>
            <AudioPlayer />
          </React.Suspense>
        </div>

      </div>
    </div>
  </Section>
  );
};


// ─── Pricing ──────────────────────────────────────────────────────────────────
const Pricing = ({ onWaitlist }: { onWaitlist: () => void }) => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const pricingRef = useScrollAnimation();

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
    <Section id="pricing" bg="white" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute right-[8%] top-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,145,73,0.12) 0%, transparent 72%)' }}
      />

      <div className="mb-14 max-w-3xl">
        <Badge>Simple, Honest Pricing</Badge>
        <h2
          className="font-display font-bold text-offwhite mb-4"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
        >
          No contracts. Cancel anytime.
        </h2>
        <p className="text-[17px] text-offwhite/52 mb-8 leading-relaxed">
          Early access available now. Prices locked for life when you join.
        </p>

        {/* Toggle */}
        <div className="inline-flex rounded-full p-1.5"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 10px 26px rgba(2,13,24,0.18)' }}>
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-7 py-3 min-h-[44px] rounded-full text-[13px] font-bold transition-colors duration-300 ${
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

      <div ref={pricingRef} className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-6 md:pb-0 px-4 md:px-0 -mx-4 md:mx-0 no-scrollbar pt-10 md:pt-12">
        {plans.map((plan, i) => (
          <div
            key={i}
            data-animate
            data-delay={i}
            className={`snap-center flex-shrink-0 w-[82vw] md:w-auto relative flex flex-col rounded-[24px] p-8 ${
              plan.isPopular
                ? 'popular-ring md:scale-[1.04] order-first md:order-none'
                : i === 0
                  ? 'hover:-translate-y-1 order-2 md:order-none'
                  : 'hover:-translate-y-1 order-3 md:order-none'
            }`}
            style={{
              background: plan.isPopular
                ? 'linear-gradient(180deg, rgba(31,23,26,0.92) 0%, rgba(17,39,69,0.92) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.035) 100%)',
              boxShadow: plan.isPopular
                ? '0 0 0 1px rgba(255,168,102,0.22), 0 24px 60px rgba(2,13,24,0.38)'
                : '0 0 0 1px rgba(255,255,255,0.08), 0 16px 34px rgba(2,13,24,0.22)',
              animation: plan.isPopular ? 'ring-pulse 3s ease-in-out infinite' : undefined,
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

            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-offwhite/32">Best for</p>
              <div
                className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-offwhite/72"
                style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)' }}
              >
                {plan.description}
              </div>
            </div>

            <h3 className="font-display text-2xl font-bold text-offwhite mb-1">{plan.name}</h3>
            <p className="text-[13px] text-offwhite/40 mb-7 leading-relaxed">
              {plan.isPopular ? 'The best balance of speed, reliability, and automation for growing trades businesses.' : plan.name === 'Starter' ? 'A fast, professional front desk for solo operators who want every enquiry captured.' : 'A heavier-duty setup for teams running multiple vans, departments, or brands.'}
            </p>

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

            <div
              className="mb-4 rounded-[16px] px-4 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
            >
              <p className="text-[11px] text-offwhite/28">
              14-day free trial · No card required · Cancel anytime
              </p>
            </div>

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
  const faqRef = useScrollAnimation();

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
      <div className="grid gap-10 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-14">
        <div className="xl:pt-2">
          <Badge>Got Questions?</Badge>
          <h2
            className="font-display font-bold text-offwhite"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
          >
            Frequently asked questions
          </h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-offwhite/52">
            Everything trades businesses usually ask before switching from missed calls, voicemail, or manual answering.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              'Setup takes around 14 minutes',
              'No contract or lock-in',
              'Works with your existing number',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[18px] px-4 py-4 text-[13px] font-semibold text-offwhite/72"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.035) 100%)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div ref={faqRef} data-animate className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              data-delay={i}
              className="overflow-hidden rounded-[20px]"
              style={{
                background: openIndex === i
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.045) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.032) 100%)',
                boxShadow: openIndex === i
                  ? '0 0 0 1px rgba(255,107,43,0.18), 0 16px 36px rgba(2,13,24,0.22)'
                  : '0 0 0 1px rgba(255,255,255,0.06), 0 10px 24px rgba(2,13,24,0.16)',
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

              <div className={`accordion-body${openIndex === i ? ' is-open' : ''}`}>
                <div className="px-6 pb-6 text-[15px] text-offwhite/56 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};

// ─── Final CTA ────────────────────────────────────────────────────────────────
const FinalCTA = ({ onWaitlist }: { onWaitlist: () => void }) => {
  const ref = useScrollAnimation();
  return (
  <section className="py-16 md:py-24 relative overflow-hidden" style={{ background: 'rgba(2,13,24,0.88)' }}>
    {/* Top fade separator */}
    <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(5,20,38,0.6) 0%, transparent 100%)' }} />
    {/* Atmospheric glows */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.12) 0%, transparent 65%)', filter: 'blur(60px)' }} />
    <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-30"
      style={{ background: 'radial-gradient(circle, rgba(153,203,255,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-20"
      style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />

    <div ref={ref} data-animate className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
      <div
        className="rounded-[30px] px-6 py-10 text-center sm:px-8 md:px-12 md:py-14"
        style={{
          background: 'linear-gradient(135deg, rgba(31,22,28,0.72) 0%, rgba(16,32,57,0.90) 100%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 56px rgba(2,13,24,0.36)',
        }}
      >
        <Badge color="blue">Your Competition Is Already Using This</Badge>

        <h2
          className="font-display font-bold text-offwhite mb-6 leading-[1.0] mt-4"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.03em' }}
        >
          Stop losing{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontStyle: 'italic',
            }}
          >
            jobs
          </span>{' '}
          to missed calls.
        </h2>

        <p className="text-[17px] text-offwhite/44 max-w-2xl mx-auto mb-10 font-body leading-relaxed">
          While you read this, a competitor is answering their calls. Every unanswered ring is a job that goes to someone else.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Button variant="primary" size="lg" onClick={onWaitlist} className="animate-pulse-glow">
            Start Free Trial — No Card Required
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

        <div className="flex flex-wrap justify-center gap-3 text-[13px] text-offwhite/28 font-body">
          {[
            { icon: Star, label: '4.9/5 rating' },
            { icon: CheckCircle2, label: 'Setup in 14 minutes' },
            { icon: CheckCircle2, label: 'Cancel anytime' },
            { icon: CheckCircle2, label: 'No card required' },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-2 rounded-full px-4 py-2"
              style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
            >
              <Icon className="w-3.5 h-3.5 text-offwhite/25" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
  );
};

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = ({ onWaitlist }: { onWaitlist: () => void }) => (
  <footer className="pt-20 pb-12" style={{ background: 'rgba(2,13,24,0.92)' }}>
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
      <div
        className="mb-12 rounded-[28px] px-6 py-8 md:px-8 md:py-9"
        style={{
          background: 'linear-gradient(135deg, rgba(26,22,27,0.58) 0%, rgba(14,28,49,0.88) 100%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 18px 44px rgba(2,13,24,0.28)',
        }}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-offwhite/30">Trade Receptionist</p>
            <h3 className="mt-2 font-display text-[clamp(2rem,3vw,3rem)] font-bold leading-[0.98] text-offwhite">
              The premium AI receptionist for UK trades.
            </h3>
          </div>
          <Button variant="primary" size="lg" onClick={onWaitlist}>
            Start Free Trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-12 border-t border-white/6 pt-12 md:grid-cols-4 mb-16">
        <div className="md:col-span-2">
          <div className="mb-6">
            <Logo height={100} />
          </div>
          <p className="text-[15px] text-offwhite/35 leading-relaxed max-w-sm">
            The UK's #1 AI receptionist for tradespeople. Never miss a call. Never lose a job.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {['Plumbers', 'Electricians', 'Builders', 'HVAC', 'Carpenters'].map((trade) => (
              <span
                key={trade}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-offwhite/58"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
              >
                {trade}
              </span>
            ))}
          </div>
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

        <div>
          <h4 className="font-bold text-[12px] tracking-[0.12em] uppercase text-offwhite/30 mb-5">Company</h4>
          <ul className="space-y-3 text-[14px] text-offwhite/45">
            <li>
              <button
                onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })}
                className="hover:text-offwhite transition-colors"
              >
                Why Trade Receptionist
              </button>
            </li>
            <li>
              <button
                onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                className="hover:text-offwhite transition-colors"
              >
                FAQs
              </button>
            </li>
            <li>
              <a href="/terms" className="hover:text-offwhite transition-colors">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="/privacy" className="hover:text-offwhite transition-colors">
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Social media row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8">
        <div className="flex items-center gap-3">
          {[
            { href: 'https://instagram.com/tradereceptionist', Icon: Instagram, label: 'Instagram' },
            { href: 'https://www.facebook.com/share/16QddwsMk8/', Icon: Facebook, label: 'Facebook' },
            { href: 'https://tiktok.com/@tradereceptionist', Icon: TikTokIcon, label: 'TikTok' },
          ].map(({ href, Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex items-center gap-2 p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(240,244,248,0.55)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,107,43,0.12)';
                (e.currentTarget as HTMLAnchorElement).style.color = '#ffb59a';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 0 1px rgba(255,107,43,0.2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(240,244,248,0.55)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.08)';
              }}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[12px] font-semibold font-body">{label}</span>
            </a>
          ))}
        </div>
        <p className="text-[13px] text-offwhite/25">
          &copy; 2026 Trade Receptionist Ltd. All rights reserved. Registered in England &amp; Wales.
        </p>
      </div>
    </div>
  </footer>
);

// ─── Cinematic Background Scene ──────────────────────────────────────────────
const PageSceneDrift: React.FC = () => (
  <>
    <div className="page-scene" aria-hidden="true" />
    <div className="page-scene-drift-a" aria-hidden="true" />
    <div className="page-scene-drift-b" aria-hidden="true" />
  </>
);

// ─── App Root ─────────────────────────────────────────────────────────────────
// ─── WhatsApp Escape Hatch ────────────────────────────────────────────────────
const WhatsAppButton = () => (
  <a
    href="https://wa.me/447786899933?text=Hi%20I%27m%20interested%20in%20Trade%20Receptionist"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with us on WhatsApp"
    className="group fixed right-4 md:right-6 bottom-28 md:bottom-6 z-40 flex items-center justify-center w-14 h-14 rounded-full animate-pulse-glow-green hover:scale-110 active:scale-95 transition-transform duration-300"
    style={{ background: '#25D366' }}
  >
    {/* WhatsApp SVG */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="white"
      className="w-7 h-7"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>

    {/* Tooltip */}
    <span
      className="pointer-events-none absolute right-16 whitespace-nowrap px-3 py-1.5 rounded-lg text-[12px] font-semibold font-body opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{
        background: 'rgba(5,20,38,0.95)',
        color: '#F0F4F8',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(2,13,24,0.5)',
      }}
    >
      Chat with us on WhatsApp
    </span>
  </a>
);

// ─── Cookie Notice ────────────────────────────────────────────────────────────
// Only strictly necessary cookies (Supabase auth) + cookieless Vercel Analytics.
// No advertising tracking. ICO rules: no consent banner needed for strictly
// necessary cookies — but a transparent notice is best practice.
const CookieNotice: React.FC = () => {
  const [visible, setVisible] = useState(() => !localStorage.getItem('cookie-ack'));
  if (!visible) return null;
  return (
    <div
      className="fixed bottom-36 md:bottom-5 left-4 right-4 md:left-auto md:right-5 md:max-w-[360px] z-[60] rounded-[20px] p-4 font-body"
      style={{
        background:   'linear-gradient(180deg, rgba(10,35,64,0.96) 0%, rgba(8,26,48,0.96) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow:    '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(2,13,24,0.45)',
      }}
      role="region"
      aria-label="Cookie notice"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Privacy-first by default</p>
        <button
          onClick={() => { localStorage.setItem('cookie-ack', '1'); setVisible(false); }}
          className="text-[12px] text-offwhite/40 transition-colors hover:text-offwhite/75"
          aria-label="Dismiss cookie notice"
        >
          Dismiss
        </button>
      </div>
      <p className="text-[13px] text-offwhite/60 leading-[1.6] mb-3 md:hidden">
        We use strictly necessary cookies for authentication and anonymous analytics.
        No advertising tracking.{' '}
        <a href="/privacy#cookies" className="text-orange-soft hover:text-orange transition-colors underline underline-offset-2">
          Privacy Policy
        </a>
      </p>
      <div className="hidden md:flex items-center justify-between gap-3 mb-1">
        <p className="text-[12px] leading-relaxed text-offwhite/54">
          Necessary cookies only. No ad tracking.{' '}
          <a href="/privacy#cookies" className="text-orange-soft hover:text-orange transition-colors underline underline-offset-2">
            Privacy Policy
          </a>
        </p>
        <button
          onClick={() => { localStorage.setItem('cookie-ack', '1'); setVisible(false); }}
          className="min-w-[122px] h-10 rounded-btn px-4 text-[13px] font-semibold text-white transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)', boxShadow: '0 12px 26px rgba(249,115,22,0.24)' }}
        >
          Continue
        </button>
      </div>
      <button
        onClick={() => { localStorage.setItem('cookie-ack', '1'); setVisible(false); }}
        className="w-full h-10 rounded-btn text-[13px] font-semibold text-white transition-all duration-200 md:hidden"
        style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8C55)', boxShadow: '0 12px 26px rgba(249,115,22,0.24)' }}
      >
        Continue
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isStripeOpen, setIsStripeOpen] = useState(false);

  const handleViewChange = (view: View) => {
    window.scrollTo(0, 0);
    setCurrentView(view);
  };

  const toggleWaitlist = () => setIsWaitlistOpen(v => !v);
  const toggleStripe = () => setIsStripeOpen(v => !v);

  return (
    <div className="min-h-screen font-body text-offwhite" style={{ isolation: 'isolate', background: 'transparent' }}>
      <PageSceneDrift />
      <div className="grain" aria-hidden="true" />
      <Header currentView={currentView} onViewChange={handleViewChange} onWaitlist={toggleStripe} />

      <main className="pb-20 md:pb-0">
        {currentView === 'home' ? (
          <>
            <Hero onWaitlist={toggleStripe} />
            <ROISection />
            <React.Suspense fallback={<LazyFallback height={800} />}>
              <FeaturesGrid onWaitlist={toggleStripe} />
            </React.Suspense>
            <ComparisonSection />
            <DemoSection />
            <Pricing onWaitlist={toggleStripe} />
            <FAQ />
            <FinalCTA onWaitlist={toggleStripe} />
          </>
        ) : (
          <React.Suspense fallback={<LazyFallback height={400} />}>
            <BookDemo />
          </React.Suspense>
        )}
      </main>

      <Footer onWaitlist={toggleStripe} />
      <StickyBottomBar onWaitlist={toggleStripe} />
      <WhatsAppButton />
      {isStripeOpen && (
        <React.Suspense fallback={null}>
          <StripeCheckoutModal isOpen={isStripeOpen} onClose={() => setIsStripeOpen(false)} onWaitlist={toggleWaitlist} />
        </React.Suspense>
      )}
      {isWaitlistOpen && (
        <React.Suspense fallback={null}>
          <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
        </React.Suspense>
      )}
      <CookieNotice />
    </div>
  );
};

export default App;
