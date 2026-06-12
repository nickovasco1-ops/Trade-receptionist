import { useEffect, useState } from 'react';
import type { ElementType, FormEvent, HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Bell, Bot, Calendar, CheckCircle, Clock, CreditCard, Key, Phone, Save, User, Wrench } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import DashboardShell from '../components/dashboard/DashboardShell';
import Button from '../components/dashboard/ui/Button';
import { supabase } from '../lib/supabase';
import type { ReceptionistTone, Plan } from '../../shared/types';

interface ClientSettings {
  business_name: string;
  owner_name: string;
  owner_email: string;
  owner_mobile: string;
  twilio_number: string | null;
  own_number: string | null;
  subscription_status: string | null;
  payment_status: string | null;
  after_hours_message: string | null;
  google_cal_id: string | null;
  google_cal_connected: boolean;
  // Receptionist profile
  receptionist_name: string;
  receptionist_tone: ReceptionistTone;
  // Services and coverage
  services: string[];
  service_areas: string[];
  // Working hours
  business_hours_start: string | null;
  business_hours_end: string | null;
  working_days: number[];
  // Revenue estimate
  avg_job_value: string; // stored as string in form, coerced on save
  // Advanced
  plan: Plan;
  system_prompt_override: string;
}

function buildActivationCode(twilioNumber: string) {
  return `**004*${twilioNumber}#`;
}

