import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../services/supabase';
import { buildSystemPrompt } from '../../lib/prompt-builder';
import {
  updateAgentPrompt,
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
} from '../../services/twilio';
import type { ApiResponse, Client, BusinessConfig } from '../../../../shared/types';

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const createSchema = z.object({
  business_name: z.string().min(1),
  owner_name:    z.string().min(1),
  owner_email:   z.string().email(),
  owner_mobile:  z.string().optional(),
  plan:          z.enum(['starter', 'pro', 'agency']).default('starter'),
});

const updateSchema = createSchema.partial().extend({
  retell_agent_id:      z.string().optional(),
  twilio_number:        z.string().optional(),
  google_cal_id:        z.string().optional(),
  google_refresh_token: z.string().optional(),
  is_active:            z.boolean().optional(),
});

const configSchema = z.object({
  receptionist_name:    z.string().min(1).default('Sarah'),
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
      const prompt = buildSystemPrompt(client, configRow as BusinessConfig);
      updateAgentPrompt(client.retell_agent_id, prompt).catch((err: unknown) =>
        console.error('[clients] Retell prompt sync failed', err)
      );
    }
  }

  res.json({ success: true, data: client } satisfies ApiResponse<Client>);
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
    business_name, owner_name, owner_email, owner_mobile, plan,
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
    .insert({ business_name, owner_name, owner_email, owner_mobile, plan })
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
    res.status(207).json({
      success: true,
      data:    {
        ...client,
        retell_agent_id: agentIds.agentId,
        twilio_number:   phoneNumber,
      },
      error: [
        'Supabase update failed — infrastructure is provisioned.',
        `PATCH /clients/${client.id} with retell_agent_id and twilio_number to complete.`,
      ].join(' '),
    } satisfies ApiResponse<Client>);
    return;
  }

  res.status(201).json({
    success: true,
    data:    finalRow as Client,
  } satisfies ApiResponse<Client>);
});

export default router;
