import { Link } from 'react-router-dom';
import { Logo } from '../../../components/Logo';

const EFFECTIVE = '1 May 2026';
const COMPANY   = 'Trade Receptionist Ltd';
const EMAIL     = 'privacy@tradereceptionist.co.uk';

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

function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-[14px] font-body">
        <thead>
          <tr className="border-b border-white/[0.08]">
            <th className="text-left py-2 pr-4 text-offwhite/40 font-semibold uppercase tracking-[0.08em] text-[11px]">Data</th>
            <th className="text-left py-2 pr-4 text-offwhite/40 font-semibold uppercase tracking-[0.08em] text-[11px]">Purpose</th>
            <th className="text-left py-2 text-offwhite/40 font-semibold uppercase tracking-[0.08em] text-[11px]">Lawful basis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([data, purpose, basis], i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white/[0.015]' : ''}>
              <td className="py-2.5 pr-4 text-offwhite/65 align-top">{data}</td>
              <td className="py-2.5 pr-4 text-offwhite/65 align-top">{purpose}</td>
              <td className="py-2.5 text-offwhite/65 align-top">{basis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-[14px] text-offwhite/35 font-body">
            Effective {EFFECTIVE} · {COMPANY} · Registered in England &amp; Wales
          </p>
        </div>

        <P>
          This Privacy Policy explains how {COMPANY} ("we", "us", "our") collects, uses, and
          protects personal data in connection with the Trade Receptionist service. We are committed
          to handling personal data responsibly and in compliance with the UK General Data Protection
          Regulation (UK GDPR) and the Data Protection Act 2018.
        </P>

        <Section title="1. Who We Are">
          <P>
            {COMPANY} is the data controller for personal data collected directly from Subscribers
            (business owners who use our service). For personal data collected from callers on behalf
            of a Subscriber, we act as a data processor — the Subscriber is the data controller for
            that data.
          </P>
          <P>
            For questions about this policy or to exercise your rights, contact our privacy team at{' '}
            <a href={`mailto:${EMAIL}`} className="text-orange hover:text-orange-glow transition-colors">
              {EMAIL}
            </a>
            .
          </P>
        </Section>

        <Section title="2. Personal Data We Collect">
          <P>We collect personal data in two distinct contexts:</P>

          <h3 className="text-[15px] font-semibold text-offwhite mb-2 mt-4">2A. Subscriber data (business owners)</h3>
          <P>When you register and use Trade Receptionist, we collect:</P>
          <Ul items={[
            'Name, email address, and phone number',
            'Business name, trade type, and postcode',
            'Payment and billing information (processed by Stripe — we do not store card numbers)',
            'Account preferences and configuration (greetings, availability hours, emergency keywords)',
            'Usage data (call counts, plan type, login history)',
          ]} />

          <h3 className="text-[15px] font-semibold text-offwhite mb-2 mt-4">2B. Caller data (collected on behalf of Subscribers)</h3>
          <P>
            When the AI receptionist handles an inbound call to a Subscriber's number, we collect
            and process on the Subscriber's behalf:
          </P>
          <Ul items={[
            "Caller's phone number (CLI)",
            "Caller's name and postcode (if provided during the call)",
            'Nature of the job or enquiry',
            'Urgency level (as classified by the AI)',
            'Call recording and transcript',
            'Post-call summary',
          ]} />
          <P>
            This data is processed under our Data Processing Agreement with the Subscriber. The
            Subscriber is responsible for ensuring they have a lawful basis for collecting and
            processing caller personal data under the UK GDPR.
          </P>
        </Section>

        <Section title="3. How We Use Personal Data">
          <P>The table below sets out our purposes and lawful bases for processing Subscriber personal data:</P>
          <Table rows={[
            ['Name, email, phone', 'Account creation, service delivery, notifications', 'Contract performance'],
            ['Business details', 'Configuring the AI receptionist, routing calls correctly', 'Contract performance'],
            ['Payment information', 'Processing subscription fees via Stripe', 'Contract performance'],
            ['Usage data', 'Billing, plan management, abuse prevention', 'Contract performance / Legitimate interests'],
            ['Email address', 'Service announcements, material change notices', 'Legitimate interests'],
            ['Email address', 'Marketing communications (product updates, offers)', 'Consent — you may opt out at any time'],
          ]} />
        </Section>

        <Section title="4. Call Recordings and Transcripts">
          <P>
            All calls handled by our service are recorded and transcribed using Retell AI to generate
            call summaries. Our AI receptionist discloses this to callers at the start of each call.
          </P>
          <Ul items={[
            'Call recordings are retained for 90 days and then permanently deleted.',
            'Transcripts and call summaries are retained for the lifetime of the Subscriber\'s account, plus 12 months after cancellation.',
            'Subscribers may request early deletion of specific call records by contacting our support team.',
          ]} />
          <P>
            As a Subscriber, you act as a data controller for caller recordings and transcripts. You
            must not disable the AI disclosure that informs callers their call may be recorded and
            handled by an AI system.
          </P>
        </Section>

        <Section title="5. Third-Party Processors">
          <P>We share personal data with trusted third-party processors to deliver the service. All processors are bound by data processing agreements:</P>
          <Ul items={[
            'Twilio (United States) — telephony, SMS delivery, phone number provisioning. Transfers rely on Standard Contractual Clauses (SCCs) with a UK Addendum.',
            'Retell AI (United States) — AI voice agent, call transcription and analysis. Transfers rely on SCCs with a UK Addendum.',
            'Supabase (United States/EU) — database hosting and authentication. EU region selected where available; transfers rely on SCCs.',
            'Stripe (United States) — subscription billing and payment processing. Transfers rely on SCCs with a UK Addendum.',
            'Resend (United States) — transactional email delivery. Transfers rely on SCCs.',
            'Sentry (United States) — error monitoring and application performance. Aggregate/anonymised data only where possible.',
          ]} />
          <P>
            We do not sell personal data to third parties. We do not share personal data with any
            party other than those listed above, except where required by law.
          </P>
        </Section>

        <Section title="6. International Data Transfers">
          <P>
            Several of our processors are based outside the UK. We ensure that any transfer of
            personal data to a third country is protected by an appropriate safeguard under UK GDPR
            Article 46, specifically Standard Contractual Clauses (SCCs) incorporating the UK
            International Data Transfer Addendum (UK IDTA) issued by the ICO.
          </P>
          <P>
            You may request a copy of the relevant transfer mechanisms by contacting{' '}
            <a href={`mailto:${EMAIL}`} className="text-orange hover:text-orange-glow transition-colors">
              {EMAIL}
            </a>
            .
          </P>
        </Section>

        <Section title="7. Data Retention">
          <Ul items={[
            'Subscriber account data: retained for the duration of the account plus 12 months after cancellation, then deleted.',
            'Call recordings: 90 days from the date of the call, then automatically deleted.',
            'Call transcripts and summaries: retained for the lifetime of the account plus 12 months.',
            'Billing records: 7 years from the transaction date (UK legal requirement).',
            'Marketing consent records: retained until consent is withdrawn, plus 3 years.',
          ]} />
        </Section>

        <Section title="8. Your Rights Under UK GDPR">
          <P>As a data subject, you have the following rights:</P>
          <Ul items={[
            'Right of access — request a copy of the personal data we hold about you.',
            'Right to rectification — request correction of inaccurate or incomplete data.',
            'Right to erasure ("right to be forgotten") — request deletion of your personal data where there is no overriding legal reason to retain it.',
            'Right to restriction — request that we restrict processing of your data in certain circumstances.',
            'Right to data portability — receive your data in a structured, commonly used, machine-readable format.',
            'Right to object — object to processing based on legitimate interests, or to direct marketing at any time.',
            'Rights related to automated decision-making — request human review of any solely automated decisions that significantly affect you.',
          ]} />
          <P>
            To exercise any of these rights, contact us at{' '}
            <a href={`mailto:${EMAIL}`} className="text-orange hover:text-orange-glow transition-colors">
              {EMAIL}
            </a>
            . We will respond within one calendar month. We may ask you to verify your identity before
            processing your request.
          </P>
          <P>
            If you are a caller whose data has been collected by a Subscriber, please contact the
            Subscriber directly — they are the data controller for that data. We will assist
            Subscribers in fulfilling data subject requests where we are able to do so.
          </P>
        </Section>

        <Section title="9. Cookies and Tracking">
          <P>
            Our website uses the following cookies and tracking technologies:
          </P>
          <Ul items={[
            'Strictly necessary cookies — session management, CSRF protection, and authentication state. These cannot be disabled.',
            'Analytics (Vercel Analytics) — anonymous, cookieless page-view tracking. No personal data collected.',
            'Error monitoring (Sentry) — captures application errors. Session replay is masked to prevent capture of personal data.',
          ]} />
          <P>
            We do not use advertising cookies or share data with advertising networks. You can
            control cookie preferences through your browser settings. Blocking strictly necessary
            cookies may prevent the service from functioning correctly.
          </P>
        </Section>

        <Section title="10. Security">
          <P>
            We implement appropriate technical and organisational measures to protect personal data
            against unauthorised access, disclosure, alteration, and destruction. These include:
          </P>
          <Ul items={[
            'Encryption in transit (TLS 1.2+) and at rest for all stored data.',
            'Row-level security (RLS) in our database — Subscribers can only access their own data.',
            'HMAC-SHA256 signature verification on all inbound webhooks.',
            'Access controls and audit logging on administrative systems.',
            'Regular security reviews of third-party integrations.',
          ]} />
          <P>
            In the event of a personal data breach that is likely to result in a risk to your rights
            and freedoms, we will notify you and the ICO within 72 hours of becoming aware of it.
          </P>
        </Section>

        <Section title="11. Children's Privacy">
          <P>
            Our service is intended solely for business use by adults aged 18 and over. We do not
            knowingly collect personal data from children under the age of 13. If you believe a
            child has provided us with personal data, contact{' '}
            <a href={`mailto:${EMAIL}`} className="text-orange hover:text-orange-glow transition-colors">
              {EMAIL}
            </a>{' '}
            and we will delete it promptly.
          </P>
        </Section>

        <Section title="12. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by email at least 14 days before they take effect. The date at the top of this
            page reflects the date of the most recent update. Continued use of the service after
            that date constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="13. Complaints">
          <P>
            If you are unhappy with how we have handled your personal data, please contact us first
            at{' '}
            <a href={`mailto:${EMAIL}`} className="text-orange hover:text-orange-glow transition-colors">
              {EMAIL}
            </a>
            . If you remain dissatisfied, you have the right to lodge a complaint with the
            Information Commissioner's Office (ICO):
          </P>
          <Ul items={[
            'Website: ico.org.uk',
            'Telephone: 0303 123 1113',
            'Post: Information Commissioner\'s Office, Wycliffe House, Water Lane, Wilmslow, SK9 5AF',
          ]} />
        </Section>

        <Section title="14. Contact">
          <P>
            For any questions about this Privacy Policy or our data practices, contact:{' '}
            <a href={`mailto:${EMAIL}`} className="text-orange hover:text-orange-glow transition-colors">
              {EMAIL}
            </a>
            .
          </P>
          <P>
            For general enquiries about the service, see our{' '}
            <Link to="/terms" className="text-orange hover:text-orange-glow transition-colors underline underline-offset-2">
              Terms of Service
            </Link>
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
