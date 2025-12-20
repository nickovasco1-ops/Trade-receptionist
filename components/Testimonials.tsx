import React from 'react';
import { Section, Card, Badge } from './UI';
import { Star, Quote } from 'lucide-react';
import { Testimonial } from '../types';

export const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      name: "Dave Miller",
      company: "Miller Plumbing & Heating",
      role: "Owner",
      quote: "My phone used to ring off the hook while I was under a sink. Now I just get a text with the job details. It's brilliant.",
      tag: "Fewer missed calls",
      avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200"
    },
    {
      name: "Sarah Jenkins",
      company: "SJ Electrical Services",
      role: "Director",
      quote: "The qualification is spot on. It filters out the tyre kickers so I only spend time on genuine quotes.",
      tag: "Better leads",
      avatarUrl: "https://images.unsplash.com/photo-1573496359-7013c53bca63?auto=format&fit=crop&q=80&w=200&h=200"
    },
    {
      name: "Mike Thompson",
      company: "Thompson Build Group",
      role: "Site Manager",
      quote: "It sounds properly British, not like a robot. My customers actually leave messages now instead of hanging up.",
      tag: "Professional image",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200"
    },
    {
      name: "James Wilson",
      company: "Rapid Roof Repairs",
      role: "Sole Trader",
      quote: "Costs me less than a tank of diesel a month and books me about £2k of extra work. No brainer.",
      tag: "High ROI",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200"
    },
    {
      name: "Emma Clarke",
      company: "Clarke & Sons Locksmiths",
      role: "Office Manager",
      quote: "I used to spend my evenings calling people back. Now I spend them with my kids. The AI handles the bookings.",
      tag: "Work-life balance",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200"
    },
    {
      name: "Robert Hughes",
      company: "RH Gas Services",
      role: "Engineer",
      quote: "Set it up in 5 minutes between jobs. Didn't need to change my number or anything complex.",
      tag: "Easy setup",
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200&h=200"
    }
  ];

  return (
    <Section bg="white" className="relative border-t border-slate-100">
       {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-50 rounded-full blur-3xl opacity-40 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-tradeBlue-50 rounded-full blur-3xl opacity-40 -z-10"></div>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge>Community</Badge>
        <h2 className="text-3xl md:text-4xl font-bold text-tradeBlue-900 mb-4">Trusted by trades across the UK.</h2>
        <div className="inline-block px-4 py-1.5 bg-yellow-50 border border-yellow-100 rounded-full text-yellow-800 text-xs font-medium mb-6">
          ⚠️ Sample testimonials for demonstration purposes
        </div>
        <p className="text-lg text-slate-600">
          Join 500+ professionals who have stopped missing calls and started booking more work.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <Card key={i} className="p-6 h-full hover:shadow-md transition-shadow duration-300 flex flex-col">
            <div className="flex justify-between items-start mb-4">
               <Quote className="w-8 h-8 text-brand-100 fill-current" />
               <div className="flex gap-0.5">
                 {[...Array(5)].map((_, k) => (
                    <Star key={k} className="w-4 h-4 text-brand-500 fill-current" />
                 ))}
               </div>
            </div>
            
            <p className="text-slate-700 leading-relaxed mb-6 flex-grow font-medium">"{t.quote}"</p>
            
            <div className="flex items-center gap-3 pt-6 border-t border-slate-50 mt-auto">
                <img 
                    src={t.avatarUrl} 
                    alt={t.name} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    loading="lazy"
                />
                <div>
                    <p className="text-sm font-bold text-tradeBlue-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.company}</p>
                </div>
            </div>
            
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Visual detail on hover if needed */}
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
};