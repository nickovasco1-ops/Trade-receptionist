// Guide: how to never miss a call on the job.
// Primary keyword: "never miss a call on the job"; secondary: "missed call
// solutions for tradespeople", "how to divert calls on a UK mobile".
//
// Most of this page is useful whether or not the reader ever buys anything:
// the divert codes and the voicemail script are the reason to link to it.
// The divert codes are the standard GSM codes UK networks use. The product
// itself uses **004* (see CLAUDE.md §8.5, keep-existing number mode).

import React from 'react';
import { ContentSection, CtaBand, FaqList, LinkCards, PageHero, Prose } from '../../components/blocks';
import { MarketingLayout } from '../../components/MarketingLayout';
import type { MarketingRoute } from '../../routes';
import { articleNode, faqPageNode, type FaqItem, type JsonLdNode } from '../../structured-data';

const PATH = '/guides/how-to-never-miss-a-call-on-the-job';
const UPDATED = '2026-09-29';

interface DivertCode {
  code: string;
  what: string;
}

const DIVERT_CODES: readonly DivertCode[] = [
  { code: '**61*number#', what: 'Divert when you do not answer' },
  { code: '**67*number#', what: 'Divert when you are already on a call' },
  { code: '**62*number#', what: 'Divert when your phone is off or has no signal' },
  { code: '**004*number#', what: 'All three of the above in one go' },
  { code: '##004#', what: 'Cancel those diverts' },
  { code: '*#61#', what: 'Check where unanswered calls are going' },
];

const FAQS: readonly FaqItem[] = [
  {
    question: 'What is the code to divert calls when I do not answer?',
    answer:
      'On most UK mobile networks, dial **61* followed by the number you want calls sent to, then #, and press call. To cover busy and no signal as well, use **004* instead of **61*. To cancel, dial ##004#.',
  },
  {
    question: 'Will diverting calls cost me anything?',
    answer:
      'It depends on your tariff. Diverted calls are often taken from your plan like any other call, but some tariffs charge for them. Check with your network before you rely on it.',
  },
  {
    question: 'Why did my iPhone send every call away?',
    answer:
      'The Call Forwarding switch in the iPhone settings forwards every call, not just the ones you miss. For missed calls only, turn that switch off and use the **61* or **004* code from the keypad instead.',
  },
  {
    question: 'What should my voicemail greeting say?',
    answer:
      "Your business name, that you're working, and exactly what to leave: their name, number, postcode and what the job is, plus when you'll ring back. A greeting that asks for specifics gets messages you can act on.",
  },
];

