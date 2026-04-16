# Trade Receptionist — Master Development Constitution

> **Read this file entirely before touching a single line of code.**
> This is the unbreakable law of the codebase. Every design decision, component, interaction, and copy choice flows from this document. When in doubt: re-read it.

---

## 1. Project Identity & Creative North Star

### What This Product Is

**Trade Receptionist** is the premium AI virtual receptionist SaaS built exclusively for UK tradespeople — plumbers, electricians, builders, HVAC engineers, and construction contractors. It answers calls, books jobs, filters spam, and delivers WhatsApp summaries so a tradesman never loses a customer while he's under a sink or on a roof.

This is **not** a generic productivity app. It is **not** a cute startup. It is a precision-engineered business tool with the authority and reliability of professional-grade trade equipment.

### The Master Craftsman Aesthetic

The entire visual language flows from one metaphor: **a master craftsman's workshop**. Think:

- Heavy cast-iron machinery with warm industrial lighting
- A blueprint laid flat on a workbench — precise, structural, purposeful
- High-visibility orange on dark — PPE gear, caution tape, job site energy
- Permanence and weight — this software is built to last, like a quality tool

**The aesthetic is: authoritative, precise, built-to-last.** It is never:
- Flashy or playful
- AI-tropey (no neural networks, floating brains, robotic arms)
- Corporate generic (no light-grey SaaS, no thin Helvetica)
- Consumer app casual

### Target User Profile

Primary: **UK sole-trader tradesperson**, 28–55 years old
- Works alone or with 1–3 employees
- Drives a van, works on-site, can't always answer calls
- Loses £3,000–£15,000/year in missed calls
- Values reliability above all else
- Mobile-first: reads this site in a van cab, on a job site, in bright daylight
- Skeptical of tech — needs social proof, plain language, and real outcomes

Secondary: **Small trade business owner** (2–10 employees), same pain points at scale.

### Tone of Voice

- **Direct, no fluff.** "You miss calls. You lose money. We fix that."
- **UK English always.** "Book" not "Schedule". "Quotes" not "Estimates" (for most trades). "Ring" not "Call" sometimes. Spellings: colour, organisation, centre.
- **Outcome-first.** Every headline = result achieved, not feature described.
- **Authoritative, not salesy.** State facts. Let outcomes do the selling.

---

## 2. Design System Constitution — Industrial Luminescence

> These are **unbreakable laws**. No exceptions, no "just this once", no arbitrary values.

### 2.1 Color System

#### Primary Palette

| Token Name | Hex | Usage |
|---|---|---|
| `--color-void` | `#020D18` | Deepest background, never pure black |
| `--color-navy` | `#051426` | Primary background (body, sections) |
| `--color-navy-mid` | `#0A2340` | Elevated surface (cards, panels) |
| `--color-navy-high` | `#0F3060` | Highest elevation surface |
| `--color-orange` | `#FF6B2B` | Primary CTA, key highlights, Status Gauge active state |
| `--color-orange-glow` | `#FF8C55` | Orange hover state, glow source |
| `--color-orange-soft` | `#ffb59a` | Orange on dark backgrounds, subtle text accents |
| `--color-blue-accent` | `#99cbff` | Secondary accent, links, info states |
| `--color-blue-glow` | `#60A5FA` | Blue glow, secondary CTAs |
| `--color-surface-glass` | `rgba(255,255,255,0.06)` | Glass card base |
| `--color-white-primary` | `#F0F4F8` | Primary text on dark |
| `--color-white-secondary` | `rgba(240,244,248,0.70)` | Secondary text on dark |
| `--color-white-muted` | `rgba(240,244,248,0.40)` | Labels, captions on dark |

#### Forbidden Colors
- `#000000` (pure black) — use `#020D18` instead
- `#FFFFFF` (pure white) — use `#F0F4F8` instead
- Any grey not derived from the navy palette
- Any unsaturated mid-grey backgrounds

#### Gradient Recipes (use exactly)

```css
/* Primary CTA gradient */
background: linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%);

/* Hero background */
background: radial-gradient(ellipse at 20% 50%, rgba(255,107,43,0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(153,203,255,0.06) 0%, transparent 50%),
            #051426;

/* Blueprint grid overlay */
background-image: linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px);
background-size: 40px 40px;

/* Section divider gradient (no-line alternative) */
background: linear-gradient(180deg, #051426 0%, #0A2340 50%, #051426 100%);

/* Glass surface */
background: rgba(255,255,255,0.06);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
```

### 2.2 Typography

#### Font Families

```css
/* Display — headings, hero, section titles */
font-family: 'Space Grotesk', sans-serif;

/* Body — paragraphs, labels, UI text */
font-family: 'Manrope', sans-serif;
```

Load via Google Fonts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

#### Type Scale

