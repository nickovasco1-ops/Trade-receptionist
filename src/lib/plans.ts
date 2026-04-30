import type { Plan } from '../../shared/types';

export interface PlanConfig {
  key:        Plan;
  name:       string;
  price:      number;
  calls:      string;
  features:   string[];
  stripeUrl:  string;
  popular:    boolean;
}

const isTest = import.meta.env.VITE_STRIPE_MODE === 'test';

const LIVE_URLS = {
  starter: 'https://buy.stripe.com/7sY3cwaXI6pl7jAd5k6wE00',
  pro:     'https://buy.stripe.com/dRmdRa4zk5lh33ke9o6wE01',
  agency:  'https://buy.stripe.com/00w3cwd5QeVRfQ66GW6wE02',
};

const TEST_URLS = {
  starter: 'https://buy.stripe.com/test_eVq3cxcnbgATd4A9uA2wU00',
  pro:     'https://buy.stripe.com/test_3cIeVf86V98r4y4bCI2wU01',
  agency:  'https://buy.stripe.com/test_6oU14p3QF84n2pW4ag2wU02',
};

const urls = isTest ? TEST_URLS : LIVE_URLS;

export const PLANS: PlanConfig[] = [
  {
    key:      'starter',
    name:     'Starter',
    price:    29,
    calls:    'Up to 100 calls/month',
    features: ['AI call answering 24/7', 'Call transcripts & summaries', 'SMS alerts to your mobile'],
    stripeUrl: urls.starter,
    popular:   false,
  },
  {
    key:      'pro',
    name:     'Pro',
    price:    59,
    calls:    'Up to 300 calls/month',
    features: ['Everything in Starter', 'Diary integration', 'Priority call routing', 'Custom greetings'],
    stripeUrl: urls.pro,
    popular:   true,
  },
  {
    key:      'agency',
    name:     'Agency',
    price:    119,
    calls:    'Unlimited calls',
    features: ['Everything in Pro', 'Multiple numbers', 'Team management', 'Dedicated support'],
    stripeUrl: urls.agency,
    popular:   false,
  },
];

export const PLAN_BY_KEY: Record<Plan, PlanConfig> = Object.fromEntries(
  PLANS.map((p) => [p.key, p])
) as Record<Plan, PlanConfig>;
