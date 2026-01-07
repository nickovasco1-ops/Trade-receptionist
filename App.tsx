import React, { useState, useEffect } from 'react';
import { 
  Phone, Calendar, MessageSquare, ShieldCheck, 
  Menu, X, CheckCircle2, ArrowRight,
  Clock, Euro, Smartphone, Battery,
  Wrench, Zap, Hammer, Droplets,
  ChevronDown, ChevronUp, Star, XCircle,
  Instagram, Facebook, Twitter
} from 'lucide-react';
import { Button, Section, GlassCard, Badge, Card } from './components/UI';
import { AudioPlayer } from './components/AudioPlayer';
import { Calculator } from './components/Calculator';
import { BlueprintGrid } from './components/BlueprintGrid';
import { Testimonials } from './components/Testimonials';
import { BookDemo } from './components/BookDemo';
import { Logo } from './components/Logo';
import { ContactUs } from './components/ContactUs';
import { Feature, FAQItem, PricingTier } from './types';

type View = 'home' | 'book-demo';

// --- Custom Icons ---
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
  </svg>
);

// --- Sticky Bottom Mobile Bar ---
const StickyBottomBar = ({ onBookDemo }: { onBookDemo: () => void }) => (
  <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 md:hidden shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] flex gap-3 pb-safe">
    <Button variant="outline" fullWidth size="md" onClick={() => window.alert('Opening App Store...')}>
      Download App
    </Button>
    <Button variant="primary" fullWidth size="md" onClick={() => window.alert('Start Free Trial')}>
      7-Day Free Trial
    </Button>
  </div>
);

