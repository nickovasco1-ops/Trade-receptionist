// The single registry of public, indexable marketing pages.
//
// Everything a search engine or AI crawler reads about a page is derived from
// this file: <title>, meta description, canonical, Open Graph, JSON-LD,
// sitemap.xml and llms.txt. scripts/prerender.mjs reads it at build time and
// fails the build if a title or description is too long, duplicated, or if two
// pages claim the same primary keyword.
//
// index.tsx also reads it to register client routes for the pages marked
// `spaRoute`, so adding a page here is the whole job. Keep this file small:
// it ships in the main bundle. Page copy lives in the lazily loaded modules.

import type { ComponentType } from 'react';
import type { Crumb, JsonLdNode } from './structured-data';

export interface MarketingPageProps {
  slug?: string;
}

export interface MarketingModule {
  default?: ComponentType<MarketingPageProps>;
  /** Extra JSON-LD for this page. WebPage and BreadcrumbList are added automatically. */
  structuredData?: (route: MarketingRoute) => JsonLdNode[];
}

export interface MarketingRoute {
  path: string;
  /** Under 60 characters. */
  title: string;
  /** Under 155 characters. */
  description: string;
  /** The one query this page targets. Two pages may never share one. */
  primaryKeyword: string | null;
  /** 'full' bakes the page body into HTML; 'head' writes only the head tags. */
  prerender: 'full' | 'head';
  /** True for pages whose client route is registered from this file. */
  spaRoute: boolean;
  load: () => Promise<MarketingModule>;
  props?: MarketingPageProps;
  breadcrumbs?: Crumb[];
  ogType: 'website' | 'article';
  sitemap: { priority: number; changefreq: 'weekly' | 'monthly' | 'yearly' };
  /** ISO date the page content last changed materially. */
  lastmod: string;
}

const CONTENT_DATE = '2026-09-29';

const loadTradePage = () => import('./pages/TradePage');

const HOME: Crumb = { name: 'Home', path: '/' };
const TRADES: Crumb = { name: 'Trades', path: '/trades' };
const GUIDES: Crumb = { name: 'Guides', path: '/guides' };

interface TradeRouteSeed {
  slug: string;
  name: string;
  title: string;
  description: string;
  primaryKeyword: string;
}

// Order here is the order trades appear in the hub, the footer and llms.txt.
export const TRADE_ROUTE_SEEDS: readonly TradeRouteSeed[] = [
  {
    slug: 'plumbers',
    name: 'Plumbers',
    title: 'AI Receptionist for Plumbers | Trade Receptionist',
    description:
      'An AI receptionist for UK plumbers. Answers while you are under a sink, flags burst pipes and leaks, and texts you the job. 14-day free trial.',
    primaryKeyword: 'ai receptionist for plumbers',
  },
  {
    slug: 'electricians',
    name: 'Electricians',
    title: 'AI Receptionist for Electricians | Trade Receptionist',
    description:
      'An AI receptionist for UK electricians. Answers while you are working on a board, flags sparking and shocks, and books EICRs in. 14-day free trial.',
    primaryKeyword: 'ai receptionist for electricians',
  },
  {
    slug: 'builders',
    name: 'Builders',
    title: 'Answering Service for Builders | Trade Receptionist',
    description:
      'A call answering service for UK builders. Takes every extension and repair enquiry on site, gets the details down and texts you the lead.',
    primaryKeyword: 'answering service for builders',
  },
  {
    slug: 'heating-engineers',
    name: 'Heating engineers',
    title: 'Heating Engineer Answering Service | Trade Receptionist',
    description:
      'Call answering for UK heating and gas engineers. Handles breakdown calls, gives gas-smell safety advice and books services into your diary.',
    primaryKeyword: 'answering service for heating engineers',
  },
  {
    slug: 'roofers',
    name: 'Roofers',
    title: 'Answering Service for Roofers | Trade Receptionist',
    description:
      'Call answering for UK roofers. Picks up while you are on the roof, sorts storm leaks from quote requests and texts you every job.',
    primaryKeyword: 'answering service for roofers',
  },
  {
    slug: 'locksmiths',
    name: 'Locksmiths',
    title: '24/7 Answering Service for Locksmiths | Trade Receptionist',
    description:
      'A 24/7 answering service for UK locksmiths. Takes lockout calls at any hour, gets the address and texts it to you while you are on a job.',
    primaryKeyword: '24 hour answering service for locksmiths',
  },
  {
    slug: 'landscapers',
    name: 'Landscapers',
    title: 'Answering Service for Landscapers | Trade Receptionist',
    description:
      'Call answering for UK landscapers and gardeners. Catches enquiries you miss over the mower, books quote visits and handles the spring rush.',
    primaryKeyword: 'answering service for landscapers',
  },
  {
    slug: 'carpenters-and-joiners',
    name: 'Carpenters and joiners',
    title: 'Carpenter & Joiner Answering Service | Trade Receptionist',
    description:
      'Call answering for UK carpenters and joiners. Picks up while the saw is running, takes down what they want made and texts you the enquiry.',
    primaryKeyword: 'answering service for carpenters and joiners',
  },
];