| Token | Font | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|---|
| `display-2xl` | Space Grotesk | 72px / 4.5rem | 700 | 1.05 | -0.03em | Hero headline (desktop) |
| `display-xl` | Space Grotesk | 56px / 3.5rem | 700 | 1.08 | -0.025em | Hero headline (mobile) |
| `display-lg` | Space Grotesk | 48px / 3rem | 700 | 1.1 | -0.02em | Section headlines |
| `display-md` | Space Grotesk | 36px / 2.25rem | 600 | 1.15 | -0.015em | Sub-section headlines |
| `display-sm` | Space Grotesk | 28px / 1.75rem | 600 | 1.2 | -0.01em | Card headlines |
| `label-xl` | Manrope | 13px / 0.8125rem | 700 | 1.2 | 0.12em | Section eyebrows (UPPERCASE) |
| `body-xl` | Manrope | 20px / 1.25rem | 400 | 1.6 | 0 | Hero subheadline |
| `body-lg` | Manrope | 18px / 1.125rem | 400 | 1.65 | 0 | Feature descriptions |
| `body-md` | Manrope | 16px / 1rem | 400 | 1.7 | 0 | Default body |
| `body-sm` | Manrope | 14px / 0.875rem | 400 | 1.6 | 0 | Captions, meta |
| `mono` | 'JetBrains Mono', monospace | 13px | 400 | 1.5 | 0 | Code, metrics, data |

#### Typography Rules
- Display headings: always Space Grotesk, always negative letter-spacing, always `#F0F4F8`
- Section eyebrow labels: always Manrope, always uppercase, always `tracking-[0.12em]`, always `--color-orange-soft` or `--color-blue-accent`
- Body text on dark: `rgba(240,244,248,0.70)` — never pure white, never full opacity
- Max line length: 65ch for body text, 40ch for hero subheadlines
- No justified text. Left-aligned body. Centre-align hero only.

### 2.3 The No-Line Rule — ABSOLUTE

**There are no borders, dividers, separator lines, or rules in this design system. Zero. None.**

Instead, use:
- **Tonal surface elevation**: background-color shift between `#051426` → `#0A2340` → `#0F3060`
- **Glassmorphism panels** that float above the surface
- **Gradient fades** at section transitions (transparent → navy → transparent)
- **Spacing as structure**: generous whitespace (80px–160px section gaps) is the visual separator
- **Blueprint grid overlay** as purely decorative texture, never structural

If you catch yourself writing `border`, `border-t`, `divide-`, `hr`, or any equivalent — stop. Delete it. Find the tonal alternative.

**Only permitted border-adjacent usage:**
- `ring-1 ring-white/5` on glass cards (so subtle it reads as surface depth, not a line)
- `outline` for keyboard focus states (accessibility requirement)

### 2.4 Glassmorphism 2.0

Glass panels are the primary card surface in this system. Every interactive card uses this treatment.

#### Base Glass Recipe

```css
.glass-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 8px 32px rgba(2, 13, 24, 0.4),
    0 2px 8px rgba(2, 13, 24, 0.2);
}
```

#### Tactile Hover Lift (mandatory on interactive glass cards)

```css
.glass-card {
  transition: transform 300ms cubic-bezier(0.34, 1.2, 0.64, 1),
              box-shadow 300ms ease-in-out;
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 0 0 1px rgba(255, 107, 43, 0.15),
    0 20px 60px rgba(2, 13, 24, 0.5),
    0 4px 16px rgba(255, 107, 43, 0.08);
}
```

#### Glass Hierarchy

| Level | Opacity | Blur | Use |
|---|---|---|---|
| Deep glass | 4% | 16px | Background panels, hero overlays |
| Standard glass | 6% | 24px | Feature cards, stat panels |
| Elevated glass | 10% | 32px | Pricing cards, modals |
| Surface glass | 15% | 40px | Tooltips, popovers, top layer |

### 2.5 Elevation & Shadow System

**All shadows must use `#020D18` (void) as shadow color, never `rgba(0,0,0,...)`**

```css
/* Level 0 — flat (no shadow, tonal bg only) */
/* Level 1 — card */
box-shadow: 0 2px 8px rgba(2,13,24,0.3), 0 1px 3px rgba(2,13,24,0.2);

/* Level 2 — elevated card */
box-shadow: 0 8px 32px rgba(2,13,24,0.4), 0 2px 8px rgba(2,13,24,0.2);

/* Level 3 — floating panel */
box-shadow: 0 20px 60px rgba(2,13,24,0.5), 0 8px 24px rgba(2,13,24,0.3);

/* Level 4 — modal */
box-shadow: 0 40px 80px rgba(2,13,24,0.6), 0 16px 40px rgba(2,13,24,0.4);

/* Orange glow (CTA buttons, active elements) */
box-shadow: 0 0 24px rgba(255,107,43,0.35), 0 4px 16px rgba(255,107,43,0.2);

/* Blue glow (secondary accents) */
box-shadow: 0 0 20px rgba(153,203,255,0.25), 0 4px 12px rgba(153,203,255,0.15);
```

