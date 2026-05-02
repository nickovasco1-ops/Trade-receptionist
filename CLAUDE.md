# Trade Receptionist — Development Constitution

> **Read §0 before every task. Read the relevant section before every edit.**
> This file is the source of truth for product identity, design system, code conventions, and integration boundaries. Reality on disk overrides aspiration in this file — if they conflict, document it in §10 (Landmines) and align by edits, not by deleting the divergence.

---

## §0 — The Five Laws (memorise)

1. **No lines.** No `border-*`, `divide-*`, or `<hr>` for layout. Use tonal elevation (`navy → navy-mid → navy-high`), glassmorphism, gradient fades, and whitespace. The only permitted line is `border-l-2 border-orange` on the active feature row in the sticky-scroll Features section, plus accessibility focus outlines.
2. **No pure black, no pure white, no Inter.** Use `void` / `navy` / `offwhite` tokens and `Space Grotesk` + `Manrope` only.
3. **Mechanical motion, never bouncy.** Minimum 300ms for transforms. Easings live in §4 — anything else is wrong.
4. **Outcome copy, UK English, £.** "Start Free Trial" not "Get Started". "Diary" not "Schedule". Never "Powered by AI".
5. **Two surfaces, two voices.** The **marketing site** is editorial, dramatic, animated (Industrial Luminescence). The **dashboard product** is calm, dense, functional — same tokens, different rhythm. See §2 and §7.

If a change would violate one of these, stop and ask.

---

## §1 — Product Identity & Voice

**Trade Receptionist** is a premium AI virtual receptionist for UK tradespeople (plumbers, electricians, builders, HVAC, construction). It answers calls, books jobs, filters spam, and sends WhatsApp summaries so the trade never loses a customer while under a sink or on a roof.

### Aesthetic — "Industrial Luminescence"

The visual metaphor is **a master craftsman's workshop**: warm industrial lighting on dark cast iron, blueprint-on-workbench precision, high-vis orange against deep navy. The product is a precision tool, not a startup app.

- Authoritative, precise, built-to-last
- Never flashy, playful, AI-tropey (no neural networks / floating brains / robot arms)
- Never light-grey corporate SaaS, never thin Helvetica
- Reference standard for marketing motion: **audia.framer.website** — match its scroll-driven reveals and ambient float, but in our palette and with our weight

### User profile

- **Primary**: UK sole-trader tradesperson, 28–55, drives a van, can't always answer calls, loses £3k–£15k/year in missed work, mobile-first (often reading the site in bright daylight in a van cab).
- **Secondary**: small trade business (2–10 employees), same pain at scale.
- **Skeptical of tech.** Needs plain language, real outcomes, and proof.

### Tone of voice

- Direct, no fluff. *"You miss calls. You lose money. We fix that."*
- UK English always (colour, organise, centre; quote, diary, ring, job, call-out)
- Outcome-first headlines. Result, not feature.
- Authoritative, not salesy. State facts. Let outcomes sell.

### Voice cheat sheet — paste-ready

| Use case | Use this | Not this |
|---|---|---|
| Primary CTA | "Start Free Trial" | "Get Started", "Sign Up" |
| Secondary CTA | "Hear a Live Demo" / "Book a Demo" | "Learn More", "Contact Us" |
| Calculator CTA | "Calculate My Losses" | "Try the Calculator" |
| Pricing CTA | "Start Free Trial" | "Choose Plan", "Buy Now" |
| Features eyebrow | "WHAT YOU ACTUALLY GET" | "FEATURES" |
| How-it-works eyebrow | "THREE STEPS TO ZERO MISSED CALLS" | "HOW IT WORKS" |
| Pricing heading | "Simple, Honest Pricing" | "Pricing" |
| Testimonials eyebrow | "WHAT UK TRADESPEOPLE SAY" | "TESTIMONIALS" |
| Trust signal | "14-day free trial. No card required." | "Free trial available" |
| Urgency line | "While you read this, a competitor is answering their calls." | "Don't miss out!" |

---

## §2 — Surface Map (the repo holds three things)

This is one repo with three distinct surfaces. They share design tokens; they do **not** share UX rules.

| Surface | Entry | Purpose | Voice |
|---|---|---|---|
| **Marketing site** | `App.tsx` (root `/`) | Convert visitors. Editorial, animated, dramatic. | §1, §6 |
| **Dashboard product** | `src/pages/*` via React Router | Calm SaaS UI for paying users. Information density, function. | §7 |
| **Backend API** | `server/src/index.ts` (Express) | Webhooks, integrations, data plane. | §8 |

**Shared between them:** design tokens (`index.css` `@theme` block), `components/UI.tsx`, `components/Logo.tsx`, types in `shared/types.ts`.

> **Critical**: when asked to "improve the site", ask *which surface*. Marketing rules and dashboard rules are different (e.g., float animation belongs in marketing, never in the dashboard).

---

## §3 — Design Tokens

