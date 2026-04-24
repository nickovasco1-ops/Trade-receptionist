import React, { useEffect, useState } from 'react';
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

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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
              <Icon size={16} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
              {label}
              {active && <ChevronRight size={12} className="ml-auto opacity-50" />}
            </Link>
          );
        })}
      </div>

      {/* User + sign out */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {userEmail && (
          <div className="px-3 mb-2">
            <p className="text-[11px] text-offwhite/25 font-body truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium font-body text-offwhite/40 hover:text-offwhite/70 hover:bg-white/[0.04] transition-all duration-200 w-full text-left"
        >
          <LogOut size={15} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy flex" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0"
        style={{ background: '#020D18' }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer (always in DOM for animation) ─────── */}
      <div
        className="fixed inset-0 z-50 lg:hidden"
        style={{ pointerEvents: mobileOpen ? 'auto' : 'none' }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-void/80 backdrop-blur-sm"
          style={{
            opacity: mobileOpen ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <aside
          className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
          style={{
            background: '#020D18',
            boxShadow: '8px 0 40px rgba(2,13,24,0.7)',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <SidebarContent mobile />
        </aside>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3"
          style={{
            background: 'rgba(2,13,24,0.85)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="text-offwhite/60 hover:text-offwhite transition-colors p-1"
            aria-label="Open menu"
          >
            <Menu size={20} />
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
