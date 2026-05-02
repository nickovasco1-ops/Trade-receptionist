import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../../components/Logo';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate      = useNavigate();
  const emailRef      = useRef<HTMLInputElement>(null);
  const [email, setEmail]                 = useState('');
  const [sent, setSent]                   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState('');
  const [mounted, setMounted]             = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard', { replace: true });
    });
    // Staggered entrance
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [navigate]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError('');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12 font-body relative overflow-hidden"
      style={{ background: '#020D18' }}
    >
      {/* ── Atmospheric scene ─────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {/* Primary warm lamp — top left */}
        <div style={{
          position: 'absolute', top: '-20%', left: '-20%',
          width: '80%', height: '80%',
          background: 'radial-gradient(ellipse at center, rgba(255,107,43,0.22) 0%, rgba(255,107,43,0.08) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        {/* Cool fill — bottom right */}
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-10%',
          width: '55%', height: '55%',
          background: 'radial-gradient(ellipse at center, rgba(153,203,255,0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
        {/* Mid accent */}
        <div style={{
          position: 'absolute', top: '40%', left: '60%',
          width: '30%', height: '30%',
          background: 'radial-gradient(ellipse at center, rgba(255,140,85,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </div>

      {/* Blueprint grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(153,203,255,0.035) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(153,203,255,0.035) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-[360px] flex flex-col items-center"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >

        {/* Logo with bloom */}
        <div className="relative mb-6 flex items-center justify-center">
          <div style={{
            position: 'absolute',
            width: '220px', height: '120px',
            background: 'radial-gradient(ellipse, rgba(255,107,43,0.28) 0%, transparent 65%)',
            filter: 'blur(28px)',
            pointerEvents: 'none',
          }} />
          <Logo className="h-[50px] w-auto relative z-10" />
        </div>

        {/* Brand statement — outside the card */}
        <div className="text-center mb-8" style={{ transitionDelay: '80ms' }}>
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-orange-soft font-body mb-3">
            AI RECEPTIONIST FOR UK TRADESPEOPLE
          </p>
          <h1 className="font-display font-bold text-offwhite tracking-tight leading-[1.08] mb-3" style={{ fontSize: 'clamp(26px, 5vw, 32px)' }}>
            Your calls are{' '}
            <span
              className="italic"
              style={{
                background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              covered.
            </span>
          </h1>
          <p className="text-[14px] text-offwhite/45 font-body">
            Sign in to see what Sarah has handled today.
          </p>
        </div>

        {/* Live status pill */}
        <div
          role="status"
          aria-label="Sarah is live and answering calls"
          className="flex items-center gap-2 px-4 py-2 rounded-full mb-8 font-body"
          style={{
            background: 'rgba(255,107,43,0.08)',
            boxShadow: '0 0 0 1px rgba(255,107,43,0.16)',
          }}
        >
          <div className="relative flex items-center justify-center w-2 h-2">
            <span className="absolute w-full h-full rounded-full bg-orange animate-ping opacity-60" />
            <span className="relative w-2 h-2 rounded-full bg-orange" />
          </div>
          <Phone size={11} className="text-orange-soft" aria-hidden="true" />
          <span className="text-[12px] text-orange-soft font-semibold tracking-[-0.01em]">
            Sarah is live and answering calls
          </span>
        </div>

        {/* Glass card */}
        <div
          className="w-full rounded-card"
          style={{
            background: 'rgba(255,255,255,0.065)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.09),' +
              '0 24px 64px rgba(2,13,24,0.70),' +
              '0 0 0 1px rgba(255,107,43,0.04) inset',
          }}
        >
          {sent ? (
            /* ── Sent state ──────────────────────────────────────── */
            <div className="p-8 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{
                  background: 'rgba(255,107,43,0.11)',
                  boxShadow: '0 0 0 1px rgba(255,107,43,0.22), 0 0 36px rgba(255,107,43,0.18)',
                }}
              >
                <CheckCircle className="text-orange w-8 h-8" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h2 className="text-[21px] font-bold text-offwhite font-display tracking-tight mb-2">
                Check your inbox
              </h2>
              <p className="text-[14px] text-offwhite/50 font-body leading-relaxed mb-1">
                Magic link sent to
              </p>
              <p className="text-[14px] text-offwhite/80 font-semibold font-body mb-6 break-all">
                {email}
              </p>
              <p className="text-[13px] text-offwhite/35 font-body mb-6">
                Click the link to sign in — no password needed.
              </p>
              <button
                type="button"
                onClick={() => { setSent(false); setTimeout(() => emailRef.current?.focus(), 50); }}
                className="text-[13px] text-offwhite/30 hover:text-orange-soft transition-colors duration-200 font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px] rounded"
              >
                Wrong email? Try again
              </button>
            </div>
          ) : (
            /* ── Sign-in form ────────────────────────────────────── */
            <div className="p-7">
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 rounded-field text-[14px] font-semibold font-body text-offwhite/75 transition-all duration-300 ease-mechanical disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px] hover:-translate-y-0.5 mb-4"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.10)',
                  minHeight: '48px',
                }}
              >
                <GoogleIcon />
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4" aria-hidden="true">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07))' }} />
                <span className="text-[11px] text-offwhite/20 font-body uppercase tracking-[0.09em]">or</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.07))' }} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-[11px] font-bold text-offwhite/35 uppercase tracking-[0.09em] mb-1.5 font-body"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-offwhite/25 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      ref={emailRef}
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 rounded-field text-[14px] font-body text-offwhite placeholder:text-offwhite/20 outline-none bg-white/[0.06] shadow-ring-default focus:shadow-ring-strong focus:ring-2 focus:ring-orange/40 transition-shadow duration-200"
                      style={{ minHeight: '48px' }}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-[13px] text-orange-soft font-body py-1" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 rounded-btn font-semibold text-[15px] text-white font-body bg-gradient-to-r from-orange to-orange-glow shadow-orange-glow hover:shadow-orange-glow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-mechanical disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                  style={{ minHeight: '52px' }}
                >
                  {loading
                    ? 'Sending…'
                    : <><span>Send magic link</span><ArrowRight size={14} aria-hidden="true" /></>
                  }
                </button>
              </form>

              <p className="text-center text-[11px] text-offwhite/20 font-body mt-5">
                No password. No account needed. Just your email.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-offwhite/15 font-body mt-6">
          &copy; {new Date().getFullYear()} Trade Receptionist Ltd
        </p>
      </div>

    </div>
  );
}