function SettingsSection({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: ElementType;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[28px] px-5 py-5 sm:px-6 sm:py-6"
      style={{
        background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.08),' +
          '0 22px 48px rgba(2,13,24,0.24)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
        >
          <Icon size={16} className="text-orange-soft" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[20px] font-bold tracking-[-0.03em] text-offwhite">{title}</h2>
          <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-offwhite/46">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

interface LabeledFieldProps {
  label: string;
  name: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
  readOnly?: boolean;
  hint?: string;
}

function LabeledField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  inputMode,
  placeholder = '',
  readOnly = false,
  hint,
}: LabeledFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
        {label}
      </label>
      <input
        id={name}
        type={type}
        inputMode={inputMode}
        name={name}
        value={value}
        readOnly={readOnly}
        onChange={event => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={`min-h-[50px] w-full rounded-[18px] px-4 py-3 text-[14px] text-offwhite placeholder:text-offwhite/24 outline-none transition-[box-shadow,background-color] duration-200 ease-standard focus:ring-2 focus:ring-orange/40 ${
          readOnly ? 'cursor-default bg-white/[0.03] opacity-70' : 'bg-white/[0.05]'
        }`}
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
      />
      {hint ? <p className="mt-2 text-[12px] leading-relaxed text-offwhite/38">{hint}</p> : null}
    </div>
  );
}

function subscriptionMessage(subscriptionStatus?: string | null, paymentStatus?: string | null) {
  if (paymentStatus === 'failed' || subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') {
    return {
      title: 'Payment needs attention',
      copy: 'Your receptionist is paused until the payment issue is resolved. Please update your billing details or contact support so calls are not missed.',
    };
  }

  if (paymentStatus === 'canceled' || subscriptionStatus === 'canceled') {
    return {
      title: 'Subscription canceled',
      copy: 'Your receptionist is paused because this subscription has ended. Contact support to reactivate call handling for this business.',
    };
  }

  return null;
}

export default function SettingsPage() {
  const animRef = useScrollAnimation();
  const [clientId, setClientId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ClientSettings>>({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [calConnecting, setCalConnecting] = useState(false);
  const [calJustConnected, setCalJustConnected] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Raw textarea state — avoids filter(Boolean) stripping blank lines mid-type
  const [servicesRaw, setServicesRaw] = useState('');
  const [serviceAreasRaw, setServiceAreasRaw] = useState('');

  // Show a success banner after returning from the Google OAuth redirect
  // (server redirects to /settings?connected=google&clientId=...).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'google') {
      setCalJustConnected(true);
      // Strip the query params so a refresh doesn't re-trigger the banner.
      window.history.replaceState({}, '', window.location.pathname);
      const timer = setTimeout(() => setCalJustConnected(false), 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoadError(null);
      setActionError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        setLoadError('Could not verify your session. Please refresh and try again.');
        setLoading(false);
        return;
      }

      if (!user?.email) {
        setLoadError('Could not find your account details. Please sign in again.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('clients')
        .select('id, business_name, owner_name, owner_email, owner_mobile, twilio_number, own_number, google_cal_id, subscription_status, payment_status, plan')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (error) {
        setLoadError('We could not load your settings right now. Please try again shortly.');
        setLoading(false);
        return;
      }

      if (!data) {
        setLoadError('We could not find a business profile for this account yet.');
        setLoading(false);
        return;
      }

      const { data: configData, error: configError } = await supabase
        .from('business_config')
        .select('after_hours_message, receptionist_name, receptionist_tone, services, service_areas, business_hours_start, business_hours_end, working_days, avg_job_value, system_prompt_override')
        .eq('client_id', data.id)
        .maybeSingle();

      setClientId(data.id);
      setForm({
        business_name: data.business_name ?? '',
        owner_name: data.owner_name ?? '',
        owner_email: data.owner_email ?? '',
        owner_mobile: data.owner_mobile ?? '',
        twilio_number: data.twilio_number ?? null,
        own_number: data.own_number ?? null,
        subscription_status: data.subscription_status ?? null,
        payment_status: data.payment_status ?? null,
        after_hours_message: configData?.after_hours_message ?? '',
        google_cal_id: data.google_cal_id ?? '',
        google_cal_connected: !!data.google_cal_id,
        receptionist_name: configData?.receptionist_name ?? '',
        receptionist_tone: (configData?.receptionist_tone as ReceptionistTone | undefined) ?? 'friendly',
        services: configData?.services ?? [],
        service_areas: configData?.service_areas ?? [],
        business_hours_start: configData?.business_hours_start ? configData.business_hours_start.slice(0, 5) : null,
        business_hours_end: configData?.business_hours_end ? configData.business_hours_end.slice(0, 5) : null,
        working_days: configData?.working_days ?? [1, 2, 3, 4, 5],
        avg_job_value: String(configData?.avg_job_value ?? 250),
        plan: (data.plan as Plan) ?? 'starter',
        system_prompt_override: configData?.system_prompt_override ?? '',
      });
      // Initialise raw textarea strings from loaded arrays
      setServicesRaw((configData?.services ?? []).join('\n'));
      setServiceAreasRaw((configData?.service_areas ?? []).join('\n'));
      setConfigLoaded(!configError && !!configData);

      if (configError) {
        setLoadError('Your main settings loaded, but receptionist configuration could not be loaded. Some fields will be read-only.');
      }

      setLoading(false);
    }

    load();
  }, []);

  function set(key: keyof ClientSettings, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!clientId) return;

    setSaving(true);
    setActionError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setActionError('Your session has expired. Please sign in again before saving.');
        return;
      }

      const res = await fetch(`/api/clients/${clientId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          business_name: form.business_name ?? '',
          owner_name: form.owner_name ?? '',
          owner_mobile: form.owner_mobile || null,
          ...(configLoaded ? {
            after_hours_message: form.after_hours_message || null,
            receptionist_name: form.receptionist_name || undefined,
            receptionist_tone: form.receptionist_tone,
            services: servicesRaw.split('\n').map(s => s.trim()).filter(Boolean),
            service_areas: serviceAreasRaw.split('\n').map(s => s.trim()).filter(Boolean),
            business_hours_start: form.business_hours_start || null,
            business_hours_end: form.business_hours_end || null,
            working_days: form.working_days,
            avg_job_value: form.avg_job_value ? parseInt(form.avg_job_value, 10) || null : null,
            system_prompt_override: form.system_prompt_override.trim() || null,
          } : {}),
        }),
      });

      const json = await res.json().catch(() => ({ success: false, error: 'Could not save your settings.' }));

      if (!res.ok || !json.success) {
        setActionError(json.error ?? 'Your changes could not be saved. Please try again.');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setActionError('Could not reach the settings service. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function connectGoogleCalendar() {
    if (!clientId) {
      setActionError('Your settings are not fully loaded yet. Please refresh and try again.');
      return;
    }

    setCalConnecting(true);
    setActionError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setActionError('Your session has expired. Please sign in again before connecting Google Calendar.');
        setCalConnecting(false);
        return;
      }

      const res = await fetch(`/api/auth/google?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();

      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
        return;
      }

      setActionError(json.error ?? 'Could not start the Google Calendar connection.');
      setCalConnecting(false);
    } catch {
      setActionError('Could not reach the calendar connection service. Please try again.');
      setCalConnecting(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setActionError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setActionError('Your session has expired. Please sign in again before accessing billing.');
        setPortalLoading(false);
        return;
      }

      const res = await fetch('/api/billing/portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Could not open billing portal.' }));

      if (!res.ok || !json.success) {
        setActionError(json.error ?? 'Could not open the billing portal. Please try again.');
        setPortalLoading(false);
        return;
      }

      window.location.href = json.data.url;
    } catch {
      setActionError('Could not reach the billing service. Please try again.');
      setPortalLoading(false);
    }
  }

  const isKeepExisting = !!form.own_number && !!form.twilio_number;
  const activationCode = isKeepExisting ? buildActivationCode(form.twilio_number!) : null;
  const subscriptionAlert = subscriptionMessage(form.subscription_status, form.payment_status);

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-4 animate-pulse">
          {[0, 1, 2].map(index => (
            <div key={index} className="h-44 rounded-[28px] bg-white/[0.04]" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (loadError && !clientId) {
    return (
      <DashboardShell>
        <section
          className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
          style={{
            background:
              'radial-gradient(circle at 86% 18%, rgba(255,107,43,0.12) 0%, transparent 30%),' +
              'linear-gradient(180deg, rgba(17,31,53,0.92) 0%, rgba(10,23,39,0.96) 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 28px 64px rgba(2,13,24,0.30)',
          }}
        >
          <div
            className="rounded-[22px] px-4 py-4"
            role="alert"
            style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="mt-0.5 text-orange-soft" aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold text-offwhite">Settings unavailable</p>
                <p className="mt-1 text-[12px] leading-relaxed text-orange-soft/86">{loadError}</p>
              </div>
            </div>
          </div>
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div ref={animRef}>
        <article
          className="mb-5 overflow-hidden rounded-[32px] px-6 py-6 sm:px-7 sm:py-7"
          style={{
            background:
              'radial-gradient(circle at 88% 18%, rgba(255,107,43,0.12) 0%, transparent 30%),' +
              'linear-gradient(180deg, rgba(17,31,53,0.94) 0%, rgba(9,22,38,0.98) 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 30px 70px rgba(2,13,24,0.36), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[58ch]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-soft/90">Settings</p>
              <h1 className="mt-2.5 font-display text-[clamp(1.7rem,2.6vw,2.3rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-offwhite">
                Keep your receptionist aligned with your business.
              </h1>
              <p className="mt-2.5 max-w-[52ch] text-[13.5px] leading-relaxed text-offwhite/48">
                How it introduces your business, routes follow-up, and books your diary.
              </p>
            </div>
          </div>
        </article>

        {subscriptionAlert ? (
          <div
            data-testid="subscription-status-banner"
            role="alert"
            className="mb-5 rounded-[24px] px-5 py-4"
            style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.22)' }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={17} className="mt-0.5 text-orange-soft" aria-hidden="true" />
              <div>
                <p className="text-[14px] font-semibold text-offwhite">{subscriptionAlert.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-orange-soft/88">{subscriptionAlert.copy}</p>
              </div>
            </div>
          </div>
        ) : null}

        {calJustConnected ? (
          <div
            data-testid="calendar-connected-banner"
            role="status"
            className="mb-5 rounded-[24px] px-5 py-4"
            style={{ background: 'rgba(34,197,94,0.08)', boxShadow: '0 0 0 1px rgba(34,197,94,0.22)' }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle size={17} className="mt-0.5 text-status-success" aria-hidden="true" />
              <div>
                <p className="text-[14px] font-semibold text-offwhite">Google Calendar connected</p>
                <p className="mt-1 text-[12px] leading-relaxed text-offwhite/56">
                  Your receptionist can now check availability and book work straight into your diary.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <form onSubmit={handleSave} className="space-y-5">
              <SettingsSection
                title="Business details"
                icon={User}
                description="The core identity Trade Receptionist uses when speaking to callers and sending follow-up context back to you."
              >
                <div className="grid gap-4">
                  <LabeledField
                    label="Business name"
                    name="business_name"
                    value={form.business_name ?? ''}
                    onChange={value => set('business_name', value)}
                    placeholder="Mark Thomas Plumbing"
                  />
                  <LabeledField
                    label="Your name"
                    name="owner_name"
                    value={form.owner_name ?? ''}
                    onChange={value => set('owner_name', value)}
                    placeholder="Mark Thomas"
                  />
                  <LabeledField label="Email" name="owner_email" value={form.owner_email ?? ''} readOnly />
                </div>
              </SettingsSection>

              <SettingsSection
                title="Phone and messaging"
                icon={Phone}
                description="Keep the live hand-off clean so missed calls, summaries, and diversions land exactly where they should."
              >
                <div className="grid gap-4">
                  <LabeledField
                    label="Your mobile for SMS alerts"
                    name="owner_mobile"
                    value={form.owner_mobile ?? ''}
                    onChange={value => set('owner_mobile', value)}
                    placeholder="+44 7700 900000"
                  />

                  {form.twilio_number ? (
                    <LabeledField
                      label="AI receptionist number"
                      name="twilio_number"
                      value={form.twilio_number}
                      readOnly
                      hint={
                        isKeepExisting
                          ? 'This is the backend number your AI uses while callers continue ringing your usual business number.'
                          : 'This is the number callers ring directly to reach your AI receptionist.'
                      }
                    />
                  ) : null}

                  {form.own_number ? (
                    <LabeledField
                      label="Your existing number"
                      name="own_number"
                      value={form.own_number}
                      readOnly
                      hint="Callers ring this number first. Your carrier diverts missed calls to your AI receptionist automatically."
                    />
                  ) : null}

                  {isKeepExisting && activationCode ? (
                    <div
                      className="rounded-[20px] px-4 py-4"
                      style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-soft">Divert activation code</p>
                      <code className="mt-3 block break-all font-mono text-[18px] tracking-[0.16em] text-offwhite">{activationCode}</code>
                      <p className="mt-3 text-[12px] leading-relaxed text-orange-soft/86">
                        Dial this on your mobile and press call once to switch your missed-call diversion on. That keeps your receptionist covering you automatically.
                      </p>
                    </div>
                  ) : null}
                </div>
              </SettingsSection>

              <SettingsSection
                title="After-hours message"
                icon={Bell}
                description="Set the tone callers hear when they reach you outside working hours while still capturing the enquiry properly."
              >
                <label htmlFor="after_hours_message" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                  Custom message
                </label>
                <textarea
                  id="after_hours_message"
                  value={form.after_hours_message ?? ''}
                  onChange={event => set('after_hours_message', event.target.value)}
                  disabled={!configLoaded}
                  rows={4}
                  placeholder="We're closed right now, but your AI receptionist has taken full details of your enquiry and we'll follow up as soon as we're back on the tools."
                  className="w-full resize-none rounded-[18px] bg-white/[0.05] px-4 py-3 text-[14px] font-body text-offwhite placeholder:text-offwhite/24 outline-none transition-[box-shadow,background-color] duration-200 ease-standard focus:ring-2 focus:ring-orange/40"
                  style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                />
                {!configLoaded ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-offwhite/38">
                    This message is temporarily unavailable until your full business settings finish loading.
                  </p>
                ) : null}
              </SettingsSection>

              <SettingsSection
                title="Receptionist profile"
                icon={Bot}
                description="Personalise how your AI receptionist introduces itself and communicates with callers."
              >
                <div className="grid gap-4">
                  <LabeledField
                    label="Receptionist name"
                    name="receptionist_name"
                    value={form.receptionist_name ?? ''}
                    onChange={value => set('receptionist_name', value)}
                    placeholder="Alex"
                    hint="The name callers hear when they ring. Leave blank to keep the current name."
                  />
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Tone of voice</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['friendly', 'professional', 'efficient'] as ReceptionistTone[]).map(tone => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, receptionist_tone: tone }))}
                          aria-pressed={form.receptionist_tone === tone}
                          className="min-h-[44px] rounded-[16px] px-3 py-2.5 text-[13px] font-semibold capitalize transition-[background-color,color,box-shadow,transform] duration-300 ease-mechanical active:scale-[0.98]"
                          style={
                            form.receptionist_tone === tone
                              ? { background: 'rgba(255,107,43,0.14)', boxShadow: '0 0 0 1.5px rgba(255,107,43,0.40)', color: '#ffb59a' }
                              : { background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)', color: 'rgba(240,244,248,0.52)' }
                          }
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-offwhite/38">
                      {form.receptionist_tone === 'friendly' && 'Warm and conversational — great for domestic trades and repeat customers.'}
                      {form.receptionist_tone === 'professional' && 'Measured and formal — well suited to commercial clients and larger projects.'}
                      {form.receptionist_tone === 'efficient' && 'Direct and focused — captures the job details fast so you can call back quickly.'}
                    </p>
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                title="Services and coverage"
                icon={Wrench}
                description="Tell your receptionist exactly what work you take on and where you cover, so it only accepts relevant enquiries."
              >
                <div className="grid gap-4">
                  <div>
                    <label htmlFor="services" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                      Services offered
                    </label>
                    <textarea
                      id="services"
                      value={servicesRaw}
                      onChange={event => setServicesRaw(event.target.value)}
                      disabled={!configLoaded}
                      rows={4}
                      placeholder={"Boiler servicing and repairs\nCentral heating installation\nEmergency call-outs\nLandlord gas safety checks"}
                      className="w-full resize-none rounded-[18px] bg-white/[0.05] px-4 py-3 text-[14px] font-body text-offwhite placeholder:text-offwhite/24 outline-none transition-[box-shadow,background-color] duration-200 ease-standard focus:ring-2 focus:ring-orange/40"
                      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                    />
                    <p className="mt-2 text-[12px] leading-relaxed text-offwhite/38">One service per line. Your receptionist uses this list to qualify enquiries.</p>
                  </div>
                  <div>
                    <label htmlFor="service_areas" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                      Areas covered
                    </label>
                    <textarea
                      id="service_areas"
                      value={serviceAreasRaw}
                      onChange={event => setServiceAreasRaw(event.target.value)}
                      disabled={!configLoaded}
                      rows={3}
                      placeholder={"Birmingham\nCoventry\nSolihull"}
                      className="w-full resize-none rounded-[18px] bg-white/[0.05] px-4 py-3 text-[14px] font-body text-offwhite placeholder:text-offwhite/24 outline-none transition-[box-shadow,background-color] duration-200 ease-standard focus:ring-2 focus:ring-orange/40"
                      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                    />
                    <p className="mt-2 text-[12px] leading-relaxed text-offwhite/38">One town or postcode area per line.</p>
                  </div>
                  <LabeledField
                    label="Average job value (£)"
                    name="avg_job_value"
                    value={form.avg_job_value ?? '250'}
                    onChange={value => set('avg_job_value', value.replace(/[^0-9]/g, ''))}
                    type="text"
                    inputMode="numeric"
                    placeholder="250"
                    hint="Used to calculate estimated missed revenue on your dashboard. Set to your typical job value in £."
                  />
                </div>
              </SettingsSection>

              {(form.plan === 'business' || form.plan === 'agency') && (
                <SettingsSection
                  title="Advanced instructions"
                  icon={Key}
                  description="Add extra instructions that are appended to the end of your receptionist's prompt. Use this to handle edge cases specific to your business."
                >
                  <div>
                    <label htmlFor="system_prompt_override" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                      Custom instructions
                    </label>
                    <textarea
                      id="system_prompt_override"
                      rows={6}
                      maxLength={2000}
                      value={form.system_prompt_override}
                      onChange={event => set('system_prompt_override', event.target.value)}
                      placeholder={"Example: If a caller mentions they're an existing customer, skip asking for their number and just confirm the job details."}
                      className="w-full resize-y rounded-[16px] px-4 py-3 text-[14px] leading-relaxed text-offwhite/80 placeholder:text-offwhite/22 focus:outline-none focus:ring-1 focus:ring-orange/40 min-h-[44px]"
                      style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                    />
                    <p className="mt-2 text-[12px] leading-relaxed text-offwhite/38">
                      These instructions are appended after the core prompt. Maximum 2,000 characters.{' '}
                      {form.system_prompt_override.length > 0 && (
                        <span className={form.system_prompt_override.length > 1800 ? 'text-orange-soft' : ''}>
                          {form.system_prompt_override.length}/2000
                        </span>
                      )}
                    </p>
                  </div>
                </SettingsSection>
              )}

              <SettingsSection
                title="Working hours"
                icon={Clock}
                description="Set your opening times and working days so your receptionist knows when to treat calls as after-hours."
              >
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="business_hours_start" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                        Opens
                      </label>
                      <input
                        id="business_hours_start"
                        type="time"
                        value={form.business_hours_start ?? ''}
                        onChange={event => setForm(prev => ({ ...prev, business_hours_start: event.target.value || null }))}
                        disabled={!configLoaded}
                        className="min-h-[50px] w-full rounded-[18px] bg-white/[0.05] px-4 py-3 text-[14px] text-offwhite outline-none transition-[box-shadow,background-color] duration-200 ease-standard focus:ring-2 focus:ring-orange/40"
                        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="business_hours_end" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">
                        Closes
                      </label>
                      <input
                        id="business_hours_end"
                        type="time"
                        value={form.business_hours_end ?? ''}
                        onChange={event => setForm(prev => ({ ...prev, business_hours_end: event.target.value || null }))}
                        disabled={!configLoaded}
                        className="min-h-[50px] w-full rounded-[18px] bg-white/[0.05] px-4 py-3 text-[14px] text-offwhite outline-none transition-[box-shadow,background-color] duration-200 ease-standard focus:ring-2 focus:ring-orange/40"
                        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/34">Working days</p>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                        const active = (form.working_days ?? []).includes(index);
                        return (
                          <button
                            key={day}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setForm(prev => {
                              const days = prev.working_days ?? [];
                              return {
                                ...prev,
                                working_days: active ? days.filter(d => d !== index) : [...days, index].sort((a, b) => a - b),
                              };
                            })}
                            className="min-h-[44px] w-[52px] rounded-[14px] text-[13px] font-semibold transition-[background-color,color,box-shadow,transform] duration-300 ease-mechanical active:scale-[0.98]"
                            style={
                              active
                                ? { background: 'rgba(255,107,43,0.14)', boxShadow: '0 0 0 1.5px rgba(255,107,43,0.40)', color: '#ffb59a' }
                                : { background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)', color: 'rgba(240,244,248,0.40)' }
                            }
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                title="Google Calendar"
                icon={Calendar}
                description="Give Trade Receptionist live diary awareness so it can check availability and help move callers into real appointments."
              >
                {form.google_cal_connected ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-3 rounded-[18px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                      <CheckCircle size={15} className="text-status-success" aria-hidden="true" />
                      <span className="text-[14px] font-semibold text-offwhite/74">Calendar connected</span>
                      <span className="truncate text-[12px] text-offwhite/34">{form.google_cal_id}</span>
                    </div>
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={connectGoogleCalendar}
                        disabled={calConnecting}
                      >
                        <Key size={13} aria-hidden="true" />
                        {calConnecting ? 'Redirecting…' : 'Re-connect'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[13px] leading-relaxed text-offwhite/48">
                      Sign in with Google to connect your calendar automatically. Once connected, Trade Receptionist can check availability and book work directly into your diary.
                    </p>
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={connectGoogleCalendar}
                        disabled={calConnecting}
                      >
                        <Key size={14} aria-hidden="true" />
                        {calConnecting ? 'Redirecting to Google…' : 'Connect Google Calendar'}
                      </Button>
                    </div>
                  </div>
                )}
              </SettingsSection>

              {actionError ? (
                <div
                  className="rounded-[20px] px-4 py-4"
                  role="alert"
                  style={{ background: 'rgba(255,107,43,0.08)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle size={15} className="mt-0.5 text-orange-soft" aria-hidden="true" />
                    <p className="text-[12px] leading-relaxed text-orange-soft/86">{actionError}</p>
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={saving}
                variant={saved ? 'secondary' : 'primary'}
                data-testid="settings-save-button"
              >
                <Save size={14} aria-hidden="true" />
                <span data-testid="settings-save-status">
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
                </span>
              </Button>
            </form>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <div
              className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
              style={{
                background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">Billing</p>
              <h2 className="mt-3 font-display text-[22px] font-bold tracking-[-0.04em] text-offwhite">Manage your plan</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-offwhite/46">
                Update your payment method, download invoices, or change your plan — all from the Stripe billing portal.
              </p>
              <div className="mt-5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                >
                  <CreditCard size={14} aria-hidden="true" />
                  {portalLoading ? 'Opening portal…' : 'Manage billing'}
                </Button>
              </div>
            </div>

            <div
              className="rounded-[30px] px-6 py-6 sm:px-7 sm:py-7"
              style={{
                background: 'linear-gradient(180deg, rgba(17,31,53,0.88) 0%, rgba(10,23,39,0.94) 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(2,13,24,0.26)',
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">Live setup status</p>
              <h2 className="mt-3 font-display text-[24px] font-bold tracking-[-0.04em] text-offwhite">What this controls</h2>
              <p className="mt-4 text-[14px] leading-relaxed text-offwhite/48">
                These settings don't change your backend workflows. They refine how the receptionist presents your business, routes follow-up, and plugs into the tools you already use.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    title: 'Business identity',
                    copy: 'Caller-facing naming and ownership details stay clear and trustworthy.',
                  },
                  {
                    title: 'Call diversion readiness',
                    copy: isKeepExisting
                      ? 'Your diversion setup is configured around your existing business number.'
                      : 'Your receptionist number is set up for direct inbound handling.',
                  },
                  {
                    title: 'Diary connection',
                    copy: form.google_cal_connected
                      ? 'Calendar access is connected and available for booking support.'
                      : 'Calendar booking is available once you complete the Google connection.',
                  },
                ].map(item => (
                  <div
                    key={item.title}
                    className="rounded-[20px] bg-white/[0.04] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  >
                    <p className="text-[13px] font-semibold text-offwhite/76">{item.title}</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-offwhite/42">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}
