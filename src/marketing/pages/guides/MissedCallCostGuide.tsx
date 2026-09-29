// Guide: the cost of missed calls for tradespeople.
// Primary keyword: "cost of missed calls for tradespeople"; also answers
// "how much do missed calls cost a plumber".
//
// CLAUDE.md §1.1: this page must not quote a third-party statistic. Searched
// 2026-08-11: no independent UK source exists for a "missed call cost" figure;
// the ones circulating online trace back to call-answering vendors. So the page
// teaches the sum and shows worked examples whose every input is on screen.
// The formula is the one components/Calculator.tsx uses. Keep them in step.

import React from 'react';
import { PLANS } from '../../../lib/plans';
import { ContentSection, CtaBand, FaqList, LinkCards, PageHero, Prose } from '../../components/blocks';
import { MarketingLayout } from '../../components/MarketingLayout';
import type { MarketingRoute } from '../../routes';
import { articleNode, faqPageNode, type FaqItem, type JsonLdNode } from '../../structured-data';

const PATH = '/guides/cost-of-missed-calls-for-tradespeople';
const UPDATED = '2026-09-29';
const WEEKS = 52;

interface Example {
  trade: string;
  missedPerWeek: number;
  jobValue: number;
  winRate: number;
}

// Illustrative inputs only, chosen to show the sum. Not averages, not research.
const EXAMPLES: readonly Example[] = [
  { trade: 'Plumber', missedPerWeek: 1, jobValue: 280, winRate: 35 },
  { trade: 'Electrician', missedPerWeek: 2, jobValue: 200, winRate: 30 },
  { trade: 'Builder', missedPerWeek: 1, jobValue: 1500, winRate: 10 },
];

const gbp = (value: number): string => `£${Math.round(value).toLocaleString('en-GB')}`;
const yearly = (e: Example): number => e.missedPerWeek * e.jobValue * (e.winRate / 100) * WEEKS;

const FAQS: readonly FaqItem[] = [
  {
    question: 'How much do missed calls cost a plumber?',
    answer:
      "It depends on how many calls you miss, what the work is worth and how often you'd have won it. As an example with stated inputs: one missed call a week, a £280 job and a 35% chance of winning it comes to about £5,100 a year. Swap in your own numbers using the sum on this page.",
  },
  {
    question: 'Is there a UK statistic for how many callers never ring back?',
    answer:
      "Figures like that circulate online, but the ones we've been able to trace come from companies that sell call answering, not independent research. We don't rely on them. Your own call log over a couple of weeks is better evidence for your business than any national figure.",
  },
  {
    question: 'Should I count every missed call?',
    answer:
      "No. Leave out calls from people you know, suppliers, sales calls and anyone who left a message and got a callback in time. Count the unknown numbers that never turned into work.",
  },
  {
    question: 'What is a sensible win rate to use?',
    answer:
      'Use your own. If you quote ten jobs and win three, use 30%. For emergency work, where the first trade to answer usually gets it, your rate on answered calls may be higher. For big quoted jobs it is usually lower.',
  },
];

