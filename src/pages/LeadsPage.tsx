import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Briefcase, Mail, MapPin, Phone, Users } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import DashboardShell from '../components/dashboard/DashboardShell';
import EmptyState from '../components/dashboard/ui/EmptyState';
import { supabase } from '../lib/supabase';
import type { Lead, LeadStatus, LeadUrgency } from '../../shared/types';

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LeadsPage() {
  const animRef = useScrollAnimation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

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
        .from('leads')
        .select('id, caller_name, caller_number, caller_email, postcode, job_type, urgency, status, notes, created_at')
        .eq('client_id', clientRow.id)
        .order('created_at', { ascending: false })
        .limit(200);

      setLeads((data ?? []) as Lead[]);
      setLoading(false);
    }

    load();
  }, []);

  async function updateStatus(id: string, status: LeadStatus) {
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setLeads(prev => prev.map(lead => (lead.id === id ? { ...lead, status } : lead)));
  }

  const summary = useMemo(() => ({
    emergencies: leads.filter(lead => (lead.urgency ?? 'routine') === 'emergency').length,
    newLeads: leads.filter(lead => (lead.status ?? 'new') === 'new').length,
    booked: leads.filter(lead => (lead.status ?? 'new') === 'booked').length,
  }), [leads]);

  return (
    <DashboardShell>
      <div ref={animRef} data-animate>
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
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Leads</p>
                <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.8rem)] font-bold leading-[0.96] tracking-[-0.05em] text-offwhite">
                  Captured work, ready for follow-up.
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-offwhite/50 sm:text-[16px]">
                  Keep the pipeline sharp, surface urgent jobs early, and move every qualified enquiry toward contact or booking without clutter.
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

        {loading ? (
          <div className="mt-6 space-y-3 animate-pulse">
            {[0, 1, 2, 3].map(index => (
              <div key={index} className="h-40 rounded-[24px] bg-white/[0.04]" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Users}
              title="No leads yet"
              description="Leads captured from answered calls will appear here once Sarah starts taking real enquiries."
              action={{ label: 'Review settings', href: '/settings' }}
            />
          </div>
        ) : (
          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            {leads.map(lead => {
              const urgency = (lead.urgency ?? 'routine') as LeadUrgency;
              const status = (lead.status ?? 'new') as LeadStatus;
              const urgencyClass = URGENCY_META[urgency] ?? URGENCY_META.routine;
              const statusInfo = STATUS_META[status] ?? STATUS_META.new;
              const isEmergency = urgency === 'emergency';

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
                        <p className="truncate font-display text-[20px] font-bold tracking-[-0.03em] text-offwhite">
                          {lead.caller_name ?? 'Unknown caller'}
                        </p>
                        <span className={`inline-flex min-h-[24px] items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] ${urgencyClass}`}>
                          {urgency}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] text-offwhite/38 tabular-nums">{formatDate(lead.created_at)}</p>
                    </div>

                    <select
                      value={status}
                      onChange={event => updateStatus(lead.id, event.target.value as LeadStatus)}
                      aria-label={`Update status for ${lead.caller_name ?? 'lead'}`}
                      className={`min-h-[40px] appearance-none rounded-full px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] outline-none transition-all duration-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] focus:ring-2 focus:ring-orange/40 ${statusInfo.tone}`}
                    >
                      {(Object.entries(STATUS_META) as [LeadStatus, { label: string }][]).map(([value, meta]) => (
                        <option key={value} value={value}>{meta.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {lead.caller_number ? (
                      <div className="flex items-center gap-2.5 rounded-[18px] bg-white/[0.04] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                        <Phone size={13} className="text-offwhite/36" aria-hidden="true" />
                        <span className="truncate text-[13px] text-offwhite/64">{lead.caller_number}</span>
                      </div>
                    ) : null}
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
        )}
      </div>
    </DashboardShell>
  );
}
