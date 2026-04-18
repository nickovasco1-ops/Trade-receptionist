import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, Mail, User, Briefcase, ArrowRight } from 'lucide-react';
import { Button } from './UI';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose }) => {
  const SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbz5zNDf8j0lZwCgg4SieLWr_spZYJ8lieJirv7BYe1mthpr5fbAxOof4xaOUmIJq9GK/exec';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({ name: '', email: '', role: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const params = new URLSearchParams();
      params.append('name', formData.name);
      params.append('email', formData.email);
      params.append('role', formData.role);

      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      setStatus('success');
      setFormData({ name: '', email: '', role: '' });
    } catch (err) {
      console.error('Waitlist error:', err);
      setStatus('error');
    }
  };

  const inputClass =
    'w-full pl-12 pr-4 h-14 rounded-xl outline-none transition-[box-shadow] duration-200 text-offwhite text-[15px] font-body ' +
    'placeholder-offwhite/20 font-medium';

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
  };

  const inputFocusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.boxShadow = '0 0 0 1.5px rgba(255,107,43,0.50)';
  };
  const inputBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.08)';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          background: 'rgba(2,13,24,0.80)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={status === 'loading' ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-card overflow-hidden animate-fade-up"
        style={{
          background: '#0A2340',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(2,13,24,0.6)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-offwhite/30 hover:text-offwhite/80 transition-colors z-10 p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Orange top accent strip */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #FF6B2B, #FF8C55)' }} />

        {status === 'success' ? (
          <div className="p-10 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(255,107,43,0.12)', boxShadow: '0 0 0 1px rgba(255,107,43,0.20)' }}
            >
              <CheckCircle2 className="w-8 h-8 text-orange-soft" />
            </div>
            <h3 className="font-display text-2xl font-bold text-offwhite mb-3 tracking-tight">
              You're on the list!
            </h3>
            <p className="text-offwhite/50 mb-8 leading-relaxed text-[15px]">
              We'll be in touch very soon with your early access details. In the meantime, spread the word to fellow tradespeople.
            </p>
            <Button variant="outline" fullWidth onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="p-8">
            <div className="mb-7">
              <h3 className="font-display text-[26px] font-bold text-offwhite mb-1.5 tracking-tight">
                Join the Waitlist
              </h3>
              <p className="text-offwhite/40 text-[14px] leading-relaxed">
                Be the first to use the platform for free. Launching in limited batches.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/35 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-offwhite/25 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Smith"
                    className={inputClass}
                    style={inputStyle}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    onFocus={inputFocusStyle}
                    onBlur={inputBlurStyle}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/35 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-offwhite/25 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="john@example.co.uk"
                    className={inputClass}
                    style={inputStyle}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    onFocus={inputFocusStyle}
                    onBlur={inputBlurStyle}
                  />
                </div>
              </div>

              {/* Trade / Role */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/35 mb-2">
                  Your Trade <span className="text-offwhite/20">(Optional)</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-offwhite/25 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Plumber, Site Manager"
                    className={inputClass}
                    style={inputStyle}
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    onFocus={inputFocusStyle}
                    onBlur={inputBlurStyle}
                  />
                </div>
              </div>

              {status === 'error' && (
                <div
                  className="text-[13px] font-semibold text-orange-soft p-3 rounded-xl"
                  style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.15)' }}
                >
                  Something went wrong. Please try again or email hello@tradereceptionist.co.uk
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={status === 'loading'}
                  className="mt-1"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Saving your spot…
                    </>
                  ) : (
                    <>
                      Secure My Spot
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-5 text-center text-[12px] text-offwhite/20">
              No spam. Your data is never sold. Unsubscribe any time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