export default function MissedCallCostGuide(): React.ReactElement {
  const starter = PLANS.find((plan) => plan.key === 'starter');

  return (
    <MarketingLayout path={PATH}>
      <PageHero
        eyebrow="Guide"
        title="The cost of missed calls for tradespeople: work out your own number"
        intro={
          <p>
            You will find big numbers online for what missed calls cost a trade business. We looked for an independent UK
            study behind them and did not find one we would stand behind. So rather than quote a figure, this guide shows
            you the sum and walks through examples where every input is on the page.
          </p>
        }
      />

      <ContentSection id="sum" title="The sum">
        <Prose>
          <p>Four numbers, all of which you can get from your own phone and your own diary:</p>
          <ul>
            <li><strong>Missed calls a week</strong> that were new work, not friends, suppliers or sales calls.</li>
            <li><strong>Your typical job value</strong> for that kind of enquiry.</li>
            <li><strong>Your win rate</strong>: out of the enquiries you do answer, how many turn into paid work.</li>
            <li><strong>Working weeks a year.</strong> We use {WEEKS}; take off your holidays if you want to be strict.</li>
          </ul>
          <p>
            <strong>Missed calls a week × job value × win rate × weeks = work lost a year.</strong>
          </p>
          <p>
            It is deliberately simple. It ignores repeat work and referrals from customers you never got, so if anything it
            understates the cost. The calculator on our <a href="/">homepage</a> uses the same sum.
          </p>
        </Prose>
      </ContentSection>

      <ContentSection id="examples" tone="raised" title="Worked examples">
        <Prose>
          <p>
            These inputs are made up to show the arithmetic. They are not averages for each trade. Replace them with yours.
          </p>
        </Prose>
        <div className="mt-8 overflow-x-auto rounded-card bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(2,13,24,0.4)]">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <caption className="sr-only">Worked examples of the yearly cost of missed calls, with inputs shown</caption>
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.1em] text-offwhite/62">
                <th scope="col" className="px-5 py-4 font-bold">Example</th>
                <th scope="col" className="px-5 py-4 font-bold">Missed a week</th>
                <th scope="col" className="px-5 py-4 font-bold">Job value</th>
                <th scope="col" className="px-5 py-4 font-bold">Win rate</th>
                <th scope="col" className="px-5 py-4 font-bold text-orange-soft">Lost a year</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map((example, index) => (
                <tr key={example.trade} className={index % 2 === 0 ? 'bg-navy-mid/60' : ''}>
                  <th scope="row" className="px-5 py-4 font-semibold text-offwhite">{example.trade}</th>
                  <td className="px-5 py-4 text-offwhite/74">{example.missedPerWeek}</td>
                  <td className="px-5 py-4 text-offwhite/74">{gbp(example.jobValue)}</td>
                  <td className="px-5 py-4 text-offwhite/74">{example.winRate}%</td>
                  <td className="px-5 py-4 font-semibold text-offwhite">{gbp(yearly(example))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-10">
          <Prose>
            <h3>How much do missed calls cost a plumber?</h3>
            <p>
              Take the plumber row. One missed call a week, a £280 job, and a 35% chance of winning it: 1 × £280 × 35% ×{' '}
              {WEEKS} = {gbp(yearly(EXAMPLES[0]))} a year. If you would rather think in single jobs: miss one £350 job a
              month and that is £4,200 a year.
            </p>
            <p>
              Emergency work behaves differently. Someone with a burst pipe keeps ringing until somebody answers, so if you
              don't pick up you are unlikely to get that job at all, and if you do answer you are well placed to win it. So for
              emergency calls your win rate is high, and each one you miss costs more than a missed quote enquiry.
            </p>
          </Prose>
        </div>
      </ContentSection>

      <ContentSection id="measure" title="How to find your real numbers">
        <Prose>
          <ul>
            <li>
              <strong>Check your call log for two weeks.</strong> Count missed calls from numbers you don't recognise, and
              note which you called back and what came of it.
            </li>
            <li>
              <strong>Look at your quotes.</strong> Your win rate is quotes won divided by quotes given. Use the last few
              months, not your best month.
            </li>
            <li>
              <strong>Count the time too.</strong> An hour most evenings returning calls is an hour of your week, even when
              every call is answered in the end.
            </li>
            <li>
              <strong>Measure it with the calls themselves.</strong> Divert the calls you can't take to an answering service
              or AI receptionist for a trial period and count the enquiries that come through.
            </li>
          </ul>
          {starter && (
            <p>
              For comparison, our Starter plan is £{starter.price} a month plus VAT for up to {starter.callLimit} calls. On
              the plumber example, one extra £280 job every couple of months brings in more than the plan costs, though your
              margin on the job is what really matters. Whether that holds for you depends on your own numbers, which is the
              point of working them out. <a href="/pricing">See all plans</a>.
            </p>
          )}
        </Prose>
      </ContentSection>

      <ContentSection id="faq" tone="raised" title="Questions">
        <FaqList faqs={FAQS} />
      </ContentSection>

      <ContentSection id="more" title="Related">
        <LinkCards
          items={[
            { href: '/guides/how-to-never-miss-a-call-on-the-job', title: 'How to never miss a call on the job', text: 'Divert codes, voicemail that works, and the answering options compared.' },
            { href: '/trades/plumbers', title: 'For plumbers', text: 'How an AI receptionist handles burst pipes, quotes and landlord calls.' },
            { href: '/trades', title: 'All trades', text: 'Pick your trade to see the calls it handles and how urgent jobs reach you.' },
          ]}
        />
      </ContentSection>

      <CtaBand
        title="Find out what you are missing with your own calls."
        text="The 14-day free trial shows every call it answered for you. That is your real number."
      />
    </MarketingLayout>
  );
}

export function structuredData(route: MarketingRoute): JsonLdNode[] {
  return [articleNode(route.path, route.title, route.description, UPDATED), faqPageNode(route.path, FAQS)];
}
