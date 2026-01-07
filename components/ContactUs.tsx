import React, { useState } from 'react';
import { Section, Button, Card } from './UI';

export const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sending email via mailto for frontend-only solution
    const subject = encodeURIComponent(`New Enquiry from ${formData.name}`);
    const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`);
    window.location.href = `mailto:hello@tradereceptionist.com?subject=${subject}&body=${body}`;
  };

  return (
    <Section bg="white" id="contact">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-tradeBlue-900 mb-6 tracking-tight">Contact Us</h2>
          <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed">
            Have a question? Send us a message and we’ll get back to you shortly.
          </p>
        </div>
        <Card className="p-8 md:p-12 shadow-xl border-slate-100/60 bg-white">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-bold text-slate-900 tracking-wide">Name</label>
                  <input
                    type="text"
                    id="name"
                    required
                    className="w-full px-4 py-4 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-bold text-slate-900 tracking-wide">Email</label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="w-full px-4 py-4 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="block text-sm font-bold text-slate-900 tracking-wide">Message</label>
              <textarea
                id="message"
                required
                rows={5}
                className="w-full px-4 py-4 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all resize-none placeholder:text-slate-400 font-medium"
                placeholder="How can we help?"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>
            <div className="pt-2">
                <Button type="submit" fullWidth size="lg">Send Message</Button>
            </div>
          </form>
        </Card>
      </div>
    </Section>
  );
};