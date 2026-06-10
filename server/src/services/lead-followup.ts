import { supabase } from './supabase';
import { sendSms } from './twilio';
import { logEvent, errorMessage } from '../lib/observability';
import type { Client, Lead } from '../../../shared/types';

interface LeadWithClient extends Lead {
  clients: Pick<Client, 'business_name' | 'owner_name' | 'twilio_number'> | null;
}

interface FollowUpResult {
  sent: number;
  skipped: number;
  errors: number;
}

function buildFollowUpSms(
  lead: Lead,
  client: Pick<Client, 'business_name' | 'owner_name'>
): string {
  const name = lead.caller_name ? `, ${lead.caller_name.split(' ')[0]}` : '';
  const jobLine = lead.job_type ? ` about your ${lead.job_type}` : '';
  return [
    `Hi${name} — this is ${client.business_name}.`,
    `We missed you when you called us${jobLine}.`,
    `${client.owner_name} would love to help — give us a ring back or reply here.`,
  ].join(' ');
}

export async function runLeadFollowUp(): Promise<FollowUpResult> {
  const result: FollowUpResult = { sent: 0, skipped: 0, errors: 0 };

  // Leads created between 48h and 7 days ago, still new, not yet followed up
  const cutoffOld  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const cutoffNew  = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from('leads')
    .select('*, clients!inner(business_name, owner_name, twilio_number)')
    .eq('status', 'new')
    .not('caller_number', 'is', null)
    .is('follow_up_sent_at', null)
    .gte('created_at', cutoffOld)
    .lte('created_at', cutoffNew);

  if (error) {
    logEvent('error', 'lead_followup.query_failed', { error: error.message });
    return result;
  }

  const leads = (rows ?? []) as LeadWithClient[];

  for (const lead of leads) {
    const client = lead.clients;

    if (!client) {
      logEvent('warn', 'lead_followup.no_client', { leadId: lead.id });
      result.skipped++;
      continue;
    }

    if (!client.twilio_number) {
      logEvent('warn', 'lead_followup.no_twilio_number', { leadId: lead.id });
      result.skipped++;
      continue;
    }

    const callerNumber = lead.caller_number!;

    // Mark as sent first — idempotency guard in case of crash mid-loop
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        follow_up_sent_at: new Date().toISOString(),
        status: 'contacted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
      .is('follow_up_sent_at', null); // only update if still null (concurrent-safe)

    if (updateError) {
      logEvent('error', 'lead_followup.update_failed', { leadId: lead.id, error: updateError.message });
      result.errors++;
      continue;
    }

    try {
      const body = buildFollowUpSms(lead, client);
      await sendSms(callerNumber, body, client.twilio_number);
      logEvent('info', 'lead_followup.sms_sent', { leadId: lead.id, to: callerNumber });
      result.sent++;
    } catch (err: unknown) {
      logEvent('error', 'lead_followup.sms_failed', {
        leadId: lead.id,
        error: errorMessage(err),
      });
      result.errors++;
    }
  }

  logEvent('info', 'lead_followup.run_complete', { ...result });
  return result;
}
