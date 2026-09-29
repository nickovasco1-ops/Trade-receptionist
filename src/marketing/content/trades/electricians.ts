import type { TradeContent } from './types';

export const electricians: TradeContent = {
  slug: 'electricians',
  plural: 'electricians',
  eyebrow: 'AI receptionist for electricians',
  headline: {
    lead: 'An AI receptionist for electricians, so you never take a ',
    keyword: 'call',
    tail: ' with a board open.',
  },
  intro:
    "You shouldn't be answering the phone halfway through terminating a circuit. Trade Receptionist answers in your business name, sorts the sparking socket from the EICR enquiry, and sends you the details as soon as the call ends.",
  pains: {
    title: 'Where electricians lose work without noticing',
    intro:
      'Most of it comes down to one thing: the safe way to do the job and the fast way to answer the phone are never the same moment.',
    items: [
      {
        title: 'Safe working means the phone waits',
        text:
          "Up a ladder, in a loft, or with a consumer unit cover off, answering isn't an option. The call rings out and the customer moves on.",
      },
      {
        title: 'Faults make people ring round',
        text:
          'No power, a trip that won\'t reset, a burning smell from a socket. The caller is worried, and a worried caller keeps dialling until someone picks up.',
      },
      {
        title: 'Landlord work is repeat work',
        text:
          'EICRs, smoke alarm upgrades and remedial work for letting agents come back every year. Being the electrician who answers is how you stay on their list.',
      },
      {
        title: 'Bigger jobs need proper details',
        text:
          "Rewires, consumer unit changes and EV charger installs start with a survey. A voicemail doesn't tell you the property type, where they want the charger or when they're in.",
      },
    ],
  },
  scenarios: {
    title: 'How it handles the calls you get',
    intro: 'Three typical calls for an electrician. They are written examples to show what happens, not real customer recordings.',
    items: [
      {
        title: 'A sparking socket on a Sunday',
        context: "You're at your kid's football. The caller sounds rattled.",
        steps: [
          { who: 'Caller', text: "One of my sockets is sparking and there's a burning smell." },
          { who: 'Receptionist', text: "Treats it as urgent and takes the address and a number. If anything suggests a fire or someone in danger, it tells them to ring 999 straight away. It offers to put them through to you." },
          { who: 'You get', text: 'An urgent text and email with the address and what the caller described.' },
        ],
      },
      {
        title: 'An EICR before a new tenancy',
        context: 'A landlord rings while you are chasing cables in a new build.',
        steps: [
          { who: 'Caller', text: 'I need an electrical safety certificate on a three-bed before the new tenant moves in.' },
          { who: 'Receptionist', text: 'Takes the property address, the type of property and the date they need it by. With your diary connected, it books the inspection into a free slot.' },
          { who: 'You get', text: 'A summary with the deadline, and the booking in your calendar.' },
        ],
      },
      {
        title: 'An EV charger enquiry',
        context: 'An afternoon call while you are second-fixing.',
        steps: [
          { who: 'Caller', text: 'How much would it be to put a car charger on the side of the house?' },
          { who: 'Receptionist', text: "Gives your price range if you've set one and says the figure is confirmed after a survey. Asks where they want it fitted, the property type and when they're in." },
          { who: 'You get', text: 'A qualified lead you can ring back with a survey date.' },
        ],
      },
    ],
  },
  setup: {
    title: 'Tuned to how an electrical business works',
    intro: 'A few answers at setup decide how it talks to your customers.',
    items: [
      {
        title: 'List the work you take on',
        text: "Domestic, commercial, EV, alarms, testing. If you don't do something, it won't pretend you do.",
      },
      {
        title: 'Control what it says about price',
        text: "Give it a range for common jobs, or nothing at all. It never makes up a figure and never promises a fixed price.",
      },
      {
        title: 'Connect your diary',
        text: 'Google Calendar, Outlook or iCloud. EICRs and survey visits go straight into free slots, so you are not ringing back to arrange them.',
      },
      {
        title: 'Keep your number',
        text: "Divert the calls you can't answer to your Trade Receptionist number. Your customers and agents keep ringing the number they have.",
      },
    ],
  },
  faqs: [
    {
      question: 'What does it do if a caller mentions sparking, a shock or a fire?',
      answer:
        "It treats sparking, exposed wires, shocks and power loss as urgent and alerts you by text and email straight away. If there is any sign of a fire or danger to life, it tells the caller to ring 999 first.",
    },
    {
      question: 'Can it book EICRs and survey visits into my diary?',
      answer:
        "Yes, if you connect Google Calendar, Outlook or iCloud. It checks when you're free and only offers those times. Without a diary it takes the caller's preferred days for you to confirm.",
    },
    {
      question: 'Can I stop it giving prices for rewires?',
      answer:
        "Yes. If you don't give it any prices, it tells callers you'll quote after seeing the job and takes their details. If you do give it a range, it only ever quotes that range.",
    },
    {
      question: 'Will it waste my time with sales calls?',
      answer:
        'It recognises sales pitches, lead-generation offers and robocalls, and ends them politely. Your summaries are about customers.',
    },
    {
      question: 'Does it work for commercial as well as domestic work?',
      answer:
        "Yes. Tell it the kinds of work you do and it takes the job details and the address, whether that's a semi or a unit on an industrial estate.",
    },
  ],
  related: ['plumbers', 'heating-engineers', 'builders'],
  guides: ['how-to-never-miss-a-call-on-the-job', 'ai-receptionist-vs-answering-service-vs-voicemail'],
  closing: {
    title: 'Finish the job safely. The phone is covered.',
    text: 'Try it free for 14 days on the calls you currently miss, and read every summary it sends.',
  },
};