> **Source of truth: `index.css` `@theme` block (Tailwind v4 CSS-first config).**
> The legacy `tailwind.config.ts` mirrors the same tokens for any tooling that reads it — keep both in sync. Do not delete the legacy `brand-*` or `tradeBlue.*` aliases; older components still consume them (see §10).

### 3.1 Color palette

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `--color-void` | `#020D18` | `bg-void` | Deepest background, fallback before scene loads. Never pure black. |
| `--color-navy` | `#051426` | `bg-navy` | Primary section background |
| `--color-navy-mid` | `#0A2340` | `bg-navy-mid` | Card/panel surface |
| `--color-navy-high` | `#0F3060` | `bg-navy-high` | Highest-elevation surface |
| `--color-orange` | `#FF6B2B` | `bg-orange text-orange` | Primary CTA, key highlights |
| `--color-orange-glow` | `#FF8C55` | `bg-orange-glow` | Hover state, glow source |
| `--color-orange-soft` | `#ffb59a` | `text-orange-soft` | Eyebrow labels on dark |
| `--color-accent` | `#99cbff` | `text-accent` | Secondary accent, links, info |
| `--color-accent-glow` | `#60A5FA` | `bg-accent-glow` | Secondary glow |
| `--color-offwhite` | `#F0F4F8` | `text-offwhite` | Primary text on dark. Never pure white. |

Body text on dark: `text-offwhite/70`. Captions/labels on dark: `text-offwhite/40`.

> **Note**: the Tailwind class is `text-accent`, not `text-blue-accent`. The original spec said `blue-accent`; the actual config exposes it as `accent`. Use `accent` in code.

### 3.2 Forbidden colors

`#000000`, `#FFFFFF`, any unsaturated grey, any colour not derived from the navy palette. Use the tokens.

### 3.3 Gradient recipes (use exactly)

```css
/* Primary CTA */
background: linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%);

/* Hero background */
background:
  radial-gradient(ellipse at 20% 50%, rgba(255,107,43,0.08) 0%, transparent 60%),
  radial-gradient(ellipse at 80% 20%, rgba(153,203,255,0.06) 0%, transparent 50%),
  #051426;

/* Blueprint grid overlay (decorative texture only) */
background-image:
  linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px),
  linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px);
background-size: 40px 40px;

/* Section transition (no-line alternative) */
background: linear-gradient(180deg, #051426 0%, #0A2340 50%, #051426 100%);

/* Glass surface */
background: rgba(255,255,255,0.06);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);

/* Gradient keyword text — ONE word per headline maximum */
background: linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

### 3.4 Typography

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

| Token | Font | Size | Weight | Line | Tracking | Use |
|---|---|---|---|---|---|---|
| display-2xl | Space Grotesk | 72px | 700 | 1.05 | -0.03em | Hero (desktop) |
| display-xl | Space Grotesk | 56px | 700 | 1.08 | -0.025em | Hero (mobile) |
| display-lg | Space Grotesk | 48px | 700 | 1.10 | -0.02em | Section headline |
| display-md | Space Grotesk | 36px | 600 | 1.15 | -0.015em | Subsection |
| display-sm | Space Grotesk | 28px | 600 | 1.20 | -0.01em | Card headline |
| label-xl | Manrope | 13px | 700 | 1.20 | 0.12em | Eyebrow (UPPERCASE) |
| body-xl | Manrope | 20px | 400 | 1.60 | 0 | Hero subhead |
| body-lg | Manrope | 18px | 400 | 1.65 | 0 | Feature description |
| body-md | Manrope | 16px | 400 | 1.70 | 0 | Default body |
| body-sm | Manrope | 14px | 400 | 1.60 | 0 | Caption / meta |
| mono | JetBrains Mono | 13px | 400 | 1.50 | 0 | Code, metrics |

**Rules:**
- Display headings: always Space Grotesk, negative letter-spacing, base colour `#F0F4F8`.
- **Gradient keyword rule**: at most ONE word per headline gets `italic` + orange gradient text. Never the whole headline. Never twice in one section. Pick the most emotionally charged word (*call*, *job*, *money*).
- Eyebrows: Manrope, uppercase, `tracking-[0.12em]`, `text-orange-soft` or `text-accent`.
- Body on dark: `text-offwhite/70`. Never full opacity.
- Max line length: 65ch body, 40ch hero subhead.
- Left-align body. Centre-align hero only. Never justify.

### 3.5 Shadows (always use `#020D18`, never `rgba(0,0,0,…)`)

```css
/* Level 1 — card */          0 2px 8px rgba(2,13,24,0.3), 0 1px 3px rgba(2,13,24,0.2);
/* Level 2 — elevated */       0 8px 32px rgba(2,13,24,0.4), 0 2px 8px rgba(2,13,24,0.2);
/* Level 3 — floating panel */ 0 20px 60px rgba(2,13,24,0.5), 0 8px 24px rgba(2,13,24,0.3);
/* Level 4 — modal */          0 40px 80px rgba(2,13,24,0.6), 0 16px 40px rgba(2,13,24,0.4);

/* Orange glow (CTAs)  */ 0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.20);
/* Blue glow (accents) */ 0 0 20px rgba(153,203,255,0.25), 0 4px 12px rgba(153,203,255,0.15);
```

