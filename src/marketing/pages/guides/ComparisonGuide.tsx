// Guide: AI receptionist vs answering service vs voicemail.
// Primary keyword: "ai receptionist vs answering service".
//
// Written to be fair to the alternatives, including where an AI receptionist
// is the wrong choice. Nothing here quotes a competitor's price or a
// statistic: pricing models are described, not priced, because they vary by
// provider and we cannot evidence a "typical" figure.

import React from 'react';
import { ContentSection, CtaBand, FaqList, LinkCards, PageHero, Prose } from '../../components/blocks';
import { MarketingLayout } from '../../components/MarketingLayout';
import type { MarketingRoute } from '../../routes';
import { articleNode, faqPageNode, type FaqItem, type JsonLdNode } from '../../structured-data';

const PATH = '/guides/ai-receptionist-vs-answering-service-vs-voicemail';
const UPDATED = '2026-09-29';

interface ComparisonRow {
  label: string;
  voicemail: string;
  answeringService: string;
  ai: string;
}

const ROWS: readonly ComparisonRow[] = [
  {
    label: 'Who answers',
    voicemail: 'Nobody. A recorded greeting.',
    answeringService: 'A person at a call-handling company, working from a script about your business.',
    ai: 'Software with a natural voice, working from what you have told it about your business.',
  },
  {
    label: 'Hours',
    voicemail: 'Always on.',
    answeringService: 'Depends on the provider. Some cover evenings and weekends, some charge extra for it.',
    ai: 'Every call, any hour. You decide what it tells callers outside your working hours.',
  },
  {
    label: 'What you get afterwards',
    voicemail: 'An audio message, if the caller leaves one.',
    answeringService: 'A written message by text or email.',
    ai: 'A written summary by text and email, plus a recording and transcript.',
  },
  {
    label: 'Books into your diary',
    voicemail: 'No.',
    answeringService: 'Some do, often at extra cost. Many only take messages.',
    ai: 'Yes, if you connect your calendar. Otherwise it takes preferred times.',
  },
  {
    label: 'Urgent calls',
    voicemail: 'You find out when you listen.',
    answeringService: 'A person can judge urgency and escalate, if the script tells them how.',
    ai: 'Flags set situations (gas smell, flooding, sparking and so on) as urgent and alerts you at once.',
  },
  {
    label: 'Unusual or sensitive calls',
    voicemail: 'Not handled.',
    answeringService: 'The strongest option. A person can use judgement.',
    ai: 'Weaker. It follows its instructions and can mishear. It takes a message when unsure.',
  },
  {
    label: 'Consistency',
    voicemail: 'The same greeting every time.',
    answeringService: 'Varies with whoever picks up.',
    ai: 'The same questions and tone on every call.',
  },
  {
    label: 'How it is usually priced',
    voicemail: 'Included with your phone contract.',
    answeringService: 'Per call, per minute or monthly bundles. Check what counts as a call.',
    ai: 'Monthly plans sized by number of calls.',
  },
];

const FAQS: readonly FaqItem[] = [
  {
    question: 'Is an AI receptionist better than a human answering service?',
    answer:
      'Not for everything. A person is better at unusual, emotional or complicated calls. An AI receptionist is better at answering every call instantly, at any hour, asking the same questions every time and booking straight into a diary. For most routine trade enquiries, the second list matters more.',
  },
  {
    question: 'Will customers mind talking to an AI?',
    answer:
      "Some will prefer a person, and that's worth being honest about. What most callers want is to be answered, understood and told what happens next. A good AI receptionist does that, and one that can put the caller through to you covers the rest.",
  },
  {
    question: 'Is voicemail really that bad for a trade business?',
    answer:
      "Not always. If you miss a handful of calls a week and your customers are happy to leave a message, a clear voicemail greeting and prompt callbacks may be all you need. It falls down when callers ring round instead of waiting.",
  },
  {
    question: 'Can I use more than one of these?',
    answer:
      'Yes, and many people do. A common setup is answering yourself when you can, with unanswered calls diverted to an answering service or AI receptionist rather than voicemail.',
  },
];

