import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Phone, Users, Settings, LogOut,
  Menu, X, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../../components/Logo';

const NAV = [
  { label: 'Overview',  href: '/dashboard',       icon: LayoutDashboard },
  { label: 'Calls',     href: '/dashboard/calls',  icon: Phone },
  { label: 'Leads',     href: '/dashboard/leads',  icon: Users },
  { label: 'Settings',  href: '/settings',         icon: Settings },
];

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef  = useRef<HTMLElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

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
    await supabase.auth.signOut();
    navigate('/login');
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={['flex flex-col h-full', mobile ? 'p-6' : 'p-5'].join(' ')}>
      {/* Logo */}
      <div className="mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
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
      <div className="flex-1 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              to={href}
              onClick={() => setMobileOpen(false)}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium font-body transition-all duration-200',
                active
                  ? 'bg-orange/10 text-orange'
                  : 'text-offwhite/50 hover:text-offwhite/90 hover:bg-white/[0.05]',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" aria-hidden="true" />
              {label}
              {active && <ChevronRight size={12} className="ml-auto opacity-50" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>

      {/* User + sign out */}
      <div className="mt-4 pt-4">
        {userEmail && (
          <div className="px-3 mb-2">
            <p className="text-[11px] text-offwhite/25 font-body truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium font-body text-offwhite/40 hover:text-offwhite/70 hover:bg-white/[0.04] transition-all duration-200 w-full text-left"
        >
          <LogOut size={15} strokeWidth={2} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy flex font-body">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-void">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer (always in DOM for animation) ─────── */}
      <div
        className={['fixed inset-0 z-50 lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'].join(' ')}
      >
        {/* Backdrop */}
        <div
          className={['absolute inset-0 bg-void/80 backdrop-blur-sm transition-opacity duration-300', mobileOpen ? 'opacity-100' : 'opacity-0'].join(' ')}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer */}
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          tabIndex={-1}
          onKeyDown={handleDrawerKeyDown}
          className={[
            'absolute left-0 top-0 bottom-0 w-64 flex flex-col bg-void shadow-[8px_0_40px_rgba(2,13,24,0.7)]',
            'transition-transform duration-[350ms] ease-smooth outline-none',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <SidebarContent mobile />
        </aside>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-void/85 backdrop-blur-[20px] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
          <button
            ref={menuBtnRef}
            onClick={() => setMobileOpen(true)}
            className="text-offwhite/60 hover:text-offwhite transition-colors p-1"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <Logo className="h-6 w-auto" />
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
