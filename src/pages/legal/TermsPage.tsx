import { Link } from 'react-router-dom';
import { Logo } from '../../../components/Logo';

const EFFECTIVE = '1 May 2026';
const COMPANY   = 'Trade Receptionist Ltd';
const EMAIL     = 'legal@tradereceptionist.co.uk';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-[18px] font-bold font-display text-offwhite mb-4 mt-8">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] text-offwhite/65 font-body leading-[1.75] mb-3">{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1.5 mb-3 text-[15px] text-offwhite/65 font-body leading-[1.75]">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-navy font-body">
      {/* Header */}
      <header className="border-b border-white/[0.05] bg-void/60 backdrop-blur-[20px]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo className="h-7 w-auto" />
          </Link>
          <Link
            to="/"
            className="text-[13px] text-offwhite/40 hover:text-offwhite/70 transition-colors font-body"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      {/* Document */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-orange-soft font-body mb-3">
            Legal
          </p>
          <h1 className="text-[36px] font-bold font-display text-offwhite tracking-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-[14px] text-offwhite/35 font-body">
            Effective {EFFECTIVE} · {COMPANY} · Registered in England &amp; Wales
          </p>
        </div>

        <P>
          These Terms of Service ("Terms") govern your use of Trade Receptionist, an AI-powered
          virtual receptionist service operated by {COMPANY} ("we", "us", "our"). By creating an
          account or using our service, you agree to these Terms in full. If you do not agree,
          do not use the service.
        </P>

        <Section title="1. The Service">
          <P>
            Trade Receptionist provides an AI telephone answering service for UK tradespeople and
            small businesses ("Subscribers"). The service answers inbound calls, collects caller
            information, provides job-booking assistance, and delivers post-call summaries via SMS
            and email.
          </P>
          <P>
            We use third-party providers to deliver the service, including Twilio (telephony and
            SMS), Retell AI (AI voice agent), Supabase (data storage), and Stripe (payments).
            Your use of the service is also subject to those providers' terms where applicable.
          </P>
        </Section>

        <Section title="2. Accounts and Eligibility">
          <Ul items={[
            'You must be 18 or older and a business owner or authorised representative to register.',
            'You are responsible for keeping your login credentials secure.',
            'One account per business. You may not resell or sublicense access without our written consent.',
            'We reserve the right to refuse or terminate accounts at our discretion.',
          ]} />
        </Section>

        <Section title="3. Free Trial">
          <P>
            We offer a 14-day free trial to new Subscribers. No payment card is required to start
            a trial. At the end of the trial period, your account will be paused unless you
            subscribe to a paid plan. Trial usage is subject to a fair-use limit of 50 inbound
            calls.
          </P>
        </Section>

        <Section title="4. Subscription Plans and Billing">
          <P>We currently offer three monthly subscription plans:</P>
          <Ul items={[
            'Starter — £29/month (up to 100 calls/month)',
            'Pro — £59/month (up to 300 calls/month)',
            'Agency — £119/month (unlimited calls)',
          ]} />
          <P>
            Annual billing is available at a discount equivalent to two months free. Prices are
            exclusive of VAT where applicable. Billing is handled securely through Stripe. By
            subscribing, you authorise us to charge the payment method on file on a recurring
            monthly or annual basis.
          </P>
          <P>
            If a payment fails, we will retry up to three times over seven days. Continued
            non-payment will result in service suspension. We will notify you by email of any
            failed payments.
          </P>
        </Section>

        <Section title="5. Cancellation and Refunds">
          <P>
            You may cancel your subscription at any time from your account settings. Cancellation
            takes effect at the end of your current billing period — you retain full access until
            that date. We do not offer prorated refunds for unused periods.
          </P>
          <P>
            If you experience a significant service outage directly caused by our platform (not
            a third-party provider) lasting more than 24 consecutive hours, you may request a
            prorated credit by contacting {EMAIL} within 14 days of the incident.
          </P>
        </Section>

        <Section title="6. Acceptable Use">
          <P>You must not use Trade Receptionist to:</P>
          <Ul items={[
            'Conduct any activity that is illegal under UK or applicable international law.',
            'Deceive callers about the nature or existence of the AI answering service.',
            'Process calls for industries requiring specialist regulatory compliance (e.g. financial advice, medical triage, legal advice) without ensuring appropriate disclaimers are in place.',
            'Circumvent call limits or usage restrictions.',
            'Attempt to reverse-engineer, copy, or resell the service.',
          ]} />
          <P>
            We reserve the right to suspend your account without notice if we reasonably believe
            there is a breach of this section.
          </P>
        </Section>

        <Section title="7. AI Call Handling — Important Disclaimer">
          <P>
            Our AI receptionist is designed to handle routine trade enquiries accurately. However,
            it is an automated system and may occasionally misunderstand callers, mishear
            information, or fail to capture all relevant details. You remain responsible for
            reviewing call summaries and following up with callers as appropriate.
          </P>
          <P>
            The AI is not a substitute for human judgement in genuinely urgent or life-threatening
            situations. When an emergency keyword is detected, the system sends you an immediate
            alert — but you must ensure your own emergency response procedures are in place. We
            accept no liability for any loss arising from an AI-handled call.
          </P>
        </Section>

        <Section title="8. Call Recording and Transcription">
          <P>
            Calls handled by our service may be recorded and transcribed to generate summaries
            and improve service accuracy. Callers must be informed that their call may be recorded
            and handled by an AI system. Our AI agent includes this disclosure at the start of
            each call. You must not disable or circumvent this disclosure.
          </P>
          <P>
            Call recordings are retained for 90 days and then deleted automatically. Transcripts
            and summaries are retained for as long as your account is active, plus 12 months
            after cancellation.
          </P>
        </Section>

        <Section title="9. Data and Privacy">
          <P>
            By using the service, you act as a data controller for personal data collected from
            your callers (including names, phone numbers, postcodes, and job details). We act as
            your data processor for that data. Our data processing practices are set out in our{' '}
            <Link to="/privacy" className="text-orange hover:text-orange-glow transition-colors underline underline-offset-2">
              Privacy Policy
            </Link>
            {' '}and our Data Processing Agreement, which forms part of these Terms.
          </P>
          <P>
            You are responsible for ensuring you have a lawful basis for collecting and processing
            caller personal data under the UK GDPR, and for informing callers accordingly.
          </P>
        </Section>

        <Section title="10. Intellectual Property">
          <P>
            All software, AI models, branding, and content forming part of the Trade Receptionist
            platform are owned by {COMPANY} or our licensors. These Terms do not grant you any
            rights in our intellectual property beyond the limited licence necessary to use the
            service as intended.
          </P>
          <P>
            You retain ownership of your business data (caller records, summaries, leads). We do
            not use your business data to train AI models without your explicit consent.
          </P>
        </Section>

        <Section title="11. Limitation of Liability">
          <P>
            To the maximum extent permitted by law, {COMPANY} shall not be liable for any
            indirect, incidental, special, or consequential loss arising from your use of the
            service, including but not limited to loss of revenue, missed jobs, or data loss.
          </P>
          <P>
            Our total aggregate liability to you for any claim arising under or in connection
            with these Terms shall not exceed the total fees paid by you in the 12 months
            preceding the claim.
          </P>
          <P>
            Nothing in these Terms limits liability for death or personal injury caused by
            negligence, fraud, or any other liability that cannot be excluded by law.
          </P>
        </Section>

        <Section title="12. Service Availability">
          <P>
            We aim to provide a reliable service but cannot guarantee 100% uptime. Planned
            maintenance will be communicated in advance where possible. We are not responsible
            for outages caused by Twilio, Retell, Stripe, or any other third-party provider.
          </P>
        </Section>

        <Section title="13. Governing Law">
          <P>
            These Terms are governed by the laws of England and Wales. Any disputes shall be
            subject to the exclusive jurisdiction of the courts of England and Wales.
          </P>
        </Section>

        <Section title="14. Changes to These Terms">
          <P>
            We may update these Terms from time to time. We will give you at least 14 days'
            notice of material changes by email before they take effect. Continued use of the
            service after that date constitutes acceptance of the updated Terms.
          </P>
        </Section>

        <Section title="15. Contact">
          <P>
            For questions about these Terms, please contact us at{' '}
            <a href={`mailto:${EMAIL}`} className="text-orange hover:text-orange-glow transition-colors">
              {EMAIL}
            </a>
            .
          </P>
        </Section>

        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <p className="text-[13px] text-offwhite/25 font-body">
            &copy; {new Date().getFullYear()} {COMPANY}. Registered in England &amp; Wales.
          </p>
        </div>
      </main>
    </div>
  );
}
