// Building blocks for the SEO pages, following the §5 cookbook in CLAUDE.md:
// eyebrow → headline → body, tonal elevation instead of lines, one gradient
// keyword per headline at most.
//
// Deliberate deviation from §4.3 P1: body sections here do not use the
// [data-animate] scroll entrance. That pattern starts content at opacity 0 and
// needs JavaScript and an IntersectionObserver to reveal it; on pages whose
// job is to be read by crawlers and to render before the script loads, copy
// must never depend on JavaScript to become visible. The hero uses the CSS-only
// .hero-fade entrance, which honours prefers-reduced-motion.

import React, { type ReactNode } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { FaqItem } from '../structured-data';
import { SECONDARY_CTA, StartTrialButton } from './Checkout';

export const CONTAINER = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
const EYEBROW = 'inline-block font-body text-[13px] font-bold uppercase tracking-[0.12em] text-orange-soft mb-4';
const GLASS =
  'rounded-card bg-white/[0.06] backdrop-blur-[24px] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(2,13,24,0.4)]';

interface GradientWordProps {
  children: ReactNode;
}

/** The one emphasised word a headline may carry (§3.4). */
export function GradientWord({ children }: GradientWordProps): React.ReactElement {
  return (
    <span className="bg-gradient-to-br from-orange to-orange-glow bg-clip-text italic text-transparent">{children}</span>
  );
}

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  intro: ReactNode;
  showPricingLink?: boolean;
  children?: ReactNode;
}

