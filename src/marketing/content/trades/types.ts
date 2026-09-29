// Shape of a trade landing page's copy.
//
// Content rules (CLAUDE.md §1.1 and the SEO brief):
// - Every capability described must be something the product does today.
//   Check server/src/lib/prompt-builder.ts and server/src/lib/emergency.ts
//   before describing how a call is handled.
// - Scenarios are illustrative and rendered under an "Example call" label.
//   Never present one as a real customer's call.
// - No statistics, customer counts, ratings or testimonials. No em dashes.
// - Each trade page targets one primary keyword (see src/marketing/routes.ts).

import type { ScenarioStep } from '../../components/blocks';
import type { FaqItem } from '../../structured-data';

export interface Headline {
  lead: string;
  /** The single gradient keyword (CLAUDE.md §3.4). */
  keyword: string;
  tail: string;
}

export interface TitledText {
  title: string;
  text: string;
}

export interface TradeScenario {
  title: string;
  context: string;
  steps: readonly ScenarioStep[];
}

export type TradeSlug =
  | 'plumbers' | 'electricians' | 'builders' | 'heating-engineers'
  | 'roofers' | 'locksmiths' | 'landscapers' | 'carpenters-and-joiners';

export type GuideSlug =
  | 'ai-receptionist-vs-answering-service-vs-voicemail'
  | 'cost-of-missed-calls-for-tradespeople'
  | 'how-to-never-miss-a-call-on-the-job';

export interface TradeContent {
  slug: TradeSlug;
  /** Plural, lower case, as used in running copy: "plumbers". */
  plural: string;
  eyebrow: string;
  headline: Headline;
  intro: string;
  pains: { title: string; intro: string; items: readonly TitledText[] };
  scenarios: { title: string; intro: string; items: readonly TradeScenario[] };
  setup: { title: string; intro: string; items: readonly TitledText[] };
  faqs: readonly FaqItem[];
  related: readonly TradeSlug[];
  guides: readonly GuideSlug[];
  closing: { title: string; text: string };
}
