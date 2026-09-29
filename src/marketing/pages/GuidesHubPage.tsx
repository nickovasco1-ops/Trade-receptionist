// Index of the guides. Not aimed at a keyword of its own; it exists so every
// guide is one click from a crawlable page and from the footer.

import React from 'react';
import { ContentSection, CtaBand, LinkCards, PageHero } from '../components/blocks';
import { MarketingLayout } from '../components/MarketingLayout';
import { GUIDE_ROUTE_SEEDS } from '../routes';

export default function GuidesHubPage(): React.ReactElement {
  const guides = GUIDE_ROUTE_SEEDS.map((seed) => ({
    href: `/guides/${seed.slug}`,
    title: seed.name,
    text: seed.description,
  }));

  return (
    <MarketingLayout path="/guides">
      <PageHero
        eyebrow="Guides"
        title="Plain-English guides to handling calls in a trade business"
        intro={
          <p>
            What missed calls really cost, how to stop missing them without buying anything, and an honest comparison of
            the ways to get calls answered. No invented statistics: where we show a number, we show the sum behind it.
          </p>
        }
      />

      <ContentSection id="guides" title="Guides">
        <LinkCards items={guides} />
      </ContentSection>

      <ContentSection id="trades" tone="raised" title="Looking for your trade?">
        <p className="max-w-[65ch] text-[17px] leading-[1.7] text-offwhite/70">
          See how calls are handled for{' '}
          <a href="/trades/plumbers" className="font-semibold text-orange-soft underline underline-offset-4">plumbers</a>,{' '}
          <a href="/trades/electricians" className="font-semibold text-orange-soft underline underline-offset-4">electricians</a>,{' '}
          <a href="/trades/builders" className="font-semibold text-orange-soft underline underline-offset-4">builders</a> and{' '}
          <a href="/trades" className="font-semibold text-orange-soft underline underline-offset-4">every other trade we cover</a>.
        </p>
      </ContentSection>

      <CtaBand
        title="Ready to stop missing calls?"
        text="Start the 14-day free trial and divert the calls you can't take."
      />
    </MarketingLayout>
  );
}
