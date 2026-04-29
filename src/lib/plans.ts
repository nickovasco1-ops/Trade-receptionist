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

// ── Update these URLs from your Stripe dashboard:
// Dashboard → Payment Links → Create link for each product → copy the buy.stripe.com URL
export const PLANS: PlanConfig[] = [
  {
    key:      'starter',
    name:     'Starter',
    price:    29,
    calls:    'Up to 100 calls/month',
    features: ['AI call answering 24/7', 'Call transcripts & summaries', 'SMS alerts to your mobile'],
    stripeUrl: 'https://buy.stripe.com/7sY3cwaXI6pl7jAd5k6wE00',
    popular:   false,
  },
  {
    key:      'pro',
    name:     'Pro',
    price:    59,
    calls:    'Up to 300 calls/month',
    features: ['Everything in Starter', 'Diary integration', 'Priority call routing', 'Custom greetings'],
    stripeUrl: 'https://buy.stripe.com/dRmdRa4zk5lh33ke9o6wE01',
    popular:   true,
  },
  {
    key:      'agency',
    name:     'Agency',
    price:    119,
    calls:    'Unlimited calls',
    features: ['Everything in Pro', 'Multiple numbers', 'Team management', 'Dedicated support'],
    stripeUrl: 'https://buy.stripe.com/00w3cwd5QeVRfQ66GW6wE02',
    popular:   false,
  },
];

export const PLAN_BY_KEY: Record<Plan, PlanConfig> = Object.fromEntries(
  PLANS.map((p) => [p.key, p])
) as Record<Plan, PlanConfig>;