Pre-built Tailwind utilities: `shadow-orange-glow`, `shadow-orange-glow-lg`, `shadow-blue-glow`.

### 3.6 Glass hierarchy

| Level | Opacity | Blur | Use |
|---|---|---|---|
| Deep | 4% | 16px | Background panels, hero overlays |
| Standard | 6% | 24px | Feature cards, stat panels |
| Elevated | 10% | 32px | Pricing cards, modals |
| Surface | 15% | 40px | Tooltips, popovers |

Standard glass:
```css
background: rgba(255,255,255,0.06);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
border-radius: 16px;
box-shadow:
  0 0 0 1px rgba(255,255,255,0.08),
  0 8px 32px rgba(2,13,24,0.4),
  0 2px 8px rgba(2,13,24,0.2);
```

### 3.7 Spacing as structure

Sections separate by space, not by lines. Alternate `py-20 md:py-32` and `py-16 md:py-24` to break rhythm. Asymmetric column gutters on desktop (e.g., `gap-12 lg:gap-20`).

---

## §4 — Motion Language

Motion philosophy: **precision machinery starting up.** Heavy, intentional, smooth, inevitable. Never springy, never playful.

### 4.1 Easings

```css
--ease-standard:   cubic-bezier(0.4, 0, 0.2, 1);
--ease-entrance:   cubic-bezier(0, 0, 0.2, 1);
--ease-exit:       cubic-bezier(0.4, 0, 1, 1);
--ease-mechanical: cubic-bezier(0.34, 1.2, 0.64, 1);
--ease-precision:  cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-smooth:     cubic-bezier(0.16, 1, 0.3, 1);
```

Tailwind utilities: `ease-standard`, `ease-mechanical`, `ease-precision`, `ease-smooth`.

### 4.2 Durations

| Duration | Use |
|---|---|
| 150ms | Icon state changes, ticks |
| 200ms | Colour/opacity transitions |
| 300ms | Hover lifts, card elevation (minimum for transforms) |
| 400ms | Page element entrances |
| 500ms | Modals, section transitions |
| 600ms | Sticky panel transitions, large reveals |
| 800ms | Status gauge fills |
| 1200ms | Animated counters 0 → target |

### 4.3 Patterns (apply on the marketing site, never on the dashboard)

#### P1 — Scroll-triggered entrance (mandatory on every marketing section)

Every marketing section animates in via `IntersectionObserver`. Use the existing hook at `src/hooks/useScrollAnimation.ts`. Apply `data-animate` on every animatable element; stagger children with `data-delay="0..4"` (80ms steps).

Initial state: `opacity:0; transform: translateY(32px)`. Triggered: `is-visible` class flips to `opacity:1; transform: translateY(0)` over 600ms `ease-smooth`.

#### P2 — Sticky scroll feature showcase (signature pattern)

Implemented in `components/StickyFeatures.tsx`. Left column scrolls a feature list; right column is `position: sticky; top: 10vh` and transitions between UI states as each feature enters the viewport. The active feature row gets `border-l-2 border-orange` + `bg-orange/[0.04]` (the only permitted internal border). On mobile (<768px), the sticky behaviour collapses — feature blocks stack vertically.

#### P3 — Animated stat counters (mandatory on stats and ROI)

Use `src/hooks/useCounter.ts` (`easeOutExpo`, 1200ms, runs once via `started` flag, formats with `toLocaleString('en-GB')`). Trigger on intersection. Never ship static numbers in marketing surfaces.

#### P4 — Ambient float (hero only, max 3 elements)

Continuous subtle float on hero phone mockup + up to 2 floating glass notification cards. Use Tailwind animations `animate-float-primary` (5s) and `animate-float-secondary` (4s) — already in config. Stagger card delays by 0s / 0.8s / 1.6s. **Float only product UI** (incoming call, WhatsApp summary, stats pill). Never float decorative blobs/orbs.

#### P5 — Lenis smooth scroll (already initialised)

Initialised in `index.tsx`. Do not re-initialise per page. Do not replace with native scroll.

#### P6 — Progress bar fill (How It Works section)

3-step progress bars fill `width: 0% → 100%` over 1200ms `ease-smooth` on intersection. Background `rgba(255,255,255,0.08)`, fill `linear-gradient(90deg, #FF6B2B, #FF8C55)`.

#### P7 — Mouse parallax (hero only, desktop only)

Use `src/hooks/useParallax.ts`. Skip on touch devices (`window.matchMedia('(pointer: coarse)').matches`). Phone mockup: max 20px X / 12px Y. Floating cards: inverse 0.4× for depth.

