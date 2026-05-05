import { useEffect, useState } from 'react';
import type { ElementType, FormEvent, ReactNode } from 'react';
import { Bell, Calendar, CheckCircle, Key, Phone, Save, ShieldCheck, User } from 'lucide-react';
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

export default function SettingsPage() {
  const animRef = useScrollAnimation();
  const [clientId, setClientId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ClientSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [calConnecting, setCalConnecting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('clients')
        .select('id, business_name, owner_name, owner_email, owner_mobile, twilio_number, own_number, after_hours_message, google_cal_id')
        .eq('owner_email', user.email)
        .maybeSingle();

      if (data) {
        setClientId(data.id);
        setForm({
          business_name: data.business_name ?? '',
          owner_name: data.owner_name ?? '',
          owner_email: data.owner_email ?? '',
          owner_mobile: data.owner_mobile ?? '',
          twilio_number: data.twilio_number ?? null,
          own_number: data.own_number ?? null,
          after_hours_message: data.after_hours_message ?? '',
          google_cal_id: data.google_cal_id ?? '',
          google_cal_connected: !!data.google_cal_id,
        });
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

    await supabase.from('clients').update({
      business_name: form.business_name,
      owner_name: form.owner_name,
      owner_mobile: form.owner_mobile,
      after_hours_message: form.after_hours_message || null,
      updated_at: new Date().toISOString(),
    }).eq('id', clientId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function connectGoogleCalendar() {
    if (!clientId) return;
    setCalConnecting(true);
    const res = await fetch(`/api/auth/google?clientId=${clientId}`);
    const json = await res.json();
    if (json.success && json.data?.url) {
      window.location.href = json.data.url;
    } else {
      setCalConnecting(false);
    }
  }

  const isKeepExisting = !!form.own_number && !!form.twilio_number;
  const activationCode = isKeepExisting ? buildActivationCode(form.twilio_number!) : null;

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

  return (
    <DashboardShell>
      <div ref={animRef} data-animate>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Settings</p>
                  <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.8rem)] font-bold leading-[0.96] tracking-[-0.05em] text-offwhite">
                    Keep Sarah aligned with how your business runs.
                  </h1>
                  <p className="mt-4 text-[15px] leading-relaxed text-offwhite/50 sm:text-[16px]">
                    These controls shape your receptionist’s contact details, messaging, call diversion setup, and diary connection without changing the core flow behind the product.
                  </p>
                </div>
                <div
                  className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                  style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                >
                  Product controls
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  'Update business details',
                  'Manage SMS follow-up',
                  'Keep calendar booking ready',
                ].map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/70"
                    style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                  >
                    <ShieldCheck size={12} className="text-orange-soft" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </article>

            <form onSubmit={handleSave} className="space-y-5">
              <SettingsSection
                title="Business details"
                icon={User}
                description="The core identity Sarah uses when speaking to callers and sending follow-up context back to you."
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
                        Dial this on your mobile and press call once to switch your missed-call diversion on. That keeps Sarah covering you automatically.
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
                  rows={4}
                  placeholder="We're closed right now, but Sarah has taken full details of your enquiry and we’ll follow up as soon as we’re back on the tools."
                  className="w-full resize-none rounded-[18px] bg-white/[0.05] px-4 py-3 text-[14px] text-offwhite placeholder:text-offwhite/24 outline-none transition-all duration-200 focus:ring-2 focus:ring-orange/40"
                  style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                />
              </SettingsSection>

              <SettingsSection
                title="Google Calendar"
                icon={Calendar}
                description="Give Sarah live diary awareness so she can check availability and help move callers into real appointments."
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
                      Sign in with Google to connect your calendar automatically. Once connected, Sarah can check availability and book work directly into your diary.
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

              <Button type="submit" disabled={saving} variant={saved ? 'secondary' : 'primary'}>
                <Save size={14} aria-hidden="true" />
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
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
                These settings don’t change your backend workflows. They refine how the receptionist presents your business, routes follow-up, and plugs into the tools you already use.
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