// --- Header ---
const Header = ({ currentView, onViewChange }: { currentView: View, onViewChange: (view: View) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNav = (target: string) => {
    if (target === 'book-demo') {
        onViewChange('book-demo');
    } else {
        onViewChange('home');
        // Small timeout to allow render before scrolling
        setTimeout(() => {
            const el = document.getElementById(target);
            el?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
    setIsOpen(false);
  };

  return (
    // Reverted to h-20 for a tighter, more premium feel
    <nav className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-100/80 transition-all duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between h-20 items-center">
          <button 
            className="flex-shrink-0 flex items-center cursor-pointer hover:opacity-90 transition-opacity focus:outline-none relative z-50 h-full py-4" 
            onClick={() => handleNav('hero')}
            aria-label="Go to home"
          >
            {/* 
               LOGO ADJUSTMENT: 
               Reduced width to match the attached screenshot style.
               Sacrificed size (w-[180px]) to ensure clean alignment with nav items.
            */}
            <div className="h-full w-[150px] md:w-[180px] flex items-center justify-start">
               <Logo className="h-full w-full" />
            </div>
          </button>
          
          <div className="hidden xl:flex items-center space-x-10">
            <button onClick={() => handleNav('how-it-works')} className="text-slate-600 hover:text-tradeBlue-900 font-semibold text-sm tracking-wide transition-colors">How it works</button>
            <button onClick={() => handleNav('roi')} className="text-slate-600 hover:text-tradeBlue-900 font-semibold text-sm tracking-wide transition-colors">Calculator</button>
            <button onClick={() => handleNav('pricing')} className="text-slate-600 hover:text-tradeBlue-900 font-semibold text-sm tracking-wide transition-colors">Pricing</button>
            <button onClick={() => handleNav('book-demo')} className={`font-semibold text-sm tracking-wide transition-colors ${currentView === 'book-demo' ? 'text-brand-600' : 'text-slate-600 hover:text-tradeBlue-900'}`}>Book Demo</button>
          </div>

          <div className="hidden xl:flex items-center space-x-4 pl-4">
            <Button variant="ghost" size="sm" className="font-semibold">Log in</Button>
            <Button variant="primary" size="sm" onClick={() => window.alert('Placeholder: Start Free Trial flow')}>Start 7-Day Free Trial</Button>
          </div>

          <div className="flex items-center xl:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-tradeBlue-900 p-2">
              {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="xl:hidden bg-white border-b border-slate-100 absolute w-full px-6 py-8 shadow-2xl animate-in slide-in-from-top-5">
          <div className="flex flex-col space-y-6">
             <button className="text-xl font-bold text-left text-tradeBlue-900" onClick={() => handleNav('how-it-works')}>How it works</button>
             <button className="text-xl font-bold text-left text-tradeBlue-900" onClick={() => handleNav('roi')}>Calculator</button>
             <button className="text-xl font-bold text-left text-tradeBlue-900" onClick={() => handleNav('pricing')}>Pricing</button>
             <button className="text-xl font-bold text-left text-brand-600" onClick={() => handleNav('book-demo')}>Book a Demo</button>
             <div className="h-px bg-slate-100 my-2"></div>
             <div className="flex flex-col gap-4">
                <Button variant="secondary" fullWidth onClick={() => window.alert('Opening App Store...')}>Download App</Button>
                <Button variant="primary" fullWidth onClick={() => window.alert('Start Free Trial')}>Start Free Trial</Button>
             </div>
          </div>
        </div>
      )}
    </nav>
  );
};

// --- Hero Section (With 3D Tilt) ---
const Hero = ({ onBookDemo }: { onBookDemo: () => void }) => {
    // 3D Tilt Logic
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate rotation (max 10 degrees)
        const rotateY = ((x - centerX) / centerX) * 5; 
        const rotateX = ((centerY - y) / centerY) * 5; 
        
        setRotate({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 });
    };

    return (
      <section id="hero" className="relative pt-40 pb-24 md:pt-48 md:pb-36 overflow-hidden bg-slate-50">
        <BlueprintGrid />
        
        {/* Background Gradient */}
        <div className="absolute top-0 inset-x-0 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-100/40 via-transparent to-transparent opacity-80 pointer-events-none"></div>
        <div className="absolute top-20 right-0 w-[800px] h-[800px] bg-orange-100/30 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
            <div className="text-center lg:text-left pointer-events-none md:pointer-events-auto">
              <Badge>#1 AI App for UK Trades</Badge>
              <h1 className="text-5xl md:text-7xl font-extrabold text-tradeBlue-900 tracking-tight leading-[1.05] mb-8">
                Never miss a <span className="bg-brand-600 text-white px-4 py-1 rounded-xl -rotate-2 inline-block shadow-xl shadow-brand-500/20 transform transition-transform hover:rotate-0 mx-2">call</span> again.
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                The mobile-first AI receptionist built for UK trades. Answers calls, qualifies leads, and books jobs 24/7.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start mb-12 pointer-events-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto text-lg px-10 h-16" onClick={() => window.alert('Start Free Trial')}>
                  Start 7-Day Free Trial
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/50 backdrop-blur-sm text-lg px-10 h-16" onClick={() => window.alert('Opening App Store...')}>
                  Download App
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 md:gap-8 text-sm md:text-base text-slate-500 font-semibold tracking-wide">
                 <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Works 24/7</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>UK Accent</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Set up in 5m</span>
                 </div>
              </div>
            </div>

            {/* Hero Visual 3D Container */}
            <div 
                className="relative mx-auto lg:ml-auto w-full max-w-[420px] lg:max-w-full perspective-1000 z-50 cursor-pointer group"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ perspective: '1000px' }}
            >
                {/* Mockup */}
                <div 
                    className="relative z-10 bg-white rounded-[2.5rem] border-8 border-tradeBlue-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden aspect-[9/19] max-h-[750px] mx-auto transition-transform duration-100 ease-out"
                    style={{ 
                        transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                        boxShadow: `${-rotate.y * 2}px ${rotate.x * 2 + 20}px 50px rgba(0,0,0,0.2)`
                    }}
                >
                    <div className="absolute top-0 inset-x-0 h-7 bg-tradeBlue-900 rounded-b-xl w-40 mx-auto z-20"></div>
                    {/* Screen Content */}
                    <div className="w-full h-full bg-slate-50 flex flex-col pt-12 select-none pointer-events-none">
                       <div className="px-6 mb-6">
                          <div className="flex justify-between items-center mb-6">
                             <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                             <div className="h-4 w-20 bg-gray-200 rounded"></div>
                          </div>
                          <h3 className="text-2xl font-bold text-tradeBlue-900 mb-1 tracking-tight">Good morning, Dave</h3>
                          <p className="text-sm text-slate-500">You have 3 new jobs booked.</p>
                       </div>
                       
                       {/* Card Stack */}
                       <div className="flex-1 px-4 space-y-4">
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                             <div className="flex justify-between items-start mb-3">
                                <span className="bg-brand-100 text-brand-700 text-[10px] uppercase font-bold px-2 py-1 rounded tracking-wide">Just Now</span>
                                <span className="text-xs text-slate-400">09:42 AM</span>
                             </div>
                             <p className="font-bold text-lg text-tradeBlue-900 leading-tight mb-1">Emergency Boiler Repair</p>
                             <p className="text-sm text-slate-500 mb-4 font-medium">SE15 4TW • Mrs. Higgins</p>
                             <div className="flex gap-2">
                                <div className="flex-1 bg-slate-100 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-slate-600">View Notes</div>
                                <div className="flex-1 bg-tradeBlue-900 text-white h-9 rounded-xl flex items-center justify-center text-xs font-bold">Call Back</div>
                             </div>
                          </div>

                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 opacity-60">
                             <div className="flex justify-between items-start mb-3">
                                <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-2 py-1 rounded tracking-wide">Quote</span>
                                <span className="text-xs text-slate-400">08:15 AM</span>
                             </div>
                             <p className="font-bold text-lg text-tradeBlue-900 leading-tight mb-1">Bathroom Renovation</p>
                             <p className="text-sm text-slate-500 font-medium">SW4 9HE • Tom Baker</p>
                          </div>
                       </div>
                       
                       {/* Incoming Call Overlay */}
                       <div className="absolute bottom-6 left-4 right-4 bg-tradeBlue-900/95 backdrop-blur text-white p-5 rounded-2xl shadow-2xl animate-pulse ring-1 ring-white/20">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                                <Phone className="w-6 h-6" />
                             </div>
                             <div>
                                <p className="font-bold text-base tracking-wide">Incoming Call...</p>
                                <p className="text-xs text-slate-300 font-medium">AI is answering (Listen Live)</p>
                             </div>
                          </div>
                       </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>
    );
};

