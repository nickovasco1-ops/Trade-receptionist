import type { TradeContent } from './types';

export const roofers: TradeContent = {
  slug: 'roofers',
  plural: 'roofers',
  eyebrow: 'Answering service for roofers',
  headline: {
    lead: 'A call answering service for roofers that picks up the ',
    keyword: 'call',
    tail: ' while you are two storeys up.',
  },
  intro:
    "You can't take a call on a scaffold, and after a storm you couldn't take them all anyway. Trade Receptionist answers in your business name, separates water coming in now from a quote for a re-roof, and texts you each one with the address.",
  pains: {
    title: 'Why roofers miss so many calls',
    intro: 'Roofing is the trade where answering the phone is hardest and, after bad weather, busiest.',
    items: [
      {
        title: 'Working at height',
        text: "Gloves on, harness on, wind blowing. Reaching for a phone on a pitched roof is not something you should be doing, so it rings out.",
      },
      {
        title: 'Storms bring everyone at once',
        text: 'After high winds, the phone goes all day with slipped tiles, leaks and fallen chimney pots. The calls you miss go to whoever answers.',
      },
      {
        title: 'Wasted trips to look at a roof',
        text: "Driving out to find it's a flat roof you don't do, or a job that needed a scaffold quote first. Getting the details on the first call saves the trip.",
      },
      {
        title: 'Quotes go cold quickly',
        text: 'Someone asking about a re-roof or new fascias is usually getting several prices. The first roofer to call them back with a date tends to get the look.',
      },
    ],
  },
  scenarios: {
    title: 'How it handles a roofer\'s calls',
    intro: 'Three calls roofers get. Written to show how it works, not recordings of real customers.',
    items: [
      {
        title: 'Water coming in after high winds',
        context: 'The morning after a storm. You are already on a job.',
        steps: [
          { who: 'Caller', text: "Some tiles have come off in the night and water's pouring into the loft." },
          { who: 'Receptionist', text: 'Treats it as urgent. Takes the address, where the water is coming in and a number, and offers to put them through to you.' },
          { who: 'You get', text: 'An urgent text and email with the address, so you can plan the day around it.' },
        ],
      },
      {
        title: 'Chimney and flashing work',
        context: 'A weekday afternoon.',
        steps: [
          { who: 'Caller', text: 'Can someone quote to repoint the chimney and redo the flashing?' },
          { who: 'Receptionist', text: "Takes the address, the type of property and what they've noticed. If your diary is connected, it books a time for you to look." },
          { who: 'You get', text: 'The job details and the visit already in your calendar.' },
        ],
      },
      {
        title: 'A small job worth grouping',
        context: 'An evening call about guttering.',
        steps: [
          { who: 'Caller', text: 'Our gutters are overflowing at the back. Do you do clearing?' },
          { who: 'Receptionist', text: 'Takes the address and postcode and what the problem looks like.' },
          { who: 'You get', text: "A summary with the postcode, so you can fit it in when you're next working nearby." },
        ],
      },
    ],
  },
  setup: {
    title: 'Set up for a roofing business',
    intro: 'Tell it what you do and how you want to hear about jobs. It does the rest the same way on every call.',
    items: [
      {
        title: 'Pitched, flat, or both',
        text: "List the work you take on, from slate and tile to flat roofs, fascias and chimneys, so it doesn't book what you don't do.",
      },
      {
        title: 'Price guidance, or none',
        text: 'Give a guide range for common jobs or leave it blank. It never invents a figure for a roof it has not seen.',
      },
      {
        title: 'Survey visits in your diary',
        text: 'Connect Google Calendar, Outlook or iCloud and it only offers the times you are free to go and look.',
      },
      {
        title: 'Your own number',
        text: "Divert the calls you can't answer. The number on your van and your boards stays the same.",
      },
    ],
  },
  faqs: [
    {
      question: 'What happens if the caller has water coming in right now?',
      answer:
        "Water pouring in or flooding is treated as urgent. It takes the address and a number, offers to put the caller through to you, and sends you an urgent text and email. If a ceiling or roof has collapsed and anyone is hurt, it tells them to ring 999.",
    },
    {
      question: 'What details does it take for a quote?',
      answer:
        "The address and postcode, the type of property, what the caller wants done or has noticed, and when they're in. It notes anything else they mention, like access at the back.",
    },
    {
      question: 'Will it tell customers when I can come out?',
      answer:
        "Only times from your diary if you connect one. It never promises a date or a finish time you haven't given it.",
    },
    {
      question: "I don't keep a calendar. Does it still work?",
      answer:
        "Yes. Without a diary it takes the job details and the caller's preferred days, and you arrange the visit when you ring back.",
    },
  ],
  related: ['builders', 'carpenters-and-joiners', 'landscapers'],
  guides: ['how-to-never-miss-a-call-on-the-job', 'cost-of-missed-calls-for-tradespeople'],
  closing: {
    title: 'Keep both hands on the job. Every call still gets answered.',
    text: 'Start the 14-day free trial and see how many roofing enquiries come through that would have gone to voicemail.',
  },
};
