import React, { useState } from 'react';
import { Section, Button, Badge } from './UI';
import { Mail, User, MessageSquare, ArrowRight } from 'lucide-react';

export const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`New Enquiry from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    );
    window.location.href = `mailto:hello@tradereceptionist.co.uk?subject=${subject}&body=${body}`;
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
  };

  const inputClass =
    'w-full px-4 py-4 rounded-xl outline-none transition-[box-shadow] duration-200 ' +
    'text-offwhite text-[15px] font-body placeholder-offwhite/20 font-medium';

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.boxShadow = '0 0 0 1.5px rgba(255,107,43,0.50)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.08)';
  };

  return (
    <Section bg="white" id="contact">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
          <Badge>Talk to Our Team</Badge>
          <h2
            className="font-display font-bold text-offwhite mb-4"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4.25rem)', letterSpacing: '-0.025em', lineHeight: 0.97 }}
          >
            Got a question?
          </h2>
          <p className="text-[17px] text-offwhite/50 leading-relaxed">
            We'll get back to you within one business day — usually same day.
          </p>
        </div>

        <div
          className="rounded-card p-8 md:p-10"
          style={{
            background: 'rgba(255,255,255,0.05)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.4)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="name" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/35 mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-offwhite/25 pointer-events-none" />
                  <input
                    type="text"
                    id="name"
                    required
                    placeholder="John Smith"
                    className={inputClass + ' pl-11'}
                    style={inputStyle}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/35 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-offwhite/25 pointer-events-none" />
                  <input
                    type="email"
                    id="email"
                    required
                    placeholder="john@example.co.uk"
                    className={inputClass + ' pl-11'}
                    style={inputStyle}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/35 mb-2">
                Message
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-offwhite/25 pointer-events-none" />
                <textarea
                  id="message"
                  required
                  rows={5}
                  placeholder="How can we help?"
                  className={inputClass + ' pl-11 resize-none'}
                  style={inputStyle}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  onFocus={onFocus as any}
                  onBlur={onBlur as any}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" fullWidth size="lg">
                Send Message
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Section>
  );
};
