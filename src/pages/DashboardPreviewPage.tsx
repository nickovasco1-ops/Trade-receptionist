import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle,
  Filter,
  Key,
  Mail,
  MapPin,
  Phone,
  Play,
  Save,
  ShieldCheck,
  Siren,
  Timer,
  TrendingUp,
  Users,
  User,
  Zap,
} from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import DashboardShell from '../components/dashboard/DashboardShell';
import StatusBadge from '../components/dashboard/ui/StatusBadge';
import EmptyState from '../components/dashboard/ui/EmptyState';
import Button from '../components/dashboard/ui/Button';
import { OUTCOME_TONE } from '../components/dashboard/ui/outcomeTone';
import type { CallOutcome, LeadStatus, LeadUrgency } from '../../shared/types';

type PreviewCall = {
  id: string;
  caller_number: string;
  started_at: string;
  duration_secs: number;
  outcome: CallOutcome;
  is_emergency: boolean;
  recording_url?: string | null;
};

type PreviewLead = {
  id: string;
  caller_name: string;
  caller_number: string;
  caller_email?: string | null;
  postcode?: string | null;
  job_type?: string | null;
  urgency: LeadUrgency;
  status: LeadStatus;
  notes?: string | null;
  created_at: string;
};

const PREVIEW_CALLS: PreviewCall[] = [
  {
    id: 'call_1',
    caller_number: '07911 382645',
    started_at: '2026-05-05T08:42:00.000Z',
    duration_secs: 246,
    outcome: 'booked',
    is_emergency: false,
    recording_url: '#',
  },
  {
    id: 'call_2',
    caller_number: '07855 101209',
    started_at: '2026-05-05T07:58:00.000Z',
    duration_secs: 182,
    outcome: 'lead',
    is_emergency: true,
    recording_url: '#',
  },
  {
    id: 'call_3',
    caller_number: '07418 662990',
    started_at: '2026-05-04T17:15:00.000Z',
    duration_secs: 94,
    outcome: 'voicemail',
    is_emergency: false,
    recording_url: null,
  },
  {
    id: 'call_4',
    caller_number: '07702 003811',
    started_at: '2026-05-04T15:37:00.000Z',
    duration_secs: 214,
    outcome: 'lead',
    is_emergency: false,
    recording_url: '#',
  },
  {
    id: 'call_5',
    caller_number: '07544 982110',
    started_at: '2026-05-04T13:06:00.000Z',
    duration_secs: 66,
    outcome: 'booked',
    is_emergency: false,
    recording_url: '#',
  },
];

const PREVIEW_LEADS: PreviewLead[] = [
  {
    id: 'lead_1',
    caller_name: 'Dave Hendricks',
    caller_number: '07911 382645',
    caller_email: 'dave@example.com',
    postcode: 'SW16',
    job_type: 'Boiler repair',
    urgency: 'urgent',
    status: 'new',
    notes: 'Broken boiler, no hot water. Asked for earliest callback after 4pm.',
    created_at: '2026-05-05T08:45:00.000Z',
  },
  {
    id: 'lead_2',
    caller_name: 'Sarah Lee',
    caller_number: '07855 101209',
    caller_email: 'sarah@example.com',
    postcode: 'CR0',
    job_type: 'Emergency leak',
    urgency: 'emergency',
    status: 'contacted',
    notes: 'Leak under kitchen sink. Customer available immediately and requested same-day help.',
    created_at: '2026-05-05T07:59:00.000Z',
  },
  {
    id: 'lead_3',
    caller_name: 'John Davies',
    caller_number: '07418 662990',
    postcode: 'SE22',
    job_type: 'Bathroom fitting',
    urgency: 'routine',
    status: 'booked',
    notes: 'Quote accepted. Requested next Wednesday morning slot.',
    created_at: '2026-05-04T16:10:00.000Z',
  },
];

const STATUS_META: Record<LeadStatus, { label: string; tone: string }> = {
  new: { label: 'New', tone: 'bg-accent/15 text-accent' },
  contacted: { label: 'Contacted', tone: 'bg-status-warn/15 text-status-warn' },
  booked: { label: 'Booked', tone: 'bg-status-success/15 text-status-success' },
  lost: { label: 'Lost', tone: 'bg-status-muted-2/10 text-status-muted-2' },
  spam: { label: 'Spam', tone: 'bg-status-muted-2/10 text-status-muted-2' },
};