// --- Pain Points Section (Grid) ---
const PainPoints = () => (
  <Section bg="gray">
    <div className="text-center max-w-3xl mx-auto mb-20">
      <h2 className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 mb-6 tracking-tight">Missed calls cost you jobs. <br/>It’s that simple.</h2>
      <p className="text-xl text-slate-600 leading-relaxed">You’re on the tools, under a sink, or on a roof. You can’t answer. But voicemails don't pay the bills.</p>
    </div>

    <div className="grid md:grid-cols-3 gap-8">
      {[
        { title: "Lost Revenue", desc: "67% of customers hang up if they get voicemail. They just call the next tradesperson on the list.", icon: Euro },
        { title: "Admin Overload", desc: "Spending your evenings returning calls, chasing leads, and organizing your diary instead of relaxing.", icon: Clock },
        { title: "Reputation Hits", desc: "Slow responses make you look unprofessional. Fast communication wins the high-value jobs.", icon: Star },
      ].map((item, i) => (
        <Card key={i} className="p-10 hover:-translate-y-2 transition-transform duration-500 group">
          <div className="w-14 h-14 bg-orange-100/50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
            <item.icon className="w-7 h-7 text-brand-600 group-hover:text-white transition-colors duration-300" />
          </div>
          <h3 className="text-2xl font-bold text-tradeBlue-900 mb-4 tracking-tight">{item.title}</h3>
          <p className="text-slate-600 leading-relaxed text-base">{item.desc}</p>
        </Card>
      ))}
    </div>
  </Section>
);

