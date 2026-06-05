import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../services/supabase';
import { buildSystemPrompt } from '../../lib/prompt-builder';
import {
  updateAgentConfiguration,
  createRetellAgent,
  deleteRetellAgent,
  deleteRetellLlm,
  importTwilioNumber,
  releaseRetellNumber,
} from '../../services/retell';
import {
  searchUkNumbers,
  buyUkNumber,
  releaseNumber,
  attachNumberToTrunk,
  findNumberSid,
} from '../../services/twilio';
import type {
  ApiResponse,
  Client,
  BusinessConfig,
  ClientProvisionResponse,
  NumberMode,
} from '../../../../shared/types';

const router = Router();

function bearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim() || null;
}

// ── Validation schemas ────────────────────────────────────────────────────────

const createSchema = z.object({
  business_name: z.string().min(1),
  owner_name:    z.string().min(1),
  owner_email:   z.string().email(),
  owner_mobile:  z.string().optional(),
  own_number:    z.string().optional(),
  plan:          z.enum(['starter', 'pro', 'agency']).default('starter'),
});

const updateSchema = createSchema.partial().extend({
  retell_agent_id:      z.string().optional(),
  twilio_number:        z.string().optional(),
  own_number:           z.string().nullable().optional(),
  google_cal_id:        z.string().optional(),
  google_refresh_token: z.string().optional(),
  is_active:            z.boolean().optional(),
});

const settingsSchema = z.object({
  business_name:        z.string().min(1),
  owner_name:           z.string().min(1),
  owner_mobile:         z.string().nullable().optional(),
  after_hours_message:  z.string().trim().max(240).nullable().optional(),
});

const configSchema = z.object({
  receptionist_name:    z.string().min(1).default('Trade Receptionist'),
  services:             z.array(z.string()).default([]),
  service_areas:        z.array(z.string()).default([]),
  hourly_rate_min:      z.number().positive().optional(),
  hourly_rate_max:      z.number().positive().optional(),
  emergency_keywords:   z.array(z.string()).default([]),
  business_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  business_hours_end:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  working_days:         z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  timezone:             z.string().default('Europe/London'),
  system_prompt_override: z.string().optional(),
});

const provisionSchema = createSchema
  .omit({ plan: true })
  .extend({ plan: z.enum(['starter', 'pro', 'agency']).default('starter') })
  .merge(configSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

interface CleanupState {
  clientId:     string | null;
  llmId:        string | null;
  agentId:      string | null;
  twilioSid:    string | null;
  retellNumber: string | null;
}

async function rollback(state: CleanupState): Promise<void> {
  if (state.retellNumber) {
    await releaseRetellNumber(state.retellNumber).catch((e: unknown) =>
      console.error('[provision] Retell number release failed', e)
    );
  }
  if (state.twilioSid) {
    await releaseNumber(state.twilioSid).catch((e: unknown) =>
      console.error('[provision] Twilio number release failed', e)
    );
  }
  if (state.agentId) {
    await deleteRetellAgent(state.agentId).catch((e: unknown) =>
      console.error('[provision] Retell agent delete failed', e)
    );
  }
  if (state.llmId) {
    await deleteRetellLlm(state.llmId).catch((e: unknown) =>
      console.error('[provision] Retell LLM delete failed', e)
    );
  }
  if (state.clientId) {
    await supabase.from('business_config').delete().eq('client_id', state.clientId);
    await supabase.from('clients').delete().eq('id', state.clientId);
  }
}

// ── Number mode helpers ───────────────────────────────────────────────────────

function buildActivationCode(twilioNumber: string): string {
  // UK carrier universal divert (busy + no answer + unreachable) — one dial activates all three.
  // Works on EE, Vodafone, O2, Three, BT Mobile, Sky Mobile.
  // giffgaff users: set via My giffgaff app instead.
  return `**004*${twilioNumber}#`;
}

function buildProvisionResponse(
  client: Client,
  twilioNumber: string | null,
): ClientProvisionResponse {
  const isKeepExisting = !!client.own_number;
  const number_mode: NumberMode = isKeepExisting ? 'keep_existing' : 'new_number';

  let activation_code: string | null = null;
  let activation_instructions: string | null = null;

  if (isKeepExisting && twilioNumber) {
    activation_code = buildActivationCode(twilioNumber);
    activation_instructions =
      `On your mobile, dial ${activation_code} and press call. ` +
      `Your AI receptionist will then answer calls to ${client.own_number} whenever you\'re busy or unavailable.`;
  }

  return { ...client, number_mode, activation_code, activation_instructions };
}

// ── Standard CRUD ─────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ success: false, error: error.message } satisfies ApiResponse);
    return;
  }
  res.json({ success: true, data } satisfies ApiResponse<Client[]>);
});

