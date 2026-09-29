import type { TradeContent } from './types';

// TODO(human): lockouts are not in the default urgent keyword list
// (server/src/lib/emergency.ts). The FAQ below says urgent situations can be
// added on the setup call, which relies on ops setting
// business_config.emergency_keywords for the tenant. Confirm that is part of
// locksmith onboarding before promoting this page, or change the answer.

export const locksmiths: TradeContent = {
  slug: 'locksmiths',
  plural: 'locksmiths',
  eyebrow: '24/7 answering service for locksmiths',
  headline: {
    lead: 'A 24/7 answering service for locksmiths that takes the lockout ',
    keyword: 'call',
    tail: ' at any hour.',
  },
  intro:
    "Lockouts don't keep office hours, and with a lock in pieces on a doorstep you can't take the next one. Trade Receptionist answers any time, in your business name, takes the address and what's happened, and texts it to you as soon as the call ends.",
  pains: {
    title: 'What a locksmith loses to an unanswered phone',
    intro:
      'Most locksmith work starts with someone stood outside a door. They have their phone in their hand and a list of numbers, and they will keep going down it.',
    items: [
      {
        title: 'The first to answer usually gets the job',
        text: "A locked-out caller isn't leaving a voicemail and waiting. If you don't pick up, the next locksmith on the search results does.",
      },
      {
        title: 'Your hands are in a lock',
        text: 'Drilling out a cylinder or fitting a new mortice, you cannot stop to answer. Meanwhile the next job is ringing.',
      },
      {
        title: 'Night calls and sleep',
        text: "You want the late work you choose to take, not to be woken by sales calls. Knowing what the call is before you ring back changes that.",
      },
      {
        title: 'Not every call is a lockout',
        text: 'Lock upgrades for insurance, landlords changing locks between tenants and uPVC doors that won\'t lock all need a proper booking, not a rushed callback.',
      },
    ],
  },
  scenarios: {
    title: 'How it handles a locksmith\'s calls',
    intro: 'Three calls a locksmith gets. Written to show the flow, not recordings of real customers.',
    items: [
      {
        title: 'Locked out late in the evening',
        context: "You're finishing a lock change across town.",
        steps: [
          { who: 'Caller', text: "I've locked myself out and my keys are inside." },
          { who: 'Receptionist', text: 'Takes their name, the address, where they are now, what kind of door it is if they know, and a number to reach them. If they want to speak to you, it offers to put them through.' },
          { who: 'You get', text: 'A text and email with the address the moment the call ends, so you can ring them from the van.' },
        ],
      },
      {
        title: 'A landlord changing locks',
        context: 'A weekday morning.',
        steps: [
          { who: 'Caller', text: 'The tenant has moved out. I need the locks changing before Friday.' },
          { who: 'Receptionist', text: 'Takes the property address, how many doors and the deadline, and books a slot if your diary is connected.' },
          { who: 'You get', text: 'The job booked and the details in your summary.' },
        ],
      },
      {
        title: "A uPVC door that won't lock",
        context: 'An afternoon call while you are on a job.',
        steps: [
          { who: 'Caller', text: "The handle on our back door won't lift to lock it any more." },
          { who: 'Receptionist', text: "Takes the details. Gives your price range for a mechanism repair if you've set one, and says you'll confirm the price on the day." },
          { who: 'You get', text: 'An enquiry you can slot in around your call-outs.' },
        ],
      },
    ],
  },
  setup: {
    title: 'Set up for how a locksmith works',
    intro: 'The most important setting for a locksmith is your hours, because they decide what callers are told.',
    items: [
      {
        title: 'Set your real hours',
        text: "If you take night call-outs, set your hours to match and late calls are handled as normal jobs. If you don't, it takes the details and tells callers when you'll ring back.",
      },
      {
        title: 'Let a lockout reach you',
        text: 'Callers who ask to speak to you can be transferred to your phone, so a genuine lockout reaches you while it is still a job.',
      },
      {
        title: 'Say what you charge, or not',
        text: 'Give ranges for common jobs and it quotes only those, always subject to your confirmation. Leave them out and it never guesses.',
      },
      {
        title: 'Keep your number',
        text: 'The number on your listings, your van and your stickers stays the same. Divert the calls you miss.',
      },
    ],
  },
  faqs: [
    {
      question: 'Can it answer calls in the middle of the night?',
      answer:
        "Yes. It answers every call at any hour. What it tells the caller depends on the hours you set: inside them it handles the call as a normal job, outside them it takes the details and gives your after-hours message.",
    },
    {
      question: 'Can it put a lockout through to me?',
      answer:
        'Yes. If the caller asks to speak to you, it tries to transfer them to your phone. If you do not answer, it reassures them and takes the details instead.',
    },
    {
      question: 'Will it quote for an emergency call-out?',
      answer:
        "Only if you give it your prices. It gives the range you set and says you'll confirm on the day. With no prices set, it tells callers you'll confirm the cost when you call back.",
    },
    {
      question: 'Can I make it treat lockouts as urgent?',
      answer:
        'Anything that sounds dangerous, such as someone trapped inside, is already treated as urgent. If you want other situations flagged as urgent too, tell us on your setup call.',
    },
    {
      question: 'What about sales calls and lead-generation companies?',
      answer:
        'It recognises sales pitches, directory offers and robocalls and ends them politely, so the texts you get are from people who need a locksmith.',
    },
  ],
  related: ['carpenters-and-joiners', 'builders', 'electricians'],
  guides: ['how-to-never-miss-a-call-on-the-job', 'ai-receptionist-vs-answering-service-vs-voicemail'],
  closing: {
    title: 'Every lockout answered, even when you are on the last one.',
    text: 'Start the 14-day free trial and see which calls you would have missed.',
  },
};
