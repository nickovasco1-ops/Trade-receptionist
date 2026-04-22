import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Phone, Users, Settings, LogOut,
  Menu, X, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../../components/Logo';

const NAV = [
  { label: 'Overview',  href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Calls',     href: '/dashboard/calls',   icon: Phone },
  { label: 'Leads',     href: '/dashboard/leads',   icon: Users },
  { label: 'Settings',  href: '/settings',          icon: Settings },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <nav
      className={[
        'flex flex-col h-full',
        mobile ? 'p-6' : 'p-5',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
        </Link>
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="text-offwhite/50 hover:text-offwhite transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <div className="flex-1 space-y-1">
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
                  : 'text-offwhite/50 hover:text-offwhite hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
            </Link>
          );
        })}
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium font-body text-offwhite/40 hover:text-offwhite/70 hover:bg-white/[0.04] transition-all duration-200 w-full text-left"
      >
        <LogOut size={16} strokeWidth={2} />
        Sign out
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy flex" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-white/[0.06]"
        style={{ background: 'rgba(2,13,24,0.6)' }}
      >
        <Sidebar />
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
            style={{
              background: '#051426',
              boxShadow: '8px 0 32px rgba(2,13,24,0.6)',
            }}
          >
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]" style={{ background: 'rgba(2,13,24,0.6)' }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-offwhite/60 hover:text-offwhite transition-colors p-1"
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