### 2.6 Motion & Animation

**Motion philosophy: precision machinery, not bouncy toys.**
Every animation must feel like a heavy, well-machined component moving with intention and inertia. Never springy. Never playful.

#### Easing Functions

```css
/* Standard ease — most transitions */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

/* Entrance (coming in from below/opacity 0) */
--ease-entrance: cubic-bezier(0, 0, 0.2, 1);

/* Exit */
--ease-exit: cubic-bezier(0.4, 0, 1, 1);

/* Mechanical (tactile hover lifts — weighted but not bouncy) */
--ease-mechanical: cubic-bezier(0.34, 1.2, 0.64, 1);

/* Precision (data counters, gauge fills) */
--ease-precision: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

#### Duration Rules

| Duration | Use |
|---|---|
| 150ms | Icon state changes, checkbox ticks |
| 200ms | Colour/opacity transitions |
| 300ms | Hover lifts, card elevation |
| 400ms | Page element entrances |
| 500ms | Section transitions, modals opening |
| 600–800ms | Large hero elements, Status Gauge fills |

**Minimum 300ms for any transform.** No instant jumps except for opacity micro-states.

#### Scroll-triggered Animations

Use `IntersectionObserver` (native, no library dependency) with:
- Threshold: 0.15 (trigger when 15% visible)
- Initial state: `opacity: 0; transform: translateY(24px);`
- Animated state: `opacity: 1; transform: translateY(0);`
- Duration: 400ms entrance ease
- Stagger children: 80ms delay between siblings

#### Parallax

- Hero floating panels: mouse parallax, max 20px offset, 60fps via `transform` only (no top/left)
- BlueprintGrid canvas: subtle mouse-repel (already implemented in `BlueprintGrid.tsx`)
- Section background gradients: subtle vertical parallax on scroll, max 30px offset

### 2.7 Status Gauges

Status Gauges are a signature industrial component — circular SVG indicators that show capacity, uptime, or performance metrics. They must appear in: Hero (calls answered stat), Pricing section (plan capacity), and any metrics section.

```tsx
// StatusGauge component interface
interface StatusGaugeProps {
  value: number;        // 0–100
  label: string;        // e.g. "Calls Answered"
  metric: string;       // e.g. "98.7%"
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'blue';
}
```

Implementation:
- SVG `<circle>` with `stroke-dasharray` + `stroke-dashoffset` animated via CSS
- Background ring: `rgba(255,255,255,0.08)`
- Foreground arc: orange gradient `#FF6B2B → #FF8C55` or blue `#99cbff → #60A5FA`
- Fill animation: 800ms precision ease on mount/intersection
- Outer glow: matching color glow shadow on the arc

### 2.8 Asymmetry & Editorial Layout

**Symmetry is for amateurs. Asymmetry is for master craftsmen.**

- Hero: headline left, visual right (60/40 split on desktop)
- Feature cards: alternating left/right content + visual (not uniform grid)
- Stats row: 3-column with largest stat centred, others smaller flanking
- Blueprint grid: always slightly rotated 2–3° as background texture
- Section padding: alternate `py-20 md:py-32` and `py-16 md:py-24` to break rhythm
- Column gutters: asymmetric on desktop (e.g., `gap-12 lg:gap-20`)

### 2.9 Component Anatomy

#### Primary CTA Button

```tsx
// Exact class composition — no deviation
className="
  inline-flex items-center gap-2.5
  px-7 py-4
  bg-gradient-to-r from-[#FF6B2B] to-[#FF8C55]
  text-white font-semibold text-[15px] tracking-[-0.01em]
  rounded-[14px]
  shadow-[0_0_24px_rgba(255,107,43,0.35),0_4px_16px_rgba(255,107,43,0.2)]
  hover:shadow-[0_0_40px_rgba(255,107,43,0.5),0_8px_24px_rgba(255,107,43,0.3)]
  hover:-translate-y-0.5
  active:translate-y-0 active:shadow-[0_0_16px_rgba(255,107,43,0.25)]
  transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]
  font-[Manrope]
"
```

**CTA copy must always be outcome-focused:**
- "Start Free Trial" (primary)
- "Book a Demo" (secondary)
- "Hear a Live Demo" (audio CTA)
- "Calculate My Losses" (calculator CTA)
- Never: "Get Started", "Learn More", "Click Here", "Sign Up"

#### Secondary CTA Button

