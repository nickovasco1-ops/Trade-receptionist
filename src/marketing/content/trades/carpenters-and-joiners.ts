import type { TradeContent } from './types';

export const carpentersAndJoiners: TradeContent = {
  slug: 'carpenters-and-joiners',
  plural: 'carpenters and joiners',
  eyebrow: 'Answering service for carpenters and joiners',
  headline: {
    lead: 'Call answering for carpenters and joiners that takes the ',
    keyword: 'call',
    tail: " while the saw's running.",
  },
  intro:
    "Hanging doors on site or cutting a staircase string in the workshop, stopping to answer means stopping the job. Trade Receptionist answers in your business name, takes down what the customer wants made or fitted, and texts you the enquiry.",
  pains: {
    title: 'Why carpenters and joiners miss good work',
    intro: 'Most joinery enquiries are bespoke. They need a conversation, and the phone always goes mid-cut.',
    items: [
      {
        title: 'Machines, dust and ear defenders',
        text: "A mitre saw, a planer or the extraction running, and you won't hear it. Pick it up with glue on your hands and you regret it.",
      },
      {
        title: 'Bespoke work needs detail',
        text: 'Fitted wardrobes, alcove units, a new staircase. You need the room, rough sizes and what they are after before a visit is worth making.',
      },
      {
        title: '"When can you start?"',
        text: "Customers want a date. Promising one on a rushed call from site is how diaries get overbooked and customers get let down.",
      },
      {
        title: 'Trade and domestic calls mixed together',
        text: 'A builder after a second-fix carpenter and a homeowner wanting a door hung need different answers. On voicemail they sound the same.',
      },
    ],
  },
  scenarios: {
    title: 'How it handles joinery calls',
    intro: 'Three calls a carpenter or joiner gets. Written examples to show the flow, not real customer recordings.',
    items: [
      {
        title: 'Fitted wardrobes in an alcove',
        context: "You're in the workshop on a batch of doors.",
        steps: [
          { who: 'Caller', text: "We'd like fitted wardrobes either side of the chimney breast in the main bedroom." },
          { who: 'Receptionist', text: 'Takes the address, which room, any rough sizes they have and the style they are after. Offers a slot to come and measure up if your diary is connected.' },
          { who: 'You get', text: 'The enquiry and the measure-up booked, if you use a diary.' },
        ],
      },
      {
        title: 'A door that sticks',
        context: 'A damp week in October.',
        steps: [
          { who: 'Caller', text: "Our front door's sticking at the top since the weather changed." },
          { who: 'Receptionist', text: 'Takes the details and when they are in, and gives your guide price for an adjustment if you have set one.' },
          { who: 'You get', text: 'A quick job you can fit in around the bigger ones.' },
        ],
      },
      {
        title: 'A builder looking for a second-fix carpenter',
        context: 'A main contractor rings mid-afternoon.',
        steps: [
          { who: 'Caller', text: 'We need a carpenter for second fix on four houses from next month.' },
          { who: 'Receptionist', text: 'Takes the company, the site location, what is needed and the dates, and the best contact to ring back.' },
          { who: 'You get', text: 'A trade enquiry with enough detail to price it.' },
        ],
      },
    ],
  },
  setup: {
    title: 'Set up for how you take on work',
    intro: 'Site work, workshop work, domestic and trade. It follows the rules you give it.',
    items: [
      {
        title: 'Say what you make and fit',
        text: "Doors, kitchens, stairs, fitted furniture, first and second fix. It won't book work you don't take on.",
      },
      {
        title: 'No start dates you have not agreed',
        text: 'It only offers times from your diary and never promises a start or finish date you have not given it.',
      },
      {
        title: 'Measure-ups in your diary',
        text: 'Connect Google Calendar, Outlook or iCloud and measure-up visits book into your free slots.',
      },
      {
        title: 'Your number, unchanged',
        text: "Divert the calls you can't answer. Customers and contractors keep ringing the number they already have.",
      },
    ],
  },
  faqs: [
    {
      question: 'Can it take measurements over the phone?',
      answer:
        "It notes any sizes the caller gives, which helps you decide whether a visit is worth it. It isn't a substitute for measuring up yourself, and it doesn't pretend to be.",
    },
    {
      question: 'Will it promise customers a start date?',
      answer:
        "No. It only offers times that are free in your diary for a visit, and it never promises a start or completion date you haven't given it.",
    },
    {
      question: 'Can it handle calls from builders as well as homeowners?',
      answer:
        'Yes. It takes the job details whoever is calling. For a contractor it notes the company, the site and the dates they mention, so you can price the work.',
    },
    {
      question: 'I split my time between site and the workshop. Does that matter?',
      answer:
        'No. The calls you miss divert to it wherever you are, and you get the summary on your phone either way.',
    },
  ],
  related: ['builders', 'locksmiths', 'roofers'],
  guides: ['ai-receptionist-vs-answering-service-vs-voicemail', 'cost-of-missed-calls-for-tradespeople'],
  closing: {
    title: 'Finish the cut. The enquiry is already written down.',
    text: 'Try it free for 14 days on the calls you currently miss.',
  },
};
