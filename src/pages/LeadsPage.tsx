import React, { useEffect, useState } from 'react';
import { Users, Mail, Phone, MapPin, Briefcase, AlertTriangle } from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell';
import { supabase } from '../lib/supabase';
import type { Lead, LeadStatus } from '../../shared/types';

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  new:       { label: 'New',       bg: 'rgba(153,203,255,0.12)', text: '#99cbff' },
  contacted: { label: 'Contacted', bg: 'rgba(250,204,21,0.12)',  text: '#fde68a' },
  booked:    { label: 'Booked',    bg: 'rgba(34,197,94,0.12)',   text: '#86efac' },
  lost:      { label: 'Lost',      bg: 'rgba(255,255,255,0.06)', text: '#6b7280' },
  spam:      { label: 'Spam',      bg: 'rgba(255,255,255,0.04)', text: '#4b5563' },
};

const URGENCY_META: Record<string, { bg: string; text: string }> = {
  emergency: { bg: 'rgba(255,107,43,0.15)', text: '#ffb59a' },
  urgent:    { bg: 'rgba(250,204,21,0.12)', text: '#fde68a' },
  routine:   { bg: 'rgba(255,255,255,0.06)', text: '#6b7280' },
};

export default function LeadsPage() {
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
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-offwhite font-display tracking-tight">Leads</h1>
        <p className="text-[14px] text-offwhite/40 font-body mt-1">
          {leads.length} lead{leads.length !== 1 ? 's' : ''} captured by your receptionist.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-card h-28" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div
          className="rounded-card p-12 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          <Users size={28} className="text-offwhite/20 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[15px] font-bold text-offwhite font-display mb-1">No leads yet</p>
          <p className="text-[13px] text-offwhite/40 font-body">Leads captured from calls will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => {
            const urgencyMeta = URGENCY_META[lead.urgency ?? 'routine'] ?? URGENCY_META.routine;
            const statusMeta  = STATUS_META[lead.status  ?? 'new']    ?? STATUS_META.new;

            return (
              <div
                key={lead.id}
                className="rounded-card p-5 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: lead.urgency === 'emergency' ? 'rgba(255,107,43,0.06)' : 'rgba(255,255,255,0.04)',
                  boxShadow: lead.urgency === 'emergency'
                    ? '0 0 0 1px rgba(255,107,43,0.2), 0 8px 32px rgba(2,13,24,0.3)'
                    : '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(2,13,24,0.3)',
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    {lead.urgency === 'emergency' && <AlertTriangle size={14} className="text-orange flex-shrink-0" />}
                    <span className="text-[15px] font-bold text-offwhite font-display">
                      {lead.caller_name ?? 'Unknown caller'}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-badge text-[11px] font-semibold font-body"
                      style={{ background: urgencyMeta.bg, color: urgencyMeta.text }}
                    >
                      {lead.urgency ?? 'routine'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={lead.status ?? 'new'}
                      onChange={e => updateStatus(lead.id, e.target.value as LeadStatus)}
                      className="text-[12px] font-body rounded-[8px] px-2.5 py-1 outline-none cursor-pointer transition-all duration-200"
                      style={{
                        background: statusMeta.bg,
                        color: statusMeta.text,
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                      }}
                    >
                      {Object.entries(STATUS_META).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <span className="text-[12px] text-offwhite/30 font-body">{formatDate(lead.created_at)}</span>
                  </div>
                </div>

                {/* Details row */}
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {lead.caller_number && (
                    <span className="flex items-center gap-1.5 text-[13px] text-offwhite/60 font-body">
                      <Phone size={12} className="text-offwhite/30" /> {lead.caller_number}
                    </span>
                  )}
                  {lead.caller_email && (
                    <span className="flex items-center gap-1.5 text-[13px] text-offwhite/60 font-body">
                      <Mail size={12} className="text-offwhite/30" /> {lead.caller_email}
                    </span>
                  )}
                  {lead.postcode && (
                    <span className="flex items-center gap-1.5 text-[13px] text-offwhite/60 font-body">
                      <MapPin size={12} className="text-offwhite/30" /> {lead.postcode}
                    </span>
                  )}
                  {lead.job_type && (
                    <span className="flex items-center gap-1.5 text-[13px] text-offwhite/60 font-body">
                      <Briefcase size={12} className="text-offwhite/30" /> {lead.job_type}
                    </span>
                  )}
                </div>

                {lead.notes && (
                  <p className="mt-3 text-[13px] text-offwhite/50 font-body leading-relaxed line-clamp-2">
                    {lead.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
