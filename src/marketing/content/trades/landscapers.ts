import type { TradeContent } from './types';

export const landscapers: TradeContent = {
  slug: 'landscapers',
  plural: 'landscapers',
  eyebrow: 'Answering service for landscapers',
  headline: {
    lead: 'A call answering service for landscapers that hears the ',
    keyword: 'call',
    tail: ' over the mower.',
  },
  intro:
    "With a hedge trimmer running and ear defenders on, the phone doesn't stand a chance. Trade Receptionist answers in your business name, finds out whether it's a new patio or a regular maintenance visit, and texts you the details.",
  pains: {
    title: 'Why landscapers miss enquiries',
    intro: 'Outdoor work is loud, seasonal and weather-dependent, and all three make the phone harder to keep on top of.',
    items: [
      {
        title: 'Noise and gloves',
        text: 'Mowers, strimmers, a plate compactor or a mixer. You feel the phone buzz, if at all, after it has stopped.',
      },
      {
        title: 'Spring comes all at once',
        text: 'The first sunny weekend and everyone wants their garden sorted. You are flat out and the quote requests keep coming while you work.',
      },
      {
        title: 'Quote visits need the basics',
        text: "What they want, roughly how big, and whether you can get machinery round the side. Without that, you drive out to look at a job you can't do.",
      },
      {
        title: 'Weather rearranges everything',
        text: "After rain, regular customers ring to check you're still coming. Each one is a call to return between jobs.",
      },
    ],
  },
  scenarios: {
    title: 'How it handles a landscaper\'s calls',
    intro: 'Three calls a landscaping business gets. Written to show the flow, not recordings of real customers.',
    items: [
      {
        title: 'A new patio and fencing quote',
        context: "You're laying a lawn in the next village.",
        steps: [
          { who: 'Caller', text: "We'd like a new patio and the back fence replacing. Could someone come and quote?" },
          { who: 'Receptionist', text: 'Takes the address, what they want doing and anything they mention about the garden, like access. Offers a free slot for a quote visit if your diary is connected.' },
          { who: 'You get', text: 'A clear enquiry and, if you use a diary, the visit booked in.' },
        ],
      },
      {
        title: 'A regular customer checking after rain',
        context: 'A wet Tuesday.',
        steps: [
          { who: 'Caller', text: "You normally do our garden on a Wednesday. Are you still coming after all this rain?" },
          { who: 'Receptionist', text: 'Recognises that it is an existing customer asking about a booked job, takes their name and what they need, and reassures them you will be in touch.' },
          { who: 'You get', text: 'A short text so you can reply when you have rearranged the week.' },
        ],
      },
      {
        title: 'A fence down after the wind',
        context: 'Early on a Saturday.',
        steps: [
          { who: 'Caller', text: 'Two panels of our fence blew down last night.' },
          { who: 'Receptionist', text: 'Takes the address, how many panels and whether posts are broken, if they know.' },
          { who: 'You get', text: "The job with the postcode, so you can decide where it fits." },
        ],
      },
    ],
  },
  setup: {
    title: 'Set up for a landscaping business',
    intro: 'Whether you build gardens, maintain them or both, it takes the enquiry the way you want it.',
    items: [
      {
        title: 'Hard landscaping, maintenance, or both',
        text: "List what you do. If you don't do tree work or you don't take on one-off tidies, it won't book them.",
      },
      {
        title: 'Book quote visits around your jobs',
        text: 'Connect Google Calendar, Outlook or iCloud and it only offers the gaps you actually have.',
      },
      {
        title: 'Price guidance you choose',
        text: 'Give a range for common jobs like a lawn cut or a hedge, or none at all. It never prices a garden it has not seen.',
      },
      {
        title: 'No contract through the quiet months',
        text: "Plans are monthly and you can cancel any time, so you're not paying for a busy-season service through winter.",
      },
    ],
  },
  faqs: [
    {
      question: 'Can it book quote visits around my existing jobs?',
      answer:
        "Yes. Connect your diary and it only offers times you're free. Without a diary it takes the caller's preferred days for you to confirm.",
    },
    {
      question: 'Can it tell a regular customer from a new enquiry?',
      answer:
        'It asks. An existing customer chasing a booked job gets reassured and you get a message; a new enquiry gets the full set of questions.',
    },
    {
      question: 'Will it give prices for garden work?',
      answer:
        "Only the ranges you give it, and it always says you'll confirm after seeing the garden. With no prices set, it takes the details so you can quote.",
    },
    {
      question: 'Am I tied in over winter?',
      answer:
        'No. Plans are monthly with no long contract. You can cancel from your account settings whenever you like.',
    },
  ],
  related: ['builders', 'roofers', 'carpenters-and-joiners'],
  guides: ['cost-of-missed-calls-for-tradespeople', 'how-to-never-miss-a-call-on-the-job'],
  closing: {
    title: 'Keep the engine running. The phone gets answered.',
    text: 'Start the 14-day free trial before the spring rush and let every enquiry get a reply.',
  },
};