```tsx
className="
  inline-flex items-center gap-2.5
  px-7 py-4
  bg-[rgba(153,203,255,0.08)]
  text-[#99cbff] font-semibold text-[15px] tracking-[-0.01em]
  rounded-[14px]
  ring-1 ring-[rgba(153,203,255,0.2)]
  hover:bg-[rgba(153,203,255,0.14)]
  hover:ring-[rgba(153,203,255,0.35)]
  hover:-translate-y-0.5
  transition-all duration-300
  font-[Manrope]
"
```

#### Glass Nav

```tsx
// Sticky header — always this treatment
className="
  fixed top-0 inset-x-0 z-50
  bg-[rgba(5,20,38,0.85)]
  backdrop-blur-[20px]
  border-b-0
  shadow-[0_1px_0_rgba(255,255,255,0.05)]
"
```

#### Section Eyebrow Label

```tsx
// Every section opens with this label above the headline
className="
  inline-block
  text-[13px] font-bold tracking-[0.12em] uppercase
  text-[#ffb59a]
  font-[Manrope]
  mb-4
"
```

#### Feature Card (Glass)

```tsx
className="
  relative overflow-hidden
  bg-[rgba(255,255,255,0.06)]
  backdrop-blur-[24px]
  rounded-2xl
  shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(2,13,24,0.4)]
  p-8
  hover:-translate-y-1
  hover:shadow-[0_0_0_1px_rgba(255,107,43,0.15),0_20px_60px_rgba(2,13,24,0.5)]
  transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]
"
```

#### Pricing Card (Popular/Featured)

```tsx
// The "most popular" card gets orange glow treatment
className="
  relative
  bg-gradient-to-b from-[rgba(255,107,43,0.12)] to-[rgba(255,107,43,0.04)]
  backdrop-blur-[24px]
  rounded-2xl
  shadow-[0_0_0_1px_rgba(255,107,43,0.25),0_20px_60px_rgba(2,13,24,0.5),0_0_40px_rgba(255,107,43,0.1)]
  p-8
  scale-[1.03]
"
// Popular badge uses Status Gauge icon + 'Most Popular' text in orange
```

---

## 3. Conversion Architecture — The Revenue Blueprint

> Every page section must appear in this exact order. Do not reorder. Do not omit.

### 3.1 Mandatory Section Order

```
1.  [HEADER]       Glass sticky nav — logo left, nav centre, dual CTAs right
2.  [HERO]         Bold 8-word-max headline + outcome subheadline + dual CTAs + audio/visual proof
3.  [SOCIAL PROOF] Logos + stat bar — immediate credibility (within fold or first scroll)
4.  [PAIN POINTS]  The cost of doing nothing — emotional + financial stakes
5.  [ROI CALC]     Interactive: "See exactly what you're losing" — personalised urgency
6.  [COMPARISON]   Trade Receptionist vs alternatives — honest, factual table
7.  [DEMO]         AudioPlayer — hear a real call handled — interactive proof
8.  [HOW IT WORKS] 3-step process — simple, visual, credible
9.  [USE CASES]    Trade-specific scenarios — recognition triggers
10. [FEATURES]     4 features with real outcomes, not feature names
11. [TESTIMONIALS] Video quotes or text — real trades, real results
12. [PRICING]      3 tiers, monthly/annual toggle, Popular badge, Status Gauge
13. [FAQ]          Objection-handling accordion — 8 questions minimum
14. [FINAL CTA]    Dark section — urgency + primary CTA — last chance
15. [FOOTER]       Minimal — links, legal, social
16. [MOBILE BAR]   Sticky bottom on mobile — "Start Free Trial" always visible
```

### 3.2 Hero Requirements (Non-negotiable)

**Headline:** Maximum 8 words. Outcome-first. Present tense.
- Current: ✓ "Never Miss A Call. Never Lose A Job." (8 words, two punches)
- Must be `display-2xl` Space Grotesk, `#F0F4F8`

**Subheadline:** 1–2 sentences, max 20 words per sentence. Quantify the pain.
- Must name the specific audience (tradespeople / plumbers / electricians)
- Must reference a real outcome (calls answered, jobs booked, revenue recovered)
- `body-xl` Manrope, `rgba(240,244,248,0.70)`

**Dual CTAs:**
- Primary: "Start Free Trial" — orange gradient, orange glow
- Secondary: "Hear a Live Demo" OR "Book a Demo" — glass treatment
- Both in same row, 16px gap, never stacked on desktop

**Visual proof in hero:**
- AudioPlayer or phone mockup must be visible above the fold on desktop
- The 3D phone mockup with parallax (already in `App.tsx`) must be retained and enhanced
- Consider adding a "Calls answered today: 12,847" live-ish counter (fake but plausible)

**Social proof anchors in hero:**
- Star rating: ⭐ 4.9/5 from 200+ UK tradespeople
- Certification/trust mark if applicable
- These must appear before first scroll on desktop

