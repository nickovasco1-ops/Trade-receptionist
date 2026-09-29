// Hub linking every trade page. Targets the broad "call answering service for
// tradesmen" query so the individual trade pages can own their specific ones.

import React from 'react';
import { Card, ContentSection, CtaBand, FaqList, GradientWord, LinkCards, PageHero } from '../components/blocks';
import { MarketingLayout } from '../components/MarketingLayout';
import { tradeContent } from '../content/trades';
import { TRADE_ROUTE_SEEDS, type MarketingRoute } from '../routes';
import { faqPageNode, type FaqItem, type JsonLdNode } from '../structured-data';

const HUB_FAQS: readonly FaqItem[] = [
  {
    question: 'My trade is not listed. Will it still work for me?',
    answer:
      "Very likely. It works for any business where customers ring to book work: plasterers, tilers, painters and decorators, drainage, glaziers and more. You tell it what you do on setup, and it takes enquiries on that basis.",
  },
  {
    question: 'Is it a person or a machine answering?',
    answer:
      'It is an AI receptionist with a natural British voice. It answers in your business name, asks the questions a good receptionist would, and sends you the details. There is no call centre.',
  },
  {
    question: 'Do I need a new phone number?',
    answer:
      "No. You keep your number and divert the calls you can't answer to your Trade Receptionist number. If you'd prefer a separate business number, it can be that instead.",
  },
];

const HOW_IT_DIFFERS = [
  {
    title: 'It knows what urgent sounds like',
    text: 'Burst pipes, gas smells, sparking, flooding and no heating are treated as urgent and sent to you straight away, with safety advice where it matters.',
  },
  {
    title: 'It speaks your trade',
    text: 'You tell it the work you do and do not do, your hours and, if you want, your prices. It takes the details a tradesperson needs, not a generic message.',
  },
  {
    title: 'It books, if you want it to',
    text: 'Connect Google Calendar, Outlook or iCloud and it offers only your free slots. Or leave the diary to you and it takes preferred times.',
  },
];

export default function TradesHubPage(): React.ReactElement {
  const cards = TRADE_ROUTE_SEEDS.map((seed) => ({
    href: `/trades/${seed.slug}`,
    title: seed.name,
    text: tradeContent(seed.slug).pains.intro,
  }));

  return (
    <MarketingLayout path="/trades">
      <PageHero
        eyebrow="Call answering service for tradesmen"
        title={<>A call answering service built around your <GradientWord>trade</GradientWord>.</>}
        intro={
          <p>
            A plumber's urgent call is not an electrician's, and a builder quotes differently from a locksmith. Trade
            Receptionist answers the calls you miss in your business name and handles them the way your trade needs.
            Pick yours to see how.
          </p>
        }
      />

      <ContentSection id="trades" title="Choose your trade">
        <LinkCards items={cards} columns={4} />
      </ContentSection>

      <ContentSection id="how" tone="raised" title="What changes from trade to trade">
        <div className="grid gap-4 md:grid-cols-3">
          {HOW_IT_DIFFERS.map((item) => (
            <Card key={item.title} title={item.title}><p>{item.text}</p></Card>
          ))}
        </div>
      </ContentSection>

      <ContentSection id="faq" title="Common questions">
        <FaqList faqs={HUB_FAQS} />
      </ContentSection>

      <CtaBand
        title="Whatever your trade, stop sending customers to voicemail."
        text="Start the 14-day free trial, divert the calls you can't take, and read every summary it sends you."
      />
    </MarketingLayout>
  );
}

export function structuredData(route: MarketingRoute): JsonLdNode[] {
  return [faqPageNode(route.path, HUB_FAQS)];
}
