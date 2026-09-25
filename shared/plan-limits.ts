import type { Plan } from './types';

/** Monthly inbound-call allowances sold on the public pricing page. */
export const PLAN_CALL_LIMITS: Record<Plan, number> = {
  starter:  50,
  pro:      150,
  business: 350,
  agency:   600,
};