### 3.3 Social Proof Rules

- Use only UK trade companies and UK tradesperson names (no American names)
- Testimonial quotes must mention specific outcomes: hours saved per week, jobs booked, money recovered
- Video testimonials preferred — even a transcript with a photo reads better than text alone
- Minimum 6 testimonials; show 3 at a time with carousel
- Trade-specific logos (or badge placeholders): NICEIC, Gas Safe Register, FMB (Federation of Master Builders)

### 3.4 Pricing Section Rules

```
Tier 1: Starter   — £29/month — Up to 100 calls/month
Tier 2: Pro       — £59/month — Up to 300 calls/month [MOST POPULAR]
Tier 3: Agency    — £119/month — Unlimited calls
```

- Monthly/annual toggle (annual = 2 months free, shown as strikethrough)
- Pro tier: scale-up card, orange glow, "Most Popular" badge with Status Gauge
- Every tier: "14-day free trial" or "No contracts" trust signal
- CTA per card: "Start Free Trial" (not "Choose Plan", not "Get Started")
- Annual savings must be shown in £ ("Save £118/year")
- No hidden fees language: "Cancel anytime. No setup fees." visible per card

### 3.5 FAQ Requirements

Minimum 8 questions addressing real objections:
1. How does call diverting work? (technical trust)
2. What if I'm mid-job and can't check messages? (mobile workflow)
3. Does it work with my trade management software? (integration)
4. What accent does the AI use? (UK authenticity)
5. Can I customise what it says about my business? (personalisation)
6. Is there a contract? (no-lock-in trust)
7. What happens if I go over my call limit? (pricing clarity)
8. How quickly can I get set up? (time-to-value)

### 3.6 Conversion Copy Principles

| Principle | Application |
|---|---|
| **Loss aversion over gain** | "Stop losing £4,200/year" not "Earn more money" |
| **Specificity over vagueness** | "14 minutes setup" not "quick setup" |
| **Social normalisation** | "Join 500+ UK tradespeople" |
| **Risk reversal** | "14-day free trial. No card required." |
| **Urgency without desperation** | "While you read this, a competitor is answering their calls" |
| **Outcome in every feature** | "Smart Scheduling — so you wake up to a full diary" |
| **UK trades vocabulary** | Call-out, quote, job, booking, diary — not appointment, reservation |

---

## 4. Technical Rules

### 4.1 Stack (Exact, Non-Negotiable)

```
Runtime:     React 19.2.3
Build:       Vite 6.2.0
Language:    TypeScript 5.8.2
Styling:     Tailwind CSS (MIGRATED to local tailwind.config.ts — see §4.2)
Icons:       Lucide React
AI/Audio:    Google Gemini 2.5 Flash TTS API (@google/genai)
Booking:     Calendly embed (components/BookDemo.tsx)
Waitlist:    Google Apps Script webhook (components/WaitlistModal.tsx)
Deployment:  Vercel
```

**Do not add:**
- React Router (state-based routing is sufficient for current scope)
- Redux/Zustand (React state is sufficient)
- Framer Motion (use CSS transitions + IntersectionObserver)
- GSAP (same reason — performance cost not justified)
- Any CSS-in-JS library

**Permitted additions (only if task requires):**
- `@radix-ui/react-*` primitives for accessible modals, dropdowns, accordions
- `lenis` for smooth scroll (small, performant)
- `canvas-confetti` for conversion events (waitlist success)

### 4.2 Tailwind Migration (Required Before Major UI Work)

The current `tailwind.config` lives as an inline script in `index.html`. This **must** be migrated to a proper `tailwind.config.ts` with full CSS custom properties before any significant design system work.

**Migration steps:**
1. Install Tailwind as a proper dev dependency (`npm install -D tailwindcss postcss autoprefixer`)
2. Create `tailwind.config.ts` with all Industrial Luminescence tokens mapped to Tailwind classes
3. Create `src/styles/tokens.css` with all `--color-*` CSS variables
4. Remove CDN script from `index.html`
5. Import `tokens.css` in `src/index.tsx`

**Target Tailwind token mapping:**

```ts
// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#020D18',
        navy: {
          DEFAULT: '#051426',
          mid: '#0A2340',
          high: '#0F3060',
        },
        orange: {
          DEFAULT: '#FF6B2B',
          glow: '#FF8C55',
          soft: '#ffb59a',
        },
        'blue-accent': {
          DEFAULT: '#99cbff',
          glow: '#60A5FA',
        },
        'white-primary': '#F0F4F8',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        glass: '24px',
        'glass-lg': '32px',
        'glass-xl': '40px',
      },
      borderRadius: {
        card: '16px',
        button: '14px',
        badge: '999px',
      },
      transitionTimingFunction: {
        mechanical: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
        precision: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        standard: '300ms',
        slow: '500ms',
        gauge: '800ms',
      },
      animation: {
        'fade-up': 'fadeUp 400ms cubic-bezier(0,0,0.2,1) both',
        'gauge-fill': 'gaugeFill 800ms cubic-bezier(0.25,0.46,0.45,0.94) both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 24px rgba(255,107,43,0.35)' },
          '50%': { boxShadow: '0 0 48px rgba(255,107,43,0.6)' },
        },
      },
    },
  },
}
```

