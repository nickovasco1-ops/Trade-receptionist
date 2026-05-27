import type { Page } from '@playwright/test';
import { authenticatePage } from './auth';
import { cleanupTestUserAndData } from './cleanup';
import { testPhone, uniqueEmail, uniqueId } from './env';
import {
  restDelete,
  restGet,
  restInsert,
  restPatch,
  tableHasColumn,
} from './supabase-admin';
import { createConfirmedTestUser } from './test-users';

export interface TestAccount {
  email: string;
  clientId?: string;
}

export async function authenticate(page: Page, email = uniqueEmail('auth')): Promise<TestAccount> {
  const user = await authenticatePage(page, email);
  return { email: user.email };
}

export async function seedClient(
  email = uniqueEmail('client'),
  options: {
    onboardingComplete?: boolean;
    businessName?: string;
    retellAgentId?: string | null;
    googleCalendarId?: string | null;
  } = {}
): Promise<TestAccount> {
  await createConfirmedTestUser(email);

  const client = await restInsert<{ id: string }>('clients', {
    business_name: options.businessName ?? `E2E Plumbing ${uniqueId('biz').slice(-8)}`,
    owner_name: 'E2E Owner',
    owner_email: email,
    owner_mobile: testPhone,
    retell_agent_id: Object.prototype.hasOwnProperty.call(options, 'retellAgentId')
      ? options.retellAgentId
      : uniqueId('agent'),
    twilio_number: '+442045719023',
    own_number: null,
    google_cal_id: Object.prototype.hasOwnProperty.call(options, 'googleCalendarId')
      ? options.googleCalendarId
      : null,
    google_refresh_token: options.googleCalendarId ? 'test-refresh-token' : null,
    plan: 'pro',
    is_active: true,
    onboarding_complete: options.onboardingComplete ?? true,
  });

  await restInsert('business_config', {
    client_id: client.id,
    receptionist_name: 'Trade Receptionist',
    receptionist_tone: 'friendly',
    services: ['Boiler repair', 'Emergency callouts'],
    service_areas: ['South London'],
    emergency_keywords: ['burst pipe', 'gas leak'],
    business_hours_start: '08:00',
    business_hours_end: '18:00',
    working_days: [1, 2, 3, 4, 5],
    timezone: 'Europe/London',
  });

  return { email, clientId: client.id };
}

export async function seedCall(clientId: string) {
  const startedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const endedAt = new Date(Date.now() - 58 * 60 * 1000).toISOString();

  return restInsert<{ id: string }>('calls', {
    client_id: clientId,
    retell_call_id: uniqueId('call'),
    caller_number: '+447700900222',
    direction: 'inbound',
    duration_secs: 142,
    outcome: 'lead_captured',
    is_emergency: false,
    recording_url: 'https://example.test/recording.wav',
    started_at: startedAt,
    ended_at: endedAt,
  });
}

export async function seedTranscript(callId: string) {
  return restInsert<{ id: string }>('transcripts', {
    call_id: callId,
    full_text: 'Caller needs a boiler repair in SW1A 1AA.',
    summary: 'LEAD_CAPTURED: Jane Caller needs a boiler repair in SW1A 1AA.',
    raw_json: {
      source: 'e2e',
      id: uniqueId('transcript'),
    },
  });
}

export async function seedLead(clientId: string, callId: string) {
  return restInsert<{ id: string }>('leads', {
    client_id: clientId,
    call_id: callId,
    caller_name: 'Jane Caller',
    caller_number: '+447700900222',
    caller_email: `${uniqueId('jane')}@example.test`,
    postcode: 'SW1A 1AA',
    job_type: 'Boiler repair',
    urgency: 'routine',
    notes: 'Needs a morning visit.',
    status: 'new',
  });
}

export async function seedBooking(clientId: string, leadId?: string, callId?: string) {
  const values: Record<string, unknown> = {
    client_id: clientId,
    lead_id: leadId ?? null,
    google_event_id: uniqueId('google_event'),
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    job_type: 'Boiler repair',
    address: 'SW1A 1AA',
    status: 'scheduled',
  };

  if (callId && await tableHasColumn('bookings', 'call_id')) {
    values.call_id = callId;
  }

  return restInsert<{ id: string }>('bookings', values);
}

export async function seedCallAndLead(clientId: string) {
  const call = await seedCall(clientId);
  await seedTranscript(call.id);
  const lead = await seedLead(clientId, call.id);
  return { callId: call.id, leadId: lead.id };
}

export async function cleanupAccount(account: TestAccount) {
  await cleanupTestUserAndData(account.email);
}

export async function getClientByEmail(email: string) {
  const rows = await restGet<Record<string, unknown>>(
    'clients',
    `owner_email=eq.${encodeURIComponent(email)}&select=*`
  );
  return rows[0] ?? null;
}

export async function getBusinessConfig(clientId: string) {
  const rows = await restGet<Record<string, unknown>>(
    'business_config',
    `client_id=eq.${clientId}&select=*`
  );
  return rows[0] ?? null;
}

export async function hasAfterHoursMessageColumn() {
  return tableHasColumn('business_config', 'after_hours_message');
}

export async function markOnboardingIncomplete(clientId: string) {
  await restPatch('clients', `id=eq.${clientId}`, {
    onboarding_complete: false,
  });
}

export async function deleteClient(clientId: string) {
  await restDelete('clients', `id=eq.${clientId}`).catch(() => undefined);
}
