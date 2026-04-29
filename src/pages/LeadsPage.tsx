import { useEffect, useState } from 'react';
import { Users, Mail, Phone, MapPin, Briefcase, AlertTriangle } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import DashboardShell from '../components/dashboard/DashboardShell';
import EmptyState from '../components/dashboard/ui/EmptyState';
import { supabase } from '../lib/supabase';
import type { Lead, LeadStatus, LeadUrgency } from '../../shared/types';

const STATUS_META: Record<LeadStatus, { label: string; tone: string }> = {
  new:       { label: 'New',       tone: 'bg-accent/15 text-accent' },
  contacted: { label: 'Contacted', tone: 'bg-status-warn/15 text-status-warn' },
  booked:    { label: 'Booked',    tone: 'bg-status-success/15 text-status-success' },
  lost:      { label: 'Lost',      tone: 'bg-status-muted-2/10 text-status-muted-2' },
  spam:      { label: 'Spam',      tone: 'bg-status-muted-2/10 text-status-muted-2' },
};

const URGENCY_META: Record<LeadUrgency, string> = {
  emergency: 'bg-orange/15 text-orange-soft',
  urgent:    'bg-status-warn/15 text-status-warn',
  routine:   'bg-status-muted/10 text-status-muted',
};

export default function LeadsPage() {
  const animRef  = useScrollAnimation();
  const [leads, setLeads]     = useState<Lead[]>([]);
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

      if (!clientRow) { setLoading(false); return; }

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
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <DashboardShell>
      <div ref={animRef} data-animate>
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-offwhite font-display tracking-tight">Leads</h1>
        <p className="text-[14px] text-offwhite/40 font-body mt-1">
          {leads.length} lead{leads.length !== 1 ? 's' : ''} captured by your receptionist.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-card h-28 bg-white/[0.04]" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Leads captured from calls will appear here."
          action={{ label: 'Test the AI now', href: '/settings' }}
        />
      ) : (
        <div className="space-y-3">
          {leads.map(lead => {
            const urgency = (lead.urgency ?? 'routine') as LeadUrgency;
            const status  = (lead.status  ?? 'new')     as LeadStatus;
            const urgencyClass = URGENCY_META[urgency] ?? URGENCY_META.routine;
            const statusInfo   = STATUS_META[status]   ?? STATUS_META.new;
            const isEmergency  = urgency === 'emergency';

            const cardClasses = isEmergency
              ? 'bg-orange/[0.06] shadow-card-accent'
              : 'bg-white/[0.04] shadow-card';

            return (
              <article
                key={lead.id}
                className={`rounded-card p-5 transition-all duration-300 ease-mechanical hover:-translate-y-0.5 hover:shadow-card-hover ${cardClasses}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    {isEmergency && <AlertTriangle size={14} className="text-orange flex-shrink-0" aria-hidden="true" />}
                    <span className="text-[15px] font-bold text-offwhite font-display">
                      {lead.caller_name ?? 'Unknown caller'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-badge text-[11px] font-semibold font-body capitalize ${urgencyClass}`}>
                      {urgency}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={status}
                      onChange={e => updateStatus(lead.id, e.target.value as LeadStatus)}
                      aria-label={`Update status for ${lead.caller_name ?? 'lead'}`}
                      className={`text-[12px] font-body rounded-badge px-2.5 py-1 outline-none cursor-pointer appearance-none transition-shadow duration-200 shadow-ring-default focus:shadow-ring-strong focus:ring-2 focus:ring-orange/40 ${statusInfo.tone}`}
                    >
                      {(Object.entries(STATUS_META) as [LeadStatus, { label: string }][]).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <span className="text-[12px] text-offwhite/30 font-body tabular-nums">{formatDate(lead.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {lead.caller_number && (
                    <span className="flex items-center gap-1.5 text-[13px] text-offwhite/60 font-body">
                      <Phone size={12} className="text-offwhite/30" aria-hidden="true" /> {lead.caller_number}
                    </span>
                  )}
                  {lead.caller_email && (
                    <span className="flex items-center gap-1.5 text-[13px] text-offwhite/60 font-body">
                      <Mail size={12} className="text-offwhite/30" aria-hidden="true" /> {lead.caller_email}
                    </span>
                  )}
                  {lead.postcode && (
                    <span className="flex items-center gap-1.5 text-[13px] text-offwhite/60 font-body">
                      <MapPin size={12} className="text-offwhite/30" aria-hidden="true" /> {lead.postcode}
                    </span>
                  )}
                  {lead.job_type && (
                    <span className="flex items-center gap-1.5 text-[13px] text-offwhite/60 font-body">
                      <Briefcase size={12} className="text-offwhite/30" aria-hidden="true" /> {lead.job_type}
                    </span>
                  )}
                </div>

                {lead.notes && (
                  <p className="mt-3 text-[13px] text-offwhite/50 font-body leading-relaxed line-clamp-2">
                    {lead.notes}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
      </div>
    </DashboardShell>
  );
}
