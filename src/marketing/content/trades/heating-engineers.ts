import type { TradeContent } from './types';

export const heatingEngineers: TradeContent = {
  slug: 'heating-engineers',
  plural: 'heating engineers',
  eyebrow: 'Answering service for heating engineers',
  headline: {
    lead: 'Call answering for heating engineers that takes the breakdown ',
    keyword: 'call',
    tail: " while you're on a service.",
  },
  intro:
    'The phone rings hardest in the first cold week, exactly when you have the least time to answer it. Trade Receptionist picks up in your business name, treats no heating as a same-day priority, gives the right safety advice if someone smells gas, and books annual services into your diary.',
  pains: {
    title: 'The heating engineer\'s phone problem',
    intro:
      'Demand arrives in waves. When the weather turns, everyone with a temperamental boiler finds out at the same time, and you are already on a breakdown.',
    items: [
      {
        title: 'Breakdowns arrive together',
        text: "A cold snap turns a normal week into back-to-back breakdowns. Every call you can't take is a household with no heat ringing the next engineer.",
      },
      {
        title: 'Gas smell calls need the right words, fast',
        text: "Someone who smells gas should be told to get out and ring the emergency line, not left waiting for your callback. That advice has to be given every time, correctly.",
      },
      {
        title: 'Service reminders cause callbacks',
        text: 'Send out annual service reminders and customers ring back to book, usually while you are halfway through someone else\'s service.',
      },
      {
        title: 'Landlord certificates have deadlines',
        text: 'Agents booking gas safety checks want a date before the old record runs out. Slow replies lose you the portfolio.',
      },
    ],
  },
  scenarios: {
    title: 'How it handles heating calls',
    intro: 'Three calls a heating engineer gets every winter. Written examples, not recordings of real customers.',
    items: [
      {
        title: 'A smell of gas in the kitchen',
        context: "You're under a boiler on the other side of town.",
        steps: [
          { who: 'Caller', text: 'I can smell gas in the kitchen.' },
          { who: 'Receptionist', text: "Tells them to open the windows, not to touch any switches, to step outside and to ring the National Gas Emergency line on 0800 111 999. If anyone's in immediate danger, to ring 999. Then takes their name, address and number." },
          { who: 'You get', text: 'An urgent text and email straight away, with the address and what was said.' },
        ],
      },
      {
        title: 'No heating and a fault code',
        context: 'A Monday morning in November.',
        steps: [
          { who: 'Caller', text: "We've got no heating and the boiler's showing a fault code." },
          { who: 'Receptionist', text: "Treats it as a same-day priority, notes the fault code and boiler make if they know them, and takes the address and when they'll be in. It doesn't promise an arrival time you haven't given." },
          { who: 'You get', text: 'A summary flagged urgent, with enough detail to know what to bring.' },
        ],
      },
      {
        title: 'Booking an annual service',
        context: 'A customer replying to your reminder.',
        steps: [
          { who: 'Caller', text: 'I got your reminder. Can I book the boiler service in?' },
          { who: 'Receptionist', text: 'Checks your diary and offers two free slots. Books whichever they choose.' },
          { who: 'You get', text: 'The service in your calendar, plus the usual call summary by text and email.' },
        ],
      },
    ],
  },
  setup: {
    title: 'Set up for a heating business',
    intro: 'The safety advice is built in for every customer. The rest you set to match how you work.',
    items: [
      {
        title: 'Your working hours and after-hours message',
        text: "Outside your hours it gives your message and takes the details. A gas smell, no heating or flooding is still flagged as urgent whatever the time.",
      },
      {
        title: 'Your services',
        text: "Boilers, heat pumps, underfloor, commercial. Tell it what you cover so it doesn't take on work you don't do.",
      },
      {
        title: 'Your diary',
        text: 'Connect Google Calendar, Outlook or iCloud and annual services and gas safety checks book themselves into free slots.',
      },
      {
        title: 'Your number',
        text: "Keep the number on your van and your reminder letters. Divert the calls you can't answer.",
      },
    ],
  },
  faqs: [
    {
      question: 'What does it tell someone who smells gas?',
      answer:
        "To open the windows, not touch any switches, step outside and ring the National Gas Emergency line on 0800 111 999, or 999 if anyone is in immediate danger. It then takes their details and alerts you straight away.",
    },
    {
      question: 'Is a boiler breakdown treated as urgent?',
      answer:
        "Yes. No heating and no hot water are treated as same-day priorities and sent to you flagged as urgent. It won't promise the caller an arrival time you haven't set.",
    },
    {
      question: 'Can it take the boiler make and fault code?',
      answer:
        'It notes whatever the caller tells it, such as the make, the model or a code on the display, and puts it in your summary.',
    },
    {
      question: 'Can it book annual services and gas safety checks into my diary?',
      answer:
        "Yes, once you connect Google Calendar, Outlook or iCloud. It only offers times you're free. For landlord checks it takes the property address and the date they need it done by.",
    },
    {
      question: 'What happens to calls outside my working hours?',
      answer:
        "It still answers. It gives your after-hours message, takes the details and tells the caller when you'll be back in touch. A gas smell, no heating or flooding is still flagged to you as urgent, whatever the time.",
    },
  ],
  related: ['plumbers', 'electricians', 'builders'],
  guides: ['cost-of-missed-calls-for-tradespeople', 'how-to-never-miss-a-call-on-the-job'],
  closing: {
    title: 'Get through winter without a phone full of missed calls.',
    text: 'Start the 14-day free trial before the weather turns, and let it take the breakdown calls you cannot.',
  },
};
