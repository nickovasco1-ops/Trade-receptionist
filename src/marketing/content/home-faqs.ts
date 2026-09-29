// The homepage FAQ. Rendered by the FAQ section in App.tsx and marked up as
// FAQPage JSON-LD by src/marketing/schema/home.ts. One list, so the markup can
// never describe questions the page does not show.

import type { FAQItem } from '../../../types';

export const HOME_FAQS: readonly FAQItem[] = [
  {
    question: 'Do I need to change my phone number?',
    answer: "No. You keep your current mobile or landline. Trade Receptionist works with call forwarding, so customers still ring the number they already know.",
  },
  {
    question: "Will customers know it's AI?",
    answer: 'Most callers just notice that the phone was answered quickly and professionally. The voice is natural, British, and focused on taking the details properly.',
  },
  {
    question: 'Can it book into my Google Calendar?',
    answer: 'Yes. If you connect your calendar, it can work around your availability and help place qualified enquiries into the right slot.',
  },
  {
    question: 'What happens if the call is urgent?',
    answer: 'Urgent enquiries can be flagged and handled differently, including sending them straight through or marking them clearly so you can act fast.',
  },
  {
    question: 'Can I stop it from quoting prices?',
    answer: "Yes. You decide what it can and cannot say. If you don't want prices discussed on calls, it can simply capture the enquiry and pass it back to you.",
  },
  {
    question: 'What if it gets something wrong?',
    answer: 'You still see the enquiry summary, call record, and transcript, so you can correct anything quickly. The goal is to stop missed work, not take control away from you.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: "Yes. There's no long contract tying you in. If it's not right for your business, you can stop.",
  },
];
