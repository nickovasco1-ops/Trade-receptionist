import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Users, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell';
import { supabase } from '../lib/supabase';

interface Stats {
  totalCalls:   number;
  totalLeads:   number;
  bookedJobs:   number;
  emergencies:  number;
}

function StatCard({
  label, value, icon: Icon, href, accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className="rounded-card p-5 flex items-start gap-4 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: accent ? 'rgba(255,107,43,0.08)' : 'rgba(255,255,255,0.05)',
        boxShadow: accent
          ? '0 0 0 1px rgba(255,107,43,0.2), 0 8px 32px rgba(2,13,24,0.4)'
          : '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(2,13,24,0.3)',
      }}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? 'rgba(255,107,43,0.15)' : 'rgba(255,255,255,0.07)' }}
      >
        <Icon size={16} className={accent ? 'text-orange' : 'text-offwhite/60'} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.08em] font-body mb-0.5">{label}</p>
        <p className="text-[28px] font-bold text-offwhite font-display leading-none">{value}</p>
      </div>
      {href && <ArrowRight size={14} className="ml-auto text-offwhite/20 flex-shrink-0 mt-1" />}
    </div>
  );

  return href ? <Link to={href}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch client for this user
      const { data: clientRow } = await supabase
        .from('clients')
        .select('id')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!clientRow) { setLoading(false); return; }

      const clientId = clientRow.id;

      const [callsRes, leadsRes] = await Promise.all([
        supabase.from('calls').select('id, outcome, is_emergency, started_at, caller_number, duration_secs')
          .eq('client_id', clientId)
          .order('started_at', { ascending: false })
          .limit(50),
        supabase.from('leads').select('id, status')
          .eq('client_id', clientId),
      ]);

      const calls = callsRes.data ?? [];
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

  const OUTCOME_BADGE: Record<string, { label: string; color: string }> = {
    booked:        { label: 'Booked',      color: 'rgba(34,197,94,0.15)'  },
    lead_captured: { label: 'Lead',        color: 'rgba(153,203,255,0.15)' },
    enquiry:       { label: 'Enquiry',     color: 'rgba(255,255,255,0.08)' },
    spam:          { label: 'Spam',        color: 'rgba(255,255,255,0.05)' },
    voicemail:     { label: 'Voicemail',   color: 'rgba(255,255,255,0.05)' },
    emergency:     { label: 'Emergency',   color: 'rgba(255,107,43,0.15)'  },
    transferred:   { label: 'Transferred', color: 'rgba(255,255,255,0.08)' },
    no_answer:     { label: 'Missed',      color: 'rgba(239,68,68,0.12)'   },
  };

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
            <div key={i} className="rounded-card h-24" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total calls"  value={stats.totalCalls}  icon={Phone}        href="/dashboard/calls" />
            <StatCard label="Leads"        value={stats.totalLeads}  icon={Users}        href="/dashboard/leads" />
            <StatCard label="Jobs booked"  value={stats.bookedJobs}  icon={TrendingUp}   accent />
            <StatCard label="Emergencies"  value={stats.emergencies} icon={AlertTriangle} />
          </div>

          {/* Recent calls */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-offwhite font-display">Recent calls</h2>
              <Link to="/dashboard/calls" className="text-[13px] text-orange font-body hover:text-orange-glow transition-colors flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {recentCalls.length === 0 ? (
              <div
                className="rounded-card p-10 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
              >
                <Phone size={24} className="text-offwhite/20 mx-auto mb-3" />
                <p className="text-[14px] text-offwhite/40 font-body">No calls yet — your AI receptionist is ready.</p>
              </div>
            ) : (
              <div
                className="rounded-card overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
              >
                {recentCalls.map((call, i) => {
                  const badge = OUTCOME_BADGE[call.outcome ?? 'enquiry'] ?? OUTCOME_BADGE.enquiry;
                  const when  = call.started_at ? new Date(call.started_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
                  const dur   = call.duration_secs != null ? `${Math.floor(call.duration_secs / 60)}m ${call.duration_secs % 60}s` : '—';

                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-4 px-5 py-3.5 text-[13px] font-body"
                      style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                    >
                      <Phone size={14} className="text-offwhite/30 flex-shrink-0" />
                      <span className="text-offwhite/70 flex-1 truncate">{call.caller_number ?? 'Unknown'}</span>
                      <span className="text-offwhite/30 hidden sm:block">{when}</span>
                      <span className="text-offwhite/30 hidden md:block">{dur}</span>
                      <span
                        className="px-2 py-0.5 rounded-badge text-[11px] font-semibold text-offwhite/70 flex-shrink-0"
                        style={{ background: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* No client provisioned yet */
        <div
          className="rounded-card p-10 text-center max-w-md"
          style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          <h2 className="text-[18px] font-bold text-offwhite font-display mb-2">Set up your receptionist</h2>
          <p className="text-[14px] text-offwhite/50 font-body mb-5 leading-relaxed">
            You don't have an account configured yet. Complete onboarding to get your AI receptionist live.
          </p>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-btn font-semibold text-[14px] text-white font-body transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%)', boxShadow: '0 0 24px rgba(255,107,43,0.35)' }}
          >
            Start onboarding <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </DashboardShell>
  );
}
