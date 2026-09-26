import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customerAttention, leadAction, onboardingState } from './notion-ops';

describe('customer attention', () => {
  const healthy = {
    isActive: true,
    subscriptionStatus: 'active',
    paymentStatus: 'current',
    hasAgent: true,
    hasNumber: true,
    diaryConnected: true,
    onboardingComplete: true,
    callCount: 4,
    usageStatus: 'OK',
    ageHours: 72,
  };

  it('puts failed payments ahead of lower-risk setup actions', () => {
    assert.deepEqual(customerAttention({ ...healthy, paymentStatus: 'failed', diaryConnected: false }), {
      attention: 'At risk',
      nextAction: 'Contact the customer about the failed payment',
    });
  });

  it('surfaces silent and diary-less customers, otherwise stays clear', () => {
    assert.equal(customerAttention({ ...healthy, callCount: 0 }).nextAction,
      'Confirm the number divert and make a test call');
    assert.equal(customerAttention({ ...healthy, diaryConnected: false }).attention, 'Needs attention');
    assert.deepEqual(customerAttention(healthy), {
      attention: 'None',
      nextAction: 'No action needed',
    });
  });
});

describe('lead actions', () => {
  const now = new Date('2026-09-26T12:00:00.000Z');

  it('makes emergency leads immediate and closes completed work', () => {
    assert.deepEqual(leadAction({
      status: 'new', urgency: 'emergency', createdAt: '2026-09-26T10:00:00.000Z',
    }, now), {
      needsAction: true,
      nextAction: 'Call immediately — emergency',
      actionDue: '2026-09-26T10:00:00.000Z',
      ageHours: 2,
    });
    assert.equal(leadAction({
      status: 'booked', urgency: 'routine', createdAt: '2026-09-25T10:00:00.000Z',
    }, now).needsAction, false);
  });

  it('gives routine new leads a 24-hour deadline', () => {
    assert.equal(leadAction({
      status: 'new', urgency: 'routine', createdAt: '2026-09-26T10:00:00.000Z',
    }, now).actionDue, '2026-09-27T10:00:00.000Z');
  });
});

describe('onboarding state', () => {
  const now = new Date('2026-09-26T12:00:00.000Z');

  it('marks a fully activated customer live', () => {
    assert.deepEqual(onboardingState({
      createdAt: '2026-09-24T12:00:00.000Z',
      hasAgent: true,
      hasNumber: true,
      diaryConnected: true,
      firstCallAt: '2026-09-25T12:00:00.000Z',
    }, now), {
      stage: 'Live',
      blocker: '',
      nextAction: 'No action needed',
      daysWaiting: 0,
      daysToLive: 1,
      liveDate: '2026-09-25T12:00:00.000Z',
    });
  });

  it('marks incomplete activation as stalled after 24 hours with a clear action', () => {
    const state = onboardingState({
      createdAt: '2026-09-24T12:00:00.000Z',
      hasAgent: true,
      hasNumber: true,
      diaryConnected: false,
      firstCallAt: null,
    }, now);
    assert.equal(state.stage, 'Stalled');
    assert.equal(state.blocker, 'diary is not connected; no call has been received');
    assert.equal(state.nextAction, 'Help the customer connect their diary');
    assert.equal(state.daysWaiting, 2);
  });
});