router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ success: false, error: 'Client not found' } satisfies ApiResponse);
    return;
  }
  res.json({ success: true, data } satisfies ApiResponse<Client>);
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    res.status(500).json({ success: false, error: error.message } satisfies ApiResponse);
    return;
  }
  res.status(201).json({ success: true, data } satisfies ApiResponse<Client>);
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  const { data, error } = await supabase
    .from('clients')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({
      success: false,
      error:   error?.message ?? 'Client not found',
    } satisfies ApiResponse);
    return;
  }

  const client = data as Client;

  // Sync prompt to Retell whenever client config changes
  if (client.retell_agent_id) {
    const { data: configRow } = await supabase
      .from('business_config')
      .select('*')
      .eq('client_id', client.id)
      .single();

    if (configRow) {
      updateAgentConfiguration(client, configRow as BusinessConfig).catch((err: unknown) =>
        console.error('[clients] Retell prompt sync failed', err)
      );
    }
  }

  res.json({ success: true, data: client } satisfies ApiResponse<Client>);
});

router.patch('/:id/settings', async (req: Request, res: Response) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  const clientId = req.params.id;
  const { business_name, owner_name, owner_mobile, after_hours_message } = parsed.data;

  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing authentication token' } satisfies ApiResponse);
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const ownerEmail = authData.user?.email;
  if (authError || !ownerEmail) {
    res.status(401).json({ success: false, error: 'Invalid authentication token' } satisfies ApiResponse);
    return;
  }

  const [{ data: existingClient, error: clientFetchError }, { data: existingConfig, error: configFetchError }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).eq('owner_email', ownerEmail).single(),
    supabase.from('business_config').select('*').eq('client_id', clientId).maybeSingle(),
  ]);

  if (clientFetchError || !existingClient) {
    res.status(404).json({ success: false, error: clientFetchError?.message ?? 'Client not found' } satisfies ApiResponse);
    return;
  }

  if (configFetchError) {
    res.status(404).json({
      success: false,
      error: configFetchError.message,
    } satisfies ApiResponse);
    return;
  }

  const previousClient = existingClient as Client;
  const previousConfig = existingConfig as BusinessConfig | null;
  if (after_hours_message !== undefined && !previousConfig) {
    res.status(409).json({
      success: false,
      error: 'After-hours settings are not available for this account yet.',
    } satisfies ApiResponse);
    return;
  }

  const timestamp = new Date().toISOString();

  const clientPatch = {
    business_name,
    owner_name,
    owner_mobile: owner_mobile ?? null,
    updated_at: timestamp,
  };

  const nextClient = { ...previousClient, ...clientPatch } as Client;
  const nextConfig = previousConfig
    ? ({
        ...previousConfig,
        ...(after_hours_message !== undefined ? { after_hours_message } : {}),
        updated_at: timestamp,
      } as BusinessConfig)
    : null;

  const rollbackSettings = async () => {
    await supabase.from('clients').update({
      business_name: previousClient.business_name,
      owner_name: previousClient.owner_name,
      owner_mobile: previousClient.owner_mobile,
      updated_at: previousClient.updated_at,
    }).eq('id', clientId);

    if (previousConfig && after_hours_message !== undefined) {
      await supabase.from('business_config').update({
        after_hours_message: previousConfig.after_hours_message,
        updated_at: previousConfig.updated_at,
      }).eq('client_id', clientId);
    }
  };

  const { error: clientUpdateError } = await supabase
    .from('clients')
    .update(clientPatch)
    .eq('id', clientId);

  if (clientUpdateError) {
    res.status(500).json({ success: false, error: clientUpdateError.message } satisfies ApiResponse);
    return;
  }

  if (after_hours_message !== undefined && previousConfig) {
    const { error: configUpdateError } = await supabase
      .from('business_config')
      .update({
        after_hours_message,
        updated_at: timestamp,
      })
      .eq('client_id', clientId);

    if (configUpdateError) {
      await rollbackSettings().catch((err: unknown) =>
        console.error('[clients] settings rollback failed after config update error', err)
      );
      res.status(500).json({
        success: false,
        error: 'Could not save your after-hours settings. No changes were applied.',
      } satisfies ApiResponse);
      return;
    }
  }

  if (previousClient.retell_agent_id && nextConfig) {
    try {
      await updateAgentConfiguration(nextClient, nextConfig);
    } catch (err: unknown) {
      await rollbackSettings().catch((rollbackErr: unknown) =>
        console.error('[clients] settings rollback failed after prompt sync error', rollbackErr)
      );
      res.status(502).json({
        success: false,
        error: 'Your settings were not synced to the live receptionist. No changes were applied.',
      } satisfies ApiResponse);
      return;
    }
  }

  res.json({
    success: true,
    data: {
      client: nextClient,
      config: nextConfig,
    },
  } satisfies ApiResponse);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('clients').delete().eq('id', req.params.id);
  if (error) {
    res.status(500).json({ success: false, error: error.message } satisfies ApiResponse);
    return;
  }
  res.json({ success: true } satisfies ApiResponse);
});

