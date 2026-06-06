import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Filter, Phone, Play, Siren, Timer } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useCounter } from '../hooks/useCounter';
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

export default function CallsPage() {
  const animRef = useScrollAnimation();
  const [calls, setCalls] = useState<CallWithSummary[]>([]);
  const [filtered, setFiltered] = useState<CallWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [visible, setVisible] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientRow } = await supabase
        .from('clients')
        .select('id')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!clientRow) {
        setLoading(false);
        return;
      }

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
      setVisible(true);
    }

    load();
  }, []);

  useEffect(() => {
    setFiltered(outcomeFilter === 'all' ? calls : calls.filter(call => call.outcome === outcomeFilter));
  }, [outcomeFilter, calls]);

  const filterLabel = outcomeFilter === 'all'
    ? 'all outcomes'
    : (OUTCOME_TONE[outcomeFilter as NonNullable<CallOutcome>]?.label.toLowerCase() ?? outcomeFilter);

  const summary = useMemo(() => {
    const emergencyCount = filtered.filter(call => call.is_emergency).length;
    const recordedCount = filtered.filter(call => !!call.recording_url).length;
    const averageSecs = filtered.length > 0
      ? Math.round(filtered.reduce((sum, call) => sum + (call.duration_secs ?? 0), 0) / filtered.length)
      : 0;

    return { emergencyCount, recordedCount, averageSecs };
  }, [filtered]);

  const totalCallsDisplay = useCounter({ target: calls.length, shouldStart: visible });
  const emergencyDisplay = useCounter({ target: summary.emergencyCount, shouldStart: visible });
  const recordedDisplay = useCounter({ target: summary.recordedCount, shouldStart: visible });

  return (
    <DashboardShell>
      <div ref={animRef}>
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
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Calls</p>
                <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.8rem)] font-bold leading-[0.96] tracking-[-0.05em] text-offwhite">
                  Every conversation, clearly organised.
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-offwhite/50 sm:text-[16px]">
                  Review what your AI receptionist answered, filter by outcome, and scan urgent or recorded calls without the dashboard feeling like a bloated admin panel.
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
                { label: 'total loaded', value: totalCallsDisplay },
                { label: 'urgent', value: emergencyDisplay },
                { label: 'with recordings', value: recordedDisplay },
              ].map(({ label, value }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/70"
                  style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                >
                  <Phone size={12} className="text-orange-soft" aria-hidden="true" />
                  {value} {label}
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
              <label htmlFor="calls-outcome-filter" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                Outcome filter
              </label>
              <div className="relative">
                <select
                  id="calls-outcome-filter"
                  value={outcomeFilter}
                  onChange={event => setOutcomeFilter(event.target.value)}
                  aria-label="Filter by outcome"
                  className="min-h-[50px] w-full appearance-none rounded-[18px] bg-white/[0.05] px-4 py-3 pr-11 text-[14px] text-offwhite/78 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] outline-none transition-all duration-200 focus:ring-2 focus:ring-orange/40"
                >
                  <option value="all">All outcomes</option>
                  {ALL_OUTCOMES.map(outcome => (
                    <option key={outcome} value={outcome}>{OUTCOME_TONE[outcome].label}</option>
                  ))}
                </select>
                <Filter size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-offwhite/30" aria-hidden="true" />
              </div>
            </div>
          </article>
        </section>

        {loading ? (
          <div className="mt-6 space-y-3 animate-pulse">
            {[0, 1, 2, 3, 4, 5].map(index => (
              <div key={index} className="h-16 rounded-[20px] bg-white/[0.04]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Phone}
              title={outcomeFilter === 'all' ? 'No calls yet' : 'No matching calls'}
              description={
                outcomeFilter === 'all'
                  ? 'Your AI receptionist is ready and listening for the next enquiry.'
                  : `There are no ${OUTCOME_TONE[outcomeFilter as NonNullable<CallOutcome>]?.label.toLowerCase() ?? outcomeFilter} calls in this view yet.`
              }
              action={outcomeFilter === 'all' ? { label: 'Review settings', href: '/settings' } : undefined}
            />
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3 lg:hidden">
              {filtered.map(call => {
                const isOpen = expandedId === call.id;
                const summary = call.transcripts?.[0]?.summary ?? null;
                return (
                  <article
                    key={call.id}
                    className="overflow-hidden rounded-[24px]"
                    style={{
                      background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 18px 38px rgba(2,13,24,0.22)',
                    }}
                  >
                    <button
                      type="button"
                      className="w-full px-5 py-5 text-left"
                      onClick={() => setExpandedId(isOpen ? null : call.id)}
                      aria-expanded={isOpen}
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
                            <p className="truncate text-[15px] font-semibold text-offwhite/78">{call.caller_number ?? 'Unknown number'}</p>
                            <p className="mt-1 text-[12px] text-offwhite/38">{formatDate(call.started_at)}</p>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <StatusBadge outcome={call.outcome} />
                          {isOpen ? <ChevronUp size={14} className="text-offwhite/30" aria-hidden="true" /> : <ChevronDown size={14} className="text-offwhite/30" aria-hidden="true" />}
                        </div>
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
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-[12px] text-accent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                            <Play size={11} aria-hidden="true" />
                            Recording
                          </span>
                        ) : null}
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="px-5 pb-5 pt-0">
                        <div className="rounded-[18px] bg-white/[0.03] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                          {summary ? (
                            <>
                              <div className="mb-3 flex items-center gap-2">
                                <FileText size={13} className="text-accent/70" aria-hidden="true" />
                                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/34">Call summary</span>
                              </div>
                              <p className="text-[13px] leading-relaxed text-offwhite/62">{summary}</p>
                            </>
                          ) : (
                            <p className="text-[13px] text-offwhite/32">No transcript available for this call.</p>
                          )}
                          {call.recording_url ? (
                            <div className="mt-4">
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/34">Recording</p>
                              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                              <audio controls src={call.recording_url} className="w-full" style={{ colorScheme: 'dark', height: '40px' }} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <article
              className="mt-6 hidden overflow-hidden rounded-[30px] lg:block"
              style={{
                background: 'linear-gradient(180deg, rgba(17,31,53,0.90) 0%, rgba(10,23,39,0.96) 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
              }}
            >
              <div className="grid grid-cols-[minmax(0,1.3fr)_190px_120px_130px_110px_32px] gap-4 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/30" style={{background:'rgba(255,255,255,0.025)'}}>
                <span>Caller</span>
                <span>Date</span>
                <span>Duration</span>
                <span>Outcome</span>
                <span>Recording</span>
                <span />
              </div>

              <div>
                {filtered.map(call => {
                  const isOpen = expandedId === call.id;
                  const summary = call.transcripts?.[0]?.summary ?? null;
                  return (
                    <div key={call.id}>
                      <button
                        type="button"
                        className="grid w-full grid-cols-[minmax(0,1.3fr)_190px_120px_130px_110px_32px] gap-4 px-6 py-4 text-left transition-colors duration-150 hover:bg-white/[0.025]"
                        onClick={() => setExpandedId(isOpen ? null : call.id)}
                        aria-expanded={isOpen}
                      >
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
                            <p className="mt-1 text-[12px] text-offwhite/36">{call.is_emergency ? 'Urgent call-out' : 'Inbound handled by your receptionist'}</p>
                          </div>
                        </div>
                        <span className="self-center text-[12px] text-offwhite/40 tabular-nums">{formatDate(call.started_at)}</span>
                        <span className="self-center text-[12px] text-offwhite/40 tabular-nums">{formatDuration(call.duration_secs)}</span>
                        <div className="self-center pt-0.5">
                          <StatusBadge outcome={call.outcome} />
                        </div>
                        <div className="self-center pt-0.5">
                          {call.recording_url ? (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                              <Play size={11} aria-hidden="true" />
                              Recording
                            </span>
                          ) : (
                            <span className="text-[12px] text-offwhite/24">—</span>
                          )}
                        </div>
                        <div className="self-center">
                          {isOpen ? <ChevronUp size={14} className="text-offwhite/30" aria-hidden="true" /> : <ChevronDown size={14} className="text-offwhite/30" aria-hidden="true" />}
                        </div>
                      </button>

                      {isOpen ? (
                        <div className="px-6 pb-5">
                          <div className="rounded-[18px] bg-white/[0.03] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                              <div>
                                <div className="mb-3 flex items-center gap-2">
                                  <FileText size={13} className="text-accent/70" aria-hidden="true" />
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/34">Call summary</span>
                                </div>
                                {summary ? (
                                  <p className="text-[13px] leading-relaxed text-offwhite/62">{summary}</p>
                                ) : (
                                  <p className="text-[13px] text-offwhite/32">No transcript available for this call.</p>
                                )}
                              </div>
                              {call.recording_url ? (
                                <div>
                                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-offwhite/34">Recording</p>
                                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                  <audio controls src={call.recording_url} className="w-full" style={{ colorScheme: 'dark', height: '40px' }} />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
