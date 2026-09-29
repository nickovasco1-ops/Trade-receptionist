import type { TradeContent } from './types';

export const builders: TradeContent = {
  slug: 'builders',
  plural: 'builders',
  eyebrow: 'Answering service for builders',
  headline: {
    lead: 'A call answering service for builders that catches the next ',
    keyword: 'job',
    tail: " while you're on this one.",
  },
  intro:
    "Mixers, breakers and a site radio mean you don't hear the phone, let alone answer it. Trade Receptionist picks up in your business name, finds out what the customer wants built, and texts you a proper enquiry instead of a missed call.",
  pains: {
    title: 'Why a building firm misses its best enquiries',
    intro:
      'The calls worth the most are the ones a builder is least likely to catch: they come in while you are on site, and the caller is usually ringing more than one firm.',
    items: [
      {
        title: 'Site noise',
        text: "Between the cutter, the breaker and the skip lorry, you won't know it rang until you check at break. By then they have spoken to someone else.",
      },
      {
        title: 'Big jobs rarely leave a voicemail',
        text: "Someone planning an extension or a loft conversion is gathering quotes. If you don't pick up, they don't wait for you. They ring the next name.",
      },
      {
        title: "You can't tell what's worth calling back",
        text: 'A missed call is just a number. Is it a two-storey extension or someone wanting a gate post fixed? You find out by ringing them all.',
      },
      {
        title: 'You are also the office',
        text: 'Without someone on the phone, evenings go on returning calls and chasing details. That is time off the tools and time away from home.',
      },
    ],
  },
  scenarios: {
    title: 'How it handles a builder\'s calls',
    intro: 'Three calls a building firm gets. Written examples to show the flow, not real customer recordings.',
    items: [
      {
        title: 'An extension enquiry during a pour',
        context: "You're mid-pour and can't stop.",
        steps: [
          { who: 'Caller', text: "We've got drawings for a single-storey rear extension and we're looking for a builder." },
          { who: 'Receptionist', text: "Takes their name, address and number, what they want built, that they already have drawings, and when they're hoping to start. Offers a free slot for a site visit if your diary is connected." },
          { who: 'You get', text: 'A clear enquiry by text and email, so you know it is worth ringing back tonight.' },
        ],
      },
      {
        title: 'A ceiling down after a leak',
        context: "It's Saturday morning.",
        steps: [
          { who: 'Caller', text: 'Part of the bedroom ceiling has collapsed after a leak upstairs.' },
          { who: 'Receptionist', text: 'Treats it as an emergency. If anyone is hurt or trapped, it tells them to ring 999. It takes the address and number and offers to put them through to you.' },
          { who: 'You get', text: 'An urgent alert by text and email with the address and what happened.' },
        ],
      },
      {
        title: 'A job that needs more than one trade',
        context: "A caller isn't sure who they need.",
        steps: [
          { who: 'Caller', text: 'We want to move the bathroom downstairs and it will need new electrics as well.' },
          { who: 'Receptionist', text: "Takes all the details as normal and notes in plain words that it's a multi-trade job, so you can size it up before anyone goes out." },
          { who: 'You get', text: 'A summary that already tells you the scope, not just a name and number.' },
        ],
      },
    ],
  },
  setup: {
    title: 'Set up around how your firm quotes and books',
    intro: 'Builders price and schedule differently from call-out trades, so it follows your rules, not a generic script.',
    items: [
      {
        title: 'Say what work you take on',
        text: "Extensions, lofts, groundworks, repairs. It won't book a job type you've said you don't do.",
      },
      {
        title: 'Keep quoting in your hands',
        text: "Most builders don't give prices over the phone. Leave the price range blank and it tells callers you'll quote after a site visit.",
      },
      {
        title: 'Book site visits into your diary',
        text: 'Connect Google Calendar, Outlook or iCloud and it offers only the times you have free for surveys and quotes.',
      },
      {
        title: 'Cover more than one number',
        text: 'The Business and Agency plans include multiple phone numbers, for firms with separate lines for different sites or services.',
      },
    ],
  },
  faqs: [
    {
      question: 'Will it give customers a price for an extension?',
      answer:
        "Only if you tell it to. With no prices set, it explains that you'll quote after seeing the job and takes the details. If you set a guide range, it gives that range and says the figure is confirmed after a visit. It never makes one up.",
    },
    {
      question: 'Can it book site visits for quotes?',
      answer:
        "Yes. Connect your diary and it offers free slots for a visit and books them in. If you'd rather arrange visits yourself, it takes the caller's preferred days.",
    },
    {
      question: 'What happens with a job that needs several trades?',
      answer:
        "It still takes the enquiry in full and adds a plain note that the job looks like it needs more than one trade, so you can decide how to handle it before anyone goes out.",
    },
    {
      question: 'Do I have to change the number on my boards and van?',
      answer:
        "No. You divert the calls you can't answer to your Trade Receptionist number. Customers keep ringing the number they already have.",
    },
    {
      question: 'Can it answer for more than one phone line?',
      answer:
        'The Business and Agency plans include multiple phone numbers. Starter and Pro cover a single line.',
    },
  ],
  related: ['carpenters-and-joiners', 'roofers', 'electricians'],
  guides: ['cost-of-missed-calls-for-tradespeople', 'ai-receptionist-vs-answering-service-vs-voicemail'],
  closing: {
    title: 'Stay on the tools. Let every enquiry get answered.',
    text: 'Try it on your own number for 14 days and judge it on the enquiries it hands you.',
  },
};
