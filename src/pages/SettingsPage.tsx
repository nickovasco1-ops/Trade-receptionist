import { useEffect, useState } from 'react';
import type { ElementType, FormEvent, ReactNode } from 'react';
import { AlertCircle, Bell, Calendar, CheckCircle, Key, Phone, Save, ShieldCheck, User } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import DashboardShell from '../components/dashboard/DashboardShell';
import Button from '../components/dashboard/ui/Button';
import { supabase } from '../lib/supabase';

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
        name={name}
        value={value}
        readOnly={readOnly}
        onChange={event => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={`min-h-[50px] w-full rounded-[18px] px-4 py-3 text-[14px] text-offwhite placeholder:text-offwhite/24 outline-none transition-all duration-200 focus:ring-2 focus:ring-orange/40 ${
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
        .select('id, business_name, owner_name, owner_email, owner_mobile, twilio_number, own_number, google_cal_id, subscription_status, payment_status')
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
        .select('after_hours_message')
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
      });
      setConfigLoaded(!configError && !!configData);

      if (configError) {
        setLoadError('Your main settings loaded, but the after-hours message could not be loaded.');
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
          ...(configLoaded ? { after_hours_message: form.after_hours_message || null } : {}),
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
      <div ref={animRef} data-animate>
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
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Settings</p>
              <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,4rem)] font-bold leading-[0.94] tracking-[-0.05em] text-offwhite">
                Keep your receptionist aligned with how your business runs.
              </h1>
              <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-offwhite/52 sm:text-[16px]">
                These controls shape how your receptionist introduces your business, routes follow-up, and connects to your diary — without changing the core logic behind the product.
              </p>
            </div>
            <div className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}>
              Product controls
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {['Business identity', 'Phone & SMS routing', 'Diary connection'].map(item => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/70" style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
                <ShieldCheck size={13} className="text-orange-soft" aria-hidden="true" />
                {item}
              </span>
            ))}
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
                  className="w-full resize-none rounded-[18px] bg-white/[0.05] px-4 py-3 text-[14px] font-body text-offwhite placeholder:text-offwhite/24 outline-none transition-all duration-200 focus:ring-2 focus:ring-orange/40"
                  style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                />
                {!configLoaded ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-offwhite/38">
                    This message is temporarily unavailable until your full business settings finish loading.
                  </p>
                ) : null}
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

          <aside className="xl:sticky xl:top-6 xl:self-start">
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
