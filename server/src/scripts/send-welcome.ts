/**
 * One-off: re-send the welcome email for a tenant whose Stripe provisioning
 * failed part-way. Replaying the Stripe event does NOT work — the owner_email
 * idempotency check in provisionClient() short-circuits before the email step.
 *
 *   npx tsx --env-file=../.env src/scripts/send-welcome.ts <owner_email> [--send]
 *
 * Without --send it renders and prints a summary only (dry run).
 */
import { supabase } from '../services/supabase';
import { sendEmail } from '../services/resend';
import { welcomeHtml } from '../routes/webhooks/stripe';

async function main(): Promise<void> {
  const ownerEmail = process.argv[2]?.toLowerCase();
  const send = process.argv.includes('--send');
  if (!ownerEmail) throw new Error('usage: send-welcome.ts <owner_email> [--send]');

  const { data: client, error } = await supabase
    .from('clients')
    .select('owner_name,owner_email,plan,twilio_number')
    .eq('owner_email', ownerEmail)
    .single();
  if (error || !client) throw new Error(`no client for ${ownerEmail}: ${error?.message}`);

  const siteUrl = process.env.SITE_URL ?? 'https://tradereceptionist.com';
  let loginUrl = `${siteUrl}/onboarding`;

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerEmail,
    options: { redirectTo: `${siteUrl}/onboarding` },
  });
  const actionLink = (linkData as { properties?: { action_link?: string } } | null)
    ?.properties?.action_link;
  if (actionLink) loginUrl = actionLink;
  else console.warn('magic link unavailable, falling back to /onboarding:', linkErr?.message);

  const plan = client.plan.charAt(0).toUpperCase() + client.plan.slice(1);
  const firstName = (client.owner_name ?? 'there').split(' ')[0];
  const html = welcomeHtml({ firstName, plan, phoneNumber: client.twilio_number, loginUrl });

  console.log({
    to: client.owner_email,
    firstName,
    plan,
    phoneNumber: client.twilio_number,
    magicLink: Boolean(actionLink),
    htmlBytes: html.length,
    mode: send ? 'SEND' : 'DRY RUN',
  });

  if (!send) return;

  await sendEmail({
    to: client.owner_email,
    subject: `Your Trade Receptionist is live — ${client.twilio_number ?? 'number provisioning'}`,
    html,
  });
  console.log('sent');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
