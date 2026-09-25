import type { Plan } from '../../../shared/types';

// Stripe product ids are stable across price changes. Keep the mapping here so
// checkout provisioning and revenue reporting cannot disagree about a tier.
export const STRIPE_PRODUCT_TO_PLAN: Record<string, Plan> = {
  // Live mode
  'prod_UOE4uHDjaA2p2A': 'starter',
  'prod_UOE4eMY23okJjd': 'pro',
  'prod_UehtOIroOuNd9l': 'business',
  'prod_UehtHB44FF2E1Y': 'agency',
  'prod_UOE5UUmEp0cXnD': 'agency', // retired £119 Agency product
  // Test mode
  'prod_UQeX2QnK9ev3bK': 'starter',
  'prod_UQeX0UFytNZhFH': 'pro',
  'prod_UQeXswCVtfNvZq': 'agency',
};

export function stripePlanForProduct(productId: string | null | undefined): Plan | null {
  return productId ? STRIPE_PRODUCT_TO_PLAN[productId] ?? null : null;
}
