// JSON-LD builders for the marketing pages.
//
// Rules this file enforces by construction:
// - FAQPage only ever receives the FAQ items a page actually renders, so the
//   markup cannot drift from the visible text (Google requires they match).
// - Offers come from src/lib/plans.ts, the same source the checkout uses.
// - No aggregateRating or Review nodes. There is no substantiated rating to
//   mark up (CLAUDE.md §1.1), and inventing one is an automatically unfair
//   practice under the DMCC Act 2024.

import { PLANS } from '../lib/plans';
import {
  CONTACT_EMAIL, DEFAULT_OG_IMAGE, LEGAL_NAME, LOGO_URL, SITE_NAME, SITE_URL, SOCIAL_PROFILES, absoluteUrl,
} from './site';

export type JsonLdNode = Record<string, unknown>;

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Crumb {
  name: string;
  path: string;
}

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const SOFTWARE_ID = `${SITE_URL}/#software`;

export function organizationNode(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    legalName: LEGAL_NAME,
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: LOGO_URL, width: 512, height: 512 },
    email: CONTACT_EMAIL,
    areaServed: { '@type': 'Country', name: 'United Kingdom' },
    sameAs: SOCIAL_PROFILES,
  };
}

export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: 'en-GB',
    publisher: { '@id': ORG_ID },
  };
}

/**
 * The product with one Offer per plan. Prices on the site are shown "+VAT",
 * so the markup says so rather than implying VAT-inclusive prices.
 */
export function softwareApplicationNode(): JsonLdNode {
  return {
    '@type': 'SoftwareApplication',
    '@id': SOFTWARE_ID,
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: `${SITE_URL}/`,
    description:
      'An AI receptionist for UK tradespeople. It answers calls when you cannot, takes the job details, books work into your diary and sends you a text and email summary of every call.',
    inLanguage: 'en-GB',
    publisher: { '@id': ORG_ID },
    offers: PLANS.map((plan) => ({
      '@type': 'Offer',
      name: `${plan.name} plan`,
      description: plan.calls,
      url: absoluteUrl('/pricing'),
      price: plan.price.toFixed(2),
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: plan.price.toFixed(2),
        priceCurrency: 'GBP',
        valueAddedTaxIncluded: false,
        referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
      },
    })),
  };
}

export function webPageNode(path: string, title: string, description: string): JsonLdNode {
  return {
    '@type': 'WebPage',
    '@id': `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: title,
    description,
    inLanguage: 'en-GB',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': SOFTWARE_ID },
  };
}

export function breadcrumbNode(crumbs: readonly Crumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqPageNode(path: string, faqs: readonly FaqItem[]): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(path)}#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function articleNode(path: string, headline: string, description: string, date: string): JsonLdNode {
  return {
    '@type': 'Article',
    '@id': `${absoluteUrl(path)}#article`,
    headline,
    description,
    image: DEFAULT_OG_IMAGE.url,
    inLanguage: 'en-GB',
    mainEntityOfPage: { '@id': `${absoluteUrl(path)}#webpage` },
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    datePublished: date,
    dateModified: date,
  };
}
