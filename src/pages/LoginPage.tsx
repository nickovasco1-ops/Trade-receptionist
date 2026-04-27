import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
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
  const navigate = useNavigate();
  const [email, setEmail]         = useState('');
  const [sent, setSent]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]         = useState('');

  // If already logged in, skip to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError('');
    // Always redirect to /dashboard — it auto-redirects to /onboarding if no client exists
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(ellipse at 30% 40%, rgba(255,107,43,0.07) 0%, transparent 60%), #051426',
        fontFamily: 'Manrope, sans-serif',
      }}
    >
      {/* Blueprint grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo className="h-8 w-auto" />
        </div>

        <div
          className="rounded-card p-8"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(2,13,24,0.5)',
          }}
        >
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="text-orange w-10 h-10" strokeWidth={1.5} />
              </div>
              <h2 className="text-[20px] font-bold text-offwhite font-display mb-2">
                Check your inbox
              </h2>
              <p className="text-[14px] text-offwhite/50 font-body leading-relaxed">
                We sent a magic link to <span className="text-offwhite/70">{email}</span>.
                Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 text-[13px] text-offwhite/40 hover:text-offwhite/60 transition-colors font-body"
              >
                Wrong email? Go back
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] font-bold text-offwhite font-display mb-1">
                Sign in or get started
              </h1>
              <p className="text-[14px] text-offwhite/40 font-body mb-6">
                New accounts are set up automatically.
              </p>

              {/* Google sign-in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-[10px] text-[14px] font-semibold font-body text-offwhite/80 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 mb-5"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.1)'; }}
              >
                <GoogleIcon />
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-[12px] text-offwhite/20 font-body">or</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.08em] mb-1.5 font-body">
                    Email — magic link
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-offwhite/30" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-[10px] text-[14px] font-body text-offwhite placeholder-offwhite/25 outline-none transition-shadow duration-200 focus:ring-2 focus:ring-orange/40"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-[13px] text-red-400 font-body">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-btn font-semibold text-[15px] text-white font-body bg-gradient-to-r from-orange to-orange-glow shadow-orange-glow hover:shadow-orange-glow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : <>Send magic link <ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[12px] text-offwhite/25 font-body mt-6">
          &copy; {new Date().getFullYear()} Trade Receptionist Ltd
        </p>
      </div>
    </div>
  );
}
