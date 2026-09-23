/**
 * Connecting the tenant's diary.
 *
 * Shared by the onboarding wizard and the Settings page, because the reason this
 * feature had zero adoption was that it existed in exactly one place nobody
 * visits. Of five tenants only the founder's own test account has ever connected
 * a calendar.
 *
 * The design point is the first question. Previously the tenant had to work out
 * for themselves that "Google Calendar" was the thing they needed, on a Settings
 * page they had no reason to open. Asking "where do you keep your diary?" in
 * their own words, with the iPhone answer being a legitimate choice rather than
 * an unsupported one, is the whole difference.
 *
 * The iPhone branch matters most. An iPhone is not a calendar service — the data
 * behind the iOS Calendar app is Google, Outlook or iCloud depending on the
 * account. Both paying customers are on Google *through* an iPhone, so asking
 * which email backs it routes the common case to the one-tap flow and leaves the
 * app-specific password to genuine iCloud diaries only.
 */
import { useState, type ElementType } from 'react';
import {
  ArrowLeft, Calendar, CalendarCheck, CalendarX, ExternalLink,
  Loader2, Mail, Smartphone, TriangleAlert,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CalendarProvider } from '../../../shared/types';

type Screen = 'choose' | 'iphone' | 'apple' | 'done';

export interface DiaryConnectProps {
  clientId: string;
  /** Which provider is already connected, if any. */
  connectedProvider?: CalendarProvider | null;
  /** True when the provider has rejected the stored credential. */
  needsReconnect?: boolean;
  /** Onboarding only — lets the tenant move on without a diary. */
  onSkip?: () => void;
  /**
   * Fired only for CalDAV, which is the one flow that completes in-page. Google
   * and Microsoft leave for a consent screen and come back through a redirect,
   * so the caller learns about those by re-reading the client row.
   */
  onConnected?: (provider: CalendarProvider) => void;
}

const PROVIDER_LABEL: Record<CalendarProvider, string> = {
  google: 'Google Calendar',
  microsoft: 'Outlook Calendar',
  caldav: 'Apple Calendar',
};

/** Apple renamed this from appleid.apple.com; both resolve, this is current. */
const APPLE_PASSWORD_URL = 'https://account.apple.com/account/manage';

async function accessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function OptionButton({
  icon: Icon, title, detail, onClick, disabled,
}: {
  icon: ElementType;
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="
        group flex w-full items-center gap-4 rounded-card
        bg-white/[0.06] px-5 py-4 text-left backdrop-blur-[24px]
        shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(2,13,24,0.3)]
        transition-all duration-300 ease-mechanical
        hover:-translate-y-0.5 hover:bg-white/[0.1]
        hover:shadow-[0_0_0_1px_rgba(255,107,43,0.2),0_8px_32px_rgba(2,13,24,0.4)]
        disabled:pointer-events-none disabled:opacity-50
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]
      "
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-high/70 text-accent">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-body text-[15px] font-semibold text-offwhite">{title}</span>
        <span className="block font-body text-[13px] leading-[1.5] text-offwhite/58">{detail}</span>
      </span>
    </button>
  );
}

