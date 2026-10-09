/**
 * Per-tenant agent overrides that the tenant must not be able to set.
 *
 * `agent_overrides` (migration 022) has RLS enabled and no policies, so only the
 * service role reads or writes it. See lib/agent-voice.ts for why the voice
 * override cannot live on `clients` or `business_config`.
 */
import { supabase } from './supabase';
import { errorMessage, logEvent } from '../lib/observability';

/**
 * The voice this tenant has been given instead of their plan's, or null.
 * A failed read answers null (the plan's voice) and logs: a missing override
 * must never stop an agent being rebuilt.
 */
export async function voiceOverrideFor(clientId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('agent_overrides')
      .select('voice_id')
      .eq('client_id', clientId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const voice = (data as { voice_id: string | null } | null)?.voice_id;
    return voice?.trim() || null;
  } catch (err: unknown) {
    logEvent('error', 'agent_overrides.read_failed', { clientId, error: errorMessage(err) });
    return null;
  }
}
