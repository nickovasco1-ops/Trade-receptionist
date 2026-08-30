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

**Trade Receptionist** is a premium AI virtual receptionist for UK tradespeople (plumbers, electricians, builders, HVAC, construction). It answers calls, books jobs, filters spam, and sends SMS + email summaries so the trade never loses a customer while under a sink or on a roof.

**Multi-tenancy model**: one subscriber = one row in the `clients` table = one dedicated Retell voice agent + one dedicated Twilio phone number + one `business_config` row (hours, tone, emergency keywords, pricing). There is no shared agent — every tenant's system prompt is generated fresh per-tenant by `server/src/lib/prompt-builder.ts` and pushed to a Retell agent created just for them at signup (`server/src/routes/webhooks/stripe.ts` → `provisionClient()`, or manually via `POST /clients/provision`). Tenant isolation on the frontend is enforced by Supabase RLS keyed on `owner_email = auth.jwt() ->> 'email'`; the backend uses the Supabase **service-role** key and bypasses RLS entirely, so tenant isolation server-side is enforced by application code (matching `owner_email` / `client_id` on every query), not by the database. See §8.9.

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
| Trust signal | "14-day free trial. No charge today." | "Free trial available", "No card required" (false — Stripe Payment Links are `payment_method_collection=always`) |
| Urgency line | "While you read this, a competitor is answering their calls." | "Don't miss out!" |

### §1.1 — Claims & substantiation (legal floor, not a style preference)

UK consumer law applies to every number on the marketing site. The **DMCC Act 2024**
gave the CMA direct enforcement powers from April 2025 — fines up to **10% of global
turnover, without going to court**. Fake reviews and fake consumer-volume claims are
listed in Schedule 20 as *automatically unfair* practices. The **CAP Code** separately
requires the advertiser to *hold documentary evidence* for any objective claim.

**The rule: every number on a marketing surface must be checkable against either
(a) `src/lib/plans.ts` / shipped product behaviour, or (b) a named, independent,
citable source. If it is neither, it does not ship.**

Prohibited without evidence in hand:

| Class | Examples | Why |
|---|---|---|
| Performance metrics | "98.7% answer rate" | Needs a real denominator. As of 2026-08-11 the DB holds 29 calls total — no basis for 3-sig-fig precision. |
| Customer volume | "500+ UK tradespeople", "Join 500+" | DB holds **7 clients, 0 paying**. |
| Superlatives | "The UK's #1…", "Britain's best" | Unsubstantiable comparative — needs market-share evidence. |
| Aggregate outcomes | "£4,200 revenue recovered/yr" | Implies a customer result we have not measured. |
| Third-party statistics | "27% never ring back", "3 in 5 jobs" | Must cite a named independent source. **Vendor/agency marketing blogs are not evidence** — most "missed call cost" figures online trace back to competitors' own press releases. |

**Testimonials**: only from real customers who have given permission, quoted
accurately, with their actual trade. Never invent a name, company or location.
Never attach a star rating the customer did not give.

**Preferred alternative to a fabricated statistic** — a transparent worked example
whose assumptions are visible on screen (this is what `Calculator.tsx` does). An
arithmetic model the visitor can check is not a claim about the world, and carries
no substantiation burden. State the inputs, never present the output as research.

> **"No card required" was false and shipped in 7 places** (including the Stripe
> checkout modal itself) until 2026-08-30. Every Payment Link is
> `payment_method_collection=always` — Stripe demands a card before the trial
> starts. Corrected to "No charge today" / "No charge for 14 days", which is
> true and keeps the risk reversal. If you ever want the literal claim back, the
> product has to change first: set `payment_method_collection=if_required` on all
> four links. Copy follows behaviour, never the reverse.

> Swept on 2026-08-11: removed "500+", "98.7%" (×3, incl. a customer-facing Resend
> template) and "UK's #1". `CLAUDE_CODE_PROMPT.md` was also corrected — it had been
> *prescribing* these figures, which is how they entered the codebase.

**The £4,200 figure** is now a *stated assumption*, not a statistic: "miss one £350
job a month and that's £4,200 a year" (£350 × 12 = £4,200). Keep that framing — the
bare number with an "avg. UK tradesperson" label is a research claim we cannot
evidence. `Calculator.tsx` defaults were retuned from 6 missed calls/week (~£30,600/yr,
7× the headline) to 1/week (~£5,040/yr) so the two figures agree; if you change one,
change the other. Searched 2026-08-11: **no independent source for £4,200 exists**,
and the £24k–£45k figures circulating online all trace back to competitors' own
marketing blogs — do not cite them.

> ⚠️ **Still outstanding**: `PAIN_STATS` and `ROI_STATS` in `App.tsx` carry
> "27% of callers never ring back" and "3 in 5 jobs go to whoever answers first",
> both uncited third-party statistics. They need a named independent source or the
> same worked-example treatment. Not yet actioned as of v3.2.

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

Body text on dark: `text-offwhite/70`. Captions/labels on dark: **`text-offwhite/58` minimum — never lower**.

> **Contrast floor (marketing site).** The audience reads this on a phone in a van cab in daylight. `/40` measures ~3.4:1 and fails WCAG AA for text under 24px; `/58` measures ~5.7:1 on `navy-mid`. Marketing surfaces were swept to a `/56` floor on 2026-08-11 — do not reintroduce sub-`/56` text opacities. Verify with a pixel-resolved contrast pass, not by eye.

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
| Deep | 5.5% | 16px | Background panels, hero overlays |
| Standard | 8% | 24px | Feature cards, stat panels |
| Elevated | 12% | 32px | Pricing cards, modals |
| Surface | 15% | 40px | Tooltips, popovers |

> Raised from 4/6/10% on 2026-08-11 for daylight legibility — at 4–6% the card edges disappear in bright ambient light. `index.css` also carries a `@media (prefers-contrast: more)` block that pushes these to 10/14/18%. The `.glass-ring` hairline is `rgba(255,255,255,0.12)` (was `0.08`) for the same reason.

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
  text-void font-semibold text-[15px] tracking-[-0.01em]
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

> **The label is `text-void`, not `text-white` — do not "fix" this back.** White on
> the orange CTA gradient measures **2.80:1** at the dark stop and **2.06:1** at the
> light stop; both fail WCAG AA (15px semibold is normal text, so the floor is 4.5:1).
> Void gives **6.98:1 / 9.49:1** with the brand orange completely unchanged, and
> dark-on-orange is the hi-vis safety convention — more on-brand for trades, not less.
> Swept across all 8 CTA sites on 2026-08-11 (marketing `Button`, dashboard `Button`,
> `ErrorFallback`, `NotFoundPage`, `LoginPage`, `PartnerPage` ×3, pricing toggle).

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

- Starter £49/mo (≤50 calls/mo)
- Pro £89/mo (≤150 calls/mo) — **Most Popular**, scaled card, orange glow
- Business £159/mo (≤350 calls/mo)
- Agency £249/mo (≤600 calls/mo)
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
| Risk reversal | "14-day free trial. No charge today." |
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
Express 4 (server/src/index.ts), Node 24 (see .nvmrc), TypeScript ~5.8, run via tsx (dev) / tsc (build)
helmet (CSP disabled — API is JSON-only, served to a cross-origin SPA)
express-rate-limit — three tiers: defaultLimiter 120/min, writeLimiter 20/min, webhookLimiter 300/min
Pino logging (pino-pretty in dev) + server/src/lib/observability.ts (structured logEvent/captureError, bridges to Sentry)
@sentry/node (gated on SENTRY_DSN — no-op if unset), instrument.ts imported first so it wraps everything
Zod for runtime validation at every boundary
Supabase JS client (@supabase/supabase-js), service-role key — bypasses RLS, see §8.9
retell-sdk (webhook signature verification) — separate from the client-side retell-client-js-sdk used by TestCallPage
@notionhq/client — optional ops logging (no-ops if NOTION_API_KEY unset)
Deployed on Railway (two railway.json files — see §10 landmine)
```

### 8.2 Layout (verified against source, 2026-08-06)

```
server/src/
├── index.ts                    ← app bootstrap: middleware order, router mounts, admin endpoints (inline, not a router)
├── instrument.ts                ← Sentry.init(), gated on SENTRY_DSN, imported first-line in index.ts
├── config/e2e.ts                 ← E2E_TEST_MODE short-circuits Retell/Twilio/Notion/Resend to fake deterministic responses
├── lib/
│   ├── prompt-builder.ts        ← builds the full per-tenant Retell system prompt + begin_message (see §8.6)
│   ├── emergency.ts             ← keyword-tiered emergency detection (critical/high/urgent) + SMS/email escalation
│   ├── observability.ts         ← logEvent/captureError — structured logging bridged to Sentry
│   ├── time.ts                  ← normaliseHour() — Postgres HH:MM:SS → HH:MM, '00:00' = unset sentinel
│   └── emergency.test.ts
├── routes/
│   ├── auth/                    ← Google Calendar OAuth (consent URL, callback, token exchange)
│   ├── billing/                 ← Stripe Billing Portal session creation
│   ├── bookings/                ← dashboard-facing booking CRUD + availability
│   ├── calls/                   ← call list/detail, recording proxy, backfill, browser test-call proxy
│   ├── clients/                 ← tenant provisioning, number assignment, settings, CRUD
│   ├── health/                  ← liveness + `/health/integrations` (which env vars are configured, booleans only)
│   ├── retell-tools/            ← check-availability + create-booking, called live by the Retell agent mid-call
│   └── webhooks/
│       ├── retell.ts            ← call_started / call_ended / call_analyzed
│       ├── stripe.ts            ← checkout.session.completed / invoice.* / customer.subscription.deleted
│       ├── improvmx.ts          ← inbound email auto-triage for hello@tradereceptionist.com
│       └── index.ts
└── services/
    ├── booking.ts                ← shared booking engine (used by both routes/bookings and routes/retell-tools)
    ├── calendar.ts                ← Google Calendar OAuth2 + freeBusy availability engine
    ├── lead-followup.ts           ← 48h–7day "we missed you" SMS follow-up (idempotent, admin/cron-triggered)
    ├── notion.ts                  ← optional ops logging: call log, subscribers, incidents DBs
    ├── resend.ts                  ← transactional email + HTML templates
    ├── retell.ts                  ← Retell agent/LLM lifecycle, number import, post-call SMS+email workflow
    ├── slot-cache.ts               ← 5-min in-memory cache of spoken availability, hints the LLM prompt
    ├── supabase.ts                 ← service-role Supabase client + Database type map
    └── twilio.ts                   ← number search/buy/release, SIP trunk attach, SMS sending
```

### 8.3 Conventions

- **Validate at boundaries.** Every webhook handler and every public route validates input with a Zod schema; infer types via `z.infer<typeof schema>`. Never trust external payloads.
- **Errors**: catch `unknown`, narrow with `instanceof Error`, log with Pino with structured fields. Never `console.log`. Never swallow.
- **Secrets**: `import.meta.env` on the client, `process.env` on the server. Validate presence on boot. No hard-coded keys.
- **Webhook idempotency**: Twilio and Retell can retry. Persist a delivery id in Supabase before processing; reject duplicates.
- **Logging**: include request id, tenant id, integration name, and outcome. Never log secrets, full call audio, or PII without masking.

### 8.4 Supabase

- Schema lives in `supabase/migrations/*.sql` (18 migrations as of 2026-08-30). Treat migrations as append-only; never edit a committed migration — write a new one.
- **A `CHECK (col IN (...))` constraint is part of the type.** Widening a union in `shared/types.ts` without a matching migration produces a runtime insert failure, not a compile error. See the 018 landmine in §10.
- Six tables: `clients`, `business_config`, `calls`, `transcripts`, `leads`, `bookings`. Full list + purpose in §8.9.
- RLS policies exist on all six (added incrementally — `transcripts` had none until migration 015, a real bug that shipped: the dashboard silently showed zero transcripts for months). Any new table needs RLS policies **in the same migration**, not a follow-up.
- **RLS only governs the browser client.** `src/lib/supabase.ts` uses the anon key + user JWT, so RLS (`owner_email = auth.jwt() ->> 'email'`) is the real tenant boundary there. `server/src/services/supabase.ts` uses the **service-role key**, which bypasses RLS completely — every server route that returns tenant data must filter by `owner_email`/`client_id` in application code. There is no database-level backstop for a missing `.eq('client_id', ...)` in a server route.

### 8.4a — API authentication (added 2026-08-30)

`server/src/middleware/auth.ts` is the only auth boundary on the data plane. The
server uses the service-role key and bypasses RLS (§8.4), so a route without a
guard here is world-readable.

| Guard | Applies to | Mechanism |
|---|---|---|
| `requireAdmin` | Ops/provisioning: `GET/POST /clients`, `PATCH/DELETE /clients/:id`, `/provision`, `/:id/assign-number`, `/connect-number`, `/calls/backfill/:id` | `x-admin-key` vs `ADMIN_API_KEY`. **Fails closed** when the env var is unset. |
| `requireUser` | Dashboard surface: `GET /clients/:id`, `/:id/activation-code`, `/rebuild-agent`, `GET /calls`, `/calls/:id` | Supabase JWT → `res.locals.ownerEmail`. A valid admin key also satisfies it and sets `res.locals.isAdmin`. |
| `requireClientOwnership` | Any `:id` client route after `requireUser` | Confirms the row's `owner_email` matches the caller. Returns **404, not 403**, so another tenant's row is not confirmed to exist. |

List endpoints must additionally scope by `ownedClientIds(res)` — a guard proves
*who* is calling, not *which rows* they may read. `GET /calls` leaked every
tenant's calls precisely because it authenticated nobody and scoped nothing.

The dashboard reads `clients`/`calls` **directly from Supabase under RLS**, not
through these routes; only `PATCH /clients/:id/settings` and
`POST /clients/rebuild-agent` are called from the browser. Both send the user's
JWT — if you add a third, send `Authorization: Bearer <access_token>` or it 401s.

### 8.5 Integration boundaries (do not break)

| Integration | Where | What it does | Don't break |
|---|---|---|---|
| Retell AI | `server/src/services/retell.ts`, `server/src/lib/prompt-builder.ts` | Voice AI agent (voice `retell-Willa`/"Charlotte", en-GB) answers every call. One agent + one LLM per tenant, created at provisioning. | Prompt-builder assembles ~200 lines of tenant-specific instructions (tone, booking rules, emergency keywords, rates, escalation). Changing its output shape requires retesting live against a Retell agent. `buildBeginMessage()` is deliberately static — a dynamic greeting previously caused the LLM to greet-and-hang-up in the same turn. |
| Twilio | `server/src/services/twilio.ts` + `routes/webhooks` (form-encoded) | UK number search/purchase, SIP trunk attach (this is what actually routes inbound PSTN calls into Retell — a number without a trunk attach just says "incorrect number"), SMS sending. Supports **new-number** mode (bought number is the advertised business number) and **keep-existing** mode (`**004*{number}#` universal-divert USSD code forwards the tenant's real number). | Never log raw call recordings. `TWILIO_ADDRESS_SID`/`TWILIO_BUNDLE_SID` required for UK regulatory number purchase. |
| Stripe | `components/StripeCheckoutModal.tsx` (static Payment Links per plan, `src/lib/plans.ts`) + `server/src/routes/webhooks/stripe.ts` | Subscriptions / billing. `checkout.session.completed` runs the **entire tenant provisioning pipeline** (Retell agent + Twilio number + Supabase auth user + welcome email) — this is the most consequential webhook in the codebase. | Webhook signature is verified by hand (HMAC-SHA256 of `timestamp.rawBody`, `timingSafeEqual`) — **not** the Stripe SDK. If `STRIPE_WEBHOOK_SECRET` is unset, verification is silently skipped. `PRODUCT_TO_PLAN` hardcodes live+test Stripe product IDs — a new/changed Stripe product needs this map updated or new signups silently get no plan. |
| Resend | `server/src/services/resend.ts` | Transactional email (post-call summaries, booking confirmations, trial reminders, welcome email, ImprovMX auto-replies). | Templates must use UK English. Defaults `RESEND_FROM_EMAIL` to `hello@tradereceptionist.com` if unset. |
| Google Calendar | `server/src/services/calendar.ts`, `routes/auth` | Per-tenant OAuth2; agent checks `freeBusy` live mid-call via `retell-tools` and books directly into the trade's diary. | OAuth `state` param is HMAC-signed (`GOOGLE_OAUTH_STATE_SECRET`, falls back to `SUPABASE_SERVICE_ROLE_KEY` if unset). Refresh-token exchange runs server-side only. |
| Notion | `server/src/services/notion.ts` | **Optional internal ops dashboard** — call log, subscriber signups, incident audit trail, three separate databases. Lazy-inits and silently no-ops if `NOTION_API_KEY` is unset — never blocks the call/webhook pipeline. | Fire-and-forget by design; never let a Notion write become load-bearing for the call flow. |
| Sentry | `index.tsx` (frontend, DSN **hardcoded**, EU region) + `server/src/instrument.ts` (backend, gated on `SENTRY_DSN` env var) | Error + performance tracking, session replay (frontend), source-map upload at build time (`SENTRY_AUTH_TOKEN`). | Frontend DSN is intentionally not an env var (see `.env.example` comment) — don't "fix" this into `VITE_SENTRY_DSN` without checking `vite.config.ts`'s Sentry plugin config first. Backend is a genuine no-op without `SENTRY_DSN` — fine for local dev. |
| Crisp | `components/CrispChat.tsx`, mounted globally in `index.tsx` | Live chat widget on the marketing site. | Controlled entirely by `VITE_CRISP_WEBSITE_ID` — blank disables it, no code change needed for local dev. |
| ImprovMX | `server/src/routes/webhooks/improvmx.ts` | Inbound email webhook for `hello@tradereceptionist.com` (ImprovMX is an email-forwarding service, not a full support desk) — keyword-categorises and auto-replies via Resend. | Does not create tickets anywhere; purely a triage auto-responder. Skips automated senders and internal `@tradereceptionist.com` addresses to avoid reply loops. |
| Google Gemini (`@google/genai`) | `scripts/generate-sample-call.mjs` — **build-time only** | Pre-generates the static demo call audio file (`public/assets/generated/sample-call.wav`) played by `components/AudioPlayer.tsx`. | **Not a runtime/browser dependency** — despite what earlier versions of this file said. Uses server-side `GEMINI_API_KEY` (never `VITE_GEMINI_API_KEY` — the script's own comments explicitly warn against browser-side Gemini calls). `AudioPlayer.tsx` itself just plays a static `.wav` via `<audio>` + Web Audio API for the waveform visualisation; it has zero API dependency at runtime. Regenerate via `npm run generate:demo-audio`. |
| Google Apps Script (waitlist) | `components/WaitlistModal.tsx` | Waitlist signup form `POST`s to a hardcoded `script.google.com/macros/s/...` URL. | **This is live, current behaviour** — not stale legacy, despite what earlier versions of this file claimed. If you migrate this to Supabase, update this row and remove the Apps Script URL. |

### 8.6 Call lifecycle (Retell webhook flow)

1. **`call_started`** → upsert `calls` row keyed on `retell_call_id` (`ignoreDuplicates: true` — Retell retries are expected).
2. Live, mid-call: the agent may call the `retell-tools` endpoints (`check-availability` / `create-booking`) to check the tenant's Google Calendar and book directly. Both verify `X-Retell-Signature` **via `retell-sdk`'s `verify()`** — Retell signs custom-function calls with the same `v={unix_ms},d={HMAC(body+timestamp)}` scheme as webhooks. This was a hand-rolled plain `HMAC(body)` and therefore **rejected every request from 2026-05-21 to 2026-08-30** (see §10).
3. **`call_ended`** → upsert `calls` (never overwrite `started_at`/`ended_at` with null), upsert `transcripts`, derive `outcome` from Retell's structured post-call analysis (fallback: regex on the summary), derive emergency tier via `server/src/lib/emergency.ts` keyword matching, upsert a `leads` row for outcomes `booked|lead_captured|enquiry|emergency|no_answer|voicemail` (unique on `leads.call_id`, migration 010 — prevents duplicate leads on webhook retry).
   - **Emergency** → `escalateEmergency()` (owner SMS + email, tier-appropriate copy) + Notion incident-style call log, then returns early — skips the normal post-call workflow.
   - **Normal** → `postCallWorkflow()` (owner SMS + owner email + optional caller SMS confirmation, each channel's failure caught independently) + Notion call log.
4. **`call_analyzed`** (fires after `call_ended`, once Retell finishes deeper analysis) → backfills `recording_url` if still missing, refines transcript/lead fields.
5. All post-webhook processing runs fire-and-forget **after** the `200` ack — Retell's webhook signature verification uses `retell-sdk`'s `verify()` (SHA-256 of `body+timestamp`, 5-minute replay window). A bad signature is logged as `error` (triggers Railway/Sentry alerting) but still returns `200 {ok:false}` to avoid Retell retry storms; recovery path is `POST /admin/sync-calls`.

### 8.7 Tenant provisioning & billing flow

Two entry points do the same underlying work, with different guarantees:

- **`checkout.session.completed` webhook** (`routes/webhooks/stripe.ts` → `provisionClient()`) — the real-world path. Runs: insert `clients` → insert `business_config` (defaults: 08:00–18:00 Mon–Fri, Europe/London, standard emergency keywords) → build prompt + `createRetellAgent()` → buy/attach a UK Twilio number → create Supabase auth user + magic link → send welcome email (Resend) → log to Notion. **No rollback** — if a later step fails, earlier steps are left in place and the failure is only logged. Idempotent on `owner_email` (re-running just updates lifecycle fields).
- **`POST /clients/provision`** (`routes/clients/index.ts`) — manual/admin path with the same steps, but **with full rollback** on any failure in steps 1–8 (deletes the Twilio number, Retell agent + LLM, and the `clients`/`business_config` rows). If only the final Supabase-persist step fails, returns `207` with the provisioned provider IDs so a human can `PATCH` them in manually rather than losing already-purchased infrastructure.
- **Number mode** is decided per-tenant by whether `own_number` is set on the request: unset → **new_number** mode (bought number is the tenant's advertised number); set → **keep_existing** mode (tenant keeps their real number, activates a UK carrier divert code `**004*{twilio_number}#` — works on EE/O2/Vodafone/Three/BT Mobile/Sky Mobile).
- Stripe lifecycle events (`invoice.payment_succeeded/failed`, `customer.subscription.deleted`) update `clients.subscription_status`/`payment_status`/`is_active`/`current_period_end`, matched in priority order: `stripe_subscription_id` → `stripe_customer_id` → `owner_email`.

### 8.8 Admin / cron-triggered endpoints

No scheduler exists inside this repo — these are designed to be hit by an external cron (Railway cron, GitHub Actions, etc.) and are all gated by an `x-admin-key` header matching `ADMIN_API_KEY` (checked inline per-route in `index.ts`, not shared middleware):

| Endpoint | Purpose |
|---|---|
| `POST /admin/check-tenant-integrity` | Diffs Stripe ↔ Supabase ↔ Retell ↔ Twilio per tenant and reports anyone whose product is not actually working (no agent, no number, number off the SIP trunk, number not imported into Retell, bound to the wrong agent, missing `business_config`, billing drift, churned-but-active). Read-only. Emails critical findings when `INTEGRITY_ALERT_EMAIL` is set. **Intended daily** — this is the only thing between a half-provisioned tenant and a customer complaint. |
| `POST /admin/send-trial-reminders` | Emails clients 8–10 days into a `trialing` subscription. Intended daily. |
| `POST /admin/run-lead-followup` | Runs `services/lead-followup.ts` — 48h–7day "we missed you" SMS to uncontacted leads. Intended recurring. |
| `POST /admin/sync-calls` | Pulls recent calls from Retell per-agent, backfills any missing from Supabase. Webhook-delivery-failure recovery. |
| `POST /admin/test-notifications` | Sends a live diagnostic SMS+email for a given `clientId`. |
| `POST /admin/notify-call` | Re-fires post-call notifications for a `retellCallId` that missed them. |
| `POST /admin/fix-agent-greeting` | Directly patches `begin_message`/turn-taking on a Retell agent, reads back to verify. |
| `POST /admin/enable-recording` | Bulk-patches `record_audio: true` onto every tenant's Retell agent. |

### 8.9 Database schema

Six tables (`supabase/migrations/002_revised_schema.sql` onward — `001_initial_schema.sql` created a different schema that 002 drops entirely, so treat 001 as dead history, not a reference):

| Table | Purpose | Notable columns added later |
|---|---|---|
| `clients` | One row per tenant | `own_number` (003), `onboarding_complete` (005), Stripe lifecycle columns — `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `payment_status`, `current_period_end` (011), lowercased-email trigger (012), `plan` check widened to include `'business'` (018) |
| `business_config` | Per-tenant hours/tone/pricing | `receptionist_tone` (006), `after_hours_message` (007), `avg_job_value` (013, default 250 — feeds dashboard missed-revenue estimates) |
| `calls` | One row per Retell call | — |
| `transcripts` | Full call transcript | RLS policy only added in 015 (see §8.4) |
| `leads` | Extracted lead per qualifying call outcome | unique on `call_id` (010), `follow_up_sent_at` (014), `property_type` + `customer_availability` (016), `'flagged_for_review'` status value (017) |
| `bookings` | Confirmed calendar bookings | `call_id` FK (009), partial unique indexes: one scheduled booking per lead + one per client+timeslot (008) |

**RLS pattern**: every policy compares `owner_email = auth.jwt() ->> 'email'` on `clients` directly; every child table uses `client_id IN (SELECT id FROM clients WHERE owner_email = auth.jwt() ->> 'email')` (or a `calls JOIN clients` for `transcripts`, which has no direct `client_id` column). Consistent "walk up to `clients` via `owner_email`" model — reuse it verbatim for any new tenant-scoped table.

### 8.10 Deployment

- **Frontend**: Vercel. `vercel.json` — `outputDirectory: dist`, rewrites `/api/:path*` → the Railway backend URL (this is how the SPA avoids CORS for same-origin-looking calls), catch-all SPA rewrite to `index.html`, CSP allow-lists `*.supabase.co`, `api.retellai.com`, and the Sentry ingest endpoint. Deploys on push (Vercel's own Git integration — no custom GitHub Action for this).
- **Backend**: Railway. **Two `railway.json` files exist with different settings** — root `railway.json` (`buildCommand: cd server && npm ci --include=dev && npm run build`, 60s healthcheck timeout, `restartPolicyType: ALWAYS`, 10 retries) and `server/railway.json` (assumes the service root is `server/` directly, 30s healthcheck timeout, `restartPolicyType: ON_FAILURE`, 3 retries). Which one Railway actually reads depends on the Railway service's configured root directory — **check the Railway dashboard, don't assume**, before editing either file. Healthcheck hits `/health`.
- **CI**: `.github/workflows/ci.yml` exists (injects test secrets for `.env.test` per that file's own comment) — read it before assuming what runs on PRs.

### 8.11 Environment variables — grouped by service

Full reference: `docs/ENVIRONMENT.md` + `npm run validate:env -- --env=<local|test|staging|production>` (checks presence/validity only, never prints values). Boot-blocking vs optional is enforced in `server/src/index.ts` (hard `process.exit(1)` vs warn-only) — this table reflects that, not aspiration:

| Var | Local dev | Notes |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | **Blocker** | `src/lib/supabase.ts` throws at import time if missing — frontend won't even mount. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **Blocker** | Server hard-exits on boot without these. |
| `RETELL_API_KEY` | **Blocker** | Server hard-exits on boot. Also the HMAC secret for webhook verification (no separate webhook secret). |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | **Blocker** | Server hard-exits on boot. |
| `TWILIO_SIP_TRUNK_SID` | Functional blocker | Not a boot check, but without it newly-bought numbers never route into Retell. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Warn-only locally, **required staging/prod** | Server boots without them but checkout/billing silently breaks. |
| `RESEND_API_KEY` | Warn-only locally, **required staging/prod** | Emails silently fail to send without it. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional locally, **required staging/prod** | Calendar OAuth. |
| `RETELL_WEBHOOK_URL`, `RETELL_FUNCTION_BASE_URL`, `RETELL_SIP_TERMINATION_URI`, `PUBLIC_API_BASE_URL` | Optional in code | Needed for live Retell dashboard config / custom tool URLs, not for local boot. |
| `NOTION_API_KEY` + 3 DB IDs | Fully optional | No-ops when absent — never blocks the call pipeline. |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Optional | Backend Sentry is a genuine no-op without `SENTRY_DSN`. Frontend DSN is hardcoded (not env-driven). |
| `VITE_CRISP_WEBSITE_ID` | Optional | Blank disables the widget. |
| `ADMIN_API_KEY` | Required only for the §8.8 admin endpoints | Not a boot check. **Fails closed** in `middleware/auth.ts` — an unset value authorises nothing. |
| `INTEGRITY_ALERT_EMAIL` | Optional | Where `/admin/check-tenant-integrity` emails critical findings. Unset = report is returned and logged only, nobody is told. |
| `GEMINI_API_KEY` | Not needed for `npm run dev` | Server-side only, used solely by `scripts/generate-sample-call.mjs` at build/content time — never set as `VITE_GEMINI_API_KEY`. |

### 8.12 Current state / open work (inferred from code, 2026-08-06)

- Core call → webhook → outcome → notify pipeline, tenant provisioning (both webhook and manual paths), Google Calendar booking (both live-call tool and dashboard-initiated), Stripe billing lifecycle, and the marketing site are all implemented and build clean.
- `docs/ONBOARDING.md` states stale pricing (Starter £29/100 calls, Pro £59/300 calls, Agency £119/unlimited — three tiers) that does not match the live four-tier pricing in `src/lib/plans.ts`, `App.tsx`, and `shared/types.ts` (Starter £49/Pro £89/Business £159/Agency £249). Fix the doc, not the code — see §10.
- `TestCallPage.tsx` (browser-mic Retell test harness) exists and is auth-gated but not linked from any nav — reachable only by direct URL (`/test-call`).
- `DashboardPreviewPage.tsx` and siblings (`OnboardingPreviewPage`, `DashboardPreviewCallsPage`, etc.) are public, unauthenticated sales-demo versions of the real dashboard — `DashboardShell` takes a `preview` prop that fakes auth state for this purpose. Don't wire real data into these.
- Test coverage: Playwright e2e (`e2e/`, `playwright.config.ts` + `playwright.smoke.config.ts`), one server unit test (`emergency.test.ts`). No frontend unit test runner is configured.

---

## §9 — Code Conventions (TS / React)

### 9.1 Stack reality

```
React 19.2
Vite 6.2 (Vite 6.4 as actually resolved — package.json pins ^6.2.0)
TypeScript ~5.8
Tailwind v4 via @tailwindcss/vite — config lives in index.css (@theme)
react-router-dom 7 (BrowserRouter/Routes live in index.tsx, not App.tsx — App.tsx is the marketing page only, mounted at "/")
Lucide icons
Lenis smooth scroll (initialised in index.tsx, marketing route only)
Supabase JS (anon key — RLS-governed, see §8.4)
retell-client-js-sdk — used by TestCallPage.tsx for the browser-mic live agent test, NOT the marketing AudioPlayer
@sentry/react + @sentry/vite-plugin — error/session-replay tracking + build-time source-map upload
@vercel/analytics
@google/genai — devDependency, build-time only (scripts/generate-sample-call.mjs), not shipped to the browser
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
| CTA gradient is **not** the documented brand orange | `components/UI.tsx` `Button` primary paints `linear-gradient(135deg, #F97316 0%, #F4A261 100%)` — neither stop is a §3.1 token (`#FF6B2B` → `#FF8C55`). The dashboard `Button` and the §5.2 recipe *do* use the tokens, so the primary CTA renders a different orange on marketing vs. dashboard. Found 2026-08-11 during the contrast audit. | Don't assume the documented token is what's on screen — measure the rendered value. Reconciling the two is desirable but is a visible brand change across every CTA, so it needs an explicit decision, not a drive-by edit. |
| Marketing claims re-seeding from `CLAUDE_CODE_PROMPT.md` | That file used to *instruct* an agent to ship "98.7% answer rate", "500+ trades served" and "£4,200 avg. savings" as animated counters. Corrected 2026-08-11, but it is the reason those figures existed at all. | Treat `CLAUDE_CODE_PROMPT.md` as a live input to future sessions. If you remove a claim from code, remove it there too or it comes straight back. See §1.1. |
| `components/AudioPlayer.tsx` | **Corrected 2026-08-06 — earlier versions of this file had this backwards.** It plays a static pre-generated `public/assets/generated/sample-call.wav` via `<audio>` + Web Audio API. It has **no runtime API dependency** — `@google/genai`/Gemini only runs at content-generation time via `npm run generate:demo-audio` (`scripts/generate-sample-call.mjs`), using a server-side `GEMINI_API_KEY`, never `VITE_GEMINI_API_KEY`. | Don't reintroduce a live browser-side Gemini call. To refresh the demo audio, regenerate the file and commit it; don't wire the player to a live API. |
| `components/WaitlistModal.tsx` | **Corrected 2026-08-06 — earlier versions of this file had this backwards.** It `POST`s to a live, hardcoded `script.google.com/macros/s/...` Google Apps Script URL. This **is** current production behaviour, not stale legacy — no Supabase-backed waitlist table exists. | If you migrate the waitlist to Supabase, update this row (and §8.5) in the same PR. Don't assume the Apps Script reference is dead code without checking. |
| Twilio number flows | Two modes: provision new number, **or** keep customer's existing number (`clients.own_number`, migration 003). | Onboarding and call routing must handle both branches — `buildProvisionResponse()` in `routes/clients/index.ts` branches on this. `POST /clients/connect-number` is the repair path for numbers provisioned before the SIP-trunk-attach step existed. |
| Retell phone-number agent fields | Retell **removed** the single-agent fields (`inbound_agent_id`, `outbound_agent_id`, `*_sms_agent_id`, and their `_version` siblings) on 2026-03-31 in favour of weighted lists (`inbound_agents: [{agent_id, weight}]`). `importTwilioNumber()` and `assignAgentToNumber()` still sent the old shape, so **every number import hard-failed** — the tenant got a purchased Twilio number that routed nowhere. Fixed 2026-08-30. | Retell ships breaking deprecations on a dated schedule; a working provisioning path can rot without any code change. When number routing breaks, check the deprecation notices before debugging our own code. Audit with `GET /list-phone-numbers` — any `clients.twilio_number` absent from that list is a tenant whose calls do not route. |
| Data plane shipped unauthenticated | Until 2026-08-30 `GET /clients` returned every tenant (emails, mobiles, Stripe ids) and `GET /calls` returned every call — both unauthenticated on the public internet. `DELETE /clients/:id`, `/provision` and `/:id/assign-number` were open too, the last two able to spend money buying Twilio numbers. Nobody noticed because the dashboard reads Supabase directly, so the routes had no visible consumer. | Guards now live in §8.4a. **A new route on `/clients` or `/calls` is public until you add one** — there is no default-deny and no RLS backstop. Probe any new endpoint unauthenticated before shipping. |
| Stripe lifecycle drift | `customer.subscription.deleted` never landed for several tenants: three churned customers still had `is_active: true` and a genuinely active payer was still labelled `trialing` (found 2026-08-30, not yet reconciled). Churned users therefore keep service. | `clients.subscription_status` is not self-healing — no reconciliation job exists. Trust Stripe, not the DB, and periodically diff the two. |
| `retell-tools` rejected every mid-call tool call | The custom-function endpoints verified a plain `HMAC-SHA256(body)` against the raw `X-Retell-Signature` header. Retell actually sends `v={unix_ms},d={HMAC(body+timestamp)}` — the identical mistake BUG-002a fixed in `webhooks/retell.ts` on 2026-06-10 (`4233cf1`). That fix was never applied here, so **`check_calendar_availability` and `create_calendar_booking` returned 401 on every real call for over three months** — the agent could never read a diary or book a job. Invisible because a failed tool is spoken away by the LLM, nothing logged at error level, and the only call-linked booking in the DB is a synthetic `auto_test_*` row. Fixed 2026-08-30. | **When you fix a signature scheme, grep for every other place that verifies one.** There are three: `webhooks/retell.ts`, `webhooks/stripe.ts`, `retell-tools/index.ts`. Always use the provider SDK's verify — never hand-roll. Tool rejections now log `error`-level as `retell_tools.invalid_signature`. |
| Webhook backfill | `POST /calls/backfill/:retell_call_id` and `POST /admin/sync-calls` replay missed Retell events by re-pulling from Retell's API. | When changing `routes/webhooks/retell.ts`, keep it idempotent — replays are a real, designed-for recovery path, not a hypothetical. |
| Supabase migrations | Append-only, 18 files as of 2026-08-30 (see §8.9). Migration 001 created a schema that 002 immediately drops — don't treat 001 as representative of the live schema. | Never edit a committed migration. Add a new one. |
| `clients.plan` check constraint drifted from `Plan` | The four-tier scheme shipped in `shared/types.ts`, `src/lib/plans.ts` and `PRODUCT_TO_PLAN`, but the DB check still only allowed `starter\|pro\|agency`. **Every Business-tier (£159) checkout failed** at the `clients` insert in `provisionClient()` — customer charged, no tenant row, no agent, no number, no welcome email. Shipped undetected until a paying customer reported it 2026-08-30 (Sentry `TRADE-RECEPTIONIST-API-A`). Fixed by migration 018. | TypeScript union widening is invisible to Postgres. When adding a `Plan`/status/enum value, grep `pg_constraint` for a matching `CHECK` and write the migration in the same PR. |
| `provisionClient()` fails silently to the customer | On any DB failure it logs to Sentry and `return`s. Stripe already got its `200`, so there is no retry and **no customer-facing signal** — the buyer is charged and simply gets nothing. Recovery is a manual webhook replay (sign `t.rawBody` with `STRIPE_WEBHOOK_SECRET` and POST the stored event to `/webhooks/stripe`; the `owner_email` idempotency check makes replay safe). | Treat any `stripe.webhook.db_persistence_failed` as a paying customer with a dead account, not a background error. It needs a same-day alert, not a dashboard someone reads later. |
| Lenis | Initialised once in `index.tsx`, marketing route (`/`) only. | Don't re-initialise per page. Don't replace with native scroll. |
| Float animation tax | `animate-float-*` runs forever. | Cap at 3 floating elements per section. Never on the dashboard. |
| Stripe live key not in Railway | `STRIPE_SECRET_KEY_LIVE` is in `.env` locally but Railway still uses the old key. | Add `STRIPE_SECRET_KEY=sk_live_...` to Railway environment variables so production payments go live. |
| Two `railway.json` files | Root `railway.json` and `server/railway.json` have different `buildCommand`, healthcheck timeout, and restart policy (§8.10). | Before editing either, confirm in the Railway dashboard which root directory the service actually uses — editing the wrong one silently does nothing. |
| `docs/ONBOARDING.md` pricing | States Starter £29 (100 calls)/Pro £59 (300 calls)/Agency £119 (unlimited) — a stale three-tier scheme that appears nowhere in code. | Live pricing is the four-tier Starter £49/Pro £89/Business £159/Agency £249 in `src/lib/plans.ts` (§6.3, §14). Fix the doc; don't "reconcile" the code toward it. |
| Stripe webhook signature verification | `routes/webhooks/stripe.ts` verifies by hand (HMAC-SHA256 of `timestamp.rawBody`), not via the Stripe SDK, and **silently skips verification** if `STRIPE_WEBHOOK_SECRET` is unset rather than rejecting the request. | Never deploy without `STRIPE_WEBHOOK_SECRET` set — an unset secret does not fail closed. |
| `checkout.session.completed` has no rollback | `provisionClient()` in the Stripe webhook keeps going and only logs on a failed step (unlike `POST /clients/provision`, which fully rolls back). | A real-world checkout can leave a tenant with e.g. a Retell agent but no Twilio number. `POST /admin/sync-calls` and manual `PATCH`/`POST /clients/:id/assign-number` are the recovery tools, not a webhook retry. |
| Two local env files needed | `server/package.json`'s `dev` script runs `tsx watch --env-file=../.env` — it reads root **`.env`** only, never `.env.local`. Vite (`dev:web`) reads `.env.local` automatically per its own convention. `npm run dev` runs both concurrently. | Keep both `.env` and `.env.local` populated with the same values for local dev (both are gitignored), or `npm run dev:api` boots with none of your secrets and hard-exits on the required-var check (§8.11). |

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
- [ ] `npm run test:e2e` is green and `npm test --prefix server` passes — CI runs both, and both were dark for months.
- [ ] Manually exercised the change. Type-checking is not feature-checking.

### Useful commands

```
npm run dev                    # web + api together (concurrently)
npm run dev:web                # vite only, http://localhost:3000
npm run dev:api                # express only, http://localhost:3001 (tsx watch, loads ../.env)
npm run build                  # vite production build → dist/
npm run build:api              # tsc for server → server/dist/
npm run preview                # preview the vite production build

npm test --prefix server        # server unit tests (node:test via tsx) — 44 tests
npm run test:e2e                # Playwright, full suite (what CI runs)
npm run test:e2e:ui             # Playwright UI mode
npm run test:e2e:debug          # Playwright debug mode
npm run test:smoke              # Playwright, playwright.smoke.config.ts (release smoke subset)
npm run test:release-smoke      # alias for test:smoke

npm run validate:env -- --env=<local|test|staging|production>   # checks required env vars are present, never prints values

npm run generate:demo-audio             # regenerate public/assets/generated/sample-call.wav (needs GEMINI_API_KEY, server-side)
npm run generate:call-flow-assets       # regenerate all call-flow illustration assets
npm run generate:landing-asset          # regenerate a single landing-page image asset

npm run visual-skill:dry-run    # trade-receptionist-visual-skill CLI, dry-run mode
```

CLIs installed on this machine for deploy/DB operations (not npm scripts): `supabase` (Supabase CLI), `railway` (Railway CLI), `vercel` (Vercel CLI). None are wired into npm scripts — invoke directly, e.g. `supabase db push`, `railway up`, `vercel --prod`. None are authenticated by default; each needs an interactive login (`supabase login`, `railway login`, `vercel login`) before first use.

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
| Trial length | 14 days. A card **is** collected at checkout (`payment_method_collection=always` on every Payment Link); nothing is charged until day 14 |
| Pricing | Starter £49 / Pro £89 / Business £159 / Agency £249 (monthly; annual = −20%, approx 2.4 months free) |
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

*v3.8 · 2026-08-30 — fixed `retell-tools` signature verification, which had been rejecting **every** mid-call `check_calendar_availability` and `create_calendar_booking` since 2026-05-21: it hand-rolled a plain `HMAC(body)` while Retell sends the webhook's `v=,d=` scheme, so the agent could never read a diary or book a job on a real call. Confirmed against production with an SDK-signed probe and corroborated by the DB (the only call-linked booking is a synthetic `auto_test_*` row). Now uses `retell-sdk`'s `verify()`; rejections log at error level; 8 e2e tests, all confirmed failing against the pre-fix code.*

*Trade Receptionist Constitution — built to last, like the tools it serves.*
*v3.1 · 2026-08-06 — §8 rewritten against verified source (routes, services, webhook flow, provisioning, DB schema, deploy config, env vars); corrected two backwards §10 entries (AudioPlayer/Gemini, WaitlistModal/Apps Script); added multi-tenancy note to §1.*
*v3.6 · 2026-08-30 — reconciled tenant lifecycle state against Stripe (three churned tenants were still `is_active`); added `/admin/check-tenant-integrity`; `DELETE /clients/:id` now releases the Twilio number and Retell agent instead of orphaning them; corrected the false "No card required" claim in 7 places and gave Business/Agency Payment Links their advertised 14-day trial; repaired the e2e suite (20 hard failures → 0, incl. two real bugs: a query-dropping redirect and webhook tests that were signing wrongly and asserting nothing) and widened CI to run it all.*
*v3.5 · 2026-08-30 — added §8.4a (API auth guards) after finding the entire data plane unauthenticated in production; two new §10 landmines (public data plane, Stripe lifecycle drift); Business/Agency Payment Links given the 14-day trial they had always been advertised with.*
*v3.4 · 2026-08-30 — fixed `importTwilioNumber()`/`assignAgentToNumber()` for Retell's 2026-03-31 weighted-agent-list migration (the old `inbound_agent_id` field was failing every number import); exported `welcomeHtml` and added `server/src/scripts/send-welcome.ts` to re-send a welcome email out-of-band, since replaying a Stripe event hits the idempotency path and skips it; new §10 landmine for the Retell deprecation.*
*v3.3 · 2026-08-30 — migration 018 widens `clients_plan_check` to include the `'business'` tier, which had been silently failing every £159 checkout since the four-tier scheme shipped; two new §10 landmines (type-vs-CHECK-constraint drift, and `provisionClient()`'s silent-failure mode); §8.4/§8.9 updated to 18 migrations.*
*v3.2 · 2026-08-11 — added §1.1 (claims & substantiation: DMCC Act 2024 / CAP Code floor) after removing "500+", "98.7%" ×3 and "UK's #1" from source; §5.2 primary CTA label changed `text-white` → `text-void` (white measured 2.80:1 / 2.06:1 on the CTA gradient, failing AA) and swept across all 8 CTA sites; two new §10 landmines (undocumented CTA gradient `#F97316`/`#F4A261`, and `CLAUDE_CODE_PROMPT.md` re-seeding fabricated claims).*

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Trade-receptionist** (2103 symbols, 4187 relationships, 160 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

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
