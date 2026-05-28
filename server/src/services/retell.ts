import { sendOwnerSms, sendCallerSms } from './twilio';
import { sendPostCallEmail } from './resend';
import { buildSystemPrompt } from '../lib/prompt-builder';
import { isE2ETestMode } from '../config/e2e';
import { errorMessage, logEvent } from '../lib/observability';
import type { Client, Call, BusinessConfig } from '../../../shared/types';

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
  /** Friendly name — e.g. "Trade Receptionist — Mark Thomas Plumbing" */
  agentName:    string;
  /** Full system prompt built by buildSystemPrompt() */
  prompt:       string;
  /** Owner's E.164 mobile number — used for transfer_to_owner tool */
  ownerNumber?: string | null;
  /** Whether live calendar tools should be attached to the agent */
  calendarBookingEnabled?: boolean;
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
function retellFunctionBaseUrl(): string | null {
  const explicit = process.env.RETELL_FUNCTION_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const webhookUrl = process.env.RETELL_WEBHOOK_URL?.trim();
  if (!webhookUrl) return null;

  try {
    const parsed = new URL(webhookUrl);
    return parsed.origin;
  } catch {
    return null;
  }
}

function buildCalendarTools(baseUrl: string): Record<string, unknown>[] {
  return [
    {
      type: 'custom',
      name: 'check_calendar_availability',
      description: 'Check the business diary and return the best available booking slots before you offer times to the caller.',
      url: `${baseUrl}/retell-tools/check-availability`,
      method: 'POST',
      speak_during_execution: true,
      speak_after_execution: true,
      execution_message_type: 'static_text',
      execution_message_description: 'Let me check the diary for you now.',
      timeout_ms: 15000,
      parameters: {
        type: 'object',
        properties: {
          requested_date: {
            type: 'string',
            description: 'Optional preferred booking date in YYYY-MM-DD format. Leave blank if the caller just wants the next available slot.',
          },
          time_preference: {
            type: 'string',
            description: 'Caller preference for time of day. Use one of: any, morning, afternoon.',
          },
          duration_mins: {
            type: 'number',
            description: 'Length of the booking in minutes. Use 60 unless you have a specific reason to use a different length.',
          },
        },
      },
    },
    {
      type: 'custom',
      name: 'create_calendar_booking',
      description: 'Create the booking in the client diary only after the caller has agreed a specific slot and you have their contact details.',
      url: `${baseUrl}/retell-tools/create-booking`,
      method: 'POST',
      speak_during_execution: true,
      speak_after_execution: true,
      execution_message_type: 'static_text',
      execution_message_description: 'Great, I am getting that booked in for you now.',
      timeout_ms: 20000,
      parameters: {
        type: 'object',
        required: ['start_time_iso', 'customer_name', 'job_type', 'confirmation_channel'],
        properties: {
          start_time_iso: {
            type: 'string',
            description: 'The exact agreed booking start time as an ISO-8601 timestamp from a previously returned available slot.',
          },
          customer_name: {
            type: 'string',
            description: 'Caller full name for the booking.',
          },
          caller_number: {
            type: 'string',
            description: 'Caller mobile or phone number in international format if available.',
          },
          caller_email: {
            type: 'string',
            description: 'Caller email address if available and needed for confirmation.',
          },
          job_type: {
            type: 'string',
            description: 'Short description of the job being booked.',
          },
          address: {
            type: 'string',
            description: 'Job address or postcode if the caller has provided it.',
          },
          notes: {
            type: 'string',
            description: 'Important job notes, access details, or anything the owner should know.',
          },
          confirmation_channel: {
            type: 'string',
            description: 'How to send the caller confirmation. Use one of: sms, email, both, none.',
          },
          duration_mins: {
            type: 'number',
            description: 'Length of the booking in minutes. Use 60 unless a different duration was clearly agreed.',
          },
        },
      },
    },
  ];
}

function buildRetellTools(
  ownerNumber?: string | null,
  calendarBookingEnabled = false
): Record<string, unknown>[] {
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

  if (calendarBookingEnabled) {
    const baseUrl = retellFunctionBaseUrl();
    if (baseUrl) {
      tools.push(...buildCalendarTools(baseUrl));
    }
  }

  return tools;
}

