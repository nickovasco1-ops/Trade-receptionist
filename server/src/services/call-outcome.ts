/**
 * Keeping `calls.outcome` true after the call has ended.
 *
 * The outcome is first written by `call_ended`, which usually arrives before
 * Retell has analysed the call — so it was derived from an empty summary and
 * fell through to `enquiry`. Nothing ever revisited it. Found 2026-09-25: all
 * 19 calls of the previous 30 days were stored as `enquiry` while Retell's own
 * analysis said no_answer ×9, lead_captured ×6 and booked ×2, including a call
 * that had put a job in the customer's diary. The dashboard therefore showed a
 * tradesperson none of the jobs their receptionist had won them.
 *
 * Shared by the `call_analyzed` webhook and `POST /admin/sync-calls`, so the
 * live path and the recovery path cannot drift apart (see lead-extraction.ts
 * for why that matters).
 */
import type { CallOutcome } from '../../../shared/types';
import { supabase } from './supabase';
import { logEvent } from '../lib/observability';

/**
 * Whether the agent booked a job during this call. A booking row is a fact in
 * our own database; the outcome is an LLM's reading of the transcript.
 */
export async function callHasBooking(retellCallId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, calls!inner(retell_call_id)')
    .eq('calls.retell_call_id', retellCallId)
    .neq('status', 'cancelled')
    .limit(1);

  if (error) {
    logEvent('warn', 'call_outcome.booking_lookup_failed', { error: error.message });
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Store the analysed outcome on the call, and mark its lead booked when the
 * call booked a job. Returns true when anything was changed.
 *
 * A lead is only moved from `new` to `booked` — a status the owner has since
 * set by hand (contacted, lost…) is theirs and is left alone.
 */
export async function applyAnalysedOutcome(
  callId: string,
  current: CallOutcome | null,
  next: CallOutcome,
  source: 'call_analyzed' | 'sync_calls',
): Promise<boolean> {
  let changed = false;

  if (current !== next) {
    const { error } = await supabase.from('calls').update({ outcome: next }).eq('id', callId);
    if (error) {
      logEvent('error', 'call_outcome.update_failed', { source, error: error.message });
      return false;
    }
    logEvent('info', 'call_outcome.corrected', { source, from: current, to: next });
    changed = true;
  }

  if (next === 'booked') {
    const { data, error } = await supabase
      .from('leads')
      .update({ status: 'booked', updated_at: new Date().toISOString() })
      .eq('call_id', callId)
      .eq('status', 'new')
      .select('id');
    if (error) {
      logEvent('error', 'call_outcome.lead_update_failed', { source, error: error.message });
    } else if (data && data.length > 0) {
      changed = true;
    }
  }

  return changed;
}