### 4.3 Performance Requirements

| Metric | Target | Method |
|---|---|---|
| LCP | < 1.5s | Preload hero font + above-fold image, avoid render-blocking |
| CLS | 0 | Reserve space for async images (width/height attributes), no layout shift |
| INP | < 200ms | No heavy main-thread work on interaction; offload Gemini API async |
| FCP | < 0.8s | Critical CSS inlined, fonts preloaded |
| Bundle | < 150KB gzipped JS | Tree-shake Lucide, lazy-load non-hero sections |

**Lazy loading rules:**
- AudioPlayer: lazy import (only loads when user scrolls to Demo section)
- BookDemo/Calendly: lazy import + only mount on route change
- Testimonials: lazy import
- Calculator: lazy import
- All below-fold images: `loading="lazy"` attribute

**Image rules:**
- Format: WebP with AVIF fallback where possible
- Never use Unsplash CDN in production (latency, reliability) — use self-hosted or Cloudinary
- Logo must be SVG or inline, not loaded from image2url.com

### 4.4 Accessibility

- **WCAG AAA contrast** on all text: use contrast checker for all `rgba()` text on glass
  - White primary (`#F0F4F8`) on `#051426`: ✓ 14.3:1
  - White secondary (`rgba(240,244,248,0.70)`) on `#051426`: verify ≥ 7:1
  - Orange soft (`#ffb59a`) on `#051426`: verify ≥ 4.5:1
- **Focus states**: every interactive element has a visible orange outline on keyboard focus
  ```css
  :focus-visible { outline: 2px solid #FF6B2B; outline-offset: 3px; }
  ```
- **Touch targets**: minimum 48×48px for all tappable elements (trades users on job sites)
- **ARIA**: use semantic HTML first. Only add `aria-*` when semantic HTML is insufficient
- **Motion**: respect `prefers-reduced-motion`. Wrap all scroll animations and parallax in:
  ```css
  @media (prefers-reduced-motion: reduce) { /* disable transforms, keep opacity */ }
  ```
- **Screen reader**: AudioPlayer must have text transcript accessible via `aria-live` or toggle

### 4.5 Mobile-First Rules

This site is used on phones in vans and on job sites. Mobile is not an afterthought.

- Default layout assumes 375px viewport. Scale up from there.
- All tap targets ≥ 48px
- Sticky bottom bar (`StickyBottomBar` in `App.tsx`): always visible on mobile, never on desktop
- Font sizes never below 16px on mobile (prevents iOS zoom)
- Avoid hover-only interactions — all hover states must have tap equivalents
- High readability in bright light: maximum contrast (`#F0F4F8` on `#051426`), avoid low-contrast glass text
- The 3D phone parallax in Hero: disable mouse tracking on touch devices, use static pose

### 4.6 File & Component Architecture

```
Trade-receptionist/
├── CLAUDE.md                    ← This file (authoritative)
├── App.tsx                      ← Main page sections (keep flat, not abstracted)
├── index.html                   ← Entry, SEO, font preloads
├── index.tsx                    ← React mount
├── types.ts                     ← Shared TypeScript interfaces
├── tailwind.config.ts           ← Design token layer (to be created)
├── vite.config.ts               ← Build config
├── components/
│   ├── UI.tsx                   ← Button, Card, GlassCard, Section, Badge, StatusGauge
│   ├── AudioPlayer.tsx          ← AI demo audio (Gemini TTS)
│   ├── Calculator.tsx           ← ROI calculator
│   ├── BookDemo.tsx             ← Calendly embed
│   ├── WaitlistModal.tsx        ← Google Sheets form
│   ├── Testimonials.tsx         ← Testimonials carousel
│   ├── BlueprintGrid.tsx        ← Canvas grid background
│   └── Logo.tsx                 ← Logo (migrate from CDN to self-hosted SVG)
└── src/
    └── styles/
        └── tokens.css           ← CSS custom properties (to be created)
```

**Component rules:**
- Keep `App.tsx` as the page orchestrator. Do not extract sections into separate files unless reused
- Do not create wrapper components that only add padding/margin — use Tailwind directly
- `StatusGauge` must be added to `components/UI.tsx` alongside existing primitives
- Co-locate a component's types in the same file unless used across 3+ files

---

## 5. Guardrails & Philosophy

