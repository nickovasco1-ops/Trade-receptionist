export type CustomerAttention = 'None' | 'Needs attention' | 'At risk' | 'Churned';

export interface CustomerAttentionInput {
  isActive: boolean;
  subscriptionStatus: string | null;
  paymentStatus: string | null;
  hasAgent: boolean;
  hasNumber: boolean;
  diaryConnected: boolean;
  onboardingComplete: boolean;
  callCount: number;
  usageStatus: string;
  ageHours: number;
}

export interface CustomerAttentionResult {
  attention: CustomerAttention;
  nextAction: string;
}

/** Choose one clear owner action, ordered by business risk. */
export function customerAttention(input: CustomerAttentionInput): CustomerAttentionResult {
  if (!input.isActive || input.subscriptionStatus === 'canceled' || input.paymentStatus === 'canceled') {
    return { attention: 'Churned', nextAction: 'No action — service has ended' };
  }
  if (input.paymentStatus === 'failed'
      || ['past_due', 'unpaid', 'incomplete'].includes(input.subscriptionStatus ?? '')) {
    return { attention: 'At risk', nextAction: 'Contact the customer about the failed payment' };
  }
  if (input.ageHours >= 24 && (!input.hasAgent || !input.hasNumber)) {
    return { attention: 'At risk', nextAction: 'Repair provisioning before the customer misses calls' };
  }
  if (input.usageStatus === 'Over limit' || input.usageStatus === 'Limit reached') {
    return { attention: 'Needs attention', nextAction: 'Agree an upgrade or overage arrangement' };
  }
  if (input.ageHours >= 24 && input.callCount === 0) {
    return { attention: 'Needs attention', nextAction: 'Confirm the number divert and make a test call' };
  }
  if (!input.diaryConnected) {
    return { attention: 'Needs attention', nextAction: 'Help the customer connect their diary' };
  }
  if (!input.onboardingComplete) {
    return { attention: 'Needs attention', nextAction: 'Help the customer finish setup' };
  }
  if (input.usageStatus === 'Approaching limit') {
    return { attention: 'Needs attention', nextAction: 'Offer the next plan before the allowance runs out' };
  }
  return { attention: 'None', nextAction: 'No action needed' };
}

export interface LeadActionInput {
  status: string | null;
  urgency: string | null;
  createdAt: string;
}

export interface LeadActionResult {
  needsAction: boolean;
  nextAction: string;
  actionDue: string | null;
  ageHours: number;
}

/** Turn lead state into a queue that can be worked without interpreting raw fields. */
export function leadAction(input: LeadActionInput, now = new Date()): LeadActionResult {
  const created = new Date(input.createdAt);
  const ageHours = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 3_600_000));
  const needsAction = input.status === 'new' || input.status === 'flagged_for_review';
  if (!needsAction) return { needsAction: false, nextAction: 'No action needed', actionDue: null, ageHours };

  if (input.status === 'flagged_for_review') {
    return { needsAction: true, nextAction: 'Review the extracted caller details', actionDue: input.createdAt, ageHours };
  }
  if (input.urgency === 'emergency') {
    return { needsAction: true, nextAction: 'Call immediately — emergency', actionDue: input.createdAt, ageHours };
  }
  if (input.urgency === 'urgent') {
    return { needsAction: true, nextAction: 'Call today — urgent job', actionDue: input.createdAt, ageHours };
  }

  const due = new Date(created.getTime() + 24 * 3_600_000).toISOString();
  return { needsAction: true, nextAction: 'Contact this lead within 24 hours', actionDue: due, ageHours };
}

export type OnboardingStage =
  | 'Signed Up'
  | 'Number Assigned'
  | 'Agent Configured'
  | 'Test Call Done'
  | 'Live'
  | 'Stalled';

export interface OnboardingInput {
  createdAt: string;
  hasAgent: boolean;
  hasNumber: boolean;
  diaryConnected: boolean;
  firstCallAt: string | null;
}

export interface OnboardingResult {
  stage: OnboardingStage;
  blocker: string;
  nextAction: string;
  daysWaiting: number;
  daysToLive: number | null;
  liveDate: string | null;
}

/** Real activation requires an agent, a routed number, a diary and a received call. */
export function onboardingState(input: OnboardingInput, now = new Date()): OnboardingResult {
  const created = new Date(input.createdAt);
  const ageMs = Math.max(0, now.getTime() - created.getTime());
  const daysWaiting = Math.floor(ageMs / 86_400_000);
  const blockers: string[] = [];
  if (!input.hasAgent) blockers.push('Retell agent is missing');
  if (!input.hasNumber) blockers.push('receptionist number is missing');
  if (!input.diaryConnected) blockers.push('diary is not connected');
  if (!input.firstCallAt) blockers.push('no call has been received');

  const live = blockers.length === 0;
  let stage: OnboardingStage;
  if (live) stage = 'Live';
  else if (ageMs >= 24 * 3_600_000) stage = 'Stalled';
  else if (input.firstCallAt) stage = 'Test Call Done';
  else if (input.hasAgent) stage = 'Agent Configured';
  else if (input.hasNumber) stage = 'Number Assigned';
  else stage = 'Signed Up';

  const nextAction = !input.hasAgent
    ? 'Create or repair the Retell agent'
    : !input.hasNumber
      ? 'Assign and connect the receptionist number'
      : !input.diaryConnected
        ? 'Help the customer connect their diary'
        : !input.firstCallAt
          ? 'Make a test call and confirm the divert works'
          : 'No action needed';
  const liveDate = live ? input.firstCallAt : null;
  const daysToLive = liveDate
    ? Math.max(0, Math.ceil((new Date(liveDate).getTime() - created.getTime()) / 86_400_000))
    : null;

  return {
    stage,
    blocker: blockers.join('; '),
    nextAction,
    daysWaiting: live ? 0 : daysWaiting,
    daysToLive,
    liveDate,
  };
}
