import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle, BarChart2, Calendar, CheckCircle, Phone, ShieldCheck, TrendingUp, Users, Zap } from 'lucide-react';
import type { ElementType } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useCounter } from '../hooks/useCounter';
import DashboardShell from '../components/dashboard/DashboardShell';
import StatusBadge from '../components/dashboard/ui/StatusBadge';
import EmptyState from '../components/dashboard/ui/EmptyState';
import { supabase } from '../lib/supabase';
import { syncGoogleCalendarToken } from '../lib/calendar';
import { PLAN_BY_KEY } from '../lib/plans';
import type { Call, Plan } from '../../shared/types';

interface Stats {
  totalCalls: number;
  totalLeads: number;
  bookedJobs: number;
  emergencies: number;
}

type CallRow = Pick<Call, 'id' | 'outcome' | 'is_emergency' | 'started_at' | 'caller_number' | 'duration_secs'>;

interface SubscriptionAlert {
  title: string;
  copy: string;
}

interface QuotaAlert {
  used: number;
  limit: number;
  pct: number;
  urgent: boolean;
}

interface MissedRevenueData {
  missedCalls: number;
  avgJobValue: number;
  estimatedValue: number;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: ElementType;
  href?: string;
  accent?: boolean;
  helper?: string;
  testId?: string;
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

function StatCard({ label, value, icon: Icon, href, accent = false, helper, testId }: StatCardProps) {
  const content = (
    <article
      data-testid={testId}
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

function subscriptionMessage(subscriptionStatus?: string | null, paymentStatus?: string | null): SubscriptionAlert | null {
  if (paymentStatus === 'failed' || subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') {
    return {
      title: 'Payment needs attention',
      copy: 'Your receptionist is paused until the payment issue is resolved. Update billing or contact support so call handling can resume.',
    };
  }

  if (paymentStatus === 'canceled' || subscriptionStatus === 'canceled') {
    return {
      title: 'Subscription canceled',
      copy: 'Your receptionist is paused because this subscription has ended. Contact support to reactivate call handling.',
    };
  }

  return null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const animRef = useScrollAnimation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallRow[]>([]);
  const [subscriptionAlert, setSubscriptionAlert] = useState<SubscriptionAlert | null>(null);
  const [quotaAlert, setQuotaAlert] = useState<QuotaAlert | null>(null);
  const [missedRevenue, setMissedRevenue] = useState<MissedRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsVisible, setStatsVisible] = useState(false);
  const [calBannerVisible, setCalBannerVisible] = useState(false);

  // Show a banner when the Google Calendar was silently auto-connected during sign-in.
  // index.tsx sets this sessionStorage flag after a successful save-calendar-token call.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('calendarAutoConnected') === '1') {
        sessionStorage.removeItem('calendarAutoConnected');
        setCalBannerVisible(true);
        const timer = setTimeout(() => setCalBannerVisible(false), 7000);
        return () => clearTimeout(timer);
      }
    } catch { /* storage unavailable in some environments */ }
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Capture the Google Calendar refresh token if the user just signed in with
      // Google and landed here (token is only present on this first post-OAuth load).
      await syncGoogleCalendarToken();