interface GuideRouteSeed {
  slug: string;
  name: string;
  title: string;
  description: string;
  primaryKeyword: string;
  load: () => Promise<MarketingModule>;
}

export const GUIDE_ROUTE_SEEDS: readonly GuideRouteSeed[] = [
  {
    slug: 'ai-receptionist-vs-answering-service-vs-voicemail',
    name: 'AI receptionist vs answering service vs voicemail',
    title: 'AI Receptionist vs Answering Service vs Voicemail (UK)',
    description:
      'A straight comparison for UK trades: what voicemail, a human answering service and an AI receptionist each do with a call you cannot take.',
    primaryKeyword: 'ai receptionist vs answering service',
    load: () => import('./pages/guides/ComparisonGuide'),
  },
  {
    slug: 'cost-of-missed-calls-for-tradespeople',
    name: 'The cost of missed calls for tradespeople',
    title: 'Cost of Missed Calls for Tradespeople: Work Out Yours',
    description:
      'How much do missed calls cost a plumber, electrician or builder? A worked example you can check, and how to plug in your own numbers.',
    primaryKeyword: 'cost of missed calls for tradespeople',
    load: () => import('./pages/guides/MissedCallCostGuide'),
  },
  {
    slug: 'how-to-never-miss-a-call-on-the-job',
    name: 'How to never miss a call on the job',
    title: 'Never Miss a Call on the Job: Options for Tradespeople',
    description:
      'Practical ways to stop missing calls while you work, from voicemail and call diverts to answering services and AI, with the UK divert codes.',
    primaryKeyword: 'never miss a call on the job',
    load: () => import('./pages/guides/NeverMissACallGuide'),
  },
];

