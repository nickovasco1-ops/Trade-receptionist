// One landing page per trade, from a shared template. The copy for each trade
// lives in src/marketing/content/trades/<slug>.ts and is written separately,
// so pages share a layout, not their words.

import React from 'react';
import { PLANS } from '../../lib/plans';
import {
  Card, ContentSection, CtaBand, FaqList, GradientWord, LinkCards, PageHero, Scenario,
  type LinkCardItem,
} from '../components/blocks';
import { MarketingLayout } from '../components/MarketingLayout';
import { tradeContent } from '../content/trades';
import { GUIDE_ROUTE_SEEDS, TRADE_ROUTE_SEEDS, type MarketingPageProps, type MarketingRoute } from '../routes';
import { faqPageNode, type JsonLdNode } from '../structured-data';

function relatedLinks(slug: string): LinkCardItem[] {
  const content = tradeContent(slug);
  const trades = content.related.map((related) => {
    const seed = TRADE_ROUTE_SEEDS.find((s) => s.slug === related);
    const other = tradeContent(related);
    return {
      href: `/trades/${related}`,
      title: seed?.name ?? related,
      text: other.intro.split('. ')[0] + '.',
    };
  });
  const guides = content.guides.map((guide) => {
    const seed = GUIDE_ROUTE_SEEDS.find((s) => s.slug === guide);
    return {
      href: `/guides/${guide}`,
      title: seed?.name ?? guide,
      text: seed?.description ?? '',
    };
  });
  return [...trades, ...guides];
}

export default function TradePage({ slug }: MarketingPageProps): React.ReactElement {
  const content = tradeContent(slug);
  const path = `/trades/${content.slug}`;
  const fromPrice = Math.min(...PLANS.map((plan) => plan.price));

  return (
    <MarketingLayout path={path}>
      <PageHero
        eyebrow={content.eyebrow}
        title={<>{content.headline.lead}<GradientWord>{content.headline.keyword}</GradientWord>{content.headline.tail}</>}
        intro={<p>{content.intro}</p>}
      />

      <ContentSection id="problem" title={content.pains.title} intro={<p>{content.pains.intro}</p>}>
        <div className="grid gap-4 md:grid-cols-2">
          {content.pains.items.map((item) => (
            <Card key={item.title} title={item.title}><p>{item.text}</p></Card>
          ))}
        </div>
      </ContentSection>

      <ContentSection id="calls" tone="raised" eyebrow="Example calls" title={content.scenarios.title} intro={<p>{content.scenarios.intro}</p>}>
        <div className="grid gap-4 lg:grid-cols-3">
          {content.scenarios.items.map((scenario) => (
            <Scenario key={scenario.title} {...scenario} />
          ))}
        </div>
      </ContentSection>

      <ContentSection id="setup" title={content.setup.title} intro={<p>{content.setup.intro}</p>}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {content.setup.items.map((item) => (
            <Card key={item.title} title={item.title}><p>{item.text}</p></Card>
          ))}
        </div>
        <p className="mt-10 max-w-[65ch] text-[16px] leading-[1.7] text-offwhite/70">
          Plans start at £{fromPrice} a month plus VAT, sized by how many calls you get, with a 14-day free trial and no setup
          fee.{' '}
          <a href="/pricing" className="font-semibold text-orange-soft underline underline-offset-4 hover:text-orange">
            Compare plans and what each includes
          </a>
          .
        </p>
      </ContentSection>

      <ContentSection id="faq" tone="raised" title={`Questions ${content.plural} ask`}>
        <FaqList faqs={content.faqs} />
      </ContentSection>

      <ContentSection id="related" title="Related trades and guides">
        <LinkCards items={relatedLinks(content.slug)} columns={content.related.length + content.guides.length === 4 ? 4 : 3} />
        <p className="mt-8 text-[15px] text-offwhite/66">
          Not your trade?{' '}
          <a href="/trades" className="font-semibold text-orange-soft underline underline-offset-4 hover:text-orange">See every trade we cover</a>.
        </p>
      </ContentSection>

      <CtaBand title={content.closing.title} text={content.closing.text} />
    </MarketingLayout>
  );
}

export function structuredData(route: MarketingRoute): JsonLdNode[] {
  return [faqPageNode(route.path, tradeContent(route.props?.slug).faqs)];
}