export function PageHero({ eyebrow, title, intro, showPricingLink = true, children }: PageHeroProps): React.ReactElement {
  return (
    <section aria-labelledby="page-heading" className="relative pb-4 pt-8 md:pb-6 md:pt-12">
      <div className={CONTAINER}>
        <div className="max-w-3xl">
          <span className={`hero-fade ${EYEBROW}`}>{eyebrow}</span>
          <h1
            id="page-heading"
            className="hero-fade font-display text-[clamp(2.25rem,5.5vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-offwhite"
            style={{ animationDelay: '80ms' }}
          >
            {title}
          </h1>
          <div
            className="hero-fade mt-6 max-w-[62ch] font-body text-[clamp(1.05rem,1.8vw,1.2rem)] leading-[1.65] text-offwhite/72"
            style={{ animationDelay: '140ms' }}
          >
            {intro}
          </div>
          <div className="hero-fade mt-8 flex flex-col gap-4 sm:flex-row sm:items-center" style={{ animationDelay: '220ms' }}>
            <StartTrialButton />
            {showPricingLink && (
              <a href="/pricing" className={SECONDARY_CTA}>See Pricing</a>
            )}
          </div>
          <p className="hero-fade mt-5 text-[14px] text-offwhite/62" style={{ animationDelay: '280ms' }}>
            14-day free trial. No charge today. Cancel anytime.
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

interface ContentSectionProps {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  tone?: 'base' | 'raised';
  children: ReactNode;
}

export function ContentSection({ id, eyebrow, title, intro, tone = 'base', children }: ContentSectionProps): React.ReactElement {
  const background = tone === 'raised'
    ? 'bg-[linear-gradient(180deg,rgba(10,35,64,0)_0%,rgba(10,35,64,0.55)_18%,rgba(10,35,64,0.55)_82%,rgba(10,35,64,0)_100%)]'
    : '';
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`relative py-16 md:py-24 ${background}`}>
      <div className={CONTAINER}>
        <div className="mb-10 max-w-3xl">
          {eyebrow && <span className={EYEBROW}>{eyebrow}</span>}
          <h2
            id={`${id}-heading`}
            className="font-display text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em] text-offwhite"
          >
            {title}
          </h2>
          {intro && <div className="mt-5 max-w-[65ch] text-[17px] leading-[1.7] text-offwhite/70">{intro}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

interface CardProps {
  title: string;
  children: ReactNode;
  label?: string;
}

export function Card({ title, children, label }: CardProps): React.ReactElement {
  return (
    <article className={`${GLASS} h-full p-6 md:p-7`}>
      {label && <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">{label}</p>}
      <h3 className="font-display text-[20px] font-semibold leading-snug tracking-[-0.01em] text-offwhite">{title}</h3>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.7] text-offwhite/70">{children}</div>
    </article>
  );
}

export interface ScenarioStep {
  who: 'Caller' | 'Receptionist' | 'You get';
  text: string;
}

interface ScenarioProps {
  title: string;
  context: string;
  steps: readonly ScenarioStep[];
}

/** An illustrative call, labelled as such. Never presented as a real customer's call. */
export function Scenario({ title, context, steps }: ScenarioProps): React.ReactElement {
  return (
    <article className={`${GLASS} p-6 md:p-7`}>
      <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">Example call</p>
      <h3 className="font-display text-[20px] font-semibold leading-snug text-offwhite">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-offwhite/62">{context}</p>
      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="grid grid-cols-[6.5rem_1fr] gap-3 text-[15px] leading-[1.6]">
            <span className={`font-semibold ${step.who === 'Caller' ? 'text-offwhite/62' : step.who === 'You get' ? 'text-orange-soft' : 'text-accent'}`}>
              {step.who}
            </span>
            <span className="text-offwhite/78">{step.text}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

interface FaqListProps {
  faqs: readonly FaqItem[];
}

/**
 * Native <details>, so every answer is in the HTML (crawlers and FAQPage
 * markup see it) and the accordion works before, or without, JavaScript.
 */
export function FaqList({ faqs }: FaqListProps): React.ReactElement {
  return (
    <div className="max-w-3xl space-y-3">
      {faqs.map((faq) => (
        <details key={faq.question} className={`group ${GLASS} !rounded-[14px]`}>
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-[17px] font-semibold text-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px] [&::-webkit-details-marker]:hidden">
            {faq.question}
            <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-orange-soft transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-[15px] leading-[1.7] text-offwhite/70">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

export interface LinkCardItem {
  href: string;
  title: string;
  text: string;
}

interface LinkCardsProps {
  items: readonly LinkCardItem[];
  columns?: 2 | 3 | 4;
}

export function LinkCards({ items, columns = 3 }: LinkCardsProps): React.ReactElement {
  const grid = columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
  return (
    <ul className={`grid gap-4 ${grid}`}>
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            className={`${GLASS} group flex h-full flex-col p-6 transition-all duration-300 ease-mechanical hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(255,107,43,0.2),0_20px_60px_rgba(2,13,24,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]`}
          >
            <span className="font-display text-[18px] font-semibold text-offwhite">{item.title}</span>
            <span className="mt-2 flex-1 text-[14px] leading-relaxed text-offwhite/66">{item.text}</span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-orange-soft">
              Read more <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

interface CtaBandProps {
  title: ReactNode;
  text: string;
}

export function CtaBand({ title, text }: CtaBandProps): React.ReactElement {
  return (
    <section aria-labelledby="cta-heading" className="relative py-16 md:py-24">
      <div className={CONTAINER}>
        <div className="rounded-[28px] bg-[linear-gradient(135deg,rgba(255,107,43,0.12)_0%,rgba(10,35,64,0.9)_60%)] px-6 py-10 shadow-[0_0_0_1px_rgba(255,107,43,0.18),0_20px_60px_rgba(2,13,24,0.5)] md:px-12 md:py-14">
          <h2 id="cta-heading" className="max-w-2xl font-display text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em] text-offwhite">
            {title}
          </h2>
          <p className="mt-4 max-w-[60ch] text-[17px] leading-[1.7] text-offwhite/72">{text}</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <StartTrialButton />
            <a href="/pricing" className={SECONDARY_CTA}>See Pricing</a>
          </div>
          <p className="mt-5 text-[14px] text-offwhite/62">14-day free trial. No charge today. Cancel anytime.</p>
        </div>
      </div>
    </section>
  );
}

interface ProseProps {
  children: ReactNode;
}

/** Long-form copy for the guides: readable measure, spacing as structure. */
export function Prose({ children }: ProseProps): React.ReactElement {
  return (
    <div className="max-w-[68ch] space-y-5 text-[17px] leading-[1.75] text-offwhite/74 [&_a]:font-semibold [&_a]:text-orange-soft [&_a]:underline [&_a]:underline-offset-4 [&_h3]:pt-4 [&_h3]:font-display [&_h3]:text-[22px] [&_h3]:font-semibold [&_h3]:text-offwhite [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-offwhite [&_ul]:space-y-2">
      {children}
    </div>
  );
}