// ── POST /clients/provision ───────────────────────────────────────────────────
//
// Full end-to-end provisioning:
//   1. Insert client row
//   2. Insert business_config row
//   3. Build system prompt
//   4. Create Retell LLM   (holds prompt + transfer tool)
//   5. Create Retell agent (Charlotte voice, en-GB, webhook URL)
//   6. Search available UK Twilio numbers
//   7. Purchase a UK number
//   8. Import number into Retell and assign to agent
//   9. Update client row with retell_agent_id + twilio_number
//
// Any failure in steps 1–8 triggers a full rollback.
// If step 9 (Supabase update) fails, infrastructure is intact — the response
// includes a warning and the IDs so the caller can patch manually.

router.post('/provision', async (req: Request, res: Response) => {
  const parsed = provisionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  const {
    business_name, owner_name, owner_email, owner_mobile, own_number, plan,
    receptionist_name, services, service_areas,
    hourly_rate_min, hourly_rate_max,
    emergency_keywords, business_hours_start, business_hours_end,
    working_days, timezone, system_prompt_override,
  } = parsed.data;

  const state: CleanupState = {
    clientId:     null,
    llmId:        null,
    agentId:      null,
    twilioSid:    null,
    retellNumber: null,
  };

  // ── Step 1: Create client row ─────────────────────────────────────────────

  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .insert({ business_name, owner_name, owner_email: owner_email.toLowerCase(), owner_mobile, own_number: own_number ?? null, plan })
    .select()
    .single();

  if (clientErr || !clientRow) {
    res.status(500).json({
      success: false,
      error:   `Failed to create client: ${clientErr?.message ?? 'unknown'}`,
    } satisfies ApiResponse);
    return;
  }

  const client = clientRow as Client;
  state.clientId = client.id;

  // ── Step 2: Create business_config row ───────────────────────────────────

  const configInsert = {
    client_id:            client.id,
    receptionist_name,
    services,
    service_areas,
    hourly_rate_min:      hourly_rate_min ?? null,
    hourly_rate_max:      hourly_rate_max ?? null,
    emergency_keywords,
    business_hours_start: business_hours_start ?? null,
    business_hours_end:   business_hours_end ?? null,
    working_days,
    timezone,
    system_prompt_override: system_prompt_override ?? null,
  };

  const { data: configRow, error: configErr } = await supabase
    .from('business_config')
    .insert(configInsert)
    .select()
    .single();

  if (configErr || !configRow) {
    await rollback(state);
    res.status(500).json({
      success: false,
      error:   `Failed to create business_config: ${configErr?.message ?? 'unknown'}`,
    } satisfies ApiResponse);
    return;
  }

  const config = configRow as BusinessConfig;

  // ── Step 3: Build system prompt ───────────────────────────────────────────

  const prompt = buildSystemPrompt(client, config);

  // ── Steps 4 + 5: Create Retell LLM → Agent ───────────────────────────────

  let agentIds: { agentId: string; llmId: string };

  try {
    agentIds = await createRetellAgent({
      agentName:    `${receptionist_name} — ${business_name}`,
      prompt,
      ownerNumber:  owner_mobile ?? null,
      calendarBookingEnabled: !!client.google_cal_id,
      beginMessage: undefined,
    });
    state.llmId   = agentIds.llmId;
    state.agentId = agentIds.agentId;
  } catch (err: unknown) {
    await rollback(state);
    res.status(502).json({
      success: false,
      error:   `Retell agent creation failed: ${err instanceof Error ? err.message : String(err)}`,
    } satisfies ApiResponse);
    return;
  }

  // ── Steps 6–8: Buy + import UK number (optional — skip if unavailable) ──────

  let phoneNumber: string | null = null;

  try {
    const available = await searchUkNumbers(5);
    if (available.length) {
      const purchased = await buyUkNumber(available[0].phoneNumber);
      phoneNumber      = purchased.phoneNumber;
      state.twilioSid  = purchased.sid;

      await attachNumberToTrunk(purchased.sid);
      await importTwilioNumber(phoneNumber, agentIds.agentId);
      state.retellNumber = phoneNumber;
    }
  } catch (err: unknown) {
    // Non-fatal — agent is live, number can be added later via Settings
    console.warn('[provision] Phone number step skipped:', err instanceof Error ? err.message : err);
  }

  // ── Step 9: Persist agent_id + phone back to Supabase ────────────────────

  const { data: finalRow, error: updateErr } = await supabase
    .from('clients')
    .update({
      retell_agent_id: agentIds.agentId,
      twilio_number:   phoneNumber,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', client.id)
    .select()
    .single();

  if (updateErr || !finalRow) {
    // Infrastructure is fully provisioned — only the DB record didn't update.
    // Return 207 so the caller knows it's safe and what IDs to patch manually.
    console.error('[provision] Supabase update failed after full provisioning', updateErr);
    const partialClient = { ...client, retell_agent_id: agentIds.agentId, twilio_number: phoneNumber } as Client;
    res.status(207).json({
      success: true,
      data:    buildProvisionResponse(partialClient, phoneNumber),
      error: [
        'Supabase update failed — infrastructure is provisioned.',
        `PATCH /clients/${client.id} with retell_agent_id and twilio_number to complete.`,
      ].join(' '),
    } satisfies ApiResponse<ClientProvisionResponse>);
    return;
  }

  const finalClient = finalRow as Client;
  console.log(
    `[provision] complete  client=${finalClient.id}  mode=${finalClient.own_number ? 'keep_existing' : 'new_number'}  number=${phoneNumber ?? 'none'}`
  );
  res.status(201).json({
    success: true,
    data:    buildProvisionResponse(finalClient, phoneNumber),
  } satisfies ApiResponse<ClientProvisionResponse>);
});

// ── POST /clients/:id/assign-number ──────────────────────────────────────────
//
// Manually assign a UK phone number to an existing client.
// Supports two modes via optional body field:
//   own_number (string) — client keeps their existing number, uses carrier divert.
//                         Response includes activation_code with the USSD string.
//   (omitted)           — new Twilio number becomes their advertised number.

router.post('/:id/assign-number', async (req: Request, res: Response) => {
  const own_number: string | undefined = typeof req.body?.own_number === 'string'
    ? req.body.own_number
    : undefined;

  const { data: clientRow, error: fetchErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !clientRow) {
    res.status(404).json({ success: false, error: 'Client not found' } satisfies ApiResponse);
    return;
  }

  const client = clientRow as Client;

  if (!client.retell_agent_id) {
    res.status(400).json({
      success: false,
      error: 'Client has no Retell agent — run /provision first',
    } satisfies ApiResponse);
    return;
  }

  if (client.twilio_number) {
    res.status(400).json({
      success: false,
      error: `Client already has number ${client.twilio_number}`,
    } satisfies ApiResponse);
    return;
  }

  let phoneNumber: string;
  let twilioSid: string;

  try {
    const available = await searchUkNumbers(5);
    if (!available.length) {
      res.status(502).json({
        success: false,
        error: 'No UK numbers available on Twilio right now — try again shortly',
      } satisfies ApiResponse);
      return;
    }
    const purchased = await buyUkNumber(available[0].phoneNumber);
    phoneNumber = purchased.phoneNumber;
    twilioSid   = purchased.sid;
  } catch (err: unknown) {
    res.status(502).json({
      success: false,
      error: `Twilio purchase failed: ${err instanceof Error ? err.message : String(err)}`,
    } satisfies ApiResponse);
    return;
  }

  try {
    await attachNumberToTrunk(twilioSid);
    await importTwilioNumber(phoneNumber, client.retell_agent_id);
  } catch (err: unknown) {
    await releaseNumber(twilioSid).catch(() => null);
    res.status(502).json({
      success: false,
      error: `Retell import failed: ${err instanceof Error ? err.message : String(err)}`,
    } satisfies ApiResponse);
    return;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('clients')
    .update({
      twilio_number: phoneNumber,
      own_number:    own_number ?? null,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', client.id)
    .select()
    .single();

  if (updateErr || !updated) {
    const partialClient = { ...client, twilio_number: phoneNumber, own_number: own_number ?? null } as Client;
    res.status(207).json({
      success: true,
      data: buildProvisionResponse(partialClient, phoneNumber),
      error: `Supabase update failed — number ${phoneNumber} purchased and imported but not saved. PATCH /clients/${client.id} manually.`,
    } satisfies ApiResponse<ClientProvisionResponse>);
    return;
  }

  const updatedClient = updated as Client;
  console.log(
    `[clients] assigned ${phoneNumber} to ${client.owner_email}  mode=${updatedClient.own_number ? 'keep_existing' : 'new_number'}`
  );
  res.json({
    success: true,
    data: buildProvisionResponse(updatedClient, phoneNumber),
  } satisfies ApiResponse<ClientProvisionResponse>);
});

// ── GET /clients/:id/activation-code ─────────────────────────────────────────
//
// Returns the USSD divert activation code for a client that has both a
// twilio_number and an own_number set. Safe to call any time — idempotent.

router.get('/:id/activation-code', async (req: Request, res: Response) => {
  const { data: clientRow, error } = await supabase
    .from('clients')
    .select('id, twilio_number, own_number, business_name, owner_email')
    .eq('id', req.params.id)
    .single();

  if (error || !clientRow) {
    res.status(404).json({ success: false, error: 'Client not found' } satisfies ApiResponse);
    return;
  }

  const { twilio_number, own_number } = clientRow as Pick<Client, 'twilio_number' | 'own_number' | 'id' | 'business_name' | 'owner_email'>;

  if (!twilio_number) {
    res.status(400).json({
      success: false,
      error: 'Client has no Twilio number yet — run /assign-number or /provision first',
    } satisfies ApiResponse);
    return;
  }

  if (!own_number) {
    res.status(400).json({
      success: false,
      error: 'Client is in new_number mode — no divert needed. Set own_number via PATCH /clients/:id to switch to keep_existing mode.',
    } satisfies ApiResponse);
    return;
  }

  const activation_code = buildActivationCode(twilio_number);
  const activation_instructions =
    `On your mobile, dial ${activation_code} and press call. ` +
    `Your AI receptionist will then answer calls to ${own_number} whenever you\'re busy or unavailable.`;

  res.json({
    success: true,
    data: { activation_code, activation_instructions, own_number, twilio_number },
  } satisfies ApiResponse);
});

// ── POST /clients/rebuild-agent ───────────────────────────────────────────────
// Called by the frontend after onboarding saves new business_config data.
// Fetches the latest client + config and pushes a fresh prompt to Retell.

router.post('/rebuild-agent', async (req: Request, res: Response) => {
  const { clientId } = req.body as { clientId?: string };
  if (!clientId) {
    res.status(400).json({ success: false, error: 'clientId required' } satisfies ApiResponse);
    return;
  }

  const [{ data: client }, { data: config }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('business_config').select('*').eq('client_id', clientId).single(),
  ]);

  if (!client || !config) {
    res.status(404).json({ success: false, error: 'Client or config not found' } satisfies ApiResponse);
    return;
  }

  if (!client.retell_agent_id) {
    res.status(200).json({ success: true, data: { skipped: true, reason: 'No Retell agent yet' } } satisfies ApiResponse);
    return;
  }

  try {
    await updateAgentConfiguration(client as Client, config as BusinessConfig);
    console.log(`[clients] Rebuilt Retell prompt for ${client.business_name} (${client.id})`);
    res.json({ success: true } satisfies ApiResponse);
  } catch (err: unknown) {
    console.error('[clients] rebuild-agent failed', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Retell update failed',
    } satisfies ApiResponse);
  }
});

// ── POST /clients/connect-number ──────────────────────────────────────────────
// Backfill / repair: connect a client's existing Twilio number to the SIP trunk
// and import it into Retell. Use for numbers provisioned before the trunk-attach
// step existed (their inbound calls fail with "incorrect number"). Idempotent —
// the trunk attach treats "already attached" as success.

router.post('/connect-number', async (req: Request, res: Response) => {
  const { clientId } = req.body as { clientId?: string };
  if (!clientId) {
    res.status(400).json({ success: false, error: 'clientId required' } satisfies ApiResponse);
    return;
  }

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (!client) {
    res.status(404).json({ success: false, error: 'Client not found' } satisfies ApiResponse);
    return;
  }
  if (!client.twilio_number) {
    res.status(400).json({ success: false, error: 'Client has no Twilio number to connect' } satisfies ApiResponse);
    return;
  }
  if (!client.retell_agent_id) {
    res.status(400).json({ success: false, error: 'Client has no Retell agent — run /provision first' } satisfies ApiResponse);
    return;
  }

  try {
    const numberSid = await findNumberSid(client.twilio_number as string);
    if (!numberSid) {
      res.status(404).json({
        success: false,
        error: `Twilio does not own ${client.twilio_number} on this account`,
      } satisfies ApiResponse);
      return;
    }

    await attachNumberToTrunk(numberSid);
    await importTwilioNumber(client.twilio_number as string, client.retell_agent_id as string);

    console.log(`[clients] connect-number repaired ${client.twilio_number} -> ${client.retell_agent_id} (${client.id})`);
    res.json({
      success: true,
      data: { phoneNumber: client.twilio_number, agentId: client.retell_agent_id },
    } satisfies ApiResponse<{ phoneNumber: string; agentId: string }>);
  } catch (err: unknown) {
    console.error('[clients] connect-number failed', err);
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to connect number',
    } satisfies ApiResponse);
  }
});

export default router;
