import { useEffect, useState } from 'react';
import { Phone, Play, Filter } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import DashboardShell from '../components/dashboard/DashboardShell';
import EmptyState from '../components/dashboard/ui/EmptyState';
import StatusBadge from '../components/dashboard/ui/StatusBadge';
import { OUTCOME_TONE } from '../components/dashboard/ui/outcomeTone';
import { supabase } from '../lib/supabase';
import type { Call, CallOutcome } from '../../shared/types';

type CallWithSummary = Pick<
  Call,
  'id' | 'outcome' | 'is_emergency' | 'caller_number' | 'direction' | 'duration_secs' | 'started_at' | 'ended_at' | 'recording_url'
> & { transcripts?: { summary: string | null }[] | null };

const ALL_OUTCOMES = Object.keys(OUTCOME_TONE) as NonNullable<CallOutcome>[];

export default function CallsPage() {
  const animRef  = useScrollAnimation();
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

  const filterLabel =
    outcomeFilter === 'all'
      ? 'total'
      : (OUTCOME_TONE[outcomeFilter as NonNullable<CallOutcome>]?.label.toLowerCase() ?? outcomeFilter);

  return (
    <DashboardShell>
      <div ref={animRef} data-animate>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[26px] font-bold text-offwhite font-display tracking-tight">Calls</h1>
          <p className="text-[14px] text-offwhite/40 font-body mt-1">
            {filtered.length} {filterLabel} call{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Filter size={13} className="text-offwhite/30 flex-shrink-0" aria-hidden="true" />
          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value)}
            aria-label="Filter by outcome"
            className="text-[13px] font-body text-offwhite/70 rounded-field px-3 py-2 bg-white/[0.06] shadow-ring-default focus:shadow-ring-strong outline-none cursor-pointer transition-shadow duration-200 focus:ring-2 focus:ring-orange/40 appearance-none"
          >
            <option value="all">All outcomes</option>
            {ALL_OUTCOMES.map(o => (
              <option key={o} value={o}>{OUTCOME_TONE[o].label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-field h-14 bg-white/[0.04]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Phone}
          title={outcomeFilter === 'all' ? 'No calls yet' : 'No matching calls'}
          description={
            outcomeFilter === 'all'
              ? 'Your AI receptionist is ready and listening.'
              : `No ${OUTCOME_TONE[outcomeFilter as NonNullable<CallOutcome>]?.label.toLowerCase() ?? outcomeFilter} calls yet.`
          }
          action={outcomeFilter === 'all' ? { label: 'Test the AI now', href: '/settings' } : undefined}
        />
      ) : (
        <div className="rounded-card overflow-hidden bg-white/[0.04] shadow-ring-subtle">
          <div
            className="grid gap-4 px-5 py-3 text-[11px] font-semibold text-offwhite/30 uppercase tracking-[0.09em] font-body bg-white/[0.03]"
            style={{ gridTemplateColumns: '1fr 140px 80px 100px 80px' }}
          >
            <span>Caller</span>
            <span className="hidden sm:block">Date</span>
            <span className="hidden md:block">Duration</span>
            <span>Outcome</span>
            <span className="hidden md:block">Recording</span>
          </div>

          {filtered.map((call) => (
            <div
              key={call.id}
              className="grid gap-4 px-5 py-3.5 items-center text-[13px] font-body hover:bg-white/[0.025] transition-colors duration-150 even:bg-white/[0.015]"
              style={{ gridTemplateColumns: '1fr 140px 80px 100px 80px' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Phone
                  size={13}
                  aria-hidden="true"
                  className={call.is_emergency ? 'text-orange flex-shrink-0' : 'text-offwhite/25 flex-shrink-0'}
                />
                <span className="text-offwhite/80 truncate">{call.caller_number ?? 'Unknown number'}</span>
              </div>
              <span className="text-offwhite/40 hidden sm:block tabular-nums">{formatDate(call.started_at)}</span>
              <span className="text-offwhite/40 hidden md:block tabular-nums">{formatDuration(call.duration_secs)}</span>
              <StatusBadge outcome={call.outcome} />
              <div className="hidden md:block">
                {call.recording_url ? (
                  <a
                    href={call.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:text-accent-glow transition-colors"
                  >
                    <Play size={11} aria-hidden="true" /> Play
                  </a>
                ) : (
                  <span className="text-offwhite/20">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </DashboardShell>
  );
}
