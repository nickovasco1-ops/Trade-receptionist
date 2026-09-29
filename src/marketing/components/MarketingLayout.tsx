// Shell for the SEO pages: glass header, visible breadcrumbs, footer with a
// link to every trade and guide, and the mobile sticky CTA bar.
//
// Every link is a plain <a href>. Each page is prerendered with its own head,
// so a full page load is what gives a visitor (and a crawler) the right title,
// canonical and JSON-LD. No client-side routing between these pages.

import React, { useEffect, type ReactNode } from 'react';
import { Logo } from '../../../components/Logo';
import { GUIDE_ROUTE_SEEDS, TRADE_ROUTE_SEEDS, findMarketingRoute } from '../routes';
import { absoluteUrl } from '../site';
import type { Crumb } from '../structured-data';
import { CheckoutProvider, StartTrialButton } from './Checkout';

const NAV = [
  { label: 'Trades', href: '/trades' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Guides', href: '/guides' },
];

const LINK = 'transition-colors duration-200 hover:text-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px] rounded';

/**
 * Keeps <head> right when the page is reached without its prerendered HTML
 * (vite dev, or a client-side navigation). In production the prerendered head
 * is already correct and this is a no-op.
 */
function useRouteHead(path: string): void {
  useEffect(() => {
    const route = findMarketingRoute(path);
    if (!route) return;
    document.title = route.title;
    document.head.querySelector('meta[name="description"]')?.setAttribute('content', route.description);
    document.head.querySelector('link[rel="canonical"]')?.setAttribute('href', absoluteUrl(route.path));
  }, [path]);
}

function Header(): React.ReactElement {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-navy/85 backdrop-blur-[20px] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="/" aria-label="Trade Receptionist home" className={`flex shrink-0 items-center ${LINK}`}>
          <Logo variant="mark" height={36} />
          <span className="ml-2.5 hidden font-display text-[17px] font-bold tracking-[-0.02em] text-offwhite sm:inline">
            Trade Receptionist
          </span>
        </a>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-[44px] items-center px-2.5 text-[14px] font-semibold text-offwhite/72 sm:px-3 ${LINK}`}
            >
              {item.label}
            </a>
          ))}
          <a href="/login" className={`hidden min-h-[44px] items-center px-3 text-[14px] font-semibold text-offwhite/72 lg:inline-flex ${LINK}`}>
            Log in
          </a>
          <StartTrialButton compact className="ml-2 hidden md:inline-flex" />
        </nav>
      </div>
    </header>
  );
}

interface BreadcrumbsProps {
  crumbs: readonly Crumb[];
}

function Breadcrumbs({ crumbs }: BreadcrumbsProps): React.ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 md:pt-28 lg:px-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-offwhite/62">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-offwhite/80">{crumb.name}</span>
              ) : (
                <>
                  <a href={crumb.path} className={`underline-offset-4 hover:underline ${LINK}`}>{crumb.name}</a>
                  <span aria-hidden="true" className="text-offwhite/58">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface FooterColumnProps {
  heading: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}

function FooterColumn({ heading, links }: FooterColumnProps): React.ReactElement {
  return (
    <div>
      <h2 className="mb-4 font-body text-[12px] font-bold uppercase tracking-[0.12em] text-offwhite/58">{heading}</h2>
      <ul className="space-y-0.5 text-[14px] text-offwhite/66">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className={`inline-flex min-h-[40px] items-center ${LINK}`}>{link.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer(): React.ReactElement {
  const trades = [
    ...TRADE_ROUTE_SEEDS.map((seed) => ({ label: seed.name, href: `/trades/${seed.slug}` })),
    { label: 'All trades', href: '/trades' },
  ];
  const guides = [
    ...GUIDE_ROUTE_SEEDS.map((seed) => ({ label: seed.name, href: `/guides/${seed.slug}` })),
    { label: 'All guides', href: '/guides' },
  ];
  const company = [
    { label: 'Home', href: '/' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Partner Programme', href: '/partner' },
    { label: 'Log in', href: '/login' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ];

  return (
    <footer className="bg-void/90 pb-28 pt-16 md:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Logo height={72} />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-offwhite/62">
              An AI receptionist for UK tradespeople. It answers when you cannot, and texts you the job.
            </p>
          </div>
          <FooterColumn heading="By trade" links={trades} />
          <FooterColumn heading="Guides" links={guides} />
          <FooterColumn heading="Company" links={company} />
        </div>
        <p className="mt-12 text-[13px] text-offwhite/58">
          &copy; 2026 Trade Receptionist Ltd. Registered in England &amp; Wales.
        </p>
      </div>
    </footer>
  );
}

function MobileCtaBar(): React.ReactElement {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-navy/95 p-3 backdrop-blur-[20px] shadow-[0_-1px_0_rgba(255,255,255,0.05)] md:hidden">
      <StartTrialButton className="w-full" />
    </div>
  );
}

interface MarketingLayoutProps {
  path: string;
  children: ReactNode;
}

export function MarketingLayout({ path, children }: MarketingLayoutProps): React.ReactElement {
  useRouteHead(path);
  const crumbs = findMarketingRoute(path)?.breadcrumbs;

  return (
    <CheckoutProvider>
      <div className="min-h-screen bg-navy font-body text-offwhite">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 20% 0%, rgba(255,107,43,0.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 10%, rgba(153,203,255,0.06) 0%, transparent 50%)',
          }}
        />
        <Header />
        {crumbs && crumbs.length > 1 ? <Breadcrumbs crumbs={crumbs} /> : <div className="pt-24 md:pt-28" />}
        <main id="main-content" tabIndex={-1} className="relative">
          {children}
        </main>
        <Footer />
        <MobileCtaBar />
      </div>
    </CheckoutProvider>
  );
}
