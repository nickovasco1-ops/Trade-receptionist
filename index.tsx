import * as Sentry from '@sentry/react';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Lenis from 'lenis';
import './index.css';
import App from './App';

// ─── Sentry (initialise before any render) ────────────────────────────────────
Sentry.init({
  dsn: 'https://b8748cc35c5e8e0c8fc3707e02ea5681@o4511297291288576.ingest.de.sentry.io/4511297348239440',
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // 20 % of transactions in production; 100 % locally for debugging
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/trade-receptionist-production\.up\.railway\.app/,
    /^https:\/\/api\.tradereceptionist\.com/,
  ],
  // 10 % of sessions recorded; 100 % on errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: true,
  enableLogs: true,
});

// Legal pages (lazy — public, no auth required)
const TermsPage      = React.lazy(() => import('./src/pages/legal/TermsPage'));
const PrivacyPage    = React.lazy(() => import('./src/pages/legal/PrivacyPage'));

// Dashboard pages (lazy — keeps homepage bundle unchanged)
const LoginPage      = React.lazy(() => import('./src/pages/LoginPage'));
const DashboardPage  = React.lazy(() => import('./src/pages/DashboardPage'));
const CallsPage      = React.lazy(() => import('./src/pages/CallsPage'));
const LeadsPage      = React.lazy(() => import('./src/pages/LeadsPage'));
const SettingsPage   = React.lazy(() => import('./src/pages/SettingsPage'));
const OnboardingPage = React.lazy(() => import('./src/pages/OnboardingPage'));
const WelcomePage    = React.lazy(() => import('./src/pages/WelcomePage'));

// Auth guard — simple: checks Supabase session cookie presence via storage
import { supabase } from './src/lib/supabase';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);

      // Auto-connect Google Calendar when user signs in with Google and grants calendar access
      if (
        _event === 'SIGNED_IN' &&
        session?.user?.app_metadata?.provider === 'google' &&
        session.provider_refresh_token &&
        session.user.email
      ) {
        fetch('/api/auth/google/save-calendar-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:                session.user.email,
            providerToken:        session.provider_token ?? undefined,
            providerRefreshToken: session.provider_refresh_token,
          }),
        }).catch(() => {});
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LenisInit() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return null;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

// React 19 error handlers — pipe all error types into Sentry automatically
ReactDOM.createRoot(rootElement, {
  onUncaughtError:    Sentry.reactErrorHandler(),
  onCaughtError:      Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* ── Marketing homepage ─────────────────────────────── */}
        <Route path="/" element={<><LenisInit /><App /></>} />

        {/* ── Auth ───────────────────────────────────────────── */}
        <Route path="/login" element={
          <React.Suspense fallback={null}>
            <LoginPage />
          </React.Suspense>
        } />

        {/* ── Dashboard (auth-gated) ──────────────────────────── */}
        <Route path="/dashboard" element={
          <RequireAuth>
            <React.Suspense fallback={null}>
              <DashboardPage />
            </React.Suspense>
          </RequireAuth>
        } />
        <Route path="/dashboard/calls" element={
          <RequireAuth>
            <React.Suspense fallback={null}>
              <CallsPage />
            </React.Suspense>
          </RequireAuth>
        } />
        <Route path="/dashboard/leads" element={
          <RequireAuth>
            <React.Suspense fallback={null}>
              <LeadsPage />
            </React.Suspense>
          </RequireAuth>
        } />
        <Route path="/settings" element={
          <RequireAuth>
            <React.Suspense fallback={null}>
              <SettingsPage />
            </React.Suspense>
          </RequireAuth>
        } />
        <Route path="/onboarding" element={
          <RequireAuth>
            <React.Suspense fallback={null}>
              <OnboardingPage />
            </React.Suspense>
          </RequireAuth>
        } />

        {/* ── Post-payment landing page (no auth required) ─────── */}
        <Route path="/welcome" element={
          <React.Suspense fallback={null}>
            <WelcomePage />
          </React.Suspense>
        } />

        {/* ── Legal pages (public) ────────────────────────────── */}
        <Route path="/terms" element={
          <React.Suspense fallback={null}>
            <TermsPage />
          </React.Suspense>
        } />
        <Route path="/privacy" element={
          <React.Suspense fallback={null}>
            <PrivacyPage />
          </React.Suspense>
        } />
      </Routes>

      {/* Vercel Analytics — auto-tracks page views across all routes */}
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>
);
