import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { Phone, Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ElementType } from 'react';
import DashboardShell from '../components/dashboard/DashboardShell';
import StatusBadge from '../components/dashboard/ui/StatusBadge';
import EmptyState from '../components/dashboard/ui/EmptyState';
import { supabase } from '../lib/supabase';
import type { Call } from '../../shared/types';

interface Stats {
  totalCalls:  number;
  totalLeads:  number;
  bookedJobs:  number;
  emergencies: number;
}

type CallRow = Pick<Call, 'id' | 'outcome' | 'is_emergency' | 'started_at' | 'caller_number' | 'duration_secs'>;

interface StatCardProps {
  label: string;
  value: number;
  icon: ElementType;
  href?: string;
  accent?: boolean;
}

function StatCard({ label, value, icon: Icon, href, accent = false }: StatCardProps) {
  const surfaceClasses = accent
    ? 'bg-orange/[0.08] shadow-card-accent hover:shadow-[0_0_0_1px_rgba(255,107,43,0.30),0_20px_48px_rgba(2,13,24,0.50),0_0_32px_rgba(255,107,43,0.10)]'
    : 'bg-white/[0.04] shadow-card hover:shadow-card-hover';

  const iconBg = accent ? 'bg-orange/15' : 'bg-white/[0.07]';
  const iconColor = accent ? 'text-orange' : 'text-offwhite/60';

  const inner = (
    <div
      className={`group rounded-card p-5 flex items-start gap-4 transition-all duration-300 ease-mechanical hover:-translate-y-1 ${surfaceClasses}`}
    >
      <div className={`w-9 h-9 rounded-field flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={16} className={iconColor} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-offwhite/40 uppercase tracking-[0.09em] font-body mb-1">{label}</p>
        <p className="text-[30px] font-bold text-offwhite font-display leading-none tabular-nums">{value}</p>
      </div>
      {href && (
        <ArrowRight
          size={14}
          aria-hidden="true"
          className="flex-shrink-0 mt-1 text-offwhite/20 group-hover:text-orange/60 transition-colors duration-200"
        />
      )}
    </div>
  );

  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const animRef  = useScrollAnimation();
  const [stats, setStats]         = useState<Stats | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallRow[]>([]);
  const [loading, setLoading]     = useState(true);

  const totalCalls  = stats?.totalCalls  ?? 0;
  const totalLeads  = stats?.totalLeads  ?? 0;
  const bookedJobs  = stats?.bookedJobs  ?? 0;
  const emergencies = stats?.emergencies ?? 0;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientRow } = await supabase
        .from('clients')
        .select('id, onboarding_complete')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!clientRow || !clientRow.onboarding_complete) { navigate('/onboarding', { replace: true }); return; }

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
        totalCalls:  calls.length,
        totalLeads:  leads.length,
        bookedJobs:  calls.filter(c => c.outcome === 'booked').length,
        emergencies: calls.filter(c => c.is_emergency).length,
      });

      setRecentCalls(calls.slice(0, 5));
      setLoading(false);
    }

    load();
  }, [navigate]);

  return (
    <DashboardShell>
      <div ref={animRef} data-animate>
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-offwhite font-display tracking-tight">Overview</h1>
        <p className="text-[14px] text-offwhite/40 font-body mt-1">Your receptionist at a glance.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-card h-[88px] bg-white/[0.04]" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total calls"  value={totalCalls}  icon={Phone}          href="/dashboard/calls" />
            <StatCard label="Leads"        value={totalLeads}  icon={Users}          href="/dashboard/leads" />
            <StatCard label="Jobs booked"  value={bookedJobs}  icon={TrendingUp}     accent />
            <StatCard label="Emergencies"  value={emergencies} icon={AlertTriangle} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-offwhite font-display">Recent calls</h2>
              <Link
                to="/dashboard/calls"
                className="text-[13px] text-orange font-body hover:text-orange-glow transition-colors flex items-center gap-1"
              >
                View all <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>

            {recentCalls.length === 0 ? (
              <EmptyState
                icon={Phone}
                title="No calls yet"
                description="Your AI receptionist is ready and listening."
                action={{ label: 'Test the AI now', href: '/settings' }}
              />
            ) : (
              <div className="rounded-card overflow-hidden bg-white/[0.04] shadow-ring-subtle">
                {recentCalls.map((call) => {
                  const when = call.started_at
                    ? new Date(call.started_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const dur = call.duration_secs != null
                    ? `${Math.floor(call.duration_secs / 60)}m ${call.duration_secs % 60}s`
                    : '—';

                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-4 px-5 py-3.5 text-[13px] font-body hover:bg-white/[0.025] transition-colors duration-150 even:bg-white/[0.015]"
                    >
                      <Phone size={13} className="text-offwhite/25 flex-shrink-0" aria-hidden="true" />
                      <span className="text-offwhite/75 flex-1 truncate">{call.caller_number ?? 'Unknown'}</span>
                      <span className="text-offwhite/30 hidden sm:block tabular-nums">{when}</span>
                      <span className="text-offwhite/30 hidden md:block tabular-nums">{dur}</span>
                      <StatusBadge outcome={call.outcome} className="flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
      </div>
    </DashboardShell>
  );
}
