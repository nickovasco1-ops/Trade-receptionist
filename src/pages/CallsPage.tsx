import React, { useEffect, useState } from 'react';
import { Phone, Play, Filter } from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell';
import { supabase } from '../lib/supabase';
import type { Call } from '../../shared/types';

type CallWithSummary = Pick<
  Call,
  'id' | 'outcome' | 'is_emergency' | 'caller_number' | 'direction' | 'duration_secs' | 'started_at' | 'ended_at' | 'recording_url'
> & { transcripts?: { summary: string | null }[] | null };

type Outcome = Call['outcome'];

const OUTCOME_META: Record<string, { label: string; bg: string; text: string }> = {
  booked:        { label: 'Booked',      bg: 'rgba(34,197,94,0.12)',   text: '#86efac' },
  lead_captured: { label: 'Lead',        bg: 'rgba(153,203,255,0.12)', text: '#99cbff' },
  enquiry:       { label: 'Enquiry',     bg: 'rgba(255,255,255,0.07)', text: '#9ca3af' },
  spam:          { label: 'Spam',        bg: 'rgba(255,255,255,0.05)', text: '#6b7280' },
  voicemail:     { label: 'Voicemail',   bg: 'rgba(255,255,255,0.05)', text: '#6b7280' },
  emergency:     { label: 'Emergency',   bg: 'rgba(255,107,43,0.15)',  text: '#ffb59a' },
  transferred:   { label: 'Transferred', bg: 'rgba(255,255,255,0.07)', text: '#9ca3af' },
  no_answer:     { label: 'Missed',      bg: 'rgba(239,68,68,0.12)',   text: '#fca5a5' },
};

const ALL_OUTCOMES = Object.keys(OUTCOME_META) as NonNullable<Outcome>[];

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  const meta = OUTCOME_META[outcome ?? 'enquiry'] ?? OUTCOME_META.enquiry;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-badge text-[11px] font-semibold font-body"
      style={{ background: meta.bg, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

export default function CallsPage() {
  const [calls, setCalls]       = useState<CallWithSummary[]>([]);
  const [filtered, setFiltered] = useState<CallWithSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientRow } = await supabase
        .from('clients')
        .select('id')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!clientRow) { setLoading(false); return; }

      const { data } = await supabase
        .from('calls')
        .select(`
          id, outcome, is_emergency, caller_number, direction,
          duration_secs, started_at, ended_at, recording_url,
          transcripts ( summary )
        `)
        .eq('client_id', clientRow.id)
        .order('started_at', { ascending: false })
        .limit(200);

      setCalls((data ?? []) as CallWithSummary[]);
      setFiltered((data ?? []) as CallWithSummary[]);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    setFiltered(
      outcomeFilter === 'all'
        ? calls
        : calls.filter(c => c.outcome === outcomeFilter)
    );
  }, [outcomeFilter, calls]);

  function formatDuration(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[26px] font-bold text-offwhite font-display tracking-tight">Calls</h1>
          <p className="text-[14px] text-offwhite/40 font-body mt-1">
            {filtered.length} {outcomeFilter === 'all' ? 'total' : (OUTCOME_META[outcomeFilter]?.label.toLowerCase() ?? outcomeFilter)}{' '}
            call{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Filter size={13} className="text-offwhite/30 flex-shrink-0" />
          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value)}
            aria-label="Filter by outcome"
            className="text-[13px] font-body text-offwhite/70 rounded-[10px] px-3 py-2 outline-none cursor-pointer transition-all duration-200 focus:ring-1 focus:ring-orange/40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="all">All outcomes</option>
            {ALL_OUTCOMES.map(o => (
              <option key={o} value={o}>{OUTCOME_META[o].label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-[10px] h-14" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-card p-12 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          <Phone size={28} className="text-offwhite/20 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[15px] font-bold text-offwhite font-display mb-1">No calls found</p>
          <p className="text-[13px] text-offwhite/40 font-body">
            {outcomeFilter === 'all'
              ? 'Your AI receptionist is ready — calls will appear here.'
              : `No ${OUTCOME_META[outcomeFilter]?.label.toLowerCase() ?? outcomeFilter} calls yet.`}
          </p>
        </div>
      ) : (
        <div
          className="rounded-card overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          {/* Table header */}
          <div
            className="grid gap-4 px-5 py-3 text-[11px] font-semibold text-offwhite/30 uppercase tracking-[0.09em] font-body"
            style={{
              gridTemplateColumns: '1fr 140px 80px 100px 80px',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <span>Caller</span>
            <span className="hidden sm:block">Date</span>
            <span className="hidden md:block">Duration</span>
            <span>Outcome</span>
            <span className="hidden md:block">Recording</span>
          </div>

          {/* Rows */}
          {filtered.map((call) => (
            <div
              key={call.id}
              className="grid gap-4 px-5 py-3.5 items-center text-[13px] font-body hover:bg-white/[0.025] transition-colors duration-150"
              style={{
                gridTemplateColumns: '1fr 140px 80px 100px 80px',
                boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Phone
                  size={13}
                  className={call.is_emergency ? 'text-orange flex-shrink-0' : 'text-offwhite/25 flex-shrink-0'}
                />
                <span className="text-offwhite/80 truncate">{call.caller_number ?? 'Unknown number'}</span>
              </div>
              <span className="text-offwhite/40 hidden sm:block tabular-nums">{formatDate(call.started_at)}</span>
              <span className="text-offwhite/40 hidden md:block tabular-nums">{formatDuration(call.duration_secs)}</span>
              <OutcomeBadge outcome={call.outcome} />
              <div className="hidden md:block">
                {call.recording_url ? (
                  <a
                    href={call.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:text-accent-glow transition-colors"
                  >
                    <Play size={11} /> Play
                  </a>
                ) : (
                  <span className="text-offwhite/20">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
