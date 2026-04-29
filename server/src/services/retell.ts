import { sendOwnerSms, sendCallerSms } from './twilio';
import { sendPostCallEmail } from './resend';
import type { Client, Call } from '../../../shared/types';

const BASE_URL = 'https://api.retellai.com';

const CHARLOTTE_VOICE_ID = 'retell-Willa';

// ── Auth ──────────────────────────────────────────────────────────────────────

function headers() {
  const key = process.env.RETELL_API_KEY;
  if (!key) throw new Error('RETELL_API_KEY not set');
  return {
    Authorization:  `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RetellAgentConfig {
  /** Friendly name — e.g. "Sarah — Mark Thomas Plumbing" */
  agentName:    string;
  /** Full system prompt built by buildSystemPrompt() */
  prompt:       string;
  /** Owner's E.164 mobile number — used for transfer_to_owner tool */
  ownerNumber?: string | null;
  /** Optional: first utterance spoken when call connects */
  beginMessage?: string;
}

export interface ProvisionedAgent {
  agentId: string;
  llmId:   string;
}

// ── Retell LLM API (v2) ───────────────────────────────────────────────────────

/**
 * Create a Retell-managed LLM.  The LLM holds the system prompt and tools.
 * When ownerNumber is provided, a native transfer_call tool is registered so
 * the agent can route calls to the owner without any server-side code.
 */
export async function createRetellLlm(
  prompt: string,
  ownerNumber?: string | null
): Promise<{ llmId: string }> {
  const tools: Record<string, unknown>[] = [
    {
      type:        'end_call',
      name:        'EndCall',
      description: 'End the call politely once the enquiry is complete.',
    },
  ];

  if (ownerNumber) {
    tools.push({
      type:        'bridge_transfer',
      name:        'TransferToOwner',
      description: [
        'Transfer the call to the business owner when the customer explicitly asks',
        'to speak with a real person, or when an emergency requires immediate',
        'human response.',
      ].join(' '),
      transfer_option: {
        type:   'external',
        number: ownerNumber,
      },
    });
  }

  const res = await fetch(`${BASE_URL}/create-retell-llm`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({
      general_prompt: prompt,
      general_tools:  tools,
      model:          'gpt-4o-mini',
    }),
  });
  if (!res.ok) throw new Error(`Retell createLlm failed: ${await res.text()}`);
  const data = (await res.json()) as { llm_id: string };
  return { llmId: data.llm_id };
}

/**
 * Update only the system prompt on an existing Retell LLM.
 * Called by the PATCH /clients/:id route whenever client config changes.
 */
export async function updateRetellLlm(llmId: string, prompt: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/update-retell-llm/${llmId}`, {
    method:  'PATCH',
    headers: headers(),
    body:    JSON.stringify({ general_prompt: prompt }),
  });
  if (!res.ok) throw new Error(`Retell updateLlm failed: ${await res.text()}`);
}

/** Delete a Retell LLM. Used during provisioning rollback. */
export async function deleteRetellLlm(llmId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/delete-retell-llm/${llmId}`, {
    method:  'DELETE',
    headers: headers(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Retell deleteLlm failed: ${await res.text()}`);
  }
}

// ── Retell Agent API (v2) ─────────────────────────────────────────────────────

/**
 * Create a full Retell agent configured with:
 * - Charlotte ElevenLabs voice (en-GB)
 * - Backchannel enabled for natural conversation pacing
 * - 8 s silence timeout before ending the call
 * - Webhook URL for call events (reads RETELL_WEBHOOK_URL env var)
 */
export async function createRetellAgent(
  config: RetellAgentConfig
): Promise<ProvisionedAgent> {
  const { llmId } = await createRetellLlm(config.prompt, config.ownerNumber);

  const webhookUrl = process.env.RETELL_WEBHOOK_URL;

  const agentBody: Record<string, unknown> = {
    agent_name:       config.agentName,
    response_engine:  { type: 'retell-llm', llm_id: llmId },
    voice_id:         CHARLOTTE_VOICE_ID,
    language:         'en-GB',
    enable_backchannel:         true,
    backchannel_frequency:      0.7,
    backchannel_words:          ['hmm', 'right', 'okay', 'yes', 'I see'],
    interruption_sensitivity:   0.9,
    end_call_after_silence_ms:  10000,
    max_call_duration_ms:       600000,
  };

  if (webhookUrl) agentBody.webhook_url = webhookUrl;
  if (config.beginMessage) agentBody.begin_message = config.beginMessage;

  const res = await fetch(`${BASE_URL}/create-agent`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(agentBody),
  });
  if (!res.ok) {
    await deleteRetellLlm(llmId).catch(() => {});
    throw new Error(`Retell createAgent failed: ${await res.text()}`);
  }

  const data = (await res.json()) as { agent_id: string };
  return { agentId: data.agent_id, llmId };
}

/** Delete a Retell agent. Used during provisioning rollback. */
export async function deleteRetellAgent(agentId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/delete-agent/${agentId}`, {
    method:  'DELETE',
    headers: headers(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Retell deleteAgent failed: ${await res.text()}`);
  }
}

// ── Phone Number Management (v2) ──────────────────────────────────────────────

/**
 * Import a Twilio-owned phone number into Retell.
 * Retell will automatically configure the Twilio number's webhook so calls
 * are routed through the Retell platform.
 */
export async function importTwilioNumber(
  phoneNumber: string,
  agentId:     string
): Promise<void> {
  const twSid   = process.env.TWILIO_ACCOUNT_SID;
  const twToken = process.env.TWILIO_AUTH_TOKEN;
  if (!twSid || !twToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required for number import');
  }

  const res = await fetch(`${BASE_URL}/create-phone-number`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({
      phone_number:       phoneNumber,
      type:               'twilio',
      twilio_account_sid: twSid,
      twilio_auth_token:  twToken,
      agent_id:           agentId,
    }),
  });
  if (!res.ok) throw new Error(`Retell importPhoneNumber failed: ${await res.text()}`);
}

