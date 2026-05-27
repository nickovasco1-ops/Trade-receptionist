import { expect, test } from '@playwright/test';
import { cleanupAccount, seedClient, type TestAccount } from './utils/fixtures';
import { apiBaseURL, uniqueId } from './utils/env';
import { restGet } from './utils/supabase-admin';
import { eventually, postJsonWebhook, retellSignature } from './utils/webhooks';

type RetellPayload = Record<string, unknown>;

async function postRawRetellWebhook(raw: string, signature = retellSignature(raw)) {
  return fetch(`${apiBaseURL}/webhooks/retell`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-retell-signature': signature,
    },
    body: raw,
  });
}

function signedHeaders(payload: RetellPayload) {
  const raw = JSON.stringify(payload);
  return { 'x-retell-signature': retellSignature(raw) };
}

async function seedRetellClient(): Promise<TestAccount & { agentId: string }> {
  const agentId = uniqueId('agent_retell');
  const account = await seedClient(undefined, {
    onboardingComplete: true,
    retellAgentId: agentId,
  });
  return { ...account, agentId };
}

async function postStarted(agentId: string, callId = uniqueId('call_retell'), fromNumber = '+447700900444') {
  const payload = {
    event: 'call_started',
    call_id: callId,
    agent_id: agentId,
    from_number: fromNumber,
    to_number: '+442045719023',
  };
  const response = await postJsonWebhook('/webhooks/retell', payload, signedHeaders(payload));
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ received: true });
  return { callId, fromNumber };
}

async function postEnded(
  agentId: string,
  callId: string,
  options: {
    fromNumber?: string;
    summary?: string;
    transcript?: string;
    customData?: Record<string, unknown>;
    durationMs?: number;
  } = {}
) {
  const now = Date.now();
  const durationMs = options.durationMs ?? 121_000;
  const payload = {
    event: 'call_ended',
    call_id: callId,
    agent_id: agentId,
    from_number: options.fromNumber ?? '+447700900444',
    to_number: '+442045719023',
    duration_ms: durationMs,
    call_status: 'ended',
    start_timestamp: now - durationMs,
    end_timestamp: now,
    recording_url: 'https://example.test/retell-recording.wav',
    transcript: options.transcript ?? 'Caller Jane Caller needs a boiler repair at SW1A 1AA.',
    call_analysis: {
      call_summary: options.summary ?? 'LEAD_CAPTURED: Jane Caller needs a boiler repair at SW1A 1AA.',
      custom_analysis_data: options.customData ?? {
        caller_name: 'Jane Caller',
        caller_number: options.fromNumber ?? '+447700900444',
        postcode: 'SW1A 1AA',
        job_type: 'Boiler repair',
        urgency: 'routine',
        notes: 'Available tomorrow morning.',
      },
    },
  };
  const response = await postJsonWebhook('/webhooks/retell', payload, signedHeaders(payload));
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ received: true });
}

async function getCallByRetellId(callId: string) {
  const rows = await restGet<Record<string, unknown>>('calls', `retell_call_id=eq.${callId}&select=*`);
  return rows[0] ?? null;
}