      const { data: clientRow } = await supabase
        .from('clients')
        .select('id, onboarding_complete, subscription_status, payment_status, plan')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!clientRow || !clientRow.onboarding_complete) {
        navigate('/onboarding', { replace: true });
        return;
      }

      setSubscriptionAlert(subscriptionMessage(clientRow.subscription_status, clientRow.payment_status));

      // Rolling 30-day window for quota calculation
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [callsRes, leadsRes, quotaRes, missedRes, configRes] = await Promise.all([
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
        supabase
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientRow.id)
          .gte('started_at', thirtyDaysAgo),
        supabase
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientRow.id)
          .in('outcome', ['no_answer', 'voicemail'])
          .gte('started_at', thirtyDaysAgo),
        supabase
          .from('business_config')
          .select('avg_job_value')
          .eq('client_id', clientRow.id)
          .maybeSingle(),
      ]);

      const calls = (callsRes.data ?? []) as CallRow[];
      const leads = leadsRes.data ?? [];
      const callCount30d = quotaRes.count ?? 0;
      const missedCount30d = missedRes.count ?? 0;
      const avgJobValue = (configRes.data?.avg_job_value as number | null | undefined) ?? 250;

      setStats({
        totalCalls: calls.length,
        totalLeads: leads.length,
        bookedJobs: leads.filter(lead => lead.status === 'booked').length,
        emergencies: calls.filter(call => call.is_emergency).length,
      });

      // Quota banner: show at >= 80% of plan limit
      const planKey = (clientRow.plan ?? 'starter') as Plan;
      const planConfig = PLAN_BY_KEY[planKey];
      if (planConfig) {
        const pct = planConfig.callLimit > 0 ? (callCount30d / planConfig.callLimit) * 100 : 0;
        if (pct >= 80) {
          setQuotaAlert({
            used: callCount30d,
            limit: planConfig.callLimit,
            pct: Math.round(pct),
            urgent: pct >= 100,
          });
        }
      }

      // Missed revenue card: only show when there are missed calls to action
      if (missedCount30d > 0) {
        setMissedRevenue({
          missedCalls: missedCount30d,
          avgJobValue,
          estimatedValue: missedCount30d * avgJobValue,
        });
      }

      setRecentCalls(calls.slice(0, 5));
      setLoading(false);
      setStatsVisible(true);
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

  const totalCallsDisplay = useCounter({ target: totalCalls, shouldStart: statsVisible });
  const totalLeadsDisplay = useCounter({ target: totalLeads, shouldStart: statsVisible });
  const bookedJobsDisplay = useCounter({ target: bookedJobs, shouldStart: statsVisible });
  const emergenciesDisplay = useCounter({ target: emergencies, shouldStart: statsVisible });
  const leadRateDisplay = useCounter({ target: Math.round(leadRate), shouldStart: statsVisible, suffix: '%' });
  const bookingRateDisplay = useCounter({ target: Math.round(bookingRate), shouldStart: statsVisible, suffix: '%' });
  const emergencyRateDisplay = useCounter({ target: Math.round(emergencyRate), shouldStart: statsVisible, suffix: '%' });

  return (
    <DashboardShell>
      <div ref={animRef}>
        {calBannerVisible ? (
          <div
            data-testid="calendar-auto-connected-banner"
            role="status"
            className="mb-5 rounded-[24px] px-5 py-4"
            style={{ background: 'rgba(34,197,94,0.08)', boxShadow: '0 0 0 1px rgba(34,197,94,0.22)' }}
          >
            <div className="flex items-start gap-3">
              <Calendar size={17} className="mt-0.5 text-status-success" aria-hidden="true" />
              <div>
                <p className="text-[14px] font-semibold text-offwhite">Google Calendar connected</p>
                <p className="mt-1 text-[12px] leading-relaxed text-offwhite/56">
                  Your receptionist can now check your availability and book jobs straight into your diary.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {subscriptionAlert ? (
          <div
            data-testid="subscription-status-banner"
            role="alert"
            className="mb-5 rounded-[24px] px-5 py-4"
            style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.22)' }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={17} className="mt-0.5 text-orange-soft" aria-hidden="true" />
              <div>
                <p className="text-[14px] font-semibold text-offwhite">{subscriptionAlert.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-orange-soft/88">{subscriptionAlert.copy}</p>
              </div>
            </div>
          </div>
        ) : null}

        {quotaAlert ? (
          <div
            data-testid="quota-banner"
            role="alert"
            className="mb-5 rounded-[24px] px-5 py-4"
            style={
              quotaAlert.urgent
                ? { background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.22)' }
                : { background: 'rgba(153,203,255,0.07)', boxShadow: '0 0 0 1px rgba(153,203,255,0.18)' }
            }
          >
            <div className="flex items-start gap-3">
              <BarChart2
                size={17}
                className={`mt-0.5 ${quotaAlert.urgent ? 'text-orange-soft' : 'text-accent'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-offwhite">
                  {quotaAlert.urgent
                    ? 'Monthly call limit reached'
                    : `You've used ${quotaAlert.pct}% of your monthly calls`}
                </p>
                <p className={`mt-1 text-[12px] leading-relaxed ${quotaAlert.urgent ? 'text-orange-soft/88' : 'text-accent/80'}`}>
                  {quotaAlert.used.toLocaleString('en-GB')} of {quotaAlert.limit.toLocaleString('en-GB')} calls in the last 30 days.
                  {' '}
                  {quotaAlert.urgent
                    ? 'Upgrade your plan to keep your receptionist running without interruption.'
                    : 'Consider upgrading before you hit the limit.'}
                </p>
              </div>
              <Link
                to="/settings"
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-0.5"
                style={
                  quotaAlert.urgent
                    ? { background: 'rgba(255,107,43,0.14)', boxShadow: '0 0 0 1px rgba(255,107,43,0.25)', color: '#ffb59a' }
                    : { background: 'rgba(153,203,255,0.10)', boxShadow: '0 0 0 1px rgba(153,203,255,0.20)', color: '#99cbff' }
                }
              >
                Upgrade
              </Link>
            </div>
          </div>
        ) : null}

        {missedRevenue ? (
          <div
            data-testid="missed-revenue-card"
            className="mb-5 rounded-[24px] px-5 py-4"
            style={{ background: 'rgba(153,203,255,0.07)', boxShadow: '0 0 0 1px rgba(153,203,255,0.16)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <TrendingUp size={17} className="mt-0.5 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-[14px] font-semibold text-offwhite">
                    Estimated missed value this month
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-accent/80">
                    {missedRevenue.missedCalls} unanswered {missedRevenue.missedCalls === 1 ? 'call' : 'calls'} in the last 30 days
                    {' '}× £{missedRevenue.avgJobValue.toLocaleString('en-GB')} avg job value
                    {' '}= <strong className="text-offwhite">£{missedRevenue.estimatedValue.toLocaleString('en-GB')}</strong> estimate.{' '}
                    This is an estimate only — actual value may vary.
                  </p>
                </div>
              </div>
              <Link
                to="/leads"
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(153,203,255,0.10)', boxShadow: '0 0 0 1px rgba(153,203,255,0.20)', color: '#99cbff' }}
              >
                View leads
              </Link>
            </div>
          </div>
        ) : null}

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
                  Track what your receptionist handled, how much opportunity is being captured, and where you should focus next between jobs.
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
                  <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{leadRateDisplay}</p>
                  <p className="mt-2 text-[12px] text-offwhite/44">Based on the calls currently loaded into your dashboard.</p>
                </div>
                <div className="rounded-[24px] bg-white/[0.04] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Lead to booking</p>
                  <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{bookingRateDisplay}</p>
                  <p className="mt-2 text-[12px] text-offwhite/44">A quick view of how much captured demand is already turning into jobs.</p>
                </div>
                <div className="rounded-[24px] bg-white/[0.04] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Emergency share</p>
                  <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.05em] text-offwhite">{emergencyRateDisplay}</p>
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
              <StatCard testId="dashboard-stat-total-calls" label="Total calls" value={totalCallsDisplay} icon={Phone} href="/dashboard/calls" helper="Inbound conversations captured by your receptionist." />
              <StatCard testId="dashboard-stat-total-leads" label="Leads captured" value={totalLeadsDisplay} icon={Users} href="/dashboard/leads" helper="Enquiries worth reviewing and following up." />
              <StatCard label="Jobs booked" value={bookedJobsDisplay} icon={TrendingUp} accent helper="Calls already converted into booked work." />
              <StatCard label="Emergencies" value={emergenciesDisplay} icon={AlertTriangle} helper="Urgent jobs that need fast action and clear prioritisation." />
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
              <article
                data-testid="dashboard-recent-calls"
                className="rounded-[30px] overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(17,31,53,0.90) 0%, rgba(10,23,39,0.96) 100%)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5" style={{background:'linear-gradient(180deg,rgba(255,255,255,0.012) 0%,transparent 100%)'}}>
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
                  <div className="space-y-px">
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
                              <p className="mt-1 text-[12px] text-offwhite/36">{call.is_emergency ? 'Marked as urgent call-out' : 'Inbound caller handled by your receptionist'}</p>
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
                      copy: 'A higher figure means your AI receptionist is converting more calls into actionable enquiries.',
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