export const MARKETING_ROUTES: readonly MarketingRoute[] = [
  {
    path: '/',
    title: 'AI Receptionist for UK Tradespeople | Trade Receptionist',
    description:
      'Trade Receptionist answers your calls while you are on the tools, takes the job details, books work into your diary and texts you a summary.',
    primaryKeyword: 'ai receptionist for tradespeople',
    prerender: 'head',
    spaRoute: false,
    load: () => import('./schema/home'),
    ogType: 'website',
    sitemap: { priority: 1.0, changefreq: 'weekly' },
    lastmod: CONTENT_DATE,
  },
  {
    path: '/pricing',
    title: 'AI Receptionist Pricing for UK Trades | Trade Receptionist',
    description:
      'Plans from £49 a month plus VAT, sized by how many calls you get. 14-day free trial, no setup fee, no contract. See what each plan includes.',
    primaryKeyword: 'ai receptionist pricing uk',
    prerender: 'full',
    spaRoute: true,
    load: () => import('./pages/PricingPage'),
    breadcrumbs: [HOME, { name: 'Pricing', path: '/pricing' }],
    ogType: 'website',
    sitemap: { priority: 0.9, changefreq: 'monthly' },
    lastmod: CONTENT_DATE,
  },
  {
    path: '/trades',
    title: 'Call Answering Service for Tradesmen | Trade Receptionist',
    description:
      'Call answering built around how each trade works. Pick yours to see the calls it handles, how urgent jobs reach you, and trade-specific answers.',
    primaryKeyword: 'call answering service for tradesmen',
    prerender: 'full',
    spaRoute: true,
    load: () => import('./pages/TradesHubPage'),
    breadcrumbs: [HOME, TRADES],
    ogType: 'website',
    sitemap: { priority: 0.9, changefreq: 'monthly' },
    lastmod: CONTENT_DATE,
  },
  ...TRADE_ROUTE_SEEDS.map((seed): MarketingRoute => ({
    path: `/trades/${seed.slug}`,
    title: seed.title,
    description: seed.description,
    primaryKeyword: seed.primaryKeyword,
    prerender: 'full',
    spaRoute: true,
    load: loadTradePage,
    props: { slug: seed.slug },
    breadcrumbs: [HOME, TRADES, { name: seed.name, path: `/trades/${seed.slug}` }],
    ogType: 'website',
    sitemap: { priority: 0.8, changefreq: 'monthly' },
    lastmod: CONTENT_DATE,
  })),
  {
    path: '/guides',
    title: 'Call Handling Guides for Tradespeople | Trade Receptionist',
    description:
      'Plain-English guides for UK tradespeople on missed calls: what they cost, how to stop missing them, and which kind of call answering fits.',
    primaryKeyword: null,
    prerender: 'full',
    spaRoute: true,
    load: () => import('./pages/GuidesHubPage'),
    breadcrumbs: [HOME, GUIDES],
    ogType: 'website',
    sitemap: { priority: 0.6, changefreq: 'monthly' },
    lastmod: CONTENT_DATE,
  },
  ...GUIDE_ROUTE_SEEDS.map((seed): MarketingRoute => ({
    path: `/guides/${seed.slug}`,
    title: seed.title,
    description: seed.description,
    primaryKeyword: seed.primaryKeyword,
    prerender: 'full',
    spaRoute: true,
    load: seed.load,
    breadcrumbs: [HOME, GUIDES, { name: seed.name, path: `/guides/${seed.slug}` }],
    ogType: 'article',
    sitemap: { priority: 0.7, changefreq: 'monthly' },
    lastmod: CONTENT_DATE,
  })),
  {
    path: '/partner',
    title: 'Partner Programme | Trade Receptionist',
    description:
      'Refer UK tradespeople to Trade Receptionist and earn 15% recurring commission for 12 months. How the partner programme works and how to apply.',
    primaryKeyword: null,
    prerender: 'head',
    spaRoute: false,
    load: async () => ({}),
    breadcrumbs: [HOME, { name: 'Partner Programme', path: '/partner' }],
    ogType: 'website',
    sitemap: { priority: 0.4, changefreq: 'monthly' },
    lastmod: CONTENT_DATE,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Trade Receptionist',
    description:
      'How Trade Receptionist collects, uses and protects personal data, including call recordings and transcripts, under UK GDPR.',
    primaryKeyword: null,
    prerender: 'full',
    spaRoute: false,
    load: () => import('../pages/legal/PrivacyPage'),
    breadcrumbs: [HOME, { name: 'Privacy Policy', path: '/privacy' }],
    ogType: 'website',
    sitemap: { priority: 0.2, changefreq: 'yearly' },
    lastmod: CONTENT_DATE,
  },
  {
    path: '/terms',
    title: 'Terms of Service | Trade Receptionist',
    description:
      'The terms that apply when you use Trade Receptionist: the free trial, billing, cancellation, acceptable use and liability.',
    primaryKeyword: null,
    prerender: 'full',
    spaRoute: false,
    load: () => import('../pages/legal/TermsPage'),
    breadcrumbs: [HOME, { name: 'Terms of Service', path: '/terms' }],
    ogType: 'website',
    sitemap: { priority: 0.2, changefreq: 'yearly' },
    lastmod: CONTENT_DATE,
  },
];

/** Route for a pathname, ignoring a trailing slash. */
export function findMarketingRoute(pathname: string): MarketingRoute | undefined {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return MARKETING_ROUTES.find((route) => route.path === normalised);
}