test.describe('Retell webhooks', () => {
  test('malformed signed payload is acknowledged without a 500', async () => {
    const raw = '{"event":"call_started",';
    const response = await postRawRetellWebhook(raw);

    expect(response.status).not.toBe(500);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true });
  });

  test('invalid signature is rejected without a 500 or Supabase side effect', async () => {
    const callId = uniqueId('bad_sig_call');
    const response = await postJsonWebhook(
      '/webhooks/retell',
      { event: 'call_started', call_id: callId, agent_id: uniqueId('agent_bad'), from_number: '+447700900000' },
      { 'x-retell-signature': 'invalid' }
    );

    expect(response.status).not.toBe(500);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: false, reason: 'invalid_signature' });
    await expect.poll(async () => getCallByRetellId(callId)).toBeNull();
  });

  test('valid call_started creates a call record', async () => {
    const account = await seedRetellClient();
    const callId = uniqueId('started_call');

    try {
      await postStarted(account.agentId, callId, '+447700900410');

      await expect.poll(async () => getCallByRetellId(callId)).toMatchObject({
        client_id: account.clientId,
        retell_call_id: callId,
        caller_number: '+447700900410',
        direction: 'inbound',
        is_emergency: false,
      });
    } finally {
      await cleanupAccount(account);
    }
  });

  test('valid call_ended stores call duration, caller, transcript, and lead', async () => {
    const account = await seedRetellClient();
    const callId = uniqueId('ended_call');

    try {
      await postStarted(account.agentId, callId);
      await postEnded(account.agentId, callId);

      const call = await eventually(
        () => getCallByRetellId(callId),
        (row) => row?.outcome === 'lead_captured',
        'call_ended persisted call'
      );
      expect(call).toMatchObject({
        caller_number: '+447700900444',
        duration_secs: 121,
        outcome: 'lead_captured',
        recording_url: 'https://example.test/retell-recording.wav',
      });

      await eventually(
        () => restGet<Record<string, unknown>>('transcripts', `call_id=eq.${call!.id}&select=*`),
        (rows) => rows[0]?.summary === 'LEAD_CAPTURED: Jane Caller needs a boiler repair at SW1A 1AA.',
        'transcript upsert'
      );

      await eventually(
        () => restGet<Record<string, unknown>>('leads', `call_id=eq.${call!.id}&select=*`),
        (rows) => rows[0]?.caller_name === 'Jane Caller' && rows[0]?.job_type === 'Boiler repair',
        'lead insert'
      );
    } finally {
      await cleanupAccount(account);
    }
  });

  test('call_analyzed updates transcript and structured lead data', async () => {
    const account = await seedRetellClient();
    const callId = uniqueId('analyzed_call');

    try {
      await postStarted(account.agentId, callId);
      await postEnded(account.agentId, callId);
      const call = await eventually(() => getCallByRetellId(callId), Boolean, 'base call before analysis');
      await eventually(
        () => restGet<Record<string, unknown>>('leads', `call_id=eq.${call!.id}&select=id`),
        (rows) => rows.length === 1,
        'base lead before analysis'
      );

      const analyzed = {
        event: 'call_analyzed',
        call_id: callId,
        call_analysis: {
          call_summary: 'LEAD_CAPTURED: Jane Caller needs an updated radiator repair.',
          custom_analysis_data: {
            caller_name: 'Jane Caller Updated',
            caller_number: '+447700900444',
            postcode: 'SW1A 1AA',
            job_type: 'Radiator repair',
            urgency: 'urgent',
            notes: 'Updated analysis from Retell.',
          },
        },
      };
      const response = await postJsonWebhook('/webhooks/retell', analyzed, signedHeaders(analyzed));
      expect(response.status).toBe(200);

      await eventually(
        () => restGet<Record<string, unknown>>('transcripts', `call_id=eq.${call!.id}&select=*`),
        (rows) => rows[0]?.summary === 'LEAD_CAPTURED: Jane Caller needs an updated radiator repair.',
        'analysis transcript update'
      );
      await eventually(
        () => restGet<Record<string, unknown>>('leads', `call_id=eq.${call!.id}&select=*`),
        (rows) => rows[0]?.caller_name === 'Jane Caller Updated' && rows[0]?.job_type === 'Radiator repair',
        'analysis lead update'
      );
    } finally {
      await cleanupAccount(account);
    }
  });

  test('emergency intent persists emergency call and lead with test-mode side effects stubbed', async () => {
    const account = await seedRetellClient();
    const callId = uniqueId('emergency_call');

    try {
      await postEnded(account.agentId, callId, {
        fromNumber: '+447700900911',
        summary: 'EMERGENCY: burst pipe flooding kitchen at SW1A 1AA.',
        transcript: 'Caller says this is an emergency burst pipe with water everywhere.',
        customData: {
          caller_name: 'Urgent Caller',
          caller_number: '+447700900911',
          postcode: 'SW1A 1AA',
          job_type: 'Burst pipe',
          urgency: 'emergency',
          notes: 'Water flooding kitchen.',
        },
      });

      const call = await eventually(
        () => getCallByRetellId(callId),
        (row) => row?.outcome === 'emergency' && row?.is_emergency === true,
        'emergency call persisted'
      );
      await eventually(
        () => restGet<Record<string, unknown>>('leads', `call_id=eq.${call!.id}&select=*`),
        (rows) => rows[0]?.urgency === 'emergency' && rows[0]?.job_type === 'Burst pipe',
        'emergency lead persisted'
      );
    } finally {
      await cleanupAccount(account);
    }
  });

  test('duplicate call_ended delivery is idempotent for call, transcript, and lead rows', async () => {
    const account = await seedRetellClient();
    const callId = uniqueId('duplicate_call');

    try {
      await postStarted(account.agentId, callId);
      await Promise.all([
        postEnded(account.agentId, callId),
        postEnded(account.agentId, callId),
      ]);

      const call = await eventually(
        () => getCallByRetellId(callId),
        (row) => row?.outcome === 'lead_captured',
        'duplicate call_ended persisted one call'
      );

      await eventually(
        () => restGet<Record<string, unknown>>('transcripts', `call_id=eq.${call!.id}&select=*`),
        (rows) => rows.length === 1
          && rows[0]?.summary === 'LEAD_CAPTURED: Jane Caller needs a boiler repair at SW1A 1AA.',
        'duplicate call_ended persisted one transcript'
      );

      await eventually(
        () => restGet<Record<string, unknown>>('leads', `call_id=eq.${call!.id}&select=*`),
        (rows) => rows.length === 1
          && rows[0]?.caller_name === 'Jane Caller'
          && rows[0]?.job_type === 'Boiler repair',
        'duplicate call_ended persisted one lead'
      );
    } finally {
      await cleanupAccount(account);
    }
  });
});