const URGENCY_META: Record<LeadUrgency, string> = {
  emergency: 'bg-orange/15 text-orange-soft',
  urgent: 'bg-status-warn/15 text-status-warn',
  routine: 'bg-status-muted/10 text-status-muted',
};

const PREVIEW_SETTINGS = {
  business_name: 'Hendricks Plumbing & Heating',
  owner_name: 'Dave Hendricks',
  owner_email: 'dave@hendricksplumbing.co.uk',
  owner_mobile: '+44 7791 138264',
  twilio_number: '+44 20 4571 9023',
  own_number: '+44 20 8333 9122',
  after_hours_message: 'We are currently off the tools, but Sarah has taken full details and we will call you back first thing.',
  google_cal_id: 'hendricksplumbing@gmail.com',
  google_cal_connected: true,
};

const PREVIEW_SHELL_PROPS = {
  preview: true,
  navBase: '/dashboard-preview',
  previewEmail: 'preview@tradereceptionist.co.uk',
} as const;

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function formatDuration(secs: number | null) {
  if (!secs) return '—';
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface StatCardProps {
  label: string;
  value: string;
  icon: ElementType;
  href?: string;
  accent?: boolean;
  helper?: string;
}

function StatCard({ label, value, icon: Icon, href, accent = false, helper }: StatCardProps) {
  const content = (
    <article
      className="group h-full rounded-[24px] px-5 py-5 transition-all duration-300 ease-mechanical hover:-translate-y-0.5"
      style={{
        background: accent
          ? 'linear-gradient(180deg, rgba(255,107,43,0.11) 0%, rgba(255,107,43,0.05) 100%)'
          : 'linear-gradient(180deg, rgba(17,31,53,0.84) 0%, rgba(10,23,39,0.90) 100%)',
        boxShadow: accent
          ? '0 0 0 1px rgba(255,107,43,0.22), 0 18px 38px rgba(2,13,24,0.26)'
          : '0 0 0 1px rgba(255,255,255,0.08), 0 18px 38px rgba(2,13,24,0.24)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">{label}</p>
          <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{value}</p>
          {helper ? <p className="mt-2 text-[12px] leading-relaxed text-offwhite/44">{helper}</p> : null}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: accent ? 'rgba(255,107,43,0.14)' : 'rgba(255,255,255,0.06)',
            boxShadow: accent ? '0 0 0 1px rgba(255,107,43,0.18)' : '0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          <Icon size={16} className={accent ? 'text-orange-soft' : 'text-offwhite/52'} aria-hidden="true" />
        </div>
      </div>
      {href ? (
        <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-orange-soft transition-colors duration-200 group-hover:text-orange">
          View details
          <ArrowRight size={12} aria-hidden="true" />
        </div>
      ) : null}
    </article>
  );

  return href ? <Link to={href} className="block h-full">{content}</Link> : content;
}

function SettingsSection({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: ElementType;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[28px] px-5 py-5 sm:px-6 sm:py-6"
      style={{
        background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.08),' +
          '0 22px 48px rgba(2,13,24,0.24)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
        >
          <Icon size={16} className="text-orange-soft" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[20px] font-bold tracking-[-0.03em] text-offwhite">{title}</h2>
          <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-offwhite/46">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function LabeledField({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  readOnly = false,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
        {label}
      </label>
      <input
        id={name}
        value={value}
        readOnly={readOnly}
        onChange={event => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={`min-h-[50px] w-full rounded-[18px] px-4 py-3 text-[14px] text-offwhite placeholder:text-offwhite/24 outline-none transition-all duration-200 focus:ring-2 focus:ring-orange/40 ${
          readOnly ? 'cursor-default bg-white/[0.03] opacity-70' : 'bg-white/[0.05]'
        }`}
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
      />
      {hint ? <p className="mt-2 text-[12px] leading-relaxed text-offwhite/38">{hint}</p> : null}
    </div>
  );
}

export default function DashboardPreviewPage() {
  const totalCalls = PREVIEW_CALLS.length;
  const totalLeads = PREVIEW_LEADS.length;
  const bookedJobs = PREVIEW_CALLS.filter(call => call.outcome === 'booked').length;
  const emergencies = PREVIEW_CALLS.filter(call => call.is_emergency).length;
  const leadRate = totalCalls > 0 ? (totalLeads / totalCalls) * 100 : 0;
  const bookingRate = totalLeads > 0 ? (bookedJobs / totalLeads) * 100 : 0;
  const emergencyRate = totalCalls > 0 ? (emergencies / totalCalls) * 100 : 0;

  return (
    <DashboardShell {...PREVIEW_SHELL_PROPS}>
      <div>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <article
            className="overflow-hidden rounded-[32px] px-6 py-6 sm:px-7 sm:py-7"
            style={{
              background:
                'radial-gradient(circle at 86% 20%, rgba(255,107,43,0.14) 0%, transparent 28%),' +
                'linear-gradient(180deg, rgba(17,31,53,0.94) 0%, rgba(9,22,38,0.98) 100%)',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.08),' +
                '0 30px 70px rgba(2,13,24,0.36),' +
                'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[58ch]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Dashboard preview</p>
                <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,4rem)] font-bold leading-[0.94] tracking-[-0.05em] text-offwhite">
                  Your receptionist is covering the phones.
                </h1>
                <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-offwhite/52 sm:text-[16px]">
                  This is a dummy dashboard walkthrough with realistic sample data so you can inspect the full premium UI without signing in or touching live records.
                </p>
              </div>
              <div
                className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
              >
                Preview mode
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                'No live auth required',
                'No database writes',
                'Same visual system as the real dashboard',
              ].map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/70"
                  style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                >
                  <ShieldCheck size={13} className="text-orange-soft" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/[0.04] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Lead capture rate</p>
                <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{formatPercent(leadRate)}</p>
                <p className="mt-2 text-[12px] text-offwhite/44">Based on the sample calls currently loaded into preview.</p>
              </div>
              <div className="rounded-[24px] bg-white/[0.04] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Lead to booking</p>
                <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{formatPercent(bookingRate)}</p>
                <p className="mt-2 text-[12px] text-offwhite/44">A quick view of how captured demand becomes real booked work.</p>
              </div>
              <div className="rounded-[24px] bg-white/[0.04] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Emergency share</p>
                <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{formatPercent(emergencyRate)}</p>
                <p className="mt-2 text-[12px] text-offwhite/44">Shows how much urgent inbound work is coming into the pipeline.</p>
              </div>
            </div>
          </article>

          <article
            className="rounded-[32px] px-6 py-6 sm:px-7 sm:py-7"
            style={{
              background: 'linear-gradient(180deg, rgba(17,31,53,0.90) 0%, rgba(9,22,38,0.96) 100%)',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.08),' +
                '0 24px 60px rgba(2,13,24,0.28)',
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">Operational focus</p>
            <h2 className="mt-3 font-display text-[26px] font-bold leading-[1] tracking-[-0.04em] text-offwhite">
              What needs attention next.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-offwhite/48">
              Walk the preview routes to inspect the full visual hierarchy across calls, leads, and settings.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                { href: '/dashboard-preview/calls', title: 'Review recent calls', copy: 'Inspect the premium filter bar, data table, and mobile cards.', icon: Phone },
                { href: '/dashboard-preview/leads', title: 'Review captured leads', copy: 'Check the urgency/status grouping and stronger pipeline cards.', icon: Users },
                { href: '/dashboard-preview/settings', title: 'Inspect settings surfaces', copy: 'See the upgraded utility layout and product control panels.', icon: Zap },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="rounded-[20px] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                        <Icon size={16} className="text-offwhite/60" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-offwhite">{item.title}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-offwhite/44">{item.copy}</p>
                      </div>
                      <ArrowRight size={14} className="mt-1 text-orange-soft/60" aria-hidden="true" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total calls" value={String(totalCalls)} icon={Phone} href="/dashboard-preview/calls" helper="Inbound conversations captured by Sarah." />
          <StatCard label="Leads captured" value={String(totalLeads)} icon={Users} href="/dashboard-preview/leads" helper="Enquiries worth reviewing and following up." />
          <StatCard label="Jobs booked" value={String(bookedJobs)} icon={TrendingUp} accent helper="Calls already converted into booked work." />
          <StatCard label="Emergencies" value={String(emergencies)} icon={AlertTriangle} helper="Urgent jobs that need fast action and clear prioritisation." />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <article
            className="rounded-[30px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(17,31,53,0.90) 0%, rgba(10,23,39,0.96) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/6 px-6 py-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">Latest activity</p>
                <h2 className="mt-2 font-display text-[24px] font-bold tracking-[-0.04em] text-offwhite">Recent calls</h2>
              </div>
              <Link
                to="/dashboard-preview/calls"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold text-orange-soft transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.16)' }}
              >
                Open calls
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>

            <div className="divide-y divide-white/6">
              {PREVIEW_CALLS.map(call => (
                <div key={call.id} className="grid gap-4 px-6 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: call.is_emergency ? 'rgba(255,107,43,0.12)' : 'rgba(255,255,255,0.05)',
                        boxShadow: call.is_emergency ? '0 0 0 1px rgba(255,107,43,0.18)' : '0 0 0 1px rgba(255,255,255,0.07)',
                      }}
                    >
                      <Phone size={14} className={call.is_emergency ? 'text-orange-soft' : 'text-offwhite/48'} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-offwhite/78">{call.caller_number}</p>
                      <p className="mt-1 text-[12px] text-offwhite/36">{call.is_emergency ? 'Marked as urgent call-out' : 'Inbound caller handled by Sarah'}</p>
                    </div>
                  </div>
                  <span className="text-[12px] text-offwhite/38 tabular-nums">{formatDate(call.started_at)}</span>
                  <span className="text-[12px] text-offwhite/38 tabular-nums">{formatDuration(call.duration_secs)}</span>
                  <StatusBadge outcome={call.outcome} className="justify-self-start md:justify-self-end" />
                </div>
              ))}
            </div>
          </article>

          <article
            className="rounded-[30px] px-6 py-6"
            style={{
              background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">Signal check</p>
            <h2 className="mt-2 font-display text-[24px] font-bold tracking-[-0.04em] text-offwhite">How the pipeline looks</h2>
            <div className="mt-6 space-y-4">
              {[
                { label: 'Lead capture', value: formatPercent(leadRate), copy: 'Shows how much answered demand is becoming structured follow-up.' },
                { label: 'Booking efficiency', value: formatPercent(bookingRate), copy: 'A fast signal for whether captured leads are turning into jobs.' },
                { label: 'Urgent call share', value: formatPercent(emergencyRate), copy: 'Useful when inspecting emergency response and callback pressure.' },
              ].map(item => (
                <div
                  key={item.label}
                  className="rounded-[20px] px-4 py-4"
                  style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-offwhite/74">{item.label}</p>
                    <span className="font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">{item.value}</span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-offwhite/42">{item.copy}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}

export function DashboardPreviewCallsPage() {
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  const filtered = useMemo(
    () => (outcomeFilter === 'all' ? PREVIEW_CALLS : PREVIEW_CALLS.filter(call => call.outcome === outcomeFilter)),
    [outcomeFilter],
  );

  const summary = useMemo(() => {
    const emergencyCount = filtered.filter(call => call.is_emergency).length;
    const recordedCount = filtered.filter(call => !!call.recording_url).length;
    const averageSecs = filtered.length > 0
      ? Math.round(filtered.reduce((sum, call) => sum + (call.duration_secs ?? 0), 0) / filtered.length)
      : 0;
    return { emergencyCount, recordedCount, averageSecs };
  }, [filtered]);

  const filterLabel = outcomeFilter === 'all'
    ? 'all outcomes'
    : (OUTCOME_TONE[outcomeFilter as NonNullable<CallOutcome>]?.label.toLowerCase() ?? outcomeFilter);

  return (
    <DashboardShell {...PREVIEW_SHELL_PROPS}>
      <div>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article
            className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
            style={{
              background:
                'radial-gradient(circle at 88% 16%, rgba(255,107,43,0.12) 0%, transparent 30%),' +
                'linear-gradient(180deg, rgba(17,31,53,0.92) 0%, rgba(10,23,39,0.96) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 28px 64px rgba(2,13,24,0.30)',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[58ch]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Calls preview</p>
                <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.8rem)] font-bold leading-[0.96] tracking-[-0.05em] text-offwhite">
                  Every conversation, clearly organised.
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-offwhite/50 sm:text-[16px]">
                  Use the filter to inspect the premium data treatment without relying on a live account or real call history.
                </p>
              </div>
              <div
                className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
              >
                {filtered.length} in view
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                `${PREVIEW_CALLS.length} total loaded`,
                `${summary.emergencyCount} urgent`,
                `${summary.recordedCount} with recordings`,
              ].map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/70"
                  style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                >
                  <Phone size={12} className="text-orange-soft" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article
            className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
            style={{
              background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
            }}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">
              <Filter size={12} aria-hidden="true" />
              Filtering
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-offwhite/48">
              Keep the list focused on what matters right now, whether that is booked calls, missed opportunities, or urgent inbound work.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Current filter</p>
                <p className="mt-3 text-[14px] font-semibold capitalize text-offwhite/78">{filterLabel}</p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Average length</p>
                <p className="mt-3 text-[14px] font-semibold text-offwhite/78">{formatDuration(summary.averageSecs)}</p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Urgent share</p>
                <p className="mt-3 text-[14px] font-semibold text-offwhite/78">
                  {filtered.length > 0 ? `${Math.round((summary.emergencyCount / filtered.length) * 100)}%` : '0%'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="preview-calls-filter" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                Outcome filter
              </label>
              <div className="relative">
                <select
                  id="preview-calls-filter"
                  value={outcomeFilter}
                  onChange={event => setOutcomeFilter(event.target.value)}
                  className="min-h-[50px] w-full appearance-none rounded-[18px] bg-white/[0.05] px-4 py-3 pr-11 text-[14px] text-offwhite/78 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] outline-none transition-all duration-200 focus:ring-2 focus:ring-orange/40"
                >
                  <option value="all">All outcomes</option>
                  {Object.keys(OUTCOME_TONE).map(outcome => (
                    <option key={outcome} value={outcome}>{OUTCOME_TONE[outcome as NonNullable<CallOutcome>].label}</option>
                  ))}
                </select>
                <Filter size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-offwhite/30" aria-hidden="true" />
              </div>
            </div>
          </article>
        </section>

        <div className="mt-6 space-y-3 lg:hidden">
          {filtered.map(call => (
            <article
              key={call.id}
              className="rounded-[24px] px-5 py-5"
              style={{
                background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 18px 38px rgba(2,13,24,0.22)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: call.is_emergency ? 'rgba(255,107,43,0.12)' : 'rgba(255,255,255,0.05)',
                      boxShadow: call.is_emergency ? '0 0 0 1px rgba(255,107,43,0.18)' : '0 0 0 1px rgba(255,255,255,0.07)',
                    }}
                  >
                    <Phone size={14} className={call.is_emergency ? 'text-orange-soft' : 'text-offwhite/48'} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-offwhite/78">{call.caller_number}</p>
                    <p className="mt-1 text-[12px] text-offwhite/38">{formatDate(call.started_at)}</p>
                  </div>
                </div>
                <StatusBadge outcome={call.outcome} className="flex-shrink-0" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-[12px] text-offwhite/56 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <Timer size={12} aria-hidden="true" />
                  {formatDuration(call.duration_secs)}
                </span>
                {call.is_emergency ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/[0.10] px-3 py-1.5 text-[12px] text-orange-soft shadow-[inset_0_0_0_1px_rgba(255,107,43,0.16)]">
                    <Siren size={12} aria-hidden="true" />
                    Emergency
                  </span>
                ) : null}
                {call.recording_url ? (
                  <a
                    href={call.recording_url}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-[12px] text-accent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  >
                    <Play size={11} aria-hidden="true" />
                    Recording
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <article
          className="mt-6 hidden overflow-hidden rounded-[30px] lg:block"
          style={{
            background: 'linear-gradient(180deg, rgba(17,31,53,0.90) 0%, rgba(10,23,39,0.96) 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
          }}
        >
          <div className="grid grid-cols-[minmax(0,1.3fr)_190px_120px_130px_110px] gap-4 border-b border-white/6 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/30">
            <span>Caller</span>
            <span>Date</span>
            <span>Duration</span>
            <span>Outcome</span>
            <span>Recording</span>
          </div>

          <div className="divide-y divide-white/6">
            {filtered.map(call => (
              <div key={call.id} className="grid grid-cols-[minmax(0,1.3fr)_190px_120px_130px_110px] gap-4 px-6 py-4 transition-colors duration-150 hover:bg-white/[0.025]">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: call.is_emergency ? 'rgba(255,107,43,0.12)' : 'rgba(255,255,255,0.05)',
                      boxShadow: call.is_emergency ? '0 0 0 1px rgba(255,107,43,0.18)' : '0 0 0 1px rgba(255,255,255,0.07)',
                    }}
                  >
                    <Phone size={14} className={call.is_emergency ? 'text-orange-soft' : 'text-offwhite/48'} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-offwhite/78">{call.caller_number}</p>
                    <p className="mt-1 text-[12px] text-offwhite/36">{call.is_emergency ? 'Urgent call-out' : 'Inbound handled by Sarah'}</p>
                  </div>
                </div>
                <span className="text-[12px] text-offwhite/40 tabular-nums">{formatDate(call.started_at)}</span>
                <span className="text-[12px] text-offwhite/40 tabular-nums">{formatDuration(call.duration_secs)}</span>
                <div className="pt-0.5">
                  <StatusBadge outcome={call.outcome} />
                </div>
                <div className="pt-0.5">
                  {call.recording_url ? (
                    <a href={call.recording_url} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent transition-colors duration-200 hover:text-accent-glow">
                      <Play size={11} aria-hidden="true" />
                      Play
                    </a>
                  ) : (
                    <span className="text-[12px] text-offwhite/24">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </DashboardShell>
  );
}

export function DashboardPreviewLeadsPage() {
  const [leads, setLeads] = useState(PREVIEW_LEADS);

  const summary = useMemo(() => ({
    emergencies: leads.filter(lead => lead.urgency === 'emergency').length,
    newLeads: leads.filter(lead => lead.status === 'new').length,
    booked: leads.filter(lead => lead.status === 'booked').length,
  }), [leads]);

  return (
    <DashboardShell {...PREVIEW_SHELL_PROPS}>
      <div>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article
            className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
            style={{
              background:
                'radial-gradient(circle at 86% 18%, rgba(255,107,43,0.12) 0%, transparent 30%),' +
                'linear-gradient(180deg, rgba(17,31,53,0.92) 0%, rgba(10,23,39,0.96) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 28px 64px rgba(2,13,24,0.30)',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[58ch]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Leads preview</p>
                <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.8rem)] font-bold leading-[0.96] tracking-[-0.05em] text-offwhite">
                  Captured work, ready for follow-up.
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-offwhite/50 sm:text-[16px]">
                  This seeded pipeline lets you inspect urgency grouping, lead cards, and inline status changes without relying on any live backend records.
                </p>
              </div>
              <div
                className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
              >
                {leads.length} captured
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                `${summary.newLeads} new to review`,
                `${summary.booked} marked booked`,
                `${summary.emergencies} emergency call-outs`,
              ].map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/70"
                  style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                >
                  <Users size={12} className="text-orange-soft" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article
            className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
            style={{
              background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">Pipeline view</p>
            <h2 className="mt-3 font-display text-[24px] font-bold tracking-[-0.04em] text-offwhite">Move fast on the right enquiries.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">New</p>
                <p className="mt-3 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">{summary.newLeads}</p>
                <p className="mt-2 text-[12px] text-offwhite/42">Fresh follow-up waiting for a response.</p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Booked</p>
                <p className="mt-3 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">{summary.booked}</p>
                <p className="mt-2 text-[12px] text-offwhite/42">Jobs already turned into confirmed work.</p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Emergency</p>
                <p className="mt-3 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">{summary.emergencies}</p>
                <p className="mt-2 text-[12px] text-offwhite/42">High-priority work that deserves fast action.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          {leads.length === 0 ? (
            <div className="xl:col-span-2">
              <EmptyState
                icon={Users}
                title="No leads yet"
                description="This preview can also show the premium empty state if you clear the sample data later."
              />
            </div>
          ) : leads.map(lead => {
            const urgencyClass = URGENCY_META[lead.urgency];
            const statusInfo = STATUS_META[lead.status];
            const isEmergency = lead.urgency === 'emergency';

            return (
              <article
                key={lead.id}
                className="rounded-[28px] px-5 py-5 transition-all duration-300 ease-mechanical hover:-translate-y-0.5"
                style={{
                  background: isEmergency
                    ? 'linear-gradient(180deg, rgba(255,107,43,0.08) 0%, rgba(10,23,39,0.96) 100%)'
                    : 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
                  boxShadow: isEmergency
                    ? '0 0 0 1px rgba(255,107,43,0.18), 0 22px 50px rgba(2,13,24,0.26)'
                    : '0 0 0 1px rgba(255,255,255,0.08), 0 22px 50px rgba(2,13,24,0.24)',
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {isEmergency ? <AlertTriangle size={14} className="text-orange-soft" aria-hidden="true" /> : null}
                      <p className="truncate font-display text-[20px] font-bold tracking-[-0.03em] text-offwhite">{lead.caller_name}</p>
                      <span className={`inline-flex min-h-[24px] items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] ${urgencyClass}`}>
                        {lead.urgency}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] text-offwhite/38 tabular-nums">{formatDate(lead.created_at)}</p>
                  </div>

                  <select
                    value={lead.status}
                    onChange={event =>
                      setLeads(prev => prev.map(item => (item.id === lead.id ? { ...item, status: event.target.value as LeadStatus } : item)))
                    }
                    className={`min-h-[40px] appearance-none rounded-full px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] outline-none transition-all duration-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] focus:ring-2 focus:ring-orange/40 ${statusInfo.tone}`}
                  >
                    {(Object.entries(STATUS_META) as [LeadStatus, { label: string }][]).map(([value, meta]) => (
                      <option key={value} value={value}>{meta.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2.5 rounded-[18px] bg-white/[0.04] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                    <Phone size={13} className="text-offwhite/36" aria-hidden="true" />
                    <span className="truncate text-[13px] text-offwhite/64">{lead.caller_number}</span>
                  </div>
                  {lead.caller_email ? (
                    <div className="flex items-center gap-2.5 rounded-[18px] bg-white/[0.04] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                      <Mail size={13} className="text-offwhite/36" aria-hidden="true" />
                      <span className="truncate text-[13px] text-offwhite/64">{lead.caller_email}</span>
                    </div>
                  ) : null}
                  {lead.postcode ? (
                    <div className="flex items-center gap-2.5 rounded-[18px] bg-white/[0.04] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                      <MapPin size={13} className="text-offwhite/36" aria-hidden="true" />
                      <span className="truncate text-[13px] text-offwhite/64">{lead.postcode}</span>
                    </div>
                  ) : null}
                  {lead.job_type ? (
                    <div className="flex items-center gap-2.5 rounded-[18px] bg-white/[0.04] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                      <Briefcase size={13} className="text-offwhite/36" aria-hidden="true" />
                      <span className="truncate text-[13px] text-offwhite/64">{lead.job_type}</span>
                    </div>
                  ) : null}
                </div>

                {lead.notes ? (
                  <div className="mt-4 rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/32">Summary</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-offwhite/52">{lead.notes}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </DashboardShell>
  );
}

export function DashboardPreviewSettingsPage() {
  const [form, setForm] = useState(PREVIEW_SETTINGS);
  const [saved, setSaved] = useState(false);

  const isKeepExisting = !!form.own_number && !!form.twilio_number;
  const activationCode = isKeepExisting ? `**004*${form.twilio_number}#` : null;

  function setField<K extends keyof typeof PREVIEW_SETTINGS>(key: K, value: (typeof PREVIEW_SETTINGS)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <DashboardShell {...PREVIEW_SHELL_PROPS}>
      <div>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <article
              className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
              style={{
                background:
                  'radial-gradient(circle at 86% 18%, rgba(255,107,43,0.12) 0%, transparent 30%),' +
                  'linear-gradient(180deg, rgba(17,31,53,0.92) 0%, rgba(10,23,39,0.96) 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 28px 64px rgba(2,13,24,0.30)',
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-[58ch]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Settings preview</p>
                  <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.8rem)] font-bold leading-[0.96] tracking-[-0.05em] text-offwhite">
                    Keep Sarah aligned with how your business runs.
                  </h1>
                  <p className="mt-4 text-[15px] leading-relaxed text-offwhite/50 sm:text-[16px]">
                    This seeded settings view lets you inspect the upgraded layout and form hierarchy while keeping everything completely local to preview mode.
                  </p>
                </div>
                <div
                  className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                  style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                >
                  Product controls
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  'Update business details',
                  'Manage SMS follow-up',
                  'Keep calendar booking ready',
                ].map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/70"
                    style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                  >
                    <ShieldCheck size={12} className="text-orange-soft" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </article>

            <div className="space-y-5">
              <SettingsSection
                title="Business details"
                icon={User}
                description="The core identity Sarah uses when speaking to callers and sending follow-up context back to you."
              >
                <div className="grid gap-4">
                  <LabeledField label="Business name" name="preview-business-name" value={form.business_name} onChange={value => setField('business_name', value)} />
                  <LabeledField label="Your name" name="preview-owner-name" value={form.owner_name} onChange={value => setField('owner_name', value)} />
                  <LabeledField label="Email" name="preview-owner-email" value={form.owner_email} readOnly />
                </div>
              </SettingsSection>

              <SettingsSection
                title="Phone and messaging"
                icon={Phone}
                description="Keep the live hand-off clean so missed calls, summaries, and diversions land exactly where they should."
              >
                <div className="grid gap-4">
                  <LabeledField label="Your mobile for SMS alerts" name="preview-owner-mobile" value={form.owner_mobile} onChange={value => setField('owner_mobile', value)} />
                  <LabeledField
                    label="AI receptionist number"
                    name="preview-twilio-number"
                    value={form.twilio_number ?? ''}
                    readOnly
                    hint="This is the backend number your AI uses while callers continue ringing your usual business number."
                  />
                  <LabeledField
                    label="Your existing number"
                    name="preview-own-number"
                    value={form.own_number ?? ''}
                    readOnly
                    hint="Callers ring this number first. Your carrier diverts missed calls to your AI receptionist automatically."
                  />

                  {activationCode ? (
                    <div
                      className="rounded-[20px] px-4 py-4"
                      style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-soft">Divert activation code</p>
                      <code className="mt-3 block break-all font-mono text-[18px] tracking-[0.16em] text-offwhite">{activationCode}</code>
                      <p className="mt-3 text-[12px] leading-relaxed text-orange-soft/86">
                        This is shown in preview so you can inspect the elevated utility treatment for call diversion setup.
                      </p>
                    </div>
                  ) : null}
                </div>
              </SettingsSection>

              <SettingsSection
                title="After-hours message"
                icon={Bell}
                description="Set the tone callers hear when they reach you outside working hours while still capturing the enquiry properly."
              >
                <label htmlFor="preview-after-hours-message" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                  Custom message
                </label>
                <textarea
                  id="preview-after-hours-message"
                  value={form.after_hours_message ?? ''}
                  onChange={event => setField('after_hours_message', event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-[18px] bg-white/[0.05] px-4 py-3 text-[14px] text-offwhite placeholder:text-offwhite/24 outline-none transition-all duration-200 focus:ring-2 focus:ring-orange/40"
                  style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                />
              </SettingsSection>

              <SettingsSection
                title="Google Calendar"
                icon={Calendar}
                description="Give Sarah live diary awareness so she can check availability and help move callers into real appointments."
              >
                <div className="flex flex-wrap items-center gap-3 rounded-[18px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <CheckCircle size={15} className="text-status-success" aria-hidden="true" />
                  <span className="text-[14px] font-semibold text-offwhite/74">Calendar connected</span>
                  <span className="truncate text-[12px] text-offwhite/34">{form.google_cal_id}</span>
                </div>
                <div className="mt-4">
                  <Button type="button" variant="ghost" size="sm">
                    <Key size={13} aria-hidden="true" />
                    Re-connect
                  </Button>
                </div>
              </SettingsSection>

              <Button
                type="button"
                onClick={() => {
                  setSaved(true);
                  window.setTimeout(() => setSaved(false), 1600);
                }}
                variant={saved ? 'secondary' : 'primary'}
              >
                <Save size={14} aria-hidden="true" />
                {saved ? 'Saved' : 'Save changes'}
              </Button>
            </div>
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div
              className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
              style={{
                background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">Live setup status</p>
              <h2 className="mt-3 font-display text-[24px] font-bold tracking-[-0.04em] text-offwhite">What this controls</h2>
              <p className="mt-4 text-[14px] leading-relaxed text-offwhite/48">
                Preview mode keeps the visual structure real while leaving auth, saves, and external integrations untouched.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    title: 'Business identity',
                    copy: 'Caller-facing naming and ownership details stay clear and trustworthy.',
                  },
                  {
                    title: 'Call diversion readiness',
                    copy: 'The diversion setup panel is visible with a seeded activation code for visual review.',
                  },
                  {
                    title: 'Diary connection',
                    copy: 'Calendar booking is shown as connected so you can inspect the finished utility state.',
                  },
                ].map(item => (
                  <div
                    key={item.title}
                    className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  >
                    <p className="text-[13px] font-semibold text-offwhite/76">{item.title}</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-offwhite/42">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}
