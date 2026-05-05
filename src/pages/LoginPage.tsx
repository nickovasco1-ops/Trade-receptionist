import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../../components/Logo';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function StatusDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map(index => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-orange animate-pulse"
          style={{ animationDelay: `${index * 140}ms` }}
        />
      ))}
    </span>
  );
}

const FIELD_CLASS =
  'w-full min-h-[50px] rounded-field bg-white/[0.05] px-4 py-3 text-[14px] text-offwhite placeholder:text-offwhite/24 outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-200 focus:ring-2 focus:ring-orange/40 focus:shadow-[0_0_0_1px_rgba(255,107,43,0.26),0_0_24px_rgba(255,107,43,0.12)]';

export default function LoginPage() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard', { replace: true });
    });

    const timer = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(timer);
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });

    setLoading(false);

    if (signInError) setError(signInError.message);
    else setSent(true);
  }

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden px-4 py-6 font-body sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      style={{
        background:
          'radial-gradient(circle at 14% 18%, rgba(255,107,43,0.12) 0%, transparent 32%),' +
          'radial-gradient(circle at 82% 26%, rgba(153,203,255,0.10) 0%, transparent 34%),' +
          '#051426',
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div
        className="pointer-events-none absolute left-[-10%] top-[8%] h-[320px] w-[320px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.22) 0%, transparent 72%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-8%] right-[-4%] h-[320px] w-[320px] rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 72%)' }}
      />

      <div
        className="relative mx-auto w-full max-w-[1180px]"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div className="mb-8 flex items-center justify-between gap-4">
          <div
            className="rounded-[16px] px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.06)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 10px 24px rgba(2,13,24,0.22)',
            }}
          >
            <Logo height={24} />
          </div>
          <div
            className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
            style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
          >
            Secure magic-link sign in
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-10">
          <section className="order-2 lg:order-1">
            <div className="lg:sticky lg:top-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">
                AI receptionist for UK tradespeople
              </p>
              <h1 className="mt-3 max-w-[10ch] font-display text-[clamp(2.6rem,4vw,4.8rem)] font-bold leading-[0.94] tracking-[-0.05em] text-offwhite">
                Sign in and get back to the work that matters.
              </h1>
              <p className="mt-5 max-w-[48ch] text-[16px] leading-relaxed text-offwhite/58 sm:text-[17px]">
                Trade Receptionist keeps answering while you’re on the tools. Your dashboard shows what Sarah captured, who called, and what needs your attention next.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  'No passwords to remember',
                  'Calendar-ready Google sign in',
                  'Built for sole traders and small teams',
                ].map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                    style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                  >
                    <ShieldCheck size={13} className="text-orange-soft" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>

              <div
                className="mt-6 overflow-hidden rounded-[28px] p-5 sm:p-6"
                style={{
                  background: 'linear-gradient(180deg, rgba(16,29,50,0.90) 0%, rgba(9,22,38,0.94) 100%)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 56px rgba(2,13,24,0.34)',
                }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent/72">
                      Live operating mode
                    </p>
                    <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-offwhite/56">
                      Once signed in, you’ll see the enquiries Sarah handled, the jobs that were booked, and the follow-up that still needs your call back.
                    </p>
                  </div>
                  <div
                    className="hidden h-10 w-10 items-center justify-center rounded-full sm:flex"
                    style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
                  >
                    <Sparkles size={16} className="text-orange-soft" aria-hidden="true" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {[
                    'See new leads immediately',
                    'Review call summaries between jobs',
                    'Pick up where the AI left off',
                  ].map(item => (
                    <div
                      key={item}
                      className="rounded-[16px] px-4 py-3 text-[13px] font-semibold text-offwhite/72"
                      style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div
              className="overflow-hidden rounded-[30px] p-5 sm:p-6 lg:p-7"
              style={{
                background: 'linear-gradient(180deg, rgba(17,31,53,0.92) 0%, rgba(10,23,39,0.96) 100%)',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.08),' +
                  '0 28px 70px rgba(2,13,24,0.46),' +
                  'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="relative z-10">
                {sent ? (
                  <div className="py-4 text-center">
                    <div
                      className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                      style={{
                        background: 'rgba(255,107,43,0.12)',
                        boxShadow: '0 0 0 1px rgba(255,107,43,0.20), 0 0 36px rgba(255,107,43,0.18)',
                      }}
                    >
                      <CheckCircle className="h-8 w-8 text-orange" strokeWidth={1.8} aria-hidden="true" />
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">
                      Link sent
                    </p>
                    <h2 className="mt-3 font-display text-[clamp(2rem,3vw,3.2rem)] font-bold leading-[0.98] tracking-[-0.04em] text-offwhite">
                      Check your inbox.
                    </h2>
                    <p className="mx-auto mt-4 max-w-[34ch] text-[15px] leading-relaxed text-offwhite/56">
                      Your secure sign-in link is on its way to the email below. No password needed.
                    </p>

                    <div
                      className="mx-auto mt-6 max-w-[420px] rounded-[20px] p-4 text-left"
                      style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent/72">Destination</p>
                      <p className="mt-2 break-all text-[15px] font-semibold text-offwhite/82">{email}</p>
                    </div>

                    <div
                      role="status"
                      aria-live="polite"
                      className="mx-auto mt-6 max-w-[420px] rounded-[18px] px-4 py-4"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,107,43,0.08) 0%, rgba(255,107,43,0.04) 100%)',
                        boxShadow: '0 0 0 1px rgba(255,107,43,0.14)',
                      }}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <StatusDots />
                        <span className="text-[14px] font-semibold tracking-[-0.01em] text-orange-soft">
                          Waiting for you to open the magic link
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSent(false);
                        setTimeout(() => emailRef.current?.focus(), 60);
                      }}
                      className="mt-6 rounded text-[13px] text-offwhite/32 transition-colors duration-200 hover:text-offwhite/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                    >
                      Wrong email? Try again
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">
                        Access your dashboard
                      </p>
                      <h2 className="mt-3 font-display text-[clamp(2rem,3vw,3.2rem)] font-bold leading-[0.98] tracking-[-0.04em] text-offwhite">
                        Your calls are already covered.
                      </h2>
                      <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-offwhite/56">
                        Sign in to see what Sarah has handled today, connect your calendar, and keep refining how your receptionist works.
                      </p>
                    </div>

                    <div
                      className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2"
                      style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.16)' }}
                      role="status"
                      aria-label="Sarah is live and answering calls"
                    >
                      <div className="relative flex h-2 w-2 items-center justify-center">
                        <span className="absolute h-full w-full rounded-full bg-orange animate-ping opacity-60" />
                        <span className="relative h-2 w-2 rounded-full bg-orange" />
                      </div>
                      <Phone size={12} className="text-orange-soft" aria-hidden="true" />
                      <span className="text-[12px] font-semibold tracking-[-0.01em] text-orange-soft">
                        Sarah is live and answering calls
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="mb-5 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-field bg-white/[0.07] text-[14px] font-semibold text-offwhite/78 transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] hover:-translate-y-0.5 hover:bg-white/[0.10] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.10)' }}
                    >
                      <GoogleIcon />
                      {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                    </button>

                    <div className="mb-5 flex items-center gap-3" aria-hidden="true">
                      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07))' }} />
                      <span className="text-[11px] uppercase tracking-[0.09em] text-offwhite/20">or</span>
                      <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.07))' }} />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label
                          htmlFor="login-email"
                          className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/38"
                        >
                          Email address
                        </label>
                        <div className="relative">
                          <Mail
                            size={14}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-offwhite/24"
                            aria-hidden="true"
                          />
                          <input
                            ref={emailRef}
                            id="login-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            className={`${FIELD_CLASS} pl-11`}
                          />
                        </div>
                      </div>

                      {error ? (
                        <p className="rounded-[16px] px-4 py-3 text-[13px] text-orange-soft" role="alert" style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.14)' }}>
                          {error}
                        </p>
                      ) : null}

                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-btn px-7 py-3.5 text-[15px] font-semibold tracking-[-0.015em] text-white transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
                        style={{
                          background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
                          boxShadow: '0 16px 34px rgba(249,115,22,0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
                        }}
                      >
                        {loading ? (
                          <>
                            <StatusDots />
                            Sending magic link…
                          </>
                        ) : (
                          <>
                            Send magic link
                            <ArrowRight size={15} aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </form>

                    <p className="mt-5 text-center text-[12px] leading-relaxed text-offwhite/28">
                      No password. No account admin. Just your email.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-6 text-center text-[13px] text-offwhite/28">
              Need help? Email{' '}
              <a
                href="mailto:hello@tradereceptionist.co.uk"
                className="text-offwhite/42 transition-colors duration-200 hover:text-orange-soft"
              >
                hello@tradereceptionist.co.uk
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