// --- ROI Section ---
const ROISection = () => (
    <Section id="roi" bg="white">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1">
                <Calculator />
            </div>
            <div className="order-1 lg:order-2">
                <Badge>ROI Calculator</Badge>
                <h2 className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 mb-8 tracking-tight">Do the maths.<br/>It pays for itself.</h2>
                <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                    Missing just a few calls a week adds up to thousands in lost revenue per year. 
                    Trade Receptionist costs less than a single small job per month.
                </p>
                <ul className="space-y-6">
                    <li className="flex gap-4 text-slate-700 text-lg">
                        <CheckCircle2 className="w-6 h-6 text-brand-500 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">Captures every lead, even when you're on site.</span>
                    </li>
                    <li className="flex gap-4 text-slate-700 text-lg">
                        <CheckCircle2 className="w-6 h-6 text-brand-500 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">Qualifies timewasters so you don't quote for nothing.</span>
                    </li>
                    <li className="flex gap-4 text-slate-700 text-lg">
                        <CheckCircle2 className="w-6 h-6 text-brand-500 flex-shrink-0 mt-0.5" />
                        <span className="font-medium">Cheaper than hiring a human receptionist or VA.</span>
                    </li>
                </ul>
            </div>
        </div>
    </Section>
);

// --- Comparison Section ---
const ComparisonSection = () => (
  <Section bg="gray" id="comparison">
    <div className="text-center mb-20">
      <h2 className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 mb-6 tracking-tight">Stop overpaying for help.</h2>
      <p className="text-xl text-slate-600">Why hire a temp or lose jobs to voicemail when you can have a 24/7 expert?</p>
    </div>

    <div className="overflow-x-auto pb-4">
      <div className="min-w-[900px] bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
        <div className="grid grid-cols-4 gap-4 mb-10">
          <div className="col-span-1"></div>
          <div className="text-center font-bold text-xl text-tradeBlue-900 tracking-tight">Trade Receptionist</div>
          <div className="text-center font-bold text-xl text-slate-400">Virtual Assistant</div>
          <div className="text-center font-bold text-xl text-slate-400">Voicemail</div>
        </div>

        {/* Rows */}
        {[
          { label: "Cost per month", us: "£29 fixed", them: "£500+", bad: "£0 (but costly)" },
          { label: "Availability", us: "24/7/365", them: "9am - 5pm", bad: "Always on" },
          { label: "Response Time", us: "Instant", them: "Variable", bad: "Hours/Days" },
          { label: "Books Appointments", us: true, them: true, bad: false },
          { label: "UK Accent", us: true, them: "Variable", bad: "N/A" },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 items-center py-6 border-t border-slate-100">
            <div className="font-semibold text-lg text-slate-700 pl-4">{row.label}</div>
            
            {/* Us */}
            <div className="text-center flex justify-center">
              {row.us === true ? (
                 <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                 </div>
              ) : (
                <span className="font-bold text-brand-600 bg-brand-50 px-4 py-1.5 rounded-full text-sm tracking-wide shadow-sm">{row.us}</span>
              )}
            </div>

            {/* Them */}
            <div className="text-center flex justify-center text-slate-500 font-medium">
                {row.them === true ? (
                 <CheckCircle2 className="w-6 h-6 text-slate-300" />
              ) : (
                <span className="text-base">{row.them}</span>
              )}
            </div>

            {/* Bad */}
            <div className="text-center flex justify-center text-slate-500 font-medium">
                {row.bad === false ? (
                 <XCircle className="w-6 h-6 text-red-200" />
              ) : (
                <span className="text-base">{row.bad}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

// --- Demo Section ---
const DemoSection = () => (
  <Section id="demo" bg="white">
    <div className="grid lg:grid-cols-2 gap-20 items-center">
      <div>
        <Badge>Live Demo</Badge>
        <h2 className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 mb-6 tracking-tight">Hear the difference. <br/>Not a robot, a receptionist.</h2>
        <p className="text-xl text-slate-600 mb-10 leading-relaxed">
            Trade Receptionist speaks naturally, understands UK accents, and knows your business rules. It doesn't just take messages—it qualifies leads and books appointments.
        </p>
        
        <div className="space-y-8">
            {[
                { title: "Handles Qualification", text: "Asks for postcode, job type, and urgency." },
                { title: "Checks Availability", text: "Only books times that match your live calendar." },
                { title: "Emergency Routing", text: "Patches urgent calls through to your mobile instantly." }
            ].map((feature, i) => (
                <div key={i} className="flex gap-5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center mt-1">
                        <CheckCircle2 className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-tradeBlue-900 mb-1">{feature.title}</h4>
                        <p className="text-base text-slate-600 leading-relaxed">{feature.text}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <div className="relative">
         {/* Transcript Card */}
         <div className="absolute -left-12 top-10 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-sm hidden xl:block z-20">
            <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Live Transcript</p>
            <div className="space-y-4 text-sm leading-relaxed">
                <p><span className="font-bold text-brand-600">AI:</span> "Trade Receptionist for Dave's Plumbing. How can I help?"</p>
                <p><span className="font-bold text-slate-800">Customer:</span> "Hi, my boiler is making a weird banging noise."</p>
                <p><span className="font-bold text-brand-600">AI:</span> "I can help with that. Is it urgent, or are you just looking for a quote?"</p>
            </div>
         </div>
         {/* Audio Player */}
         <div className="[&>div]:bg-tradeBlue-900">
             <AudioPlayer />
         </div>
      </div>
    </div>
  </Section>
);

// --- How It Works ---
const HowItWorks = () => (
  <Section id="how-it-works" bg="white">
    <div className="text-center mb-20">
      <Badge>Simple Process</Badge>
      <h2 className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 tracking-tight">How it works</h2>
    </div>

    {/* Steps Grid */}
    <div className="grid md:grid-cols-3 gap-10 relative mb-24">
       {/* Connecting Line (Desktop) */}
       <div className="hidden md:block absolute top-14 left-[16%] right-[16%] h-0.5 bg-slate-100 -z-0"></div>

      {[
        { step: "01", title: "Download the app", desc: "Available on iOS and Android. Create your account in minutes." },
        { step: "02", title: "Divert your calls", desc: "Set up call forwarding to your dedicated Trade Receptionist number when you're busy." },
        { step: "03", title: "Never miss a call", desc: "We answer instantly, qualify the lead based on your rules, and book it into your diary." }
      ].map((item, i) => (
        <div key={i} className="relative z-10 flex flex-col items-center text-center group">
            <div className="w-28 h-28 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-50 flex items-center justify-center mb-8 group-hover:scale-105 transition-transform duration-300">
                <span className="text-4xl font-extrabold text-brand-500 tracking-tight">{item.step}</span>
            </div>
            <h3 className="text-2xl font-bold text-tradeBlue-900 mb-4 tracking-tight">{item.title}</h3>
            <p className="text-slate-600 px-6 leading-relaxed text-base">{item.desc}</p>
        </div>
      ))}
    </div>
  </Section>
);

// --- Use Cases ---
const UseCases = () => (
  <Section bg="gray">
     <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-tradeBlue-900 tracking-tight">Built for your trade</h2>
     </div>
     
     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
            { icon: Droplets, name: "Plumbers", label: "Emergency triage" },
            { icon: Zap, name: "Electricians", label: "Quote qualification" },
            { icon: Wrench, name: "HVAC", label: "Maintenance booking" },
            { icon: Hammer, name: "Builders", label: "Site access coordination" },
        ].map((trade, i) => (
            <div key={i} className="group p-8 rounded-3xl bg-white border border-slate-100 hover:border-brand-200 hover:bg-white hover:shadow-xl hover:shadow-brand-900/5 transition-all text-center cursor-default">
                <trade.icon className="w-10 h-10 mx-auto mb-4 text-slate-300 group-hover:text-brand-600 transition-colors" />
                <h3 className="text-lg font-bold text-tradeBlue-900">{trade.name}</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">{trade.label}</p>
            </div>
        ))}
     </div>
  </Section>
);

// --- Features Grid (Accordion on Mobile) ---
const Features = () => {
    const features = [
        { title: "Smart Scheduling", desc: "Integrates with Google Calendar, Outlook, and ServiceM8 to book slots only when you're actually free." },
        { title: "Spam Blocking", desc: "Politely filters out sales calls and nuisance callers so you never get disturbed by spam." },
        { title: "WhatsApp Summaries", desc: "Get a concise text or WhatsApp message immediately after every call with the key details." },
        { title: "Custom Knowledge", desc: "Teach it your pricing ranges, service areas (postcodes), and out-of-hours fees." },
    ];

    return (
        <Section bg="gradient">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                <div className="order-2 lg:order-1">
                    <div className="grid sm:grid-cols-2 gap-6">
                        {features.map((f, i) => (
                            <GlassCard key={i} className="p-8">
                                <h3 className="font-bold text-xl text-tradeBlue-900 mb-3 tracking-tight">{f.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">{f.desc}</p>
                            </GlassCard>
                        ))}
                    </div>
                </div>
                <div className="order-1 lg:order-2">
                    <Badge>Operations</Badge>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 mb-8 tracking-tight">Run your business from your pocket.</h2>
                    <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                        Stop playing phone tag. Let Trade Receptionist handle the admin while you handle the tools. It's like having an office manager who never sleeps.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                         <Button variant="outline" className="gap-2 h-14 px-8" onClick={() => window.alert('Opening App Store...')}>
                            Download App
                        </Button>
                         <Button variant="ghost" className="gap-2 text-brand-600 h-14 font-semibold">
                            View all integrations <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </Section>
    )
}

// --- Pricing ---
const Pricing = ({ onBookDemo }: { onBookDemo: () => void }) => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const plans: PricingTier[] = [
    {
      name: "Starter",
      price: billing === 'monthly' ? "£29" : "£24",
      period: "per month (+VAT)",
      description: "Solo Traders",
      features: [
          "60 AI Minutes (~25 Calls)", 
          "24/7 Answering", 
          "SMS Summaries", 
          "Google Calendar Sync"
      ],
      buttonText: "Start 7-Day Free Trial"
    },
    {
      name: "Pro",
      price: billing === 'monthly' ? "£59" : "£49",
      period: "per month (+VAT)",
      description: "Busy Professionals",
      isPopular: true,
      features: [
          "150 AI Minutes (~65 Calls)", 
          "Everything in Starter", 
          "Call Transfer Logic", 
          "CRM Integration", 
          "Priority Support"
      ],
      buttonText: "Start 7-Day Free Trial"
    },
    {
      name: "Agency",
      price: billing === 'monthly' ? "£119" : "£99",
      period: "per month (+VAT)",
      description: "Growing Teams",
      features: [
          "350 AI Minutes (~150 Calls)", 
          "Everything in Pro", 
          "Multiple Departments", 
          "White Label Dashboard", 
          "Dedicated Account Mgr"
      ],
      buttonText: "Contact Sales"
    }
  ];

  return (
    <Section id="pricing" bg="white">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-extrabold text-tradeBlue-900 mb-6 tracking-tight">Simple, transparent pricing.</h2>
        <p className="text-xl text-slate-600 mb-10">No contracts. Cancel anytime. 7-day free trial.</p>
        
        <div className="inline-flex bg-slate-100 p-1.5 rounded-full relative">
          <button 
            onClick={() => setBilling('monthly')}
            className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${billing === 'monthly' ? 'bg-white text-tradeBlue-900 shadow-sm' : 'text-slate-500'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBilling('yearly')}
            className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${billing === 'yearly' ? 'bg-white text-tradeBlue-900 shadow-sm' : 'text-slate-500'}`}
          >
            Yearly <span className="text-brand-600 text-[10px] ml-1 font-extrabold uppercase tracking-wide">-20%</span>
          </button>
        </div>
      </div>

      <div className="flex md:grid md:grid-cols-3 gap-8 overflow-x-auto snap-x snap-mandatory pb-8 md:pb-0 px-4 md:px-0 -mx-4 md:mx-0 no-scrollbar pt-6">
        {plans.map((plan, i) => (
          <div key={i} className={`snap-center flex-shrink-0 w-[85vw] md:w-auto relative flex flex-col p-10 rounded-3xl border transition-transform duration-300 hover:-translate-y-2 ${plan.isPopular ? 'border-brand-500 bg-white ring-8 ring-brand-500/5 shadow-2xl' : 'border-slate-200 bg-white hover:shadow-xl'}`}>
             {plan.isPopular && (
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-600 text-white text-[10px] uppercase font-bold tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                 Most Popular
               </div>
             )}
             <h3 className="text-2xl font-bold text-tradeBlue-900 mb-2">{plan.name}</h3>
             <p className="text-sm text-slate-500 mb-8 font-medium">{plan.description}</p>
             <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-extrabold text-tradeBlue-900 tracking-tight">{plan.price}</span>
                <span className="text-slate-500 text-sm font-medium">{plan.period}</span>
             </div>
             
             <ul className="space-y-5 mb-10 flex-1">
                {plan.features.map((feat, k) => (
                  <li key={k} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-brand-500 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
             </ul>

             <Button 
                variant={plan.isPopular ? 'primary' : 'outline'} 
                fullWidth 
                onClick={plan.buttonText === "Contact Sales" ? () => window.alert('Opening Sales Chat...') : () => window.alert('Start Free Trial')}
            >
               {plan.buttonText || (plan.isPopular ? "Start 7-Day Free Trial" : "Book a demo")}
             </Button>
          </div>
        ))}
      </div>

      {/* ROI Text Block */}
      <div className="max-w-4xl mx-auto mt-16 bg-tradeBlue-900 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">Why £59?</h3>
            <p className="text-slate-300 text-xl leading-relaxed">
                Because a missed job costs you <span className="text-brand-400 font-bold">£150</span> on average. 
                If this app answers just <span className="text-white font-bold underline decoration-brand-500 decoration-4 underline-offset-4">ONE</span> call you would have missed, 
                it pays for itself for 3 months.
            </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
      </div>

    </Section>
  );
};

// --- FAQ Section ---
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "Do I need to change my phone number?",
      answer: "No. You simply set up call forwarding on your existing mobile or landline. We provide you with a unique forwarding number during setup. It takes about 2 minutes."
    },
    {
      question: "How does the AI know my prices?",
      answer: "During onboarding, you provide a simple knowledge base (e.g., 'Boiler service is £80', 'Call out fee is £60'). The AI uses this to answer questions intelligently."
    },
    {
      question: "What if it's an emergency?",
      answer: "You can set rules for urgent keywords (like 'gas leak' or 'flooding'). The AI can instantly transfer these calls to your mobile or a backup number."
    },
    {
      question: "Does it work with my calendar?",
      answer: "Yes. We integrate with Google Calendar, Outlook, and major trade software like ServiceM8. The AI only books slots that are actually available."
    },
    {
      question: "Is there a contract?",
      answer: "No contracts. It's a monthly rolling subscription. You can cancel anytime with one click in the app."
    }
  ];

  return (
    <Section bg="gray" id="faq">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-tradeBlue-900 mb-6 tracking-tight">Frequently Asked Questions</h2>
        <p className="text-xl text-slate-600">Everything you need to know about getting started.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md">
            <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none hover:bg-slate-50 transition-colors"
            >
                <span className="font-bold text-lg text-tradeBlue-900 pr-8">{faq.question}</span>
                {openIndex === i ? (
                    <ChevronUp className="w-6 h-6 text-brand-500 flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-6 h-6 text-slate-400 flex-shrink-0" />
                )}
            </button>
            {openIndex === i && (
                <div className="px-6 md:px-8 pb-8 text-slate-600 leading-relaxed text-base border-t border-slate-100 pt-6">
                    {faq.answer}
                </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
};

// --- Footer ---
const Footer = ({ onBookDemo }: { onBookDemo: () => void }) => (
    // Changed footer to white background and updated text colors
    <footer className="bg-white text-slate-600 py-20 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
            <div className="grid md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2 mb-8">
                        {/* 
                           Footer Logo: 
                           Reduced width to w-[140px] to address "too big" feedback.
                           Using standard color variant (not white) so blue/orange text is visible on white bg.
                        */}
                        <div className="w-[120px] md:w-[140px]">
                            <Logo className="w-full" />
                        </div>
                    </div>
                    <p className="max-w-xs text-base leading-relaxed mb-8 text-slate-500 font-medium">
                        The UK's #1 AI receptionist app for tradespeople. Never miss a call again.
                    </p>
                    <div className="flex items-center gap-4">
                        {/* Placeholder Badges - updated for light theme */}
                        <div className="h-12 w-36 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-200 transition-all">App Store</div>
                        <div className="h-12 w-36 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-200 transition-all">Google Play</div>
                    </div>
                </div>
                <div>
                    <h4 className="text-tradeBlue-900 font-bold mb-6 tracking-wide uppercase text-sm">Product</h4>
                    <ul className="space-y-4 text-sm font-medium text-slate-500">
                        <li><button onClick={() => {}} className="hover:text-tradeBlue-900 transition-colors">Pricing</button></li>
                        <li><button onClick={onBookDemo} className="hover:text-tradeBlue-900 transition-colors text-left">Book a Demo</button></li>
                        <li><button onClick={() => {}} className="hover:text-tradeBlue-900 transition-colors">Integrations</button></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-tradeBlue-900 font-bold mb-6 tracking-wide uppercase text-sm">Legal</h4>
                    <ul className="space-y-4 text-sm font-medium text-slate-500">
                        <li><button onClick={() => {}} className="hover:text-tradeBlue-900 transition-colors">Privacy Policy</button></li>
                        <li><button onClick={() => {}} className="hover:text-tradeBlue-900 transition-colors">Terms of Service</button></li>
                        <li><button onClick={() => {}} className="hover:text-tradeBlue-900 transition-colors">GDPR</button></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-slate-100 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-sm font-medium text-slate-400">&copy; 2024 Trade Receptionist Ltd. All rights reserved. London, UK.</p>
                <div className="flex gap-8 items-center text-slate-400">
                   <a href="https://instagram.com/tradereceptionist" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">
                      <Instagram className="w-6 h-6" />
                   </a>
                   <a href="https://tiktok.com/@tradereceptionist" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">
                      <TikTokIcon className="w-6 h-6" />
                   </a>
                   <a href="https://www.facebook.com/share/16QddwsMk8/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">
                      <Facebook className="w-6 h-6" />
                   </a>
                </div>
            </div>
        </div>
    </footer>
);

// --- CTA Section (Bottom) ---
const FinalCTA = ({ onBookDemo }: { onBookDemo: () => void }) => (
    <Section bg="white" className="border-t border-slate-100">
        <div className="bg-tradeBlue-900 rounded-[3rem] p-10 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500 rounded-full blur-[150px] opacity-25"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-25"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight">Ready to never miss another call?</h2>
                <p className="text-xl text-slate-300 mb-12 leading-relaxed">Join 500+ UK trades businesses saving 10+ hours a week. Try it free for 7 days, no credit card required.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                    <Button variant="primary" size="lg" className="h-16 px-10 text-lg" onClick={() => window.alert('Start Free Trial')}>Start 7-Day Free Trial</Button>
                    <Button variant="ghost" className="text-white hover:bg-white/10 h-16 px-10 text-lg border border-white/20" size="lg" onClick={() => window.alert('Opening App Store...')}>Download App</Button>
                </div>
            </div>
        </div>
    </Section>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');

  // If user lands on a 'route' (simulated), handle it
  // In a real app we'd use react-router-dom, but for this structure we use state
  const handleViewChange = (view: View) => {
    window.scrollTo(0, 0);
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-brand-200 text-slate-900">
      <Header currentView={currentView} onViewChange={handleViewChange} />
      
      <main>
        {currentView === 'home' ? (
            <>
                <Hero onBookDemo={() => handleViewChange('book-demo')} />
                <PainPoints />
                <HowItWorks />
                <ROISection />
                <ComparisonSection />
                <DemoSection />
                <Testimonials />
                <Features />
                <UseCases />
                <Pricing onBookDemo={() => handleViewChange('book-demo')} />
                <FAQ />
                <ContactUs />
                <FinalCTA onBookDemo={() => handleViewChange('book-demo')} />
            </>
        ) : (
            <BookDemo />
        )}
      </main>

      <Footer onBookDemo={() => handleViewChange('book-demo')} />
      <StickyBottomBar onBookDemo={() => handleViewChange('book-demo')} />
    </div>
  );
};

export default App;