### 4.4 Reduced motion (mandatory)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  [data-animate] { opacity: 1; transform: none; }
}
```

### 4.5 The Framer Standard

Every marketing section, scrolled into view, must feel as polished as a Framer-built site:
- Nothing simply "appears" — purposeful entrance
- Stats count up; never static
- Features section uses sticky scroll
- Smooth scroll is Lenis; never native
- Hero has floating, breathing UI

If a section would look at home on a basic Webflow template, it needs more motion work.

---

## §5 — Component Cookbook (paste-ready)

### 5.1 Section wrapper (always use this)

```tsx
<section
  data-animate
  aria-labelledby="my-heading"
  className="relative py-20 md:py-32 overflow-hidden"
>
  <div className="container mx-auto px-6 lg:px-8">
    <span data-delay="0" className="inline-block text-[13px] font-bold tracking-[0.12em] uppercase text-orange-soft font-body mb-4">
      EYEBROW LABEL
    </span>
    <h2 data-delay="1" id="my-heading" className="font-display text-4xl md:text-5xl font-bold tracking-[-0.02em] text-offwhite mb-6">
      Section headline with a <span className="italic bg-gradient-to-br from-orange to-orange-glow bg-clip-text text-transparent">keyword</span>.
    </h2>
    <p data-delay="2" className="font-body text-lg text-offwhite/70 max-w-[65ch] leading-[1.65]">
      Body copy.
    </p>
  </div>
</section>
```

### 5.2 Primary CTA

```tsx
<button className="
  inline-flex items-center gap-2.5
  px-7 py-4
  bg-gradient-to-r from-orange to-orange-glow
  text-white font-semibold text-[15px] tracking-[-0.01em]
  rounded-button
  shadow-orange-glow
  hover:shadow-orange-glow-lg hover:-translate-y-0.5
  active:translate-y-0
  transition-all duration-300 ease-mechanical
  font-body
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]
">
  Start Free Trial
</button>
```

### 5.3 Secondary CTA

```tsx
<button className="
  inline-flex items-center gap-2.5
  px-7 py-4
  bg-accent/[0.08]
  text-accent font-semibold text-[15px] tracking-[-0.01em]
  rounded-button
  ring-1 ring-accent/20
  hover:bg-accent/[0.14] hover:ring-accent/35 hover:-translate-y-0.5
  transition-all duration-300
  font-body
">
  Hear a Live Demo
</button>
```

### 5.4 Glass feature card

```tsx
<article className="
  relative overflow-hidden
  bg-white/[0.06] backdrop-blur-[24px]
  rounded-card
  shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(2,13,24,0.4)]
  p-8
  hover:-translate-y-1
  hover:shadow-[0_0_0_1px_rgba(255,107,43,0.15),0_20px_60px_rgba(2,13,24,0.5)]
  transition-all duration-300 ease-mechanical
">
  {/* content */}
</article>
```

### 5.5 Pricing card (Popular / featured tier)

```tsx
<div className="
  relative
  bg-gradient-to-b from-orange/[0.12] to-orange/[0.04]
  backdrop-blur-[24px]
  rounded-card
  shadow-[0_0_0_1px_rgba(255,107,43,0.25),0_20px_60px_rgba(2,13,24,0.5),0_0_40px_rgba(255,107,43,0.1)]
  p-8
  scale-[1.03]
">
  {/* content */}
</div>
```

### 5.6 Sticky nav

```tsx
<header className="
  fixed top-0 inset-x-0 z-50
  bg-navy/85 backdrop-blur-[20px]
  shadow-[0_1px_0_rgba(255,255,255,0.05)]
">
  {/* content */}
</header>
```

### 5.7 Status gauge (signature industrial component)

Used in: Hero (calls answered stat), Pricing capacity indicator, metrics panels.

- SVG `<circle>` with `stroke-dasharray` + `stroke-dashoffset` animated 800ms `ease-precision` on intersection
- Background ring: `rgba(255,255,255,0.08)`
- Foreground arc: orange gradient `#FF6B2B → #FF8C55` (or accent variant)
- Outer glow shadow on the arc matching the colour

```ts
interface StatusGaugeProps {
  value: number;          // 0–100
  label: string;          // e.g. "Calls Answered"
  metric: string;         // e.g. "98.7%"
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'accent';
}
```

### 5.8 Eyebrow label

```tsx
<span className="inline-block text-[13px] font-bold tracking-[0.12em] uppercase text-orange-soft font-body mb-4">
  THREE STEPS TO ZERO MISSED CALLS
</span>
```

---

## §6 — Marketing Page Architecture

### 6.1 Mandatory section order (do not reorder, do not omit)

```
1.  HEADER         Glass sticky nav. Logo left, nav centre, dual CTAs right.
2.  HERO           Outcome headline (one gradient word) + subhead + dual CTAs + floating phone + animated stats bar.
3.  SOCIAL PROOF   Logo strip + animated stat bar.
4.  PAIN POINTS    Cost of doing nothing — financial + emotional stakes.
5.  ROI CALCULATOR Personalised urgency. Component: Calculator.tsx.
6.  COMPARISON     vs. alternatives — honest factual table.
7.  DEMO           AudioPlayer.tsx — hear a real call handled.
8.  HOW IT WORKS   3 steps with progress bars (P6).
9.  USE CASES      Trade-specific scenarios.
10. FEATURES       Sticky scroll showcase (P2). Component: StickyFeatures.tsx.
11. TESTIMONIALS   Real UK trades. Component: Testimonials.tsx.
12. PRICING        3 tiers, monthly/annual toggle, Pro is Popular.
13. FAQ            8+ accordion questions.
14. FINAL CTA      Dark band, single primary CTA.
15. FOOTER         Minimal — links, legal, social.
16. MOBILE BAR     Sticky bottom on mobile only — "Start Free Trial".
```

### 6.2 Hero non-negotiables

- Headline: max 8 words, present tense, one gradient italic keyword. Current: "Never Miss A *Call*. Never Lose A *Job*."
- Subhead: 1–2 sentences, ≤20 words each, quantify the pain.
- Dual CTAs in same row, 16px gap.
- Right panel: phone mockup with float (P4) + 3 floating glass cards (incoming call, WhatsApp booking confirmation, stats pill) + mouse parallax (P7).
- Stats bar under CTAs: 3 counters animating 0 → target on load (P3) — calls answered this month, % answered, avg annual savings in £.

### 6.3 Pricing rules

- Starter £29/mo (≤100 calls/mo)
- Pro £59/mo (≤300 calls/mo) — **Most Popular**, scaled card, orange glow
- Agency £119/mo (unlimited)
- Monthly/annual toggle (annual = 2 months free, savings shown in £)
- Per card: "14-day free trial. No setup fees. Cancel anytime."
- Per-card CTA: "Start Free Trial"

### 6.4 FAQ — minimum 8 questions

1. How does call diverting work?
2. What if I'm mid-job and can't check messages?
3. Does it work with my trade management software?
4. What accent does the AI use?
5. Can I customise what it says about my business?
6. Is there a contract?
7. What happens if I go over my call limit?
8. How quickly can I get set up?

### 6.5 Conversion principles

| Principle | Apply |
|---|---|
| Loss aversion over gain | "Stop losing £4,200/year" not "Earn more" |
| Specificity over vagueness | "14 minutes setup" not "quick setup" |
| Social normalisation | "Join 500+ UK tradespeople" |
| Risk reversal | "14-day free trial. No card required." |
| Urgency without desperation | "While you read this, a competitor is answering their calls." |
| Outcome in every feature | "Smart scheduling — so you wake up to a full diary" |
| UK trades vocabulary | call-out, quote, job, booking, diary |

---

## §7 — Dashboard Conventions

The dashboard is **not** a marketing surface. It uses the same tokens but a different rhythm.

### 7.1 Layout

- Routed via `react-router-dom`. Pages live in `src/pages/`. Shell in `src/components/dashboard/DashboardShell.tsx`.
- Onboarding flow: `WelcomePage.tsx` → `OnboardingPage.tsx` → `DashboardPage.tsx`.
- Authed pages: Dashboard, Calls, Leads, Settings.

### 7.2 Rules that flip vs. marketing

| Concern | Marketing | Dashboard |
|---|---|---|
| Float animations | Required (P4) | Forbidden |
| Mouse parallax | Required (P7) | Forbidden |
| Scroll entrances | Required on every section | Use sparingly — only on first load of a page section |
| Counters | Animate 0 → target | Render values directly. No 1.2s delay before a user sees their data. |
| Lenis smooth scroll | Required | Keep enabled at root, but never delay critical interactions |
| Float / blueprint grid | Encouraged in hero | Subtle/absent — don't compete with data |
| Copy density | Editorial / spacious | Information-dense, scannable, terse labels |
| Headlines | Display-2xl / display-lg | display-sm or smaller; data is the hero |
| Eyebrows / italic gradient words | Required | Avoid — too theatrical for app chrome |

### 7.3 Dashboard component rules

- Reuse `components/UI.tsx` primitives (Button, Card, GlassCard, Section, Badge). Extend there before forking.
- Tables: zebra via `bg-navy-mid` alternating rows, no row borders. Header: `text-offwhite/40 uppercase tracking-[0.1em] text-xs`.
- Empty states: glass card with mono icon, single line of copy, single CTA. Never a giant illustration.
- Loading: skeleton shimmer in `bg-white/[0.04]` over `bg-navy-mid`. Never spinners on full sections.
- Errors: inline orange-soft text. Never red. Use `text-orange` for action-required, `text-accent` for info.

### 7.4 Auth & routing

- Supabase auth via `src/lib/supabase.ts`.
- Protect routes with the existing guard pattern in `App.tsx` / shell. Do not invent a parallel auth layer.
- Login page: `LoginPage.tsx`. Redirect logic flows through the router, not via `window.location`.