export default function NeverMissACallGuide(): React.ReactElement {
  return (
    <MarketingLayout path={PATH}>
      <PageHero
        eyebrow="Guide"
        title="How to never miss a call on the job: practical options for tradespeople"
        intro={
          <p>
            You can't answer from the top of a ladder or with your hands in a boiler, and you shouldn't try. But the call
            doesn't have to be lost. Here are the options, from free settings on your phone to having every call answered
            for you, and how to put them together.
          </p>
        }
      />

      <ContentSection id="divert" title="1. Set up call diverts properly">
        <Prose>
          <p>
            Almost every other option depends on this. A conditional divert sends a call somewhere else only when you
            don't pick up, are on another call, or have no signal. When you're free, your phone rings as normal.
          </p>
          <p>
            On UK mobiles you set diverts by typing a code into the phone keypad and pressing call, with the number you
            want calls sent to in place of <em>number</em>:
          </p>
        </Prose>
        <div className="mt-6 max-w-2xl overflow-hidden rounded-card bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(2,13,24,0.4)]">
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">UK mobile call divert codes</caption>
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.1em] text-offwhite/62">
                <th scope="col" className="px-5 py-4 font-bold">Dial</th>
                <th scope="col" className="px-5 py-4 font-bold">What it does</th>
              </tr>
            </thead>
            <tbody>
              {DIVERT_CODES.map((row, index) => (
                <tr key={row.code} className={index % 2 === 0 ? 'bg-navy-mid/60' : ''}>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-[14px] text-orange-soft">{row.code}</td>
                  <td className="px-5 py-4 text-offwhite/74">{row.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6">
          <Prose>
            <p>
              These are the standard codes on the main UK networks. If one is rejected, your network's app or customer
              services can set the same thing. Two things to check: whether diverted calls cost extra on your tariff, and on
              an iPhone, that the Call Forwarding switch in settings is off. That switch forwards every call, not just the
              missed ones.
            </p>
            <p>
              A landline is different: most providers offer divert on no answer, but you set it through them rather than
              with these codes.
            </p>
          </Prose>
        </div>
      </ContentSection>

      <ContentSection id="voicemail" tone="raised" title="2. Make voicemail ask for what you need">
        <Prose>
          <p>
            If calls go to voicemail, the greeting decides whether you get a job or a mystery. Ask for the specifics, and
            say when you'll call back so the caller has a reason to wait. For example:
          </p>
          <blockquote className="rounded-card bg-white/[0.06] p-6 italic text-offwhite/80 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            "You've reached [your business name]. I'm on a job right now. Leave your name, number, postcode and what you need
            doing, and I'll ring you back by the end of the day. If water is coming through, say so at the start and I'll
            call as soon as I can."
          </blockquote>
          <p>
            Then keep the promise. A greeting that says "end of the day" and a callback the next afternoon teaches customers
            to ring someone else.
          </p>
        </Prose>
      </ContentSection>

      <ContentSection id="habits" title="3. Habits that cost nothing">
        <Prose>
          <ul>
            <li>
              <strong>Set callback times.</strong> Ten minutes at each break, returning every missed call, beats an hour of
              callbacks at nine at night.
            </li>
            <li>
              <strong>Reply by text when you can't talk.</strong> Both iPhone and Android let you decline a call with a quick
              text message. "On a job, will call you at 12" keeps a caller from moving on.
            </li>
            <li>
              <strong>Put your hours on your van and your listings.</strong> People who know when you are reachable are
              more likely to wait.
            </li>
          </ul>
        </Prose>
      </ContentSection>

      <ContentSection id="someone" tone="raised" title="4. Get someone else to answer">
        <Prose>
          <h3>A family member or office help</h3>
          <p>
            A partner or part-time admin who knows the business is the best receptionist there is, when they are available.
            The catch is that they are not available at seven in the morning, during their own work or on holiday, and it can
            put a strain on the arrangement.
          </p>
          <h3>A human answering service</h3>
          <p>
            A call-handling company answers in your name and passes on a message. A person can use judgement on awkward
            calls. Hours, booking and pricing vary a lot between providers, so check what counts as a call and what happens
            out of hours.
          </p>
          <h3>An AI receptionist</h3>
          <p>
            Software answers every diverted call at once, any hour, takes the details, flags urgent jobs and can book into
            your diary. It is consistent and always available, but it can mishear and it follows instructions rather than
            improvising. That is what <a href="/">Trade Receptionist</a> is.
          </p>
          <p>
            For a straight comparison of the three, read{' '}
            <a href="/guides/ai-receptionist-vs-answering-service-vs-voicemail">AI receptionist vs answering service vs voicemail</a>.
          </p>
        </Prose>
      </ContentSection>

      <ContentSection id="combine" title="Putting it together">
        <Prose>
          <p>
            The setup that misses least is simple: answer when you can, and divert everything you can't to something that
            answers straight away rather than to voicemail. With an AI receptionist that is one divert code, **004* followed
            by the number you are given, and you keep your own number on the van.
          </p>
          <p>
            Not sure it is worth it? <a href="/guides/cost-of-missed-calls-for-tradespeople">Work out what missed calls cost you</a>{' '}
            first, or see <a href="/trades">how it works for your trade</a>.
          </p>
        </Prose>
      </ContentSection>

      <ContentSection id="faq" tone="raised" title="Questions">
        <FaqList faqs={FAQS} />
      </ContentSection>

      <ContentSection id="more" title="Related">
        <LinkCards
          items={[
            { href: '/guides/cost-of-missed-calls-for-tradespeople', title: 'The cost of missed calls', text: 'The sum, with worked examples you can check.' },
            { href: '/trades/electricians', title: 'For electricians', text: 'Handling faults, EICRs and EV enquiries while you work safely.' },
            { href: '/trades/roofers', title: 'For roofers', text: 'Answering while you are on the roof, and after a storm.' },
          ]}
        />
      </ContentSection>

      <CtaBand
        title="One divert code. Every call answered."
        text="Start the 14-day free trial, divert the calls you miss, and keep your own number."
      />
    </MarketingLayout>
  );
}

export function structuredData(route: MarketingRoute): JsonLdNode[] {
  return [articleNode(route.path, route.title, route.description, UPDATED), faqPageNode(route.path, FAQS)];
}