### 5.1 What You Must NEVER Do

| Category | Forbidden | Alternative |
|---|---|---|
| **Colors** | Pure black (`#000`), pure white (`#fff`), unsaturated grey backgrounds | Use void/navy/white-primary tokens |
| **Borders** | Any `border-*`, `divide-*`, `hr` for layout/dividers | Tonal elevation, glassmorphism, spacing |
| **Shadows** | `rgba(0,0,0,...)` in box-shadow | Use `rgba(2,13,24,...)` (void color) |
| **Typography** | Inter, system-ui, or any font not in the system | Space Grotesk + Manrope only |
| **Animation** | Bouncy spring (`cubic-bezier(0.34, 1.56, 0.64, 1)` or similar), `animation-timing-function: spring`, Framer Motion springs | Mechanical easing only |
| **Animation** | Transitions under 200ms for transforms | Minimum 300ms for transforms |
| **Motion** | Glowing orbs, particle effects, floating blobs | Blueprint grid, orange glow on functional elements only |
| **Imagery** | AI-generated art, stock photos with American context, robotic imagery, neural network visuals | Real UK trade photography, blueprint overlays, tool imagery |
| **Copy** | "Get Started", "Learn More", "Powered by AI", "Smart AI", generic SaaS speak | Specific outcome-first copy per §3.6 |
| **Layout** | Full symmetry, identical grid columns, centered hero on desktop | Asymmetric editorial layout |
| **Gradients** | Generic purple-to-pink, multicolour rainbow, random gradients | Only Industrial Luminescence gradient recipes |
| **Spacing** | Arbitrary pixel values (e.g., `mt-[37px]`) | Use Tailwind spacing scale or CSS variables |
| **Z-index** | Arbitrary z-index values (e.g., `z-[9999]`) | Tailwind z-scale: z-0, z-10, z-20, z-30, z-40, z-50 |

### 5.2 The Craftsman Test

Before shipping any UI change, ask: **"Does this feel like a £5,000 precision tool — or a cheap app?"**

A £5,000 tool:
- Has weight and intention in every motion
- Uses space authoritatively — it does not crowd
- Has perfect contrast and legibility in any light condition
- Makes the user feel like they made a wise, professional choice

A cheap app:
- Animates for the sake of animating
- Crams features into small space to look "full-featured"
- Uses trendy colours that won't age well
- Feels like it was designed in 2 hours

**If it fails the test: redesign it.**

### 5.3 Domain Constraints

- **UK English only** in all copy, labels, placeholders, and error messages
- **£ not $** in all pricing
- **Vat**: acknowledge VAT in pricing footnotes if needed
- **Phone numbers**: UK format (`07700 900000` or `+44 7700 900000`)
- **Trade vocabulary**: job, call-out, quote, diary, booking, round — use trades' own language
- **Regulatory badges**: Gas Safe, NICEIC, FMB — only reference if genuinely relevant
- **Never claim**: specific legal compliance (GDPR, ICO) without confirming with a legal reviewer

### 5.4 Code Quality Guardrails

- **Read before editing**: always read the target file before modifying it
- **No speculative abstractions**: do not create helper functions for things only done once
- **No over-engineering**: the component tree must stay flat and readable
- **Measure twice**: for any non-trivial component, check `App.tsx` and `components/UI.tsx` for existing implementations before creating new ones
- **No breaking existing functionality**: the AudioPlayer Gemini integration and WaitlistModal Google Sheets webhook are mission-critical — never touch without explicit instructions
- **No hardcoded API keys in code**: they must live in `.env.local` and be accessed via `import.meta.env`

---

## 6. Quick Reference Tables

### 6.1 Complete Color → Tailwind Mapping

| Design Token | Hex / Value | Tailwind Class | Usage |
|---|---|---|---|
| Void | `#020D18` | `bg-void` | Deepest bg, scroll gutter |
| Navy (default) | `#051426` | `bg-navy` | Primary page background |
| Navy Mid | `#0A2340` | `bg-navy-mid` | Elevated card bg |
| Navy High | `#0F3060` | `bg-navy-high` | Top surface bg |
| Orange primary | `#FF6B2B` | `bg-orange text-orange` | Primary CTA |
| Orange glow | `#FF8C55` | `bg-orange-glow` | Hover state |
| Orange soft | `#ffb59a` | `text-orange-soft` | Text accents on dark |
| Blue accent | `#99cbff` | `text-blue-accent` | Secondary accent |
| Blue glow | `#60A5FA` | `text-blue-accent-glow` | Blue glow |
| White primary | `#F0F4F8` | `text-white-primary` | Primary text |
| White secondary | `rgba(240,244,248,0.70)` | Inline or `text-white-primary/70` | Body text on dark |
| White muted | `rgba(240,244,248,0.40)` | `text-white-primary/40` | Captions, labels |
| Glass surface | `rgba(255,255,255,0.06)` | `bg-white/[0.06]` | Card glass base |

### 6.2 Typography Scale → Tailwind

| Scale Token | Classes |
|---|---|
| `display-2xl` | `font-display text-[72px] font-bold leading-[1.05] tracking-[-0.03em]` |
| `display-xl` | `font-display text-[56px] font-bold leading-[1.08] tracking-[-0.025em]` |
| `display-lg` | `font-display text-[48px] font-bold leading-[1.1] tracking-[-0.02em]` |
| `display-md` | `font-display text-[36px] font-semibold leading-[1.15] tracking-[-0.015em]` |
| `display-sm` | `font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.01em]` |
| `label-xl` | `font-body text-[13px] font-bold tracking-[0.12em] uppercase` |
| `body-xl` | `font-body text-[20px] font-normal leading-[1.6]` |
| `body-lg` | `font-body text-[18px] font-normal leading-[1.65]` |
| `body-md` | `font-body text-base font-normal leading-[1.7]` |
| `body-sm` | `font-body text-[14px] font-normal leading-[1.6]` |

### 6.3 Component Pattern Catalogue

| Component | File | Status | Notes |
|---|---|---|---|
| Button (primary CTA) | `components/UI.tsx` | Needs redesign | Apply orange gradient + glow |
| Button (secondary) | `components/UI.tsx` | Needs redesign | Apply glass + blue accent |
| GlassCard | `components/UI.tsx` | Needs redesign | Apply Glassmorphism 2.0 recipe |
| Section wrapper | `components/UI.tsx` | Update | Switch to navy background |
| Badge / Eyebrow | `components/UI.tsx` | Update | Apply label-xl + orange-soft |
| StatusGauge | `components/UI.tsx` | To be created | SVG arc + animated fill |
| Glass Nav | `App.tsx` | Needs redesign | Apply glass nav recipe |
| Hero | `App.tsx` | Enhance | Dual CTAs, asymmetric layout |
| AudioPlayer | `components/AudioPlayer.tsx` | Keep core, restyle shell | Apply glass card |
| ROI Calculator | `components/Calculator.tsx` | Keep logic, restyle | Glass card, orange range slider |
| Comparison Table | `App.tsx` | Restyle | Navy background, no lines |
| Pricing Cards | `App.tsx` | Needs redesign | 3-tier with Popular glow |
| Testimonials | `components/Testimonials.tsx` | Restyle | Dark bg, glass cards |
| FAQ Accordion | `App.tsx` | Restyle | Glass panel, no lines |
| BlueprintGrid | `components/BlueprintGrid.tsx` | Keep | Already excellent |
| WaitlistModal | `components/WaitlistModal.tsx` | Restyle shell only | Keep Sheets integration |
| BookDemo | `components/BookDemo.tsx` | Restyle shell only | Keep Calendly integration |

### 6.4 Conversion Copy Swaps

| Current (if present) | Required |
|---|---|
| "Get Started" | "Start Free Trial" |
| "Sign Up" | "Start Free Trial" |
| "Learn More" | "See How It Works" |
| "Contact Us" | "Talk to Our Team" |
| "Book a call" | "Book a Demo" |
| "Try it free" | "Start Free Trial — No Card Required" |
| "Features" (section heading) | "What You Get" or "Built for Tradespeople" |
| "How it works" (eyebrow) | "THREE STEPS TO ZERO MISSED CALLS" |
| "Pricing" (section heading) | "Simple, Honest Pricing" |
| "Testimonials" (eyebrow) | "WHAT UK TRADESPEOPLE SAY" |

### 6.5 Git Commit Convention

```
feat:     New feature or section
fix:      Bug fix
style:    Design/visual change (no logic change)
refactor: Code restructure (no visual change)
perf:     Performance improvement
a11y:     Accessibility improvement
tokens:   Design token / Tailwind config change
copy:     Content/copy change only
```

---

## 7. First-Run Checklist (Read Before Any Session)

Before starting any work in a new session:

- [ ] Read this file fully
- [ ] Read the target file(s) before modifying them
- [ ] Confirm tech stack (Vite + React 19 — not Next.js)
- [ ] Apply the Craftsman Test to any UI you produce
- [ ] Never use arbitrary Tailwind values — check the token table first
- [ ] Never use pure black, pure white, or Inter font
- [ ] Verify the No-Line Rule: no borders used as dividers
- [ ] Test mobile view (375px) before considering any UI complete
- [ ] Check WCAG AAA contrast for any new text colour combinations
- [ ] Verify `import.meta.env` for any API key usage — never hardcode

---

*End of CLAUDE.md — Trade Receptionist Design Constitution v1.0*
*Built to last. Like the tools it serves.*
