import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell';
import StatusBadge from '../components/dashboard/ui/StatusBadge';
import { supabase } from '../lib/supabase';
import type { Call } from '../../shared/types';

interface Stats {
  totalCalls:  number;
  totalLeads:  number;
  bookedJobs:  number;
  emergencies: number;
}

type CallRow = Pick<Call, 'id' | 'outcome' | 'is_emergency' | 'started_at' | 'caller_number' | 'duration_secs'>;


function StatCard({
  label, value, icon: Icon, href, accent = false,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={`group rounded-card p-5 flex items-start gap-4 transition-all duration-300 hover:-translate-y-1${href ? ' cursor-pointer' : ''}`}
      style={{
        background: accent ? 'rgba(255,107,43,0.08)' : 'rgba(255,255,255,0.05)',
        boxShadow: accent
          ? '0 0 0 1px rgba(255,107,43,0.2), 0 8px 32px rgba(2,13,24,0.4)'
          : '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.3)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = accent
          ? '0 0 0 1px rgba(255,107,43,0.3), 0 20px 48px rgba(2,13,24,0.5), 0 0 32px rgba(255,107,43,0.08)'
          : '0 0 0 1px rgba(255,255,255,0.1), 0 20px 48px rgba(2,13,24,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = accent
          ? '0 0 0 1px rgba(255,107,43,0.2), 0 8px 32px rgba(2,13,24,0.4)'
          : '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.3)';
      }}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? 'rgba(255,107,43,0.15)' : 'rgba(255,255,255,0.07)' }}
      >
        <Icon size={16} className={accent ? 'text-orange' : 'text-offwhite/60'} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-offwhite/40 uppercase tracking-[0.09em] font-body mb-1">{label}</p>
        <p className="text-[30px] font-bold text-offwhite font-display leading-none tabular-nums">{value}</p>
      </div>
      {href && (
        <ArrowRight
          size={14}
          className="flex-shrink-0 mt-1 text-offwhite/20 group-hover:text-orange/60 transition-colors duration-200"
        />
      )}
    </div>
  );

  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

export default function DashboardPage() {
  const navigate = useNavigate();
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
        .select('id')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!clientRow) { navigate('/onboarding', { replace: true }); return; }

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
  }, []);

  return (
    <DashboardShell>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-offwhite font-display tracking-tight">Overview</h1>
        <p className="text-[14px] text-offwhite/40 font-body mt-1">Your receptionist at a glance.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-card h-[88px]" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total calls"  value={totalCalls}  icon={Phone}          href="/dashboard/calls" />
            <StatCard label="Leads"        value={totalLeads}  icon={Users}          href="/dashboard/leads" />
            <StatCard label="Jobs booked"  value={bookedJobs}  icon={TrendingUp}     accent />
            <StatCard label="Emergencies"  value={emergencies} icon={AlertTriangle} />
          </div>

          {/* Recent calls */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-offwhite font-display">Recent calls</h2>
              <Link
                to="/dashboard/calls"
                className="text-[13px] text-orange font-body hover:text-orange-glow transition-colors flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {recentCalls.length === 0 ? (
              <div
                className="rounded-card p-10 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
              >
                <Phone size={24} className="text-offwhite/20 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[14px] font-semibold text-offwhite/60 font-display mb-1">No calls yet</p>
                <p className="text-[13px] text-offwhite/30 font-body">Your AI receptionist is ready and listening.</p>
              </div>
            ) : (
              <div
                className="rounded-card overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
              >
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
                      className="flex items-center gap-4 px-5 py-3.5 text-[13px] font-body hover:bg-white/[0.025] transition-colors duration-150"
                    >
                      <Phone size={13} className="text-offwhite/25 flex-shrink-0" />
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
    </DashboardShell>
  );
}
