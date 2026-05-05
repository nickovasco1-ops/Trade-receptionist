import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle, Phone, ShieldCheck, TrendingUp, Users, Zap } from 'lucide-react';
import type { ElementType } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import DashboardShell from '../components/dashboard/DashboardShell';
import StatusBadge from '../components/dashboard/ui/StatusBadge';
import EmptyState from '../components/dashboard/ui/EmptyState';
import { supabase } from '../lib/supabase';
import type { Call } from '../../shared/types';

interface Stats {
  totalCalls: number;
  totalLeads: number;
  bookedJobs: number;
  emergencies: number;
}

type CallRow = Pick<Call, 'id' | 'outcome' | 'is_emergency' | 'started_at' | 'caller_number' | 'duration_secs'>;

interface StatCardProps {
  label: string;
  value: string;
  icon: ElementType;
  href?: string;
  accent?: boolean;
  helper?: string;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const animRef = useScrollAnimation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientRow } = await supabase
        .from('clients')
        .select('id, onboarding_complete')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!clientRow || !clientRow.onboarding_complete) {
        navigate('/onboarding', { replace: true });
        return;
      }

      const [callsRes, leadsRes] = await Promise.all([
        supabase
          .from('calls')
          .select('id, outcome, is_emergency, started_at, caller_number, duration_secs')
          .eq('client_id', clientRow.id)
          .order('started_at', { ascending: false })
          .limit(50),
        supabase
          .from('leads')
          .select('id, status')
          .eq('client_id', clientRow.id),
      ]);

      const calls = (callsRes.data ?? []) as CallRow[];
      const leads = leadsRes.data ?? [];

      setStats({
        totalCalls: calls.length,
        totalLeads: leads.length,
        bookedJobs: calls.filter(call => call.outcome === 'booked').length,
        emergencies: calls.filter(call => call.is_emergency).length,
      });

      setRecentCalls(calls.slice(0, 5));
      setLoading(false);
    }

    load();
  }, [navigate]);

  const totalCalls = stats?.totalCalls ?? 0;
  const totalLeads = stats?.totalLeads ?? 0;
  const bookedJobs = stats?.bookedJobs ?? 0;
  const emergencies = stats?.emergencies ?? 0;
  const leadRate = totalCalls > 0 ? (totalLeads / totalCalls) * 100 : 0;
  const bookingRate = totalLeads > 0 ? (bookedJobs / totalLeads) * 100 : 0;
  const emergencyRate = totalCalls > 0 ? (emergencies / totalCalls) * 100 : 0;

  return (
    <DashboardShell>
      <div ref={animRef} data-animate>
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
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Overview</p>
                <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,4rem)] font-bold leading-[0.94] tracking-[-0.05em] text-offwhite">
                  Your receptionist is covering the phones.
                </h1>
                <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-offwhite/52 sm:text-[16px]">
                  Track what Sarah handled, how much opportunity is being captured, and where you should focus next between jobs.
                </p>
              </div>
              <div
                className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
              >
                Live operations
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                'Calls captured automatically',
                'Leads routed cleanly',
                'Urgent jobs surfaced faster',
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

            {loading ? (
              <div className="mt-7 grid gap-3 sm:grid-cols-3 animate-pulse">
                {[0, 1, 2].map(index => (
                  <div key={index} className="rounded-[22px] bg-white/[0.04] h-[112px]" />
                ))}
              </div>
            ) : (
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] bg-white/[0.04] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Lead capture rate</p>
                  <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{formatPercent(leadRate)}</p>
                  <p className="mt-2 text-[12px] text-offwhite/44">Based on the calls currently loaded into your dashboard.</p>
                </div>
                <div className="rounded-[24px] bg-white/[0.04] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Lead to booking</p>
                  <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{formatPercent(bookingRate)}</p>
                  <p className="mt-2 text-[12px] text-offwhite/44">A quick view of how much captured demand is already turning into jobs.</p>
                </div>
                <div className="rounded-[24px] bg-white/[0.04] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Emergency share</p>
                  <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{formatPercent(emergencyRate)}</p>
                  <p className="mt-2 text-[12px] text-offwhite/44">Keep an eye on urgent inbound work so callbacks stay fast and controlled.</p>
                </div>
              </div>
            )}
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
              Use the dashboard to spot follow-up, review recent conversations, and move leads into booked work quickly.
            </p>

            <div className="mt-6 grid gap-3">
              <Link
                to="/dashboard/calls"
                className="rounded-[20px] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                    <Phone size={16} className="text-offwhite/60" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-offwhite">Review recent calls</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-offwhite/44">See the latest caller activity, summaries, recordings, and outcomes.</p>
                  </div>
                  <ArrowRight size={14} className="mt-1 text-orange-soft/60" aria-hidden="true" />
                </div>
              </Link>

              <Link
                to="/dashboard/leads"
                className="rounded-[20px] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                    <Users size={16} className="text-offwhite/60" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-offwhite">Act on captured leads</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-offwhite/44">Update statuses, prioritise urgent work, and keep the pipeline moving.</p>
                  </div>
                  <ArrowRight size={14} className="mt-1 text-orange-soft/60" aria-hidden="true" />
                </div>
              </Link>

              <div
                className="rounded-[20px] px-4 py-4"
                style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange/[0.12] shadow-[0_0_0_1px_rgba(255,107,43,0.18)]">
                    <Zap size={16} className="text-orange-soft" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-offwhite">Premium workflow</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-orange-soft/86">
                      The strongest habits are simple: review calls, update leads, and keep your receptionist settings aligned with how your business actually runs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        {loading ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-4 animate-pulse">
            {[0, 1, 2, 3].map(index => (
              <div key={index} className="rounded-[24px] bg-white/[0.04] h-[148px]" />
            ))}
          </div>
        ) : stats ? (
          <>
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total calls" value={String(totalCalls)} icon={Phone} href="/dashboard/calls" helper="Inbound conversations captured by Sarah." />
              <StatCard label="Leads captured" value={String(totalLeads)} icon={Users} href="/dashboard/leads" helper="Enquiries worth reviewing and following up." />
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
                    to="/dashboard/calls"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold text-orange-soft transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.16)' }}
                  >
                    Open calls
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>

                {recentCalls.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={Phone}
                      title="No calls yet"
                      description="Your AI receptionist is live and waiting for the first enquiry to come through."
                      action={{ label: 'Review settings', href: '/settings' }}
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-white/6">
                    {recentCalls.map(call => {
                      const when = call.started_at
                        ? new Date(call.started_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—';

                      return (
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
                              <p className="truncate text-[14px] font-semibold text-offwhite/78">{call.caller_number ?? 'Unknown number'}</p>
                              <p className="mt-1 text-[12px] text-offwhite/36">{call.is_emergency ? 'Marked as urgent call-out' : 'Inbound caller handled by Sarah'}</p>
                            </div>
                          </div>
                          <span className="text-[12px] text-offwhite/38 tabular-nums">{when}</span>
                          <span className="text-[12px] text-offwhite/38 tabular-nums">{formatDuration(call.duration_secs)}</span>
                          <StatusBadge outcome={call.outcome} className="justify-self-start md:justify-self-end" />
                        </div>
                      );
                    })}
                  </div>
                )}
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
                    {
                      label: 'Lead capture',
                      value: formatPercent(leadRate),
                      copy: 'A higher figure means Sarah is converting more calls into actionable enquiries.',
                    },
                    {
                      label: 'Booking efficiency',
                      value: formatPercent(bookingRate),
                      copy: 'Helps show whether captured demand is becoming real booked work.',
                    },
                    {
                      label: 'Urgent call share',
                      value: formatPercent(emergencyRate),
                      copy: 'A useful signal when you need to stay sharp on emergency response and callbacks.',
                    },
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
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
