import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Lenis from 'lenis';
import './index.css';
import App from './App';

// Dashboard pages (lazy — keeps homepage bundle unchanged)
const LoginPage      = React.lazy(() => import('./src/pages/LoginPage'));
const DashboardPage  = React.lazy(() => import('./src/pages/DashboardPage'));
const CallsPage      = React.lazy(() => import('./src/pages/CallsPage'));
const LeadsPage      = React.lazy(() => import('./src/pages/LeadsPage'));
const SettingsPage   = React.lazy(() => import('./src/pages/SettingsPage'));
const OnboardingPage = React.lazy(() => import('./src/pages/OnboardingPage'));

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

ReactDOM.createRoot(rootElement).render(
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
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
