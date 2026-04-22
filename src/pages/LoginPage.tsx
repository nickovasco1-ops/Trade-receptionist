import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../../components/Logo';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // If already logged in, skip to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

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
                Sign in
              </h1>
              <p className="text-[14px] text-offwhite/50 font-body mb-7">
                Enter your email — we'll send a magic link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.08em] mb-1.5 font-body">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-offwhite/30" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-[10px] text-[14px] font-body text-offwhite placeholder-offwhite/25 outline-none transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,107,43,0.5)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-[13px] text-red-400 font-body">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-btn font-semibold text-[15px] text-white font-body transition-all duration-300 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)',
                    boxShadow: '0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.2)',
                  }}
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
