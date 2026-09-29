import type { TradeContent } from './types';

export const plumbers: TradeContent = {
  slug: 'plumbers',
  plural: 'plumbers',
  eyebrow: 'AI receptionist for plumbers',
  headline: {
    lead: 'An AI receptionist for plumbers that answers the ',
    keyword: 'call',
    tail: ' while you finish the job.',
  },
  intro:
    "When you're cutting in a waste pipe or holding a fitting under a sink, you can't pick up. Trade Receptionist answers in your business name, finds out whether it's a burst pipe or a bathroom quote, and texts you the details before you've dried your hands.",
  pains: {
    title: 'Why plumbers miss the calls that matter',
    intro:
      "It isn't that you don't want the work. It's that the phone always goes when both hands are busy, and a plumbing customer with a problem rarely waits.",
    items: [
      {
        title: 'Emergencies ring at the worst moment',
        text:
          "A burst pipe is the call you most want, and it never comes when you're free. Someone with water on their kitchen floor rings the next plumber on the list if you don't answer.",
      },
      {
        title: "Voicemail doesn't tell you anything",
        text:
          "\"Can you call me back?\" and a number read too fast. You spend the evening ringing people to find out whether they wanted a washer changing or a whole bathroom.",
      },
      {
        title: "Quote callers don't wait either",
        text:
          'Bathroom refits, radiator moves and outside taps are the jobs that fill next month. Those callers want to know someone will come and look, and they will usually try someone else if nobody picks up.',
      },
      {
        title: 'Agents and landlords want a quick yes',
        text:
          "A letting agent with a tenant's leak needs to know someone's on it. Being hard to reach is how you quietly drop off their list.",
      },
    ],
  },
  scenarios: {
    title: 'What happens when a customer rings',
    intro:
      'Three calls a plumber gets most weeks, and how the receptionist handles each one. These are examples written to show the flow, not recordings of real customers.',
    items: [
      {
        title: 'A burst pipe at teatime',
        context: "You're on another job across town. The caller has water coming through the kitchen ceiling.",
        steps: [
          { who: 'Caller', text: "I've got a burst pipe, water's coming through the kitchen ceiling." },
          { who: 'Receptionist', text: 'Treats it as urgent. Takes their name, address, postcode and best number, and offers to put them straight through to you.' },
          { who: 'You get', text: "A text and email marked urgent the moment the call ends, with the address and what's happening." },
        ],
      },
      {
        title: 'A bathroom refit enquiry',
        context: 'Mid-morning, while you are soldering in a loft.',
        steps: [
          { who: 'Caller', text: "We want the bath out and a walk-in shower fitted. Could someone come and have a look?" },
          { who: 'Receptionist', text: 'Asks what they want doing, the type of property and the postcode. If your diary is connected, it offers a free slot for a quote visit and books it in.' },
          { who: 'You get', text: 'A job summary by text and email, and the visit already in your calendar.' },
        ],
      },
      {
        title: 'The price question',
        context: 'A caller wants a figure before they commit.',
        steps: [
          { who: 'Caller', text: 'Roughly how much to replace a toilet cistern?' },
          { who: 'Receptionist', text: "If you've given it a price range, it gives that range and says you'll confirm a firm price once you've seen it. If you haven't, it doesn't guess. It takes the details so you can quote." },
          { who: 'You get', text: 'The enquiry with everything you need to ring back with a proper price.' },
        ],
      },
    ],
  },
  setup: {
    title: 'Set it up the way your plumbing business runs',
    intro: "You tell it how you work once. After that it answers the way you would, on the days and hours you choose.",
    items: [
      {
        title: 'Keep the number on your van',
        text: 'Divert the calls you miss to your Trade Receptionist number. On a UK mobile that is one code. Customers still ring the number they already have.',
      },
      {
        title: "Tell it what you don't do",
        text: "List the work you take on. If you don't do gas, drainage or full bathroom fits, it won't book them in as if you do.",
      },
      {
        title: 'Connect your diary if you want bookings',
        text: 'Google Calendar, Outlook or iCloud. It only offers times you are actually free. Without a diary it takes their preferred times instead.',
      },
      {
        title: 'Decide what happens after hours',
        text: 'Write your own after-hours message. It still takes the details, and anything that sounds like a burst pipe or flooding is flagged as urgent whatever the time.',
      },
    ],
  },
  faqs: [
    {
      question: 'Can it tell a real plumbing emergency from a routine job?',
      answer:
        "Yes. It listens for things like a burst pipe, flooding or water pouring through, treats them as urgent and alerts you by text and email straight away. A tap washer or a bathroom quote is taken down and sent over as a normal enquiry.",
    },
    {
      question: 'Will it try to diagnose the problem over the phone?',
      answer:
        "No. It asks what's happening and where, and writes down what the caller tells it. It won't guess at a cause, promise a fix or give a time you haven't agreed.",
    },
    {
      question: 'Can it book jobs straight into my diary?',
      answer:
        "If you connect Google Calendar, Outlook or iCloud, it checks when you're free and books the job in. If you'd rather arrange times yourself, leave the diary unconnected and it takes the caller's preferred days instead.",
    },
    {
      question: 'My business number is a landline. Does that work?',
      answer:
        "Usually, yes. Most landline providers let you divert unanswered calls to another number. The setup call included with your trial covers how to do it on your line.",
    },
    {
      question: 'How much does it cost for a plumber?',
      answer:
        'Plans start at £49 a month plus VAT for up to 50 calls, and every plan starts with a 14-day free trial with no charge today. Pro covers up to 150 calls a month if you get more.',
    },
  ],
  related: ['heating-engineers', 'electricians', 'builders'],
  guides: ['cost-of-missed-calls-for-tradespeople', 'how-to-never-miss-a-call-on-the-job'],
  closing: {
    title: 'Let the phone look after itself while you fix the leak.',
    text: "Start the free trial, divert the calls you can't take, and see what comes through in the first fortnight.",
  },
};