export async function createRetellLlm(
  prompt: string,
  ownerNumber?: string | null,
  calendarBookingEnabled = false
): Promise<{ llmId: string }> {
  if (isE2ETestMode()) {
    return { llmId: `llm_e2e_${Date.now()}` };
  }

  const tools = buildRetellTools(ownerNumber, calendarBookingEnabled);

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
  if (isE2ETestMode()) {
    return;
  }

  const res = await fetch(`${BASE_URL}/update-retell-llm/${llmId}`, {
    method:  'PATCH',
    headers: headers(),
    body:    JSON.stringify({ general_prompt: prompt }),
  });
  if (!res.ok) throw new Error(`Retell updateLlm failed: ${await res.text()}`);
}

export async function updateRetellLlmConfig(
  llmId: string,
  prompt: string,
  ownerNumber?: string | null,
  calendarBookingEnabled = false
): Promise<void> {
  if (isE2ETestMode()) {
    return;
  }

  const res = await fetch(`${BASE_URL}/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({
      general_prompt: prompt,
      general_tools: buildRetellTools(ownerNumber, calendarBookingEnabled),
    }),
  });
  if (!res.ok) throw new Error(`Retell updateLlm failed: ${await res.text()}`);
}

/** Delete a Retell LLM. Used during provisioning rollback. */
export async function deleteRetellLlm(llmId: string): Promise<void> {
  if (isE2ETestMode()) {
    return;
  }

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
  if (isE2ETestMode()) {
    return {
      agentId: `agent_e2e_${Date.now()}`,
      llmId: `llm_e2e_${Date.now()}`,
    };
  }

  const { llmId } = await createRetellLlm(
    config.prompt,
    config.ownerNumber,
    config.calendarBookingEnabled ?? false
  );

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
  if (isE2ETestMode()) {
    return;
  }

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
  if (isE2ETestMode()) {
    return;
  }

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
  if (isE2ETestMode()) {
    return;
  }

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
  if (isE2ETestMode()) {
    return;
  }

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
  if (isE2ETestMode()) {
    return null;
  }

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

export async function updateAgentConfiguration(
  client: Client,
  config: BusinessConfig
): Promise<void> {
  if (!client.retell_agent_id) return;

  const prompt = buildSystemPrompt(client, config);

  const agentRes = await fetch(`${BASE_URL}/get-agent/${client.retell_agent_id}`, { headers: headers() });
  if (agentRes.ok) {
    const agent = (await agentRes.json()) as {
      response_engine?: { type: string; llm_id?: string };
    };
    const llmId = agent.response_engine?.llm_id;
    if (llmId) {
      await updateRetellLlmConfig(llmId, prompt, client.owner_mobile, !!client.google_cal_id);
      return;
    }
  }

  await updateAgentPrompt(client.retell_agent_id, prompt);
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
      }).catch((err: unknown) => logEvent('error', 'post_call.provider_failure', {
        clientId: client.id,
        provider: 'twilio',
        channel: 'owner_sms',
        error: errorMessage(err),
      }))
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
    }).catch((err: unknown) => logEvent('error', 'post_call.provider_failure', {
      clientId: client.id,
      provider: 'resend',
      channel: 'email',
      error: errorMessage(err),
    }))
  );

  // Caller: SMS confirmation (skip spam, no_answer, voicemail)
  const confirmOutcomes = ['lead_captured', 'enquiry'];
  if (call.caller_number && fromNumber && confirmOutcomes.includes(outcome)) {
    tasks.push(
      sendCallerSms({
        to:           call.caller_number,
        from:         fromNumber,
        businessName: client.business_name,
        ownerName:    client.owner_name,
        booked:       outcome === 'booked',
      }).catch((err: unknown) => logEvent('error', 'post_call.provider_failure', {
        clientId: client.id,
        provider: 'twilio',
        channel: 'caller_sms',
        error: errorMessage(err),
      }))
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
