import React, { useEffect, useState } from 'react';
import { Save, User, Phone, Bell, Calendar, Key, CheckCircle } from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell';
import { supabase } from '../lib/supabase';

interface ClientSettings {
  business_name:        string;
  owner_name:           string;
  owner_email:          string;
  owner_mobile:         string;
  twilio_number:        string | null;
  own_number:           string | null;
  after_hours_message:  string | null;
  google_cal_id:        string | null;
  google_cal_connected: boolean;
}

function buildActivationCode(twilioNumber: string): string {
  return `**004*${twilioNumber}#`;
}

function SettingsSection({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-card p-6 mb-5"
      style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <Icon size={15} className="text-orange" strokeWidth={2} />
        <h2 className="text-[15px] font-bold text-offwhite font-display">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label, name, value, onChange, type = 'text', placeholder = '', readOnly = false, hint,
}: {
  label: string; name: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean; hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body"
      >
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-[10px] text-[14px] font-body text-offwhite placeholder-offwhite/25 outline-none transition-all duration-200 focus:ring-1 focus:ring-orange/40"
        style={{
          background: readOnly ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
          cursor: readOnly ? 'default' : 'text',
          opacity: readOnly ? 0.6 : 1,
        }}
      />
      {hint && <p className="mt-1.5 text-[12px] text-offwhite/35 font-body leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [form, setForm]         = useState<Partial<ClientSettings>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
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
          business_name:        data.business_name ?? '',
          owner_name:           data.owner_name ?? '',
          owner_email:          data.owner_email ?? '',
          owner_mobile:         data.owner_mobile ?? '',
          twilio_number:        data.twilio_number ?? null,
          own_number:           data.own_number ?? null,
          after_hours_message:  data.after_hours_message ?? '',
          google_cal_id:        data.google_cal_id ?? '',
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    setSaving(true);

    await supabase.from('clients').update({
      business_name:       form.business_name,
      owner_name:          form.owner_name,
      owner_mobile:        form.owner_mobile,
      after_hours_message: form.after_hours_message || null,
      updated_at:          new Date().toISOString(),
    }).eq('id', clientId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function connectGoogleCalendar() {
    if (!clientId) return;
    setCalConnecting(true);
    const res  = await fetch(`/api/auth/google?clientId=${clientId}`);
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
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-card h-40" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-offwhite font-display tracking-tight">Settings</h1>
        <p className="text-[14px] text-offwhite/40 font-body mt-1">Manage your receptionist and account.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-xl">

        <SettingsSection title="Business details" icon={User}>
          <div className="space-y-4">
            <Field
              label="Business name" name="business_name"
              value={form.business_name ?? ''}
              onChange={v => set('business_name', v)}
              placeholder="Mark Thomas Plumbing"
            />
            <Field
              label="Your name" name="owner_name"
              value={form.owner_name ?? ''}
              onChange={v => set('owner_name', v)}
              placeholder="Mark Thomas"
            />
            <Field label="Email" name="owner_email" value={form.owner_email ?? ''} readOnly />
          </div>
        </SettingsSection>

        <SettingsSection title="Phone &amp; messaging" icon={Phone}>
          <div className="space-y-4">
            <Field
              label="Your mobile (for SMS alerts)" name="owner_mobile"
              value={form.owner_mobile ?? ''}
              onChange={v => set('owner_mobile', v)}
              placeholder="+44 7700 900000"
            />

            {form.twilio_number && (
              <Field
                label="AI receptionist number" name="twilio_number"
                value={form.twilio_number}
                readOnly
                hint={isKeepExisting
                  ? 'This is the backend number your AI uses — callers ring your existing number, not this one.'
                  : 'This is the number callers ring to reach your AI receptionist.'}
              />
            )}

            {form.own_number && (
              <Field
                label="Your existing number" name="own_number"
                value={form.own_number}
                readOnly
                hint="Callers ring this number. Your carrier diverts missed calls to your AI receptionist automatically."
              />
            )}

            {/* Activation code — only shown in keep_existing mode */}
            {isKeepExisting && activationCode && (
              <div>
                <label className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body">
                  Divert activation code
                </label>
                <div
                  className="flex items-center gap-3 px-3.5 py-3 rounded-[10px] bg-orange/[0.07] shadow-ring-orange"
                >
                  <code className="flex-1 text-[15px] font-mono text-orange tracking-widest select-all">
                    {activationCode}
                  </code>
                </div>
                <p className="mt-1.5 text-[12px] text-offwhite/35 font-body leading-relaxed">
                  Dial this code on your mobile and press call. Done once — your AI receptionist is active.
                  Works on EE, Vodafone, O2, Three, BT Mobile and Sky Mobile.
                </p>
              </div>
            )}
          </div>
        </SettingsSection>

        <SettingsSection title="After-hours message" icon={Bell}>
          <div>
            <label
              htmlFor="after_hours_message"
              className="block text-[12px] font-semibold text-offwhite/40 uppercase tracking-[0.07em] mb-1.5 font-body"
            >
              Custom after-hours message
            </label>
            <textarea
              id="after_hours_message"
              value={form.after_hours_message ?? ''}
              onChange={e => set('after_hours_message', e.target.value)}
              rows={3}
              placeholder="We're closed right now but your AI receptionist has taken full details of your enquiry…"
              className="w-full px-3.5 py-2.5 rounded-[10px] text-[14px] font-body text-offwhite placeholder-offwhite/25 outline-none resize-none transition-all duration-200 focus:ring-1 focus:ring-orange/40"
              style={{ background: 'rgba(255,255,255,0.06)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Google Calendar" icon={Calendar}>
          {form.google_cal_connected ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
                <span className="text-[14px] text-offwhite/70 font-body">Calendar connected</span>
                <span className="text-[12px] text-offwhite/30 font-body truncate">{form.google_cal_id}</span>
              </div>
              <button
                type="button"
                onClick={connectGoogleCalendar}
                disabled={calConnecting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-semibold font-body text-offwhite/40 transition-all duration-200 hover:text-offwhite/60 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <Key size={13} />
                {calConnecting ? 'Redirecting…' : 'Re-connect'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[13px] text-offwhite/50 font-body mb-4 leading-relaxed">
                Sign in with Google to connect your calendar automatically, or use the button below. Your AI receptionist will check availability and book jobs directly into your diary.
              </p>
              <button
                type="button"
                onClick={connectGoogleCalendar}
                disabled={calConnecting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn text-[14px] font-semibold font-body text-offwhite transition-all duration-200 hover:bg-white/[0.1] disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.08)', boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' }}
              >
                <Key size={14} />
                {calConnecting ? 'Redirecting to Google…' : 'Connect Google Calendar'}
              </button>
            </div>
          )}
        </SettingsSection>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-btn font-semibold text-[14px] text-white font-body transition-all duration-300 disabled:opacity-60 hover:-translate-y-0.5${saved ? '' : ' bg-gradient-to-r from-orange to-orange-glow shadow-orange-glow hover:shadow-orange-glow-lg'}`}
          style={saved ? { background: 'rgba(34,197,94,0.2)', boxShadow: '0 0 20px rgba(34,197,94,0.2)' } : undefined}
        >
          <Save size={14} />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>

      </form>
    </DashboardShell>
  );
}