---

## §8 — Backend & Integrations

### 8.1 Stack (server)

```
Express (server/src/index.ts)
TypeScript (~5.8)
Pino logging (pino-pretty in dev)
Zod for runtime validation at every boundary
Supabase JS client (@supabase/supabase-js)
Deployed on Railway
```

### 8.2 Layout

```
server/src/
├── index.ts              ← app bootstrap
├── lib/                  ← prompt-builder, emergency, internal helpers + their tests
├── routes/
│   ├── auth/             ← session / signup / login
│   ├── calls/            ← call data API for dashboard
│   ├── clients/          ← tenant / customer mgmt
│   ├── health/           ← liveness / readiness
│   └── webhooks/         ← Twilio + Retell + Stripe inbound
└── services/
    ├── calendar.ts       ← Google Calendar
    ├── resend.ts         ← email (Resend)
    ├── retell.ts         ← AI voice (Retell)
    ├── supabase.ts       ← server-side Supabase admin client
    └── twilio.ts         ← phone numbers + SMS/voice
```

### 8.3 Conventions

- **Validate at boundaries.** Every webhook handler and every public route validates input with a Zod schema; infer types via `z.infer<typeof schema>`. Never trust external payloads.
- **Errors**: catch `unknown`, narrow with `instanceof Error`, log with Pino with structured fields. Never `console.log`. Never swallow.
- **Secrets**: `import.meta.env` on the client, `process.env` on the server. Validate presence on boot. No hard-coded keys.
- **Webhook idempotency**: Twilio and Retell can retry. Persist a delivery id in Supabase before processing; reject duplicates.
- **Logging**: include request id, tenant id, integration name, and outcome. Never log secrets, full call audio, or PII without masking.

### 8.4 Supabase

- Schema lives in `supabase/migrations/*.sql`. Treat migrations as append-only; never edit a committed migration — write a new one.
- Tenant isolation is via RLS. Any new table needs RLS policies before merge.
- Use the **server** Supabase client (service role) only inside `server/`. The **browser** client (`src/lib/supabase.ts`) uses anon key + RLS.

### 8.5 Integration boundaries (do not break)

| Integration | Where | What it does | Don't break |
|---|---|---|---|
| Retell | `server/src/services/retell.ts` | AI voice agent answers calls | Prompt-builder lives in `server/src/lib/prompt-builder.ts`. Changing prompt schema requires retesting against Retell. |
| Twilio | `server/src/services/twilio.ts` + webhooks | Number provisioning, SMS, call routing. Supports both new-number and keep-existing-number modes (see commit a65cfa5). | Never log raw call recordings. Verify webhook signatures. |
| Stripe | `components/StripeCheckoutModal.tsx` + server webhook | Subscriptions / billing | Never trust client-side price IDs alone. Verify on webhook. |
| Resend | `server/src/services/resend.ts` | Transactional email | Templates must use UK English. |
| Google Calendar | `server/src/services/calendar.ts` | Job booking into trade's diary | OAuth tokens stored encrypted; refresh flow runs server-side only. |
| Gemini TTS | `components/AudioPlayer.tsx` (client) | Demo audio | Uses `import.meta.env.VITE_GEMINI_API_KEY`. Mission-critical for the demo CTA. |

---

## §9 — Code Conventions (TS / React)

### 9.1 Stack reality

```
React 19.2
Vite 6.2
TypeScript ~5.8
Tailwind v4 via @tailwindcss/vite — config lives in index.css (@theme)
react-router-dom 7
Lucide icons
Lenis smooth scroll (initialised in index.tsx)
Supabase JS
Google Gemini TTS (@google/genai) for AudioPlayer
```

`tailwind.config.ts` exists as legacy mirror — keep tokens in sync with `index.css` `@theme`. Do not delete it without replacing every tooling consumer.

### 9.2 Permitted additions

- `@radix-ui/react-*` for accessible modals / accordions / dropdowns
- `canvas-confetti` for conversion events

### 9.3 Forbidden additions

Framer Motion, GSAP, Redux, Zustand, any CSS-in-JS library, Next.js. (Lenis + CSS + IntersectionObserver covers all motion needs.)

### 9.4 TypeScript rules

- Public APIs (exported functions, hooks, components, services): explicit parameter and return types.
- Component props: named `interface`, never inline. Don't use `React.FC`.
- `unknown` for external input; narrow before use. `any` is forbidden in app code.
- Validate external input with Zod (server **and** client where it crosses a trust boundary).
- Immutability: spread/derive, never mutate. `Readonly<T>` for inputs that must not be mutated.

### 9.5 File & function size

- Files: 200–400 lines typical, 800 max.
- Functions: <50 lines.
- Components: <300 lines. If you cross it, extract subcomponents.
- **Known landmine**: `App.tsx` is currently ~2,000 lines (see §10). Don't add to it without proposing a split first.

