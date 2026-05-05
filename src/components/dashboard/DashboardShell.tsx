import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Phone, Users, Settings, LogOut,
  Menu, X, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../../components/Logo';

const NAV = [
  { label: 'Overview', suffix: '',         icon: LayoutDashboard },
  { label: 'Calls',    suffix: '/calls',   icon: Phone },
  { label: 'Leads',    suffix: '/leads',   icon: Users },
  { label: 'Settings', suffix: '/settings', icon: Settings },
];

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface DashboardShellProps {
  children: React.ReactNode;
  navBase?: string;
  preview?: boolean;
  previewEmail?: string;
}

export default function DashboardShell({
  children,
  navBase = '/dashboard',
  preview = false,
  previewEmail = 'preview@tradereceptionist.co.uk',
}: DashboardShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef  = useRef<HTMLElement>(null);

  useEffect(() => {
    if (preview) {
      setUserEmail(previewEmail);
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, [preview, previewEmail]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Focus management: send focus into drawer on open, restore on close
  useEffect(() => {
    if (mobileOpen) {
      drawerRef.current?.focus();
    } else {
      menuBtnRef.current?.focus();
    }
  }, [mobileOpen]);

  // ESC closes drawer
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  // Focus trap: keep Tab/Shift+Tab within the drawer
  function handleDrawerKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter(el => !(el as HTMLButtonElement).disabled);
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
    }
  }

  async function handleSignOut() {
    if (preview) {
      navigate('/');
      return;
    }

    await supabase.auth.signOut();
    navigate('/login');
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={['flex h-full flex-col', mobile ? 'p-6' : 'p-5'].join(' ')}>
      {/* Logo */}
      <div className="mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div
            className="rounded-[16px] px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.06)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <Logo className="h-6 w-auto" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">Operations</p>
            <p className="truncate text-[12px] text-offwhite/42">Trade Receptionist</p>
          </div>
        </Link>
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="text-offwhite/50 hover:text-offwhite transition-colors p-1 rounded-[8px] hover:bg-white/[0.05]"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <div className="mb-5 rounded-[22px] p-4" style={{ background: 'rgba(255,255,255,0.03)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent/72">Receptionist status</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange shadow-[0_0_14px_rgba(255,107,43,0.5)]" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-offwhite/76">Live and answering calls</span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-offwhite/42">
          Review what Sarah captured, act on new jobs quickly, and keep your trade calendar full.
        </p>
      </div>

      <div className="flex-1 space-y-1">
        {NAV.map(({ label, suffix, icon: Icon }) => {
          const href = suffix ? `${navBase}${suffix}` : navBase;
          const active = suffix
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === href;
          return (
            <Link
              key={href}
              to={href}
              onClick={() => setMobileOpen(false)}
              className={[
                'flex items-center gap-3 rounded-[16px] px-3.5 py-3 text-[14px] font-medium font-body transition-all duration-200',
                active
                  ? 'text-offwhite'
                  : 'text-offwhite/50 hover:text-offwhite/88 hover:bg-white/[0.04]',
              ].join(' ')}
              style={active ? {
                background: 'linear-gradient(180deg, rgba(255,107,43,0.12) 0%, rgba(255,107,43,0.06) 100%)',
                boxShadow: '0 0 0 1px rgba(255,107,43,0.22), 0 16px 32px rgba(2,13,24,0.20)',
              } : undefined}
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                style={{
                  background: active ? 'rgba(255,107,43,0.14)' : 'rgba(255,255,255,0.05)',
                  boxShadow: active ? '0 0 0 1px rgba(255,107,43,0.18)' : '0 0 0 1px rgba(255,255,255,0.07)',
                }}
              >
                <Icon size={15} strokeWidth={active ? 2.4 : 2} className={active ? 'text-orange-soft' : 'text-offwhite/42'} aria-hidden="true" />
              </div>
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-orange-soft/60" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>

      {/* User + sign out */}
      <div
        className="mt-5 rounded-[22px] p-4"
        style={{ background: 'rgba(255,255,255,0.03)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
      >
        {userEmail && (
          <div className="mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/24">
              {preview ? 'Preview mode' : 'Signed in'}
            </p>
            <p className="mt-2 truncate text-[13px] text-offwhite/56 font-body">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[14px] font-medium font-body text-offwhite/44 transition-all duration-200 hover:bg-white/[0.04] hover:text-offwhite/70"
        >
          <LogOut size={15} strokeWidth={2} aria-hidden="true" />
          {preview ? 'Exit preview' : 'Sign out'}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#051426] font-body text-offwhite">
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="pointer-events-none fixed left-[-10%] top-[6%] h-[340px] w-[340px] rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.16) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none fixed bottom-[-10%] right-[-5%] h-[360px] w-[360px] rounded-full opacity-28 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.14) 0%, transparent 72%)' }}
      />

      <div className="relative flex min-h-screen">

        {/* ── Desktop sidebar ─────────────────────────────────── */}
        <aside className="hidden w-[292px] flex-shrink-0 px-5 py-5 lg:block">
          <div
            className="sticky top-5 h-[calc(100vh-40px)] overflow-hidden rounded-[32px]"
            style={{
              background: 'linear-gradient(180deg, rgba(16,29,50,0.92) 0%, rgba(8,21,36,0.98) 100%)',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.08),' +
                '0 24px 64px rgba(2,13,24,0.38),' +
                'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <SidebarContent />
          </div>
        </aside>

        {/* ── Mobile drawer (always in DOM for animation) ─────── */}
        <div
          className={['fixed inset-0 z-50 lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'].join(' ')}
        >
          {/* Backdrop */}
          <div
            className={['absolute inset-0 bg-void/82 backdrop-blur-sm transition-opacity duration-300', mobileOpen ? 'opacity-100' : 'opacity-0'].join(' ')}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <aside
            id="mobile-nav"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            tabIndex={-1}
            onKeyDown={handleDrawerKeyDown}
            className={[
              'absolute left-0 top-0 bottom-0 w-[288px] max-w-[86vw] flex flex-col outline-none',
              'transition-transform duration-[350ms] ease-smooth',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
            ].join(' ')}
            style={{
              background: 'linear-gradient(180deg, rgba(16,29,50,0.96) 0%, rgba(8,21,36,0.98) 100%)',
              boxShadow: '18px 0 48px rgba(2,13,24,0.56)',
            }}
          >
            <SidebarContent mobile />
          </aside>
        </div>

        {/* ── Main content ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Mobile top bar */}
          <header className="lg:hidden px-4 pt-4">
            <div
              className="flex items-center gap-3 rounded-[22px] px-4 py-3"
              style={{
                background: 'rgba(11,23,39,0.82)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 16px 34px rgba(2,13,24,0.22)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <button
                ref={menuBtnRef}
                onClick={() => setMobileOpen(true)}
                className="rounded-[10px] p-1 text-offwhite/60 transition-colors hover:text-offwhite"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <Logo className="h-6 w-auto" />
            </div>
          </header>

          <main className="flex-1 overflow-auto px-4 pb-6 pt-4 sm:px-6 sm:pb-8 lg:px-7 lg:pb-10 lg:pt-6 xl:px-8">
            <div className="mx-auto w-full max-w-[1320px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