export default function DiaryConnect({
  clientId, connectedProvider = null, needsReconnect = false, onSkip, onConnected,
}: DiaryConnectProps) {
  const [screen, setScreen] = useState<Screen>(connectedProvider && !needsReconnect ? 'done' : 'choose');
  const [busy, setBusy] = useState<CalendarProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleId, setAppleId] = useState('');
  const [applePassword, setApplePassword] = useState('');
  const [connectedName, setConnectedName] = useState<string | null>(null);
  // The prop reflects what the server said when the page loaded. A CalDAV
  // connect completes in-page, so track it locally too or the success panel
  // names no provider at all.
  const [justConnected, setJustConnected] = useState<CalendarProvider | null>(null);

  /** Google and Microsoft: fetch the consent URL, then hand over the browser. */
  async function startOAuth(provider: 'google' | 'microsoft') {
    setBusy(provider);
    setError(null);

    try {
      const token = await accessToken();
      if (!token) {
        setError('Your session has expired. Please sign in again, then reconnect.');
        setBusy(null);
        return;
      }

      const res = await fetch(`/api/auth/${provider}?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success?: boolean; data?: { url?: string }; error?: string };

      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      setError(json.error ?? `Could not start the ${PROVIDER_LABEL[provider]} connection.`);
    } catch {
      setError('Could not reach the connection service. Please try again.');
    }
    setBusy(null);
  }

  async function connectApple() {
    setBusy('caldav');
    setError(null);

    try {
      const token = await accessToken();
      if (!token) {
        setError('Your session has expired. Please sign in again, then reconnect.');
        setBusy(null);
        return;
      }

      const res = await fetch('/api/auth/caldav', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, appleId: appleId.trim(), appPassword: applePassword.trim() }),
      });
      const json = await res.json() as {
        success?: boolean; data?: { calendarName?: string | null }; error?: string;
      };

      if (json.success) {
        setConnectedName(json.data?.calendarName ?? null);
        setJustConnected('caldav');
        setScreen('done');
        onConnected?.('caldav');
        setBusy(null);
        return;
      }
      setError(json.error ?? 'Apple would not accept those details.');
    } catch {
      setError('Could not reach Apple to check those details. Please try again.');
    }
    setBusy(null);
  }

  // ── Connected ───────────────────────────────────────────────────────────────

  if (screen === 'done') {
    const provider = justConnected ?? connectedProvider;
    const label = provider ? PROVIDER_LABEL[provider] : 'Your diary';
    return (
      <div className="rounded-card bg-white/[0.06] p-6 backdrop-blur-[24px] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
        <div className="flex items-start gap-3">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="font-body text-[15px] font-semibold text-offwhite">
              {label} is connected
            </p>
            <p className="mt-1 font-body text-[13px] leading-[1.6] text-offwhite/70">
              {connectedName ? `Booking into "${connectedName}". ` : ''}
              Your receptionist can now check when you are free and book jobs straight into your diary.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Apple app-specific password ─────────────────────────────────────────────

  if (screen === 'apple') {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => { setScreen('iphone'); setError(null); }}
          className="inline-flex min-h-[44px] items-center gap-2 font-body text-[13px] text-accent
                     transition-colors duration-200 hover:text-accent-glow
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </button>

        <div>
          <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-offwhite">
            Connect your iCloud diary
          </h3>
          <p className="mt-2 max-w-[60ch] font-body text-[14px] leading-[1.65] text-offwhite/70">
            Apple does not offer a one-tap sign-in for calendars, so this takes a minute.
            You will create a one-off password just for us — your real Apple password is
            never shared, and you can revoke this at any time.
          </p>
        </div>

        <ol className="space-y-3">
          {[
            <>Open <a href={APPLE_PASSWORD_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent underline decoration-accent/40 underline-offset-2 hover:text-accent-glow">
              account.apple.com <ExternalLink className="size-3.5" aria-hidden="true" />
            </a> and sign in.</>,
            <>Go to <span className="text-offwhite">Sign-In and Security</span>, then <span className="text-offwhite">App-Specific Passwords</span>.</>,
            <>Create one and call it <span className="text-offwhite">Trade Receptionist</span>.</>,
            <>Copy the password Apple shows you and paste it below.</>,
          ].map((text, index) => (
            <li key={index} className="flex gap-3 font-body text-[14px] leading-[1.6] text-offwhite/70">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-high/70 font-mono text-[11px] text-accent">
                {index + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block font-body text-[12px] font-semibold uppercase tracking-[0.1em] text-offwhite/58">
              Apple ID
            </span>
            <input
              type="email"
              value={appleId}
              onChange={(event) => setAppleId(event.target.value)}
              placeholder="you@icloud.com"
              autoComplete="username"
              className="w-full rounded-xl bg-navy-mid/80 px-4 py-3 font-body text-[15px] text-offwhite
                         shadow-[0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-offwhite/40
                         focus:outline focus:outline-2 focus:outline-orange focus:outline-offset-[2px]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-body text-[12px] font-semibold uppercase tracking-[0.1em] text-offwhite/58">
              App-specific password
            </span>
            <input
              type="password"
              value={applePassword}
              onChange={(event) => setApplePassword(event.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              autoComplete="one-time-code"
              className="w-full rounded-xl bg-navy-mid/80 px-4 py-3 font-mono text-[15px] text-offwhite
                         shadow-[0_0_0_1px_rgba(255,255,255,0.1)] placeholder:text-offwhite/40
                         focus:outline focus:outline-2 focus:outline-orange focus:outline-offset-[2px]"
            />
          </label>
        </div>

        {error && (
          <p className="flex items-start gap-2 font-body text-[13px] leading-[1.6] text-orange-soft">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={connectApple}
          disabled={busy !== null || !appleId.trim() || !applePassword.trim()}
          className="
            inline-flex min-h-[48px] items-center gap-2.5 rounded-button
            bg-gradient-to-r from-orange to-orange-glow px-7 py-4
            font-body text-[15px] font-semibold tracking-[-0.01em] text-void
            shadow-orange-glow transition-all duration-300 ease-mechanical
            hover:-translate-y-0.5 hover:shadow-orange-glow-lg active:translate-y-0
            disabled:pointer-events-none disabled:opacity-50
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]
          "
        >
          {busy === 'caldav' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy === 'caldav' ? 'Checking with Apple…' : 'Connect My Diary'}
        </button>
      </div>
    );
  }

  // ── Which account backs the iPhone ──────────────────────────────────────────

  if (screen === 'iphone') {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => { setScreen('choose'); setError(null); }}
          className="inline-flex min-h-[44px] items-center gap-2 font-body text-[13px] text-accent
                     transition-colors duration-200 hover:text-accent-glow
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </button>

        <div>
          <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-offwhite">
            Which email is on your iPhone?
          </h3>
          <p className="mt-2 max-w-[60ch] font-body text-[14px] leading-[1.65] text-offwhite/70">
            Your iPhone shows the diary, but it is stored under one of these accounts.
            Pick the email you use and we will connect the right one.
          </p>
        </div>

        <div className="space-y-3">
          <OptionButton
            icon={Mail}
            title="Gmail"
            detail="Anything ending @gmail.com — one tap to connect"
            onClick={() => startOAuth('google')}
            disabled={busy !== null}
          />
          <OptionButton
            icon={Mail}
            title="Outlook, Hotmail or Live"
            detail="One tap to connect"
            onClick={() => startOAuth('microsoft')}
            disabled={busy !== null}
          />
          <OptionButton
            icon={Smartphone}
            title="iCloud"
            detail="Ending @icloud.com, @me.com or @mac.com — takes a minute longer"
            onClick={() => { setScreen('apple'); setError(null); }}
            disabled={busy !== null}
          />
        </div>

        {error && (
          <p className="flex items-start gap-2 font-body text-[13px] leading-[1.6] text-orange-soft">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── Where do you keep your diary? ───────────────────────────────────────────

  return (
    <div className="space-y-5">
      {needsReconnect && connectedProvider && (
        <div className="rounded-card bg-orange/[0.1] p-4 shadow-[0_0_0_1px_rgba(255,107,43,0.25)]">
          <p className="flex items-start gap-2 font-body text-[13px] leading-[1.6] text-orange-soft">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {PROVIDER_LABEL[connectedProvider]} has stopped accepting our access, so your
              receptionist cannot book jobs right now. Reconnect below to fix it.
            </span>
          </p>
        </div>
      )}

      <div>
        <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-offwhite">
          Where do you keep your diary?
        </h3>
        <p className="mt-2 max-w-[60ch] font-body text-[14px] leading-[1.65] text-offwhite/70">
          Connect it and your receptionist can see when you are free and book jobs
          straight in, while you are on the tools. Without it, it can still take a
          message — it just cannot book.
        </p>
      </div>

      <div className="space-y-3">
        <OptionButton
          icon={Calendar}
          title="Google Calendar"
          detail="Gmail, Google Workspace, or the calendar on most Android phones"
          onClick={() => startOAuth('google')}
          disabled={busy !== null}
        />
        <OptionButton
          icon={Mail}
          title="Outlook or Hotmail"
          detail="Outlook.com, Hotmail, Live, or Microsoft 365"
          onClick={() => startOAuth('microsoft')}
          disabled={busy !== null}
        />
        <OptionButton
          icon={Smartphone}
          title="My iPhone"
          detail="We will ask which email it uses — that is where the diary actually lives"
          onClick={() => { setScreen('iphone'); setError(null); }}
          disabled={busy !== null}
        />
        {onSkip && (
          <OptionButton
            icon={CalendarX}
            title="I don't keep one on my phone"
            detail="Skip for now — you will get every job by text and email instead"
            onClick={onSkip}
            disabled={busy !== null}
          />
        )}
      </div>

      {busy && (
        <p className="flex items-center gap-2 font-body text-[13px] text-offwhite/70">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Opening {PROVIDER_LABEL[busy]}…
        </p>
      )}

      {error && (
        <p className="flex items-start gap-2 font-body text-[13px] leading-[1.6] text-orange-soft">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