### 9.6 Imports & paths

- No deep relative chains (`../../../`). Co-locate or alias.
- `import.meta.env` for client env vars (must be `VITE_*` prefixed).
- `process.env` only inside `server/`.

### 9.7 Logging

- Client: don't ship `console.log`. Use a typed `logger` wrapper that no-ops in production.
- Server: Pino only. Structured fields, never string concatenation for context.

### 9.8 Performance budgets (marketing only)

| Metric | Target |
|---|---|
| LCP | < 1.5s |
| CLS | 0 |
| INP | < 200ms |
| FCP | < 0.8s |
| JS bundle (gzipped) | < 150KB |

Lazy-load below-fold components (`AudioPlayer`, `Calculator`, `Testimonials`, `BookDemo`, `StripeCheckoutModal`). Below-fold images: `loading="lazy"`. Hero image: `fetchpriority="high"` + explicit width/height.

### 9.9 Accessibility (mandatory floor)

- WCAG AAA contrast on text.
- Focus: `:focus-visible { outline: 2px solid #FF6B2B; outline-offset: 3px; }`
- Touch targets ≥ 48×48px.
- All animations honour `prefers-reduced-motion`.
- AudioPlayer has a text transcript fallback.
- Every section has a heading (`h2` typically) and `aria-labelledby`.

### 9.10 Mobile-first

- Default layout assumes 375px.
- Float animations: 50% intensity on mobile.
- Sticky-scroll Features section: collapse to vertical stack on mobile.
- Mouse parallax: disabled on touch.
- Sticky bottom CTA bar visible on mobile only.

---

## §10 — Known Landmines

| File / area | Landmine | What to do |
|---|---|---|
| `App.tsx` | ~2,000 lines / 85KB. Violates the 800-line ceiling in §9.5. Splitting is desirable but high-risk because it owns hero, sections, and routing wiring. | Don't bulk-add to it. When you must touch it, propose extracting one section at a time into `components/sections/<Section>.tsx`. Never rewrite wholesale in a single PR. |
| `tailwind.config.ts` vs `index.css` `@theme` | Two sources of token truth. Tailwind v4 reads CSS; the TS file is legacy. | Treat `index.css` as canonical. Mirror any token change into `tailwind.config.ts` so legacy tooling stays consistent. Do not delete the TS file without an audit. |
| Legacy color aliases (`brand-*`, `tradeBlue.*`) | Older components still reference them. | Keep them. Don't "clean up" without a grep + replace pass. |
| `components/AudioPlayer.tsx` | Mission-critical for the marketing demo CTA. Uses `@google/genai` with `VITE_GEMINI_API_KEY`. | Don't change the audio pipeline without a manual end-to-end test (button → audio playing). API key must remain `VITE_*`. |
| `components/WaitlistModal.tsx` / `StripeCheckoutModal.tsx` | The original spec referenced a Google Apps Script webhook for waitlist. Reality is Supabase + Stripe. | If you see the Apps Script reference anywhere, it's stale spec, not live code. |
| Twilio number flows | Two modes: provision new number, **or** keep customer's existing number (commit a65cfa5). | Onboarding and call routing must handle both branches. Backfill endpoint exists (commit 23e2735). |
| Webhook backfill | `server/src/routes/webhooks` + the backfill endpoint replay missed events. | When changing webhook handlers, ensure they remain idempotent — replays are real. |
| Supabase migrations | Append-only. | Never edit a committed migration. Add a new one. |
| Lenis | Initialised once in `index.tsx`. | Don't re-initialise per page. Don't replace with native scroll. |
| Float animation tax | `animate-float-*` runs forever. | Cap at 3 floating elements per section. Never on the dashboard. |

---

## §11 — Decision Algorithms

When a request is ambiguous, follow these.

### "Improve / redesign / fix the site"

1. Ask: marketing landing, dashboard, or backend?
2. Ask: which specific section / route / endpoint?
3. Read the current implementation before proposing changes.
4. Map the change against §0 (Five Laws). If any conflict, surface it.

### "Add a new section to the landing page"

1. Confirm where it sits in the §6.1 mandatory order.
2. Use the §5.1 section wrapper.
3. Eyebrow → headline (one gradient keyword max) → body → CTA.
4. Wire scroll entrance via `useScrollAnimation` + `data-animate`.
5. If it has stats, animate counters via `useCounter` (P3).
6. Mobile-test at 375px.
7. Run §12 Definition of Done.

### "Add a button"

1. Primary action? Use §5.2 Primary CTA recipe verbatim.
2. Secondary? §5.3.
3. Copy from §1 voice cheat sheet — never "Get Started" / "Learn More".
4. Confirm focus-visible outline is present.

### "Add a new colour / radius / shadow"

Don't. Use existing tokens. If genuinely missing, propose a token addition in **both** `index.css` `@theme` and `tailwind.config.ts`.

### "Add a new dependency"

1. Check §9.3 forbidden list.
2. Justify why an existing dep + small code can't do it.
3. Check bundle impact (should fit §9.8 budget).
4. If it's an animation library, the answer is no.

### "Refactor / split a big file"

1. If it's `App.tsx`: see §10. One section at a time.
2. Preserve public exports and routing surface.
3. After move, build and load the page in browser. Confirm no visual regression and no console errors.

### "Change a webhook handler"

1. Idempotency first — see §10.
2. Validate input with Zod.
3. Log with structured Pino fields.
4. Verify signature where the integration provides one.

### "Add a new integration"

1. New service file in `server/src/services/<name>.ts`.
2. New route(s) in `server/src/routes/`.
3. Zod schemas at the boundary.
4. Document in §8.5 of this file in the same PR.

---

## §12 — Pre-flight Ritual & Definition of Done

### Before you edit

- [ ] Read this file's relevant section.
- [ ] Read the target file(s) end-to-end.
- [ ] Identify which surface (§2) the change affects.
- [ ] Confirm no §0 Five Laws violation.

### Before you report complete

- [ ] Visual diff matches intent on the affected surface (load it in browser).
- [ ] Mobile at 375px sane.
- [ ] No new `border-*`/`divide-*`/`<hr>` in layout (except the §0 exception).
- [ ] No pure black, pure white, Inter.
- [ ] All transforms ≥ 300ms with one of the §4.1 easings.
- [ ] `prefers-reduced-motion` honoured.
- [ ] Focus states visible on all new interactive elements.
- [ ] No `console.log` left behind.
- [ ] Public APIs typed; props in named interfaces.
- [ ] No new dependency added without justification (§11).
- [ ] If touching env: required vars listed in `.env.example`.
- [ ] If touching webhooks: idempotency preserved.
- [ ] If touching Supabase schema: new migration, RLS policies updated.
- [ ] Build passes (`npm run build`); server build passes if server changed (`npm run build:api`).
- [ ] Manually exercised the change. Type-checking is not feature-checking.

### Useful commands

```
npm run dev          # web + api together (concurrently)
npm run dev:web      # vite only
npm run dev:api      # express only
npm run build        # vite production build
npm run build:api    # tsc for server
```

---

## §13 — Forbidden / Permitted Quick Reference

| Category | Forbidden | Use instead |
|---|---|---|
| Colour | `#000`, `#FFF`, unsaturated grey | Tokens in §3.1 |
| Borders / lines | `border-*`, `divide-*`, `<hr>` for layout | Tonal elevation, glass, gradient fades, spacing |
| Shadow base | `rgba(0,0,0,…)` | `rgba(2,13,24,…)` (void) |
| Font | Inter, system-ui, generic stacks | Space Grotesk + Manrope only |
| Animation libs | Framer Motion, GSAP | Lenis + CSS + IntersectionObserver |
| Animation feel | Bouncy spring | Mechanical / precision / smooth easings |
| Animation duration | < 300ms for transforms | ≥ 300ms |
| Decoration | Random blobs, particles, orbs | Blueprint grid, real product UI floats |
| Imagery | AI art, US stock photos, robotic imagery | Real UK trade photography |
| Copy | "Get Started", "Learn More", "Powered by AI" | §1 voice cheat sheet |
| Headline | Whole headline in gradient | One gradient italic keyword max |
| Layout | Full desktop symmetry | Asymmetric editorial |
| Gradient palette | Purple→pink, rainbow | Industrial Luminescence recipes only |
| State | Redux, Zustand, CSS-in-JS | React state + Supabase + URL |
| Routing | Custom router | `react-router-dom` (already installed) |

---

## §14 — Project Constants

| Constant | Value |
|---|---|
| Locale | `en-GB` (numbers, dates, currency) |
| Currency | £ |
| Phone format | UK |
| Trial length | 14 days, no card required |
| Pricing | Starter £29 / Pro £59 / Agency £119 (monthly; annual = 2 months free) |
| Reduced-motion fallback | Mandatory |
| Touch-target floor | 48×48px |
| Focus outline | `2px solid #FF6B2B`, offset 3px |

---

## §15 — How to Update This File

This file changes when reality changes. Procedure:

1. Make the code change first.
2. In the **same PR**, update the affected section here.
3. If a §10 landmine was resolved, remove it.
4. If a new landmine emerged, add it.
5. If a §0 Law was challenged, do not change it without surfacing the trade-off and getting an explicit decision.
6. Bump the version line at the bottom.

When this file disagrees with the code, the code is right. Reflect reality, then debate the spec.

---

*Trade Receptionist Constitution — built to last, like the tools it serves.*
*v3.0 · 2026-04-26*

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Trade-receptionist** (1273 symbols, 1651 relationships, 26 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Trade-receptionist/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Trade-receptionist/clusters` | All functional areas |
| `gitnexus://repo/Trade-receptionist/processes` | All execution flows |
| `gitnexus://repo/Trade-receptionist/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
