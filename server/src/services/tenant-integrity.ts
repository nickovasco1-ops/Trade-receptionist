/**
 * Tenant integrity check — does each paying tenant actually have a working
 * product?
 *
 * Provisioning spans four systems (Stripe → Supabase → Retell → Twilio) with no
 * transaction across them. `provisionClient()` logs and returns on any failure,
 * and Stripe already has its 200, so a partly-provisioned tenant is silent: the
 * customer is charged and nothing tells us they got nothing.
 *
 * On 2026-08-30 three separate faults of exactly this shape were live at once —
 * a plan value the DB rejected, a Retell field removed by a dated deprecation,
 * and a tenant whose number was never imported (broken since 2026-07-02). All
 * three were found by a customer complaining, not by us.
 *
 * This check diffs the four systems and names what is missing. It is read-only:
 * it repairs nothing, because the repair differs per fault and some cost money.
 */
import { supabase } from './supabase';
import { getRetellAgent, listRetellPhoneNumbers } from './retell';
import { getNumberDetails } from './twilio';
import { errorMessage, logEvent } from '../lib/observability';
import type { Client } from '../../../shared/types';

export type IntegritySeverity = 'critical' | 'warning';

export interface IntegrityFinding {
  clientId:     string;
  businessName: string;
  ownerEmail:   string;
  severity:     IntegritySeverity;
  code:         string;
  detail:       string;
}

export interface IntegrityReport {
  checkedAt:     string;
  tenantsChecked: number;
  findings:      IntegrityFinding[];
  healthy:       boolean;
}

interface StripeSubscription {
  status: string;
}

async function stripeSubscriptionStatus(subscriptionId: string): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const body = await res.json() as StripeSubscription;
  return typeof body.status === 'string' ? body.status : null;
}

/**
 * Stripe statuses under which the tenant should have a working receptionist.
 * `past_due` is deliberately included — service continues while payment is
 * retried, so a broken agent still matters.
 */
const SERVICEABLE = new Set(['trialing', 'active', 'past_due']);

export async function runTenantIntegrityCheck(): Promise<IntegrityReport> {
  const findings: IntegrityFinding[] = [];

  const { data, error } = await supabase
    .from('clients')
    .select('id,business_name,owner_email,plan,twilio_number,retell_agent_id,stripe_subscription_id,subscription_status,is_active');

  if (error) throw new Error(`tenant integrity: client fetch failed: ${error.message}`);

  // Automated-test tenants are provisioned with stub provider IDs, so they
  // always look broken. A leaked e2e row produced three critical findings and
  // would have emailed INTEGRITY_ALERT_EMAIL about a customer that never existed.
  const clients = ((data ?? []) as unknown as Client[])
    .filter((c) => !c.owner_email.endsWith('tradereceptionist.test'));

  // One call for all numbers rather than one per tenant.
  let retellNumbers: Array<{ phone_number: string; inbound_agent_ids: string[] }> = [];
  try {
    retellNumbers = await listRetellPhoneNumbers();
  } catch (err: unknown) {
    logEvent('error', 'integrity.retell_numbers_failed', { error: errorMessage(err) });
  }
  const retellByNumber = new Map(retellNumbers.map((n) => [n.phone_number, n]));

  let checked = 0;

  for (const client of clients) {
    const add = (severity: IntegritySeverity, code: string, detail: string) =>
      findings.push({
        clientId:     client.id,
        businessName: client.business_name,
        ownerEmail:   client.owner_email,
        severity,
        code,
        detail,
      });

    // ── Billing truth: Stripe, not our column ────────────────────────────────
    let stripeStatus: string | null = null;
    if (client.stripe_subscription_id) {
      try {
        stripeStatus = await stripeSubscriptionStatus(client.stripe_subscription_id);
      } catch (err: unknown) {
        logEvent('warn', 'integrity.stripe_lookup_failed', {
          clientId: client.id, error: errorMessage(err),
        });
      }
    }

    if (stripeStatus && stripeStatus !== client.subscription_status) {
      add('warning', 'billing_drift',
        `Stripe says "${stripeStatus}", DB says "${client.subscription_status}"`);
    }

    // A tenant Stripe considers dead should not still be served.
    if (stripeStatus && !SERVICEABLE.has(stripeStatus) && client.is_active) {
      add('critical', 'churned_still_active',
        `Stripe subscription is "${stripeStatus}" but is_active is true — churned tenant still being served`);
    }

    // Only tenants who should have a working product are worth checking further.
    const serviceable = stripeStatus ? SERVICEABLE.has(stripeStatus) : client.is_active;
    if (!serviceable) continue;
    checked += 1;

    // ── Config ───────────────────────────────────────────────────────────────
    const { count: configCount } = await supabase
      .from('business_config')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id);
    if (!configCount) {
      add('critical', 'missing_business_config',
        'No business_config row — prompt generation has nothing to build from');
    }

    // ── Retell agent ─────────────────────────────────────────────────────────
    if (!client.retell_agent_id) {
      add('critical', 'missing_agent', 'No retell_agent_id — no receptionist exists');
    } else {
      try {
        const agent = await getRetellAgent(client.retell_agent_id);
        if (!agent) {
          add('critical', 'agent_not_found_at_retell',
            `retell_agent_id ${client.retell_agent_id} does not exist at Retell`);
        }
      } catch (err: unknown) {
        logEvent('warn', 'integrity.agent_lookup_failed', {
          clientId: client.id, error: errorMessage(err),
        });
      }
    }

    // ── Phone number ─────────────────────────────────────────────────────────
    if (!client.twilio_number) {
      add('critical', 'missing_number',
        'No twilio_number — the tenant cannot receive calls at all');
      continue;
    }

    try {
      const number = await getNumberDetails(client.twilio_number);
      if (!number) {
        add('critical', 'number_not_owned',
          `${client.twilio_number} is not owned by this Twilio account`);
      } else if (!number.trunkSid) {
        add('critical', 'number_not_on_trunk',
          `${client.twilio_number} is not attached to the SIP trunk — inbound calls hear "incorrect number"`);
      }
    } catch (err: unknown) {
      logEvent('warn', 'integrity.twilio_lookup_failed', {
        clientId: client.id, error: errorMessage(err),
      });
    }

    const imported = retellByNumber.get(client.twilio_number);
    if (retellNumbers.length && !imported) {
      add('critical', 'number_not_imported_to_retell',
        `${client.twilio_number} is not imported into Retell — calls route nowhere`);
    } else if (imported && client.retell_agent_id
               && !imported.inbound_agent_ids.includes(client.retell_agent_id)) {
      add('critical', 'number_bound_to_wrong_agent',
        `${client.twilio_number} is bound to [${imported.inbound_agent_ids.join(', ') || 'no agent'}], expected ${client.retell_agent_id}`);
    }
  }

  const report: IntegrityReport = {
    checkedAt:      new Date().toISOString(),
    tenantsChecked: checked,
    findings,
    healthy:        findings.length === 0,
  };

  logEvent(findings.some((f) => f.severity === 'critical') ? 'error' : 'info',
    'integrity.check_complete', {
      tenantsChecked: checked,
      findingCount:   findings.length,
      criticalCount:  findings.filter((f) => f.severity === 'critical').length,
    });

  return report;
}
