import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, Mail, User, Briefcase } from 'lucide-react';
import { Button } from './UI';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose }) => {
  // --- CONFIGURATION ---
  // Fixed: Removed the appended placeholder text from the URL
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5zNDf8j0lZwCgg4SieLWr_spZYJ8lieJirv7BYe1mthpr5fbAxOof4xaOUmIJq9GK/exec";

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      // Using URLSearchParams for a standard form-data post
      const params = new URLSearchParams();
      params.append('name', formData.name);
      params.append('email', formData.email);
      params.append('role', formData.role);

      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Script redirects
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      // Because 'no-cors' doesn't return a readable response, we assume success if no error is thrown
      setStatus('success');
      setFormData({ name: '', email: '', role: '' });
    } catch (err) {
      console.error("Waitlist error:", err);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-tradeBlue-900/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={status === 'loading' ? undefined : onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-tradeBlue-900 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {status === 'success' ? (
          <div className="p-12 text-center animate-in zoom-in-90 duration-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-3xl font-extrabold text-tradeBlue-900 mb-4 tracking-tight">You're on the list!</h3>
            <p className="text-slate-600 mb-8 leading-relaxed font-medium">
              Thank you for joining. We'll be in touch very soon with your early access details.
            </p>
            <Button variant="primary" fullWidth onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="p-8 md:p-12">
            <div className="mb-8">
              <h3 className="text-3xl font-extrabold text-tradeBlue-900 mb-2 tracking-tight">Join the Waitlist</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Be the first to use the platform for free. We're launching in limited batches.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-widest pl-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full pl-12 pr-4 h-14 bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 rounded-2xl outline-none transition-all font-medium"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-widest pl-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="w-full pl-12 pr-4 h-14 bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 rounded-2xl outline-none transition-all font-medium"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-widest pl-1">Your Trade / Role (Optional)</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Plumber, Site Manager"
                    className="w-full pl-12 pr-4 h-14 bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 rounded-2xl outline-none transition-all font-medium"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  />
                </div>
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                  Oops! Something went wrong. Please try again or email us.
                </p>
              )}

              <div className="pt-4">
                <Button 
                  type="submit" 
                  fullWidth 
                  size="lg" 
                  disabled={status === 'loading'}
                  className="h-16 text-lg"
                >
                  {status === 'loading' ? (
                    <><Loader2 className="w-6 h-6 animate-spin mr-2" /> Saving...</>
                  ) : 'Secure My Spot'}
                </Button>
              </div>
            </form>
            
            <p className="mt-6 text-center text-xs text-slate-400 font-medium">
              We hate spam as much as you do. Your data is secure.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};