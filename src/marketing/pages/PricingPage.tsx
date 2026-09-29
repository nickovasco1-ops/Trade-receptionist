// Pricing, read from src/lib/plans.ts: the same list the checkout modal and
// Stripe Payment Links use, so this page cannot advertise a price the checkout
// does not charge (CLAUDE.md §10, "Advertised price ≠ what the Payment Link
// charged").
//
// Monthly prices only. The homepage toggle also shows yearly prices, but
// plans.ts has no yearly Payment Links, so a yearly price cannot currently be
// bought. TODO(human): add yearly links, or remove the toggle, then decide
// whether yearly belongs here.

import React from 'react';
import { Check } from 'lucide-react';
import { PLANS, type PlanConfig } from '../../lib/plans';
import { StartTrialButton } from '../components/Checkout';
import { ContentSection, CtaBand, FaqList, GradientWord, LinkCards, PageHero } from '../components/blocks';
import { MarketingLayout } from '../components/MarketingLayout';
import { GUIDE_ROUTE_SEEDS, type MarketingRoute } from '../routes';
import { faqPageNode, softwareApplicationNode, type FaqItem, type JsonLdNode } from '../structured-data';

const PRICING_FAQS: readonly FaqItem[] = [
  {
    question: 'Is VAT included?',
    answer: 'No. Prices are shown per month excluding VAT, which is added at checkout where it applies.',
  },
  {
    question: 'How does the free trial work?',
    answer:
      'Every plan starts with a 14-day free trial. You add a card at checkout, nothing is charged for 14 days, and you can cancel before then from your account settings.',
  },
  {
    question: 'Is there a setup fee or a contract?',
    answer:
      'No setup fee and no long contract. Plans are monthly, and if you cancel, the service runs to the end of the month you have paid for.',
  },
  {
    question: 'Which plan should I start on?',
    answer:
      'Pick the plan whose call allowance covers the calls you currently miss, not every call you get. If you are not sure, start smaller and move up once you can see your own numbers in the dashboard.',
  },
  {
    question: 'Do I need a new phone number?',
    answer:
      "No. Keep your existing number and divert the calls you can't answer. A setup call is included to help you do it.",
  },
];

// TODO(human): state what happens when a tenant goes over their monthly call
// allowance, and what counts as a call (e.g. whether spam counts). Neither is
// written down anywhere public, and callers will ask.

interface PlanCardProps {
  plan: PlanConfig;
}

function PlanCard({ plan }: PlanCardProps): React.ReactElement {
  const featured = plan.popular;
  return (
    <article
      className={`relative flex h-full flex-col rounded-card p-7 backdrop-blur-[24px] ${
        featured
          ? 'bg-gradient-to-b from-orange/[0.12] to-orange/[0.04] shadow-[0_0_0_1px_rgba(255,107,43,0.25),0_20px_60px_rgba(2,13,24,0.5),0_0_40px_rgba(255,107,43,0.1)]'
          : 'bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(2,13,24,0.4)]'
      }`}
    >
      {featured && (
        // "Recommended", not "Most popular": popularity is a claim about customer
        // numbers we cannot evidence yet (CLAUDE.md §1.1), recommending is not.
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-orange-soft">Recommended</p>
      )}
      <h3 className="font-display text-[24px] font-semibold text-offwhite">{plan.name}</h3>
      <p className="mt-1 text-[15px] text-offwhite/70">{plan.calls}</p>
      <p className="mt-6 font-display text-[44px] font-bold leading-none tracking-[-0.03em] text-offwhite">
        £{plan.price}
        <span className="ml-1.5 font-body text-[15px] font-medium tracking-normal text-offwhite/62">a month + VAT</span>
      </p>
      <ul className="mt-6 flex-1 space-y-3 text-[15px] text-offwhite/74">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-orange-soft" />
            {feature}
          </li>
        ))}
      </ul>
      <StartTrialButton planKey={plan.key} className="mt-8 w-full" />
    </article>
  );
}

export default function PricingPage(): React.ReactElement {
  const guideLinks = GUIDE_ROUTE_SEEDS.map((seed) => ({
    href: `/guides/${seed.slug}`,
    title: seed.name,
    text: seed.description,
  }));

  return (
    <MarketingLayout path="/pricing">
      <PageHero
        eyebrow="Pricing"
        title={<>Simple, honest pricing, sized by your <GradientWord>calls</GradientWord>.</>}
        intro={
          <p>
            Four plans, all with the same receptionist, the same text and email summaries and the same 14-day free trial.
            The difference is how many calls a month each one covers.
          </p>
        }
        showPricingLink={false}
      />

      <ContentSection id="plans" title="Plans">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => <PlanCard key={plan.key} plan={plan} />)}
        </div>
        <p className="mt-8 max-w-[65ch] text-[15px] leading-[1.7] text-offwhite/66">
          Prices exclude VAT. 14-day free trial on every plan: a card is taken at checkout and nothing is charged for 14
          days. No setup fee. Cancel from your account settings.
        </p>
      </ContentSection>

      <ContentSection id="faq" tone="raised" title="Pricing questions">
        <FaqList faqs={PRICING_FAQS} />
      </ContentSection>

      <ContentSection id="guides" title="Working out whether it pays">
        <LinkCards items={guideLinks} />
      </ContentSection>

      <CtaBand
        title="Try it on the calls you are missing now."
        text="Fourteen days is long enough to see what comes through. If it isn't paying its way, cancel before the trial ends."
      />
    </MarketingLayout>
  );
}

export function structuredData(route: MarketingRoute): JsonLdNode[] {
  return [softwareApplicationNode(), faqPageNode(route.path, PRICING_FAQS)];
}
