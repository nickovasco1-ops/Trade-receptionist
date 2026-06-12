import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle, BarChart2, Calendar, Phone, TrendingUp, Users, Zap } from 'lucide-react';
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
      className="group h-full rounded-[20px] px-5 py-[18px] transition-[transform,box-shadow] duration-300 ease-mechanical hover:-translate-y-0.5 active:translate-y-0"
      style={{
        background: accent
          ? 'linear-gradient(180deg, rgba(255,107,43,0.11) 0%, rgba(255,107,43,0.05) 100%)'
          : 'linear-gradient(180deg, rgba(17,31,53,0.84) 0%, rgba(10,23,39,0.90) 100%)',
        boxShadow: accent
          ? '0 0 0 1px rgba(255,107,43,0.22), 0 12px 28px rgba(2,13,24,0.24)'
          : '0 0 0 1px rgba(255,255,255,0.08), 0 12px 28px rgba(2,13,24,0.22)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-offwhite/36">{label}</p>
          <p className="mt-2.5 font-display text-[28px] font-bold leading-none tracking-[-0.04em] tabular-nums text-offwhite">{value}</p>
          {helper ? <p className="mt-2 text-[12px] leading-snug text-offwhite/40">{helper}</p> : null}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[10px]"
          style={{
            background: accent ? 'rgba(255,107,43,0.14)' : 'rgba(255,255,255,0.05)',
            boxShadow: accent ? '0 0 0 1px rgba(255,107,43,0.18)' : '0 0 0 1px rgba(255,255,255,0.07)',
          }}
        >
          <Icon size={14} className={accent ? 'text-orange-soft' : 'text-offwhite/48'} aria-hidden="true" />
        </div>
      </div>
      {href ? (
        <div className="mt-3.5 inline-flex items-center gap-1 text-[12px] font-medium text-offwhite/40 transition-colors duration-200 group-hover:text-orange-soft">
          View
          <ArrowRight size={11} className="transition-transform duration-300 ease-smooth group-hover:translate-x-0.5" aria-hidden="true" />
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
      try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

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
          .select('id, outcome, is_emergency, started_at, caller_number, duration_secs, created_at')
          .eq('client_id', clientRow.id)
          .order('created_at', { ascending: false })
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
      } catch {
        // Network error, auth error, or unexpected Supabase shape — stop the skeleton
        setLoading(false);
      }
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
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-[transform,background-color,box-shadow] duration-300 ease-mechanical hover:-translate-y-0.5 active:translate-y-0"
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
            role="status"
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
                to="/dashboard/leads"
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-[transform,background-color,box-shadow] duration-300 ease-mechanical hover:-translate-y-0.5 active:translate-y-0"
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-soft/90">Overview</p>
                <h1 className="mt-2.5 font-display text-[clamp(1.7rem,2.6vw,2.3rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-offwhite">
                  Your receptionist is covering the phones.
                </h1>
                <p className="mt-2.5 max-w-[52ch] text-[13.5px] leading-relaxed text-offwhite/48">
                  What was handled, what was captured, and what needs you next.
                </p>
              </div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-offwhite/64"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-status-success shadow-[0_0_8px_rgba(134,239,172,0.5)]" aria-hidden="true" />
                Live
              </div>
            </div>

            {loading ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-3 animate-pulse">
                {[0, 1, 2].map(index => (
                  <div key={index} className="rounded-[18px] bg-white/[0.04] h-[96px]" />
                ))}
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Lead capture rate', value: leadRateDisplay, copy: 'Calls converted into enquiries.' },
                  { label: 'Lead to booking', value: bookingRateDisplay, copy: 'Enquiries turned into jobs.' },
                  { label: 'Emergency share', value: emergencyRateDisplay, copy: 'Urgent call-outs in the mix.' },
                ].map(item => (
                  <div key={item.label} className="rounded-[18px] bg-white/[0.04] px-[18px] py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-offwhite/36">{item.label}</p>
                    <p className="mt-2.5 font-display text-[28px] font-bold leading-none tracking-[-0.04em] tabular-nums text-offwhite">{item.value}</p>
                    <p className="mt-2 text-[12px] leading-snug text-offwhite/40">{item.copy}</p>
                  </div>
                ))}
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/72">Up next</p>
            <h2 className="mt-2.5 font-display text-[19px] font-semibold leading-[1.1] tracking-[-0.02em] text-offwhite">
              What needs attention
            </h2>

            <div className="mt-5 grid gap-2.5">
              {[
                { to: '/dashboard/calls', icon: Phone, title: 'Review recent calls', copy: 'Summaries, recordings, outcomes.' },
                { to: '/dashboard/leads', icon: Users, title: 'Act on captured leads', copy: 'Update statuses, prioritise urgent work.' },
              ].map(({ to, icon: Icon, title, copy }) => (
                <Link
                  key={to}
                  to={to}
                  className="group rounded-[16px] px-3.5 py-3 transition-[transform,background-color] duration-300 ease-mechanical hover:bg-white/[0.06] active:scale-[0.99]"
                  style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-white/[0.05] shadow-[0_0_0_1px_rgba(255,255,255,0.07)]">
                      <Icon size={14} className="text-offwhite/56" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-offwhite/90">{title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-offwhite/40">{copy}</p>
                    </div>
                    <ArrowRight size={13} className="text-offwhite/24 transition-[transform,color] duration-300 ease-smooth group-hover:translate-x-0.5 group-hover:text-orange-soft" aria-hidden="true" />
                  </div>
                </Link>
              ))}

              <div
                className="rounded-[16px] px-3.5 py-3"
                style={{ background: 'rgba(255,107,43,0.07)', boxShadow: '0 0 0 1px rgba(255,107,43,0.16)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-orange/[0.12] shadow-[0_0_0_1px_rgba(255,107,43,0.16)]">
                    <Zap size={14} className="text-orange-soft" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-medium text-offwhite/90">The routine that works</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-orange-soft/80">
                      Review calls, update leads, keep settings current.
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
              <StatCard testId="dashboard-stat-total-calls" label="Total calls" value={totalCallsDisplay} icon={Phone} href="/dashboard/calls" helper="Inbound, handled automatically." />
              <StatCard testId="dashboard-stat-total-leads" label="Leads captured" value={totalLeadsDisplay} icon={Users} href="/dashboard/leads" helper="Enquiries worth following up." />
              <StatCard label="Jobs booked" value={bookedJobsDisplay} icon={TrendingUp} accent helper="Converted into booked work." />
              <StatCard label="Emergencies" value={emergenciesDisplay} icon={AlertTriangle} helper="Urgent call-outs flagged." />
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/72">Latest activity</p>
                    <h2 className="mt-1.5 font-display text-[18px] font-semibold tracking-[-0.02em] text-offwhite">Recent calls</h2>
                  </div>
                  <Link
                    to="/dashboard/calls"
                    className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-orange-soft transition-[background-color,transform] duration-300 ease-mechanical hover:bg-orange/[0.12] active:scale-[0.97]"
                    style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.16)' }}
                  >
                    Open calls
                    <ArrowRight size={11} className="transition-transform duration-300 ease-smooth group-hover:translate-x-0.5" aria-hidden="true" />
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
                  <div>
                    {recentCalls.map((call, index) => {
                      const when = call.started_at
                        ? new Date(call.started_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—';

                      return (
                        <div
                          key={call.id}
                          className="grid gap-4 px-6 py-3 transition-colors duration-200 ease-standard hover:bg-white/[0.025] md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center"
                          style={index % 2 === 1 ? { background: 'rgba(255,255,255,0.015)' } : undefined}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
                              style={{
                                background: call.is_emergency ? 'rgba(255,107,43,0.12)' : 'rgba(255,255,255,0.04)',
                                boxShadow: call.is_emergency ? '0 0 0 1px rgba(255,107,43,0.18)' : '0 0 0 1px rgba(255,255,255,0.06)',
                              }}
                            >
                              <Phone size={13} className={call.is_emergency ? 'text-orange-soft' : 'text-offwhite/44'} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] font-medium text-offwhite/85">{call.caller_number ?? 'Unknown number'}</p>
                              <p className="mt-0.5 text-[11.5px] text-offwhite/34">{call.is_emergency ? 'Urgent call-out' : 'Handled automatically'}</p>
                            </div>
                          </div>
                          <span className="text-[12px] text-offwhite/40 tabular-nums">{when}</span>
                          <span className="text-[12px] text-offwhite/40 tabular-nums">{formatDuration(call.duration_secs)}</span>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/72">Signal check</p>
                <h2 className="mt-1.5 font-display text-[18px] font-semibold tracking-[-0.02em] text-offwhite">Pipeline health</h2>
                <div className="mt-5 space-y-2.5">
                  {[
                    { label: 'Lead capture', value: formatPercent(leadRate), copy: 'Calls becoming enquiries.' },
                    { label: 'Booking efficiency', value: formatPercent(bookingRate), copy: 'Demand becoming booked work.' },
                    { label: 'Urgent call share', value: formatPercent(emergencyRate), copy: 'Emergency response load.' },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="rounded-[16px] px-4 py-3.5"
                      style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-offwhite/80">{item.label}</p>
                          <p className="mt-0.5 text-[11.5px] text-offwhite/36">{item.copy}</p>
                        </div>
                        <span className="font-display text-[22px] font-bold leading-none tracking-[-0.03em] tabular-nums text-offwhite">{item.value}</span>
                      </div>
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