/**
 * Assign (or reassign) a Retell-managed phone number to a different agent.
 * Useful if the number was imported without an agent ID, or to re-assign later.
 */
export async function assignAgentToNumber(
  phoneNumber: string,
  agentId:     string
): Promise<void> {
  const encoded = encodeURIComponent(phoneNumber);
  const res = await fetch(`${BASE_URL}/update-phone-number/${encoded}`, {
    method:  'PATCH',
    headers: headers(),
    body:    JSON.stringify({ agent_id: agentId }),
  });
  if (!res.ok) throw new Error(`Retell assignAgent failed: ${await res.text()}`);
}

/** Release a Retell-managed phone number. Used during provisioning rollback. */
export async function releaseRetellNumber(phoneNumber: string): Promise<void> {
  const encoded = encodeURIComponent(phoneNumber);
  const res = await fetch(`${BASE_URL}/delete-phone-number/${encoded}`, {
    method:  'DELETE',
    headers: headers(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Retell releaseNumber failed: ${await res.text()}`);
  }
}

// ── Call API ──────────────────────────────────────────────────────────────────

export async function getCall(callId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE_URL}/get-call/${callId}`, { headers: headers() });
  if (!res.ok) return null;
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Update the system prompt on an agent. Handles both v2 (LLM-backed) agents
 * and legacy v1 agents gracefully.
 */
export async function updateAgentPrompt(agentId: string, prompt: string): Promise<void> {
  // Try v2: fetch agent to discover its llm_id
  const agentRes = await fetch(`${BASE_URL}/get-agent/${agentId}`, { headers: headers() });
  if (agentRes.ok) {
    const agent = (await agentRes.json()) as {
      response_engine?: { type: string; llm_id?: string };
    };
    const llmId = agent.response_engine?.llm_id;
    if (llmId) {
      await updateRetellLlm(llmId, prompt);
      return;
    }
  }

  // Fallback: v1 direct agent prompt update
  const res = await fetch(`${BASE_URL}/update-agent/${agentId}`, {
    method:  'PATCH',
    headers: headers(),
    body:    JSON.stringify({ general_prompt: prompt }),
  });
  if (!res.ok) throw new Error(`Retell updateAgent failed: ${await res.text()}`);
}

// ── Legacy ────────────────────────────────────────────────────────────────────

/** @deprecated Use createRetellAgent() instead. Kept for existing callers. */
export async function createAgent(
  payload: Record<string, unknown>
): Promise<{ agent_id: string }> {
  const res = await fetch(`${BASE_URL}/create-agent`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Retell createAgent (v1) failed: ${await res.text()}`);
  return res.json() as Promise<{ agent_id: string }>;
}

// ── Post-call notification workflow ───────────────────────────────────────────

export interface PostCallExtra {
  callerName?:   string | null;
  jobType?:      string | null;
  postcode?:     string | null;
  urgency?:      string | null;
  transcript?:   string | null;
}

/**
 * Send all post-call notifications after a call ends.
 * Fires all tasks in parallel; individual failures are caught and logged
 * so one broken channel never blocks the others.
 */
export async function postCallWorkflow(
  client:  Client,
  call:    Call,
  summary: string,
  extra:   PostCallExtra = {}
): Promise<void> {
  const callerNumber = call.caller_number ?? 'Unknown number';
  const outcome      = call.outcome ?? 'enquiry';
  const fromNumber   = client.twilio_number ?? undefined;

  const tasks: Promise<unknown>[] = [];

  // Owner: SMS
  if (client.owner_mobile && fromNumber) {
    tasks.push(
      sendOwnerSms({
        to:           client.owner_mobile,
        from:         fromNumber,
        outcome,
        callerNumber,
        callerName:   extra.callerName,
        jobType:      extra.jobType,
        postcode:     extra.postcode,
        urgency:      extra.urgency,
        businessName: client.business_name,
      }).catch((err: unknown) => console.error('[postCall] owner SMS failed', err))
    );
  }

  // Owner: email
  tasks.push(
    sendPostCallEmail(client.owner_email, {
      businessName:  client.business_name,
      outcome,
      callerNumber,
      callerName:    extra.callerName,
      jobType:       extra.jobType,
      postcode:      extra.postcode,
      urgency:       extra.urgency,
      summary,
      transcript:    extra.transcript,
      recordingUrl:  call.recording_url,
      durationSecs:  call.duration_secs,
    }).catch((err: unknown) => console.error('[postCall] email failed', err))
  );

  // Caller: SMS confirmation (skip spam, no_answer, voicemail)
  const confirmOutcomes = ['booked', 'lead_captured', 'enquiry'];
  if (call.caller_number && fromNumber && confirmOutcomes.includes(outcome)) {
    tasks.push(
      sendCallerSms({
        to:           call.caller_number,
        from:         fromNumber,
        businessName: client.business_name,
        ownerName:    client.owner_name,
        booked:       outcome === 'booked',
      }).catch((err: unknown) => console.error('[postCall] caller SMS failed', err))
    );
  }

  await Promise.all(tasks);
}

function outcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    booked:        'Job booked',
    lead_captured: 'New lead captured',
    enquiry:       'New enquiry',
    spam:          'Spam call blocked',
    voicemail:     'Voicemail left',
    transferred:   'Call transferred',
    emergency:     'EMERGENCY call',
    no_answer:     'Missed call',
  };
  return labels[outcome] ?? 'New call';
}
