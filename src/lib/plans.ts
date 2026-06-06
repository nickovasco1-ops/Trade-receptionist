import type { Plan } from '../../shared/types';

export interface PlanConfig {
  key:        Plan;
  name:       string;
  price:      number;
  calls:      string;
  callLimit:  number;
  features:   string[];
  stripeUrl:  string;
  popular:    boolean;
}

const isTest = import.meta.env.VITE_STRIPE_MODE === 'test';

const LIVE_URLS = {
  starter:  'https://buy.stripe.com/7sY3cwaXI6pl7jAd5k6wE00',
  pro:      'https://buy.stripe.com/dRmdRa4zk5lh33ke9o6wE01',
  business: 'https://buy.stripe.com/eVq6oId5Q4hdcDUd5k6wE04',
  agency:   'https://buy.stripe.com/9B6aEYc1MfZV6fw7L06wE05',
};

const TEST_URLS = {
  starter:  'https://buy.stripe.com/test_eVq3cxcnbgATd4A9uA2wU00',
  pro:      'https://buy.stripe.com/test_3cIeVf86V98r4y4bCI2wU01',
  business: 'https://buy.stripe.com/test_aFadRb86VgATc0wbCI2wU03',
  agency:   'https://buy.stripe.com/test_dRm00lfzn98r4y4ayE2wU04',
};

const urls = isTest ? TEST_URLS : LIVE_URLS;

export const PLANS: PlanConfig[] = [
  {
    key:       'starter',
    name:      'Starter',
    price:     49,
    calls:     'Up to 50 calls/month',
    callLimit: 50,
    features:  ['AI call answering 24/7', 'SMS + email job summaries', 'Diary integration (Google Calendar)', 'Call transcripts'],
    stripeUrl: urls.starter,
    popular:   false,
  },
  {
    key:       'pro',
    name:      'Pro',
    price:     89,
    calls:     'Up to 150 calls/month',
    callLimit: 150,
    features:  ['Everything in Starter', 'Priority call routing', 'Custom greetings', 'Calendar booking', 'Priority support'],
    stripeUrl: urls.pro,
    popular:   true,
  },
  {
    key:       'business',
    name:      'Business',
    price:     159,
    calls:     'Up to 350 calls/month',
    callLimit: 350,
    features:  ['Everything in Pro', 'Multiple phone numbers', 'Shared team access', 'Advanced reporting'],
    stripeUrl: urls.business,
    popular:   false,
  },
  {
    key:       'agency',
    name:      'Agency',
    price:     249,
    calls:     'Up to 600 calls/month',
    callLimit: 600,
    features:  ['Everything in Business', 'Multiple departments', 'Dedicated account manager', 'Custom integrations'],
    stripeUrl: urls.agency,
    popular:   false,
  },
];

export const PLAN_BY_KEY: Record<Plan, PlanConfig> = Object.fromEntries(
  PLANS.map((p) => [p.key, p])
) as Record<Plan, PlanConfig>;
