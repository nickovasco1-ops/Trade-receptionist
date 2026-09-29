// Builds /llms.txt (https://llmstxt.org): a plain-Markdown summary of the
// product and links to the key pages, for AI assistants that read the site.
//
// Page links and one-line summaries come from the route registry, so the file
// cannot list a page that does not exist or miss one that does. The product
// summary below must stay checkable against shipped behaviour (CLAUDE.md §1.1):
// no statistics, no customer counts, no ratings.

import { PLANS } from '../lib/plans';
import type { MarketingRoute } from './routes';
import { CONTACT_EMAIL, SITE_URL, absoluteUrl } from './site';

const INTRO = `# Trade Receptionist

> Trade Receptionist is an AI receptionist for UK tradespeople (plumbers, electricians, builders, heating engineers, roofers, locksmiths, landscapers, carpenters and similar). It answers the calls a tradesperson cannot take while working, in the business's name, with a British voice.

What it does on each call:

- Takes the caller's name, number, address and what the job is, and sends the tradesperson a text and email summary straight after the call.
- Books the job into the tradesperson's diary if they connect one (Google Calendar, Microsoft Outlook or Apple iCloud).
- Recognises urgent calls such as a gas smell, burst pipe, flooding, sparking or no heating, alerts the tradesperson by text and email, and can offer to put the caller through. For a gas smell it tells the caller to leave the property and ring the National Gas Emergency line on 0800 111 999.
- Politely ends sales calls, robocalls and cold pitches.
- Only gives a price range if the tradesperson has set one; otherwise it takes the details for a quote.
- Keeps a recording, transcript and summary of each call in the dashboard.

How it is set up: the tradesperson keeps their existing number and diverts unanswered calls to a number Trade Receptionist provides (on UK mobiles, a single divert code), or uses the new number as their business line.`;

function pricingSection(): string {
  const lines = PLANS.map((plan) => `- ${plan.name}: £${plan.price} a month plus VAT, ${plan.calls.toLowerCase()}`);
  return [
    '## Pricing',
    '',
    ...lines,
    '',
    'Every plan starts with a 14-day free trial. A card is taken at checkout and nothing is charged for 14 days. No setup fee and no long contract; cancel from account settings.',
  ].join('\n');
}

function linkLine(route: MarketingRoute): string {
  const name = route.breadcrumbs?.[route.breadcrumbs.length - 1]?.name ?? route.title;
  return `- [${name}](${absoluteUrl(route.path)}): ${route.description}`;
}

export function buildLlmsTxt(routes: readonly MarketingRoute[]): string {
  const trades = routes.filter((route) => route.path.startsWith('/trades/'));
  const guides = routes.filter((route) => route.path.startsWith('/guides/'));
  const core = routes.filter((route) => ['/pricing', '/trades', '/guides'].includes(route.path));
  const other = routes.filter((route) => ['/partner', '/privacy', '/terms'].includes(route.path));

  return [
    INTRO,
    '',
    pricingSection(),
    '',
    '## Key pages',
    '',
    `- [Homepage](${SITE_URL}/): overview, an example call, pricing and FAQs.`,
    ...core.map(linkLine),
    '',
    '## By trade',
    '',
    ...trades.map(linkLine),
    '',
    '## Guides',
    '',
    ...guides.map(linkLine),
    '',
    '## Optional',
    '',
    ...other.map(linkLine),
    `- Contact: ${CONTACT_EMAIL}`,
    '',
  ].join('\n');
}