export default function ComparisonGuide(): React.ReactElement {
  return (
    <MarketingLayout path={PATH}>
      <PageHero
        eyebrow="Guide"
        title="AI receptionist vs answering service vs voicemail: which suits a trade business?"
        intro={
          <p>
            When you can't answer, one of three things happens to the call. It goes to voicemail, a person at an answering
            service picks up, or an AI receptionist does. Here is what each one actually does with that call, and where each
            is the right choice, including where an AI receptionist isn't.
          </p>
        }
      />

      <ContentSection id="options" title="What each option does with a call">
        <Prose>
          <h3>Voicemail</h3>
          <p>
            It costs nothing extra and it never goes off sick. The problem is what callers do with it. Someone with a
            routine job may leave a message. Someone with water through the ceiling, or who is ringing three firms for a
            quote, is more likely to hang up and try the next number. You also learn nothing until you listen, and many
            messages are just a name and a number.
          </p>
          <h3>A human answering service</h3>
          <p>
            A call-handling company answers in your business name, works from a script you agree, and passes you a
            message. The strength is judgement: a person can calm a distressed caller or deal with something unusual. The
            trade-offs are that the person is not a tradesperson, answers for many businesses, and the quality depends on
            who picks up. Hours, diary booking and what counts as a billable call all vary between providers.
          </p>
          <h3>An AI receptionist</h3>
          <p>
            Software answers every call straight away, at any hour, in your business name. It asks the same questions
            every time, can book into your calendar, and sends you a written summary. The trade-offs are real too: it can
            mishear, it follows its instructions rather than improvising, and some callers would rather speak to a person.
            A good one takes a message when it isn't sure, and can put the caller through to you.
          </p>
        </Prose>
      </ContentSection>

      <ContentSection id="compare" tone="raised" title="Side by side">
        <div className="overflow-x-auto rounded-card bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(2,13,24,0.4)]">
          <table className="w-full min-w-[720px] text-left text-[15px] leading-[1.55]">
            <caption className="sr-only">Comparison of voicemail, a human answering service and an AI receptionist</caption>
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.1em] text-offwhite/62">
                <th scope="col" className="px-5 py-4 font-bold">&nbsp;</th>
                <th scope="col" className="px-5 py-4 font-bold">Voicemail</th>
                <th scope="col" className="px-5 py-4 font-bold">Answering service</th>
                <th scope="col" className="px-5 py-4 font-bold text-orange-soft">AI receptionist</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, index) => (
                <tr key={row.label} className={index % 2 === 0 ? 'bg-navy-mid/60' : ''}>
                  <th scope="row" className="px-5 py-4 align-top font-semibold text-offwhite">{row.label}</th>
                  <td className="px-5 py-4 align-top text-offwhite/70">{row.voicemail}</td>
                  <td className="px-5 py-4 align-top text-offwhite/70">{row.answeringService}</td>
                  <td className="px-5 py-4 align-top text-offwhite/80">{row.ai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentSection>

      <ContentSection id="which" title="Which one fits your business">
        <Prose>
          <ul>
            <li>
              <strong>Voicemail is enough</strong> if you miss only a few calls a week, most of your work is repeat
              customers who will wait, and you return calls the same day.
            </li>
            <li>
              <strong>A human answering service fits</strong> if a lot of your calls are sensitive or complicated, and you
              want a person to use judgement more than you want bookings made.
            </li>
            <li>
              <strong>An AI receptionist fits</strong> if you regularly miss calls while working, your callers tend to ring
              round, and you want every call answered at once, written up and, ideally, booked in.
            </li>
          </ul>
          <h3>Questions to ask any provider</h3>
          <ul>
            <li>What counts as a call, and are spam and wrong numbers charged?</li>
            <li>What happens out of hours, and does it cost more?</li>
            <li>Is there a minimum term or a setup fee?</li>
            <li>Can I keep my existing number?</li>
            <li>How exactly are urgent calls passed to me, and how fast?</li>
            <li>Can I read or hear what was actually said on each call?</li>
          </ul>
          <p>
            Our own answers: plans are monthly with no setup fee, you keep your number, urgent calls come to you by text
            and email straight away, and every call has a recording, transcript and summary.{' '}
            <a href="/pricing">See the plans</a>, or read{' '}
            <a href="/guides/how-to-never-miss-a-call-on-the-job">other ways to stop missing calls</a>.
          </p>
        </Prose>
      </ContentSection>

      <ContentSection id="faq" tone="raised" title="Questions">
        <FaqList faqs={FAQS} />
      </ContentSection>

      <ContentSection id="more" title="Related">
        <LinkCards
          items={[
            { href: '/guides/cost-of-missed-calls-for-tradespeople', title: 'The cost of missed calls', text: 'Work out what unanswered calls cost your business, with the sum shown.' },
            { href: '/trades', title: 'By trade', text: 'How call handling works for plumbers, electricians, builders and more.' },
            { href: '/pricing', title: 'Pricing', text: 'Four monthly plans sized by calls, each with a 14-day free trial.' },
          ]}
        />
      </ContentSection>

      <CtaBand
        title="Try the AI option on your own calls."
        text="Fourteen days on the calls you currently miss is the fairest comparison there is."
      />
    </MarketingLayout>
  );
}

export function structuredData(route: MarketingRoute): JsonLdNode[] {
  return [articleNode(route.path, route.title, route.description, UPDATED), faqPageNode(route.path, FAQS)];
}
