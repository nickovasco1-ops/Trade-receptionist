import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Briefcase, Calendar, Mail, MapPin, MessageSquare, Phone, Users } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useCounter } from '../hooks/useCounter';
import DashboardShell from '../components/dashboard/DashboardShell';
import EmptyState from '../components/dashboard/ui/EmptyState';
import Button from '../components/dashboard/ui/Button';
import Field from '../components/dashboard/ui/Field';
import Textarea from '../components/dashboard/ui/Textarea';
import { supabase } from '../lib/supabase';
import type { Booking, Lead, LeadStatus, LeadUrgency } from '../../shared/types';

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

interface BookingComposerState {
  leadId: string | null;
  slots: string[];
  selectedSlot: string | null;
  address: string;
  notes: string;
  durationMins: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
}

const INITIAL_COMPOSER: BookingComposerState = {
  leadId: null,
  slots: [],
  selectedSlot: null,
  address: '',
  notes: '',
  durationMins: 60,
  loading: false,
  saving: false,
  error: null,
  success: null,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBookingTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function accessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export default function LeadsPage() {
  const animRef = useScrollAnimation();
  const availabilityRequestRef = useRef(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState<BookingComposerState>(INITIAL_COMPOSER);
  const [visible, setVisible] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  // URL-based lead highlight — set by deep-link from SMS (e.g. ?leadId=xxx)
  const deepLinkedLeadId = searchParams.get('leadId');

  useEffect(() => {
    async function load() {
      const [{ data: userData }, token] = await Promise.all([
        supabase.auth.getUser(),
        accessToken(),
      ]);
      const user = userData.user;
      if (!user?.email) {
        setLoading(false);
        return;
      }

      const { data: clientRow } = await supabase
        .from('clients')
        .select('id, google_cal_id')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (!clientRow) {
        setLoading(false);
        return;
      }

      setCalendarConnected(!!clientRow.google_cal_id);

      const [leadsRes, bookingsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, caller_name, caller_number, caller_email, postcode, job_type, urgency, status, notes, created_at')
          .eq('client_id', clientRow.id)
          .order('created_at', { ascending: false })
          .limit(200),
        token
          ? fetch('/api/bookings', {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
      ]);

      setLeads((leadsRes.data ?? []) as Lead[]);

      if (bookingsRes) {
        const bookingJson = await bookingsRes.json().catch(() => ({ success: false }));
        if (bookingsRes.ok && bookingJson.success) {
          setBookings((bookingJson.data ?? []) as Booking[]);
        }
      }

      setLoading(false);
      setVisible(true);
    }

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to and highlight a lead when arriving via deep-link (e.g. SMS tap)
  useEffect(() => {
    if (!deepLinkedLeadId || loading) return;
    const el = document.getElementById(`lead-${deepLinkedLeadId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Clear the param after 5s so refreshing the page doesn't re-highlight
    const timer = setTimeout(() => {
      setSearchParams(prev => { prev.delete('leadId'); return prev; }, { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [deepLinkedLeadId, loading, setSearchParams]);

  async function updateStatus(id: string, status: LeadStatus) {
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setLeads(prev => prev.map(lead => (lead.id === id ? { ...lead, status } : lead)));
    setSavedId(id);
    setTimeout(() => setSavedId(null), 1800);
  }

  function updateComposerIfCurrent(
    leadId: string,
    requestId: number,
    updater: (current: BookingComposerState) => BookingComposerState
  ) {
    setComposer((prev) => {
      if (prev.leadId !== leadId || availabilityRequestRef.current !== requestId) {
        return prev;
      }

      return updater(prev);
    });
  }

  async function openBookingComposer(lead: Lead) {
    const token = await accessToken();
    if (!token) {
      setComposer({
        ...INITIAL_COMPOSER,
        leadId: lead.id,
        error: 'Your session has expired. Please sign in again before booking.',
      });
      return;
    }

    const requestId = availabilityRequestRef.current + 1;
    availabilityRequestRef.current = requestId;

    setComposer({
      leadId: lead.id,
      slots: [],
      selectedSlot: null,
      address: lead.postcode ?? '',
      notes: '',
      durationMins: 60,
      loading: true,
      saving: false,
      error: null,
      success: null,
    });

    try {
      const res = await fetch(`/api/bookings/availability?leadId=${lead.id}&durationMins=60&days=7&maxSlots=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Could not load diary slots.' }));

      if (!res.ok || !json.success) {
        updateComposerIfCurrent(lead.id, requestId, (prev) => ({
          ...prev,
          loading: false,
          error: json.error ?? 'Could not load diary slots right now.',
        }));
        return;
      }

      updateComposerIfCurrent(lead.id, requestId, (prev) => ({
        ...prev,
        loading: false,
        slots: (json.data?.slots ?? []) as string[],
        error: null,
      }));
    } catch {
      updateComposerIfCurrent(lead.id, requestId, (prev) => ({
        ...prev,
        loading: false,
        error: 'Could not reach the booking service. Please try again.',
      }));
    }
  }

  async function confirmBooking() {
    if (!composer.leadId || !composer.selectedSlot) {
      setComposer((prev) => ({ ...prev, error: 'Choose a diary slot before confirming the booking.' }));
      return;
    }

    const token = await accessToken();
    if (!token) {
      setComposer((prev) => ({
        ...prev,
        error: 'Your session has expired. Please sign in again before booking.',
      }));
      return;
    }

    setComposer((prev) => ({ ...prev, saving: true, error: null, success: null }));

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadId: composer.leadId,
          scheduledAt: composer.selectedSlot,
          durationMins: composer.durationMins,
          address: composer.address || null,
          notes: composer.notes || null,
        }),
      });

      const json = await res.json().catch(() => ({ success: false, error: 'Could not save the booking.' }));

      if (!res.ok || !json.success || !json.data) {
        setComposer((prev) => ({
          ...prev,
          saving: false,
          error: json.error ?? 'Could not save the booking right now.',
        }));
        return;
      }

      const booking = json.data as Booking;
      setBookings((prev) =>
        [...prev.filter((item) => item.id !== booking.id), booking].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        )
      );
      setLeads((prev) =>
        prev.map((lead) => (
          lead.id === composer.leadId
            ? { ...lead, status: 'booked' }
            : lead
        ))
      );
      setComposer((prev) => ({
        ...prev,
        saving: false,
        success: `Booked for ${formatBookingTime(booking.scheduled_at)}.`,
        slots: [],
      }));
    } catch {
      setComposer((prev) => ({
        ...prev,
        saving: false,
        error: 'Could not reach the booking service. Please try again.',
      }));
    }
  }

  const bookedByLead = useMemo(() => {
    const next = new Map<string, Booking>();
    const ordered = [...bookings]
      .filter((booking) => booking.status === 'scheduled' && booking.lead_id)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    for (const booking of ordered) {
      if (booking.lead_id && !next.has(booking.lead_id)) {
        next.set(booking.lead_id, booking);
      }
    }

    return next;
  }, [bookings]);

  const summary = useMemo(() => ({
    emergencies: leads.filter((lead) => (lead.urgency ?? 'routine') === 'emergency').length,
    newLeads: leads.filter((lead) => (lead.status ?? 'new') === 'new').length,
    booked: leads.filter((lead) => (lead.status ?? 'new') === 'booked').length,
    upcoming: bookings.filter((booking) => booking.status === 'scheduled').length,
  }), [bookings, leads]);

  const newLeadsDisplay = useCounter({ target: summary.newLeads, shouldStart: visible });
  const bookedDisplay = useCounter({ target: summary.booked, shouldStart: visible });
  const emergenciesDisplay = useCounter({ target: summary.emergencies, shouldStart: visible });

  return (
    <DashboardShell>
      <div ref={animRef}>
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
                `${summary.upcoming} diary bookings`,
              ].map((item) => (
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">New</p>
                <p className="mt-3 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">{newLeadsDisplay}</p>
                <p className="mt-2 text-[12px] text-offwhite/42">Fresh follow-up waiting for a response.</p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Booked</p>
                <p className="mt-3 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">{bookedDisplay}</p>
                <p className="mt-2 text-[12px] text-offwhite/42">Jobs already turned into confirmed work.</p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Emergency</p>
                <p className="mt-3 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">{emergenciesDisplay}</p>
                <p className="mt-2 text-[12px] text-offwhite/42">High-priority work that deserves fast action.</p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Upcoming bookings</p>
                <p className="mt-3 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">{summary.upcoming}</p>
                <p className="mt-2 text-[12px] text-offwhite/42">Confirmed diary slots saved against your leads.</p>
              </div>
              <div className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:col-span-2 xl:col-span-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Calendar status</p>
                <p className="mt-3 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-offwhite">
                  {calendarConnected ? 'Ready' : 'Needs setup'}
                </p>
                <p className="mt-2 text-[12px] text-offwhite/42">
                  {calendarConnected
                    ? 'Live diary checks and booking are active.'
                    : 'Connect Google Calendar in settings to start booking leads.'}
                </p>
              </div>
            </div>
          </article>
        </section>

        {loading ? (
          <div className="mt-6 space-y-3 animate-pulse">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-40 rounded-[24px] bg-white/[0.04]" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Users}
              title="No leads yet"
              description="Leads captured from answered calls will appear here once your AI receptionist starts taking real enquiries."
              action={{ label: 'Review settings', href: '/settings' }}
            />
          </div>
        ) : (
          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            {leads.map((lead) => {
              const urgency = (lead.urgency ?? 'routine') as LeadUrgency;
              const status = (lead.status ?? 'new') as LeadStatus;
              const urgencyClass = URGENCY_META[urgency] ?? URGENCY_META.routine;
              const statusInfo = STATUS_META[status] ?? STATUS_META.new;
              const isEmergency = urgency === 'emergency';
              const scheduledBooking = bookedByLead.get(lead.id);
              const bookingOpen = composer.leadId === lead.id;
              const isDeepLinked = deepLinkedLeadId === lead.id;

              return (
                <article
                  key={lead.id}
                  id={`lead-${lead.id}`}
                  className="relative rounded-[28px] px-5 py-5 transition-all duration-300 ease-mechanical hover:-translate-y-0.5"
                  style={{
                    background: isEmergency
                      ? 'linear-gradient(180deg, rgba(255,107,43,0.08) 0%, rgba(10,23,39,0.96) 100%)'
                      : 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
                    boxShadow: isDeepLinked
                      ? '0 0 0 2px rgba(153,203,255,0.50), 0 22px 50px rgba(2,13,24,0.26)'
                      : isEmergency
                        ? '0 0 0 1px rgba(255,107,43,0.18), 0 22px 50px rgba(2,13,24,0.26)'
                        : '0 0 0 1px rgba(255,255,255,0.08), 0 22px 50px rgba(2,13,24,0.24)',
                  }}
                >
                  {savedId === lead.id && (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-[28px] transition-opacity duration-300"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(134,239,172,0.35), 0 0 24px rgba(134,239,172,0.08)' }}
                    />
                  )}
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
                      onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)}
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

                  {lead.caller_number ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`tel:${lead.caller_number}`}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite transition-all duration-200 hover:-translate-y-0.5"
                        style={{ background: 'rgba(255,107,43,0.12)', boxShadow: '0 0 0 1px rgba(255,107,43,0.22)' }}
                      >
                        <Phone size={13} aria-hidden="true" />
                        Call back
                      </a>
                      <a
                        href={`sms:${lead.caller_number}?body=Hi%2C%20it%27s%20${encodeURIComponent(lead.caller_name ? `${lead.caller_name} from ` : '')}${encodeURIComponent('your receptionist service')}%20returning%20your%20call.`}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite transition-all duration-200 hover:-translate-y-0.5"
                        style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.10)' }}
                      >
                        <MessageSquare size={13} aria-hidden="true" />
                        Send message
                      </a>
                    </div>
                  ) : null}

                  {lead.notes ? (
                    <div className="mt-4 rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/32">Summary</p>
                      <p className="mt-2 text-[13px] leading-relaxed text-offwhite/52">{lead.notes}</p>
                    </div>
                  ) : null}

                  {scheduledBooking ? (
                    <div
                      className="mt-4 rounded-[20px] px-4 py-4"
                      style={{
                        background: 'rgba(80,212,146,0.08)',
                        boxShadow: '0 0 0 1px rgba(80,212,146,0.16)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Calendar size={16} className="mt-0.5 text-status-success" aria-hidden="true" />
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-status-success">Booked in the diary</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-offwhite/72">
                            {formatBookingTime(scheduledBooking.scheduled_at)}
                          </p>
                          {scheduledBooking.address ? (
                            <p className="mt-1 text-[12px] leading-relaxed text-offwhite/46">{scheduledBooking.address}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!scheduledBooking ? (
                    <div className="mt-4 rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/32">Booking</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-offwhite/50">
                            {calendarConnected
                              ? 'Check live diary slots and turn this lead into confirmed work.'
                              : 'Connect Google Calendar in settings before live booking can be used.'}
                          </p>
                        </div>
                        {calendarConnected ? (
                          <Button
                            size="sm"
                            variant={bookingOpen ? 'secondary' : 'primary'}
                            onClick={() => {
                              if (bookingOpen) {
                                setComposer(INITIAL_COMPOSER);
                                return;
                              }
                              void openBookingComposer(lead);
                            }}
                          >
                            <Calendar size={14} aria-hidden="true" />
                            {bookingOpen ? 'Close booking' : 'Check diary slots'}
                          </Button>
                        ) : (
                          <a
                            href="/settings"
                            className="inline-flex min-h-[40px] items-center rounded-full px-4 py-2 text-[12px] font-semibold text-orange-soft shadow-[inset_0_0_0_1px_rgba(255,107,43,0.18)]"
                          >
                            Open settings
                          </a>
                        )}
                      </div>

                      {bookingOpen ? (
                        <div className="mt-4 space-y-4">
                          {composer.loading ? (
                            <div className="rounded-[18px] bg-white/[0.03] px-4 py-4 text-[13px] text-offwhite/52 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                              Checking the diary for the next available slots…
                            </div>
                          ) : null}

                          {composer.error ? (
                            <div
                              className="rounded-[18px] px-4 py-4"
                              role="alert"
                              style={{
                                background: 'rgba(255,107,43,0.08)',
                                boxShadow: '0 0 0 1px rgba(255,107,43,0.18)',
                              }}
                            >
                              <p className="text-[12px] leading-relaxed text-orange-soft/86">{composer.error}</p>
                            </div>
                          ) : null}

                          {composer.success ? (
                            <div
                              className="rounded-[18px] px-4 py-4"
                              role="status"
                              style={{
                                background: 'rgba(80,212,146,0.08)',
                                boxShadow: '0 0 0 1px rgba(80,212,146,0.16)',
                              }}
                            >
                              <p className="text-[12px] leading-relaxed text-status-success">{composer.success}</p>
                            </div>
                          ) : null}

                          {!composer.loading && composer.slots.length > 0 ? (
                            <div>
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/32">Available slots</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {composer.slots.map((slot) => {
                                  const selected = composer.selectedSlot === slot;
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      onClick={() => setComposer((prev) => ({ ...prev, selectedSlot: slot, error: null }))}
                                      className="rounded-[16px] px-3 py-3 text-left text-[13px] font-semibold transition-all duration-200"
                                      style={{
                                        background: selected ? 'rgba(255,107,43,0.12)' : 'rgba(255,255,255,0.03)',
                                        boxShadow: selected
                                          ? '0 0 0 1px rgba(255,107,43,0.28)'
                                          : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                                        color: selected ? '#FFF4EE' : 'rgba(245,247,250,0.76)',
                                      }}
                                    >
                                      {formatBookingTime(slot)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {!composer.loading && !composer.error && composer.slots.length === 0 && !composer.success ? (
                            <div className="rounded-[18px] bg-white/[0.03] px-4 py-4 text-[13px] text-offwhite/52 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                              No free slots showed up in the next 7 days. Try again later or adjust the diary directly.
                            </div>
                          ) : null}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                              id={`booking-address-${lead.id}`}
                              label="Address or postcode"
                              value={composer.address}
                              onChange={(event) => setComposer((prev) => ({ ...prev, address: event.target.value }))}
                              placeholder="Job address or postcode"
                            />
                            <div className="rounded-[18px] bg-white/[0.03] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/32">Booking length</p>
                              <p className="mt-2 text-[14px] font-semibold text-offwhite/72">{composer.durationMins} minutes</p>
                              <p className="mt-1 text-[12px] leading-relaxed text-offwhite/44">
                                This MVP uses your existing 60-minute booking window.
                              </p>
                            </div>
                          </div>

                          <Textarea
                            id={`booking-notes-${lead.id}`}
                            label="Extra notes for the calendar entry"
                            rows={3}
                            value={composer.notes}
                            onChange={(event) => setComposer((prev) => ({ ...prev, notes: event.target.value }))}
                            placeholder="Optional access notes, parking info, or anything the engineer should know."
                          />

                          <div className="flex flex-wrap gap-3">
                            <Button
                              size="sm"
                              onClick={() => void confirmBooking()}
                              disabled={composer.saving || !composer.selectedSlot}
                            >
                              {composer.saving ? 'Booking…' : 'Confirm booking'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setComposer(INITIAL_COMPOSER)}
                              disabled={composer.saving}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      ) : null}
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
