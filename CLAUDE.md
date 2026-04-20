 Trade Receptionist — Master Development Constitution

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

### Animation Philosophy: Precision Machinery in Motion

The site must feel like it was **built in Framer** — scroll-driven, cinematic, alive. Every section entrance, every stat counter, every sticky panel must demonstrate craft. The standard to meet is: **audia.framer.website**. Study it. Match its scroll-driven feature reveals, ambient floating UI elements, and staggered entrance sequences — but execute them in the Trade Receptionist Industrial Luminescence aesthetic.

The motion language is: **heavy machinery starting up**. Not bouncy. Not playful. Weighted, intentional, precise. Like a well-oiled piston — powerful, smooth, inevitable.

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

/* Gradient text — hero keyword highlight */
background: linear-gradient(135deg, #FF6B2B 0%, #FF8C55 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
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
- **Gradient text rule**: ONE word or short phrase per hero/section headline may use the orange gradient text treatment. Apply `italic` + gradient to the most emotionally charged word (e.g. *call*, *job*, *money*). Never the entire headline. Never more than once per section.
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

### 2.6 Motion & Animation — PREMIUM TIER

**This section is the difference between "looks decent" and "looks like Framer built it."**
**Execute every pattern here with full precision. Do not skip or simplify.**

Motion philosophy: **precision machinery starting up**. Every animation must feel like a heavy, well-machined component moving with intention and inertia. Never springy. Never playful.

#### Easing Functions

```css
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-entrance: cubic-bezier(0, 0, 0.2, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
--ease-mechanical: cubic-bezier(0.34, 1.2, 0.64, 1);
--ease-precision: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);    /* NEW: for large scroll reveals */
```

#### Duration Rules

| Duration | Use |
|---|---|
| 150ms | Icon state changes, checkbox ticks |
| 200ms | Colour/opacity transitions |
| 300ms | Hover lifts, card elevation |
| 400ms | Page element entrances |
| 500ms | Section transitions, modals opening |
| 600ms | Large reveals, sticky panel transitions |
| 800ms | Status Gauge fills, counter animations start |
| 1200ms | Animated counter from 0 → target value |

#### ── PATTERN 1: Scroll-Triggered Entrance Animations (MANDATORY on every section) ──

Every section's elements must animate in as they enter the viewport. Use `IntersectionObserver` (native, no library dependency).

```typescript
// Add to a shared useScrollAnimation hook
const observerOptions = {
  threshold: 0.12,
  rootMargin: '0px 0px -60px 0px'
};

// Initial state on ALL animatable elements:
opacity: 0;
transform: translateY(32px);

// Triggered state:
opacity: 1;
transform: translateY(0);
transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 600ms cubic-bezier(0.16, 1, 0.3, 1);

// Stagger children with data-delay attribute:
// data-delay="0"   → transition-delay: 0ms
// data-delay="1"   → transition-delay: 80ms
// data-delay="2"   → transition-delay: 160ms
// data-delay="3"   → transition-delay: 240ms
// data-delay="4"   → transition-delay: 320ms
```

Apply `data-animate` attribute to every card, headline, subheadline, and CTA group. The CSS class `is-visible` triggers the transition. Children within a grid get `data-delay="N"` for stagger.

#### ── PATTERN 2: Sticky Scroll Feature Showcase (SIGNATURE SECTION — MANDATORY) ──

This is the pattern that makes sites feel like Framer. **It must be used for the Features section.**

**Layout structure:**
```
[Left column — scrollable feature list]    [Right column — sticky phone/UI preview]
  Feature 1: Always On Call Answering  →    position: sticky; top: 10vh;
  Feature 2: Instant WhatsApp Summary  →    (transitions between UI states)
  Feature 3: Smart Spam Filtering      →    (as each feature enters viewport)
  Feature 4: Diary Integration         →
```

**Implementation:**
```tsx
// The right panel stays fixed while left content scrolls
// position: sticky; top: 10vh; height: 80vh;

// Each feature block on the left has an IntersectionObserver
// When feature N enters viewport → right panel transitions to show feature N's UI

// Right panel transition between states:
transition: opacity 400ms ease, transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
// Exiting state: opacity 0, translateY(-16px)
// Entering state: opacity 1, translateY(0)

// The active feature on the left gets an orange left-border indicator:
// border-left: 2px solid #FF6B2B (the ONLY permitted border use outside accessibility)
// + background: rgba(255,107,43,0.04)
```

The right panel shows a styled phone mockup or UI screenshot for each feature. When no real screenshots exist, use a glass card with an illustrated UI that represents the feature.

#### ── PATTERN 3: Animated Stat Counters (MANDATORY for stats section) ──

Stats must count up from 0 when they enter the viewport — never static numbers.

```typescript
function animateCounter(
  element: HTMLElement,
  target: number,
  duration: number = 1200,
  prefix: string = '',
  suffix: string = ''
) {
  const startTime = performance.now();
  const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutExpo(progress);
    const current = Math.round(easedProgress * target);

    element.textContent = prefix + current.toLocaleString('en-GB') + suffix;

    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// Usage examples:
// animateCounter(el, 12847, 1200, '', '')     → "12,847"
// animateCounter(el, 98, 1000, '', '%')        → "98%"
// animateCounter(el, 4200, 1200, '£', '')      → "£4,200"
```

Trigger via IntersectionObserver. Counter only runs once (use a `started` flag).

#### ── PATTERN 4: Ambient Float Animation (hero UI elements only) ──

The phone mockup and any floating glass UI cards in the hero section must have a **continuous subtle float**. This is **not** decoration — it signals the product is alive and responsive.

```css
@keyframes float-primary {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33%       { transform: translateY(-10px) rotate(0.3deg); }
  66%       { transform: translateY(-5px) rotate(-0.2deg); }
}

@keyframes float-secondary {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-8px) rotate(-0.3deg); }
}

.hero-phone-mockup {
  animation: float-primary 5s ease-in-out infinite;
}

.hero-floating-card {
  animation: float-secondary 4s ease-in-out infinite;
  /* Offset each card's start time for organic feel: */
  /* Card 1: animation-delay: 0s */
  /* Card 2: animation-delay: 0.8s */
  /* Card 3: animation-delay: 1.6s */
}
```

**Permitted floating elements (maximum 3 per section):**
- Phone mockup (primary float)
- Incoming call glass card ("Sarah" answering)
- WhatsApp message glass card (job booked notification)
- Stats pill (calls answered today)

**Forbidden floating elements:**
- Decorative blobs, orbs, or abstract shapes without semantic meaning
- Anything that doesn't represent a real product UI element

#### ── PATTERN 5: Lenis Smooth Scroll (MANDATORY) ──

Install and configure Lenis for buttery smooth scrolling across the entire page.

```typescript
// Install: npm install lenis
import Lenis from 'lenis';

// In App.tsx useEffect:
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
});

function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Cleanup:
return () => lenis.destroy();
```

#### ── PATTERN 6: Progress Bar Loading (How It Works section) ──

The 3-step How It Works section must show animated progress bars that fill on scroll.

```css
.step-progress-bar {
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
}

.step-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF6B2B, #FF8C55);
  border-radius: 2px;
  width: 0%;
  transition: width 1200ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* When step enters viewport: */
.step-progress-fill.is-visible {
  width: 100%;
}
```

Each step's bar triggers independently as the user scrolls down.

#### ── PATTERN 7: Mouse Parallax (Hero only) ──

The hero phone mockup must respond to mouse movement on desktop.

```typescript
// In Hero component:
useEffect(() => {
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip touch devices

  const handleMouseMove = (e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20; // max 20px offset
    const y = (e.clientY / window.innerHeight - 0.5) * 12; // max 12px offset

    phoneMockupRef.current?.style.setProperty(
      'transform',
      `translate(${x}px, ${y}px) translateY(var(--float-y, 0px))`
    );

    // Floating cards get inverse/reduced parallax for depth:
    floatingCard1Ref.current?.style.setProperty(
      'transform',
      `translate(${-x * 0.4}px, ${-y * 0.4}px)`
    );
  };

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, []);
```

#### Duration Recap & Motion Hierarchy

| Minimum 300ms for any transform. No instant jumps except opacity micro-states. |

```
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2.7 Status Gauges

Status Gauges are a signature industrial component — circular SVG indicators that show capacity, uptime, or performance metrics. They must appear in: Hero (calls answered stat), Pricing section (plan capacity), and any metrics section.

```tsx
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
className="
  relative
  bg-gradient-to-b from-[rgba(255,107,43,0.12)] to-[rgba(255,107,43,0.04)]
  backdrop-blur-[24px]
  rounded-2xl
  shadow-[0_0_0_1px_rgba(255,107,43,0.25),0_20px_60px_rgba(2,13,24,0.5),0_0_40px_rgba(255,107,43,0.1)]
  p-8
  scale-[1.03]
"
```

---

## 3. Conversion Architecture — The Revenue Blueprint

> Every page section must appear in this exact order. Do not reorder. Do not omit.

### 3.1 Mandatory Section Order

```
1.  [HEADER]       Glass sticky nav — logo left, nav centre, dual CTAs right
2.  [HERO]         Bold headline (gradient word) + outcome subheadline + dual CTAs + floating phone + animated stats
3.  [SOCIAL PROOF] Logo strip + animated stat bar — immediate credibility
4.  [PAIN POINTS]  Cost of doing nothing — emotional + financial stakes
5.  [ROI CALC]     Interactive: "See exactly what you're losing" — personalised urgency
6.  [COMPARISON]   Trade Receptionist vs alternatives — honest, factual table
7.  [DEMO]         AudioPlayer — hear a real call handled
8.  [HOW IT WORKS] 3-step process with animated progress bars
9.  [USE CASES]    Trade-specific scenarios — recognition triggers
10. [FEATURES]     STICKY SCROLL SHOWCASE — 4 features, phone panel stays fixed
11. [TESTIMONIALS] Video quotes or text — real trades, real results
12. [PRICING]      3 tiers, monthly/annual toggle, Popular badge, Status Gauge
13. [FAQ]          Objection-handling accordion — 8 questions minimum
14. [FINAL CTA]    Dark section — urgency + primary CTA
15. [FOOTER]       Minimal — links, legal, social
16. [MOBILE BAR]   Sticky bottom on mobile — "Start Free Trial" always visible
```

### 3.2 Hero Requirements (Non-negotiable)

**Headline:** Maximum 8 words. Outcome-first. Present tense. ONE word gets italic + gradient treatment.
- Current: "Never Miss A *Call*. Never Lose A *Job*." — the words *Call* and *Job* render in italic orange gradient
- Must be `display-2xl` Space Grotesk, base colour `#F0F4F8`, gradient words use the gradient text recipe

**Subheadline:** 1–2 sentences, max 20 words per sentence. Quantify the pain.

**Dual CTAs:**
- Primary: "Start Free Trial" — orange gradient, orange glow
- Secondary: "Hear a Live Demo" — glass treatment
- Both in same row, 16px gap

**Hero right panel (MANDATORY):**
- Phone mockup with ambient float animation
- 3 floating glass notification cards (with staggered float delays):
  - "Incoming call from Dave — Plumbing quote" (incoming call card)
  - "Sarah answered. Job booked for Tuesday." (outcome card)
  - "Calls answered today: 2,847" (stats pill)
- Mouse parallax on desktop (Pattern 7)

**Animated stats bar beneath CTAs:**
- "12,847 calls answered this month" (counter animation)
- "98.7% answered rate" (counter animation)
- "£4,200 avg. annual savings" (counter animation)
These count up from 0 on page load, 1200ms easeOutExpo.

### 3.3 Social Proof Rules

- Use only UK trade companies and UK tradesperson names
- Testimonial quotes must mention specific outcomes
- Minimum 6 testimonials; show 3 at a time with carousel
- Trade-specific logos: NICEIC, Gas Safe Register, FMB

### 3.4 Pricing Section Rules

```
Tier 1: Starter   — £29/month — Up to 100 calls/month
Tier 2: Pro       — £59/month — Up to 300 calls/month [MOST POPULAR]
Tier 3: Agency    — £119/month — Unlimited calls
```

- Monthly/annual toggle (annual = 2 months free)
- Pro tier: scale-up card, orange glow, "Most Popular" badge
- Every tier: "14-day free trial" trust signal
- CTA per card: "Start Free Trial"
- Annual savings shown in £
- "Cancel anytime. No setup fees." per card

### 3.5 FAQ Requirements

8 questions minimum:
1. How does call diverting work?
2. What if I'm mid-job and can't check messages?
3. Does it work with my trade management software?
4. What accent does the AI use?
5. Can I customise what it says about my business?
6. Is there a contract?
7. What happens if I go over my call limit?
8. How quickly can I get set up?

### 3.6 Conversion Copy Principles

| Principle | Application |
|---|---|
| **Loss aversion over gain** | "Stop losing £4,200/year" not "Earn more money" |
| **Specificity over vagueness** | "14 minutes setup" not "quick setup" |
| **Social normalisation** | "Join 500+ UK tradespeople" |
| **Risk reversal** | "14-day free trial. No card required." |
| **Urgency without desperation** | "While you read this, a competitor is answering their calls" |
| **Outcome in every feature** | "Smart Scheduling — so you wake up to a full diary" |
| **UK trades vocabulary** | Call-out, quote, job, booking, diary |

---

## 4. Technical Rules

### 4.1 Stack (Exact, Non-Negotiable)

```
Runtime:     React 19.2.3
Build:       Vite 6.2.0
Language:    TypeScript 5.8.2
Styling:     Tailwind CSS (local tailwind.config.ts)
Icons:       Lucide React
AI/Audio:    Google Gemini 2.5 Flash TTS API (@google/genai)
Booking:     Calendly embed (components/BookDemo.tsx)
Waitlist:    Google Apps Script webhook (components/WaitlistModal.tsx)
Smooth Scroll: Lenis (npm install lenis)
Deployment:  Vercel
```

**Do not add:**
- React Router
- Redux/Zustand
- Framer Motion (Lenis + CSS + IntersectionObserver covers all needs)
- GSAP
- Any CSS-in-JS library

**Permitted additions:**
- `lenis` — smooth scroll (MANDATORY, install it)
- `@radix-ui/react-*` — accessible modals, dropdowns, accordions
- `canvas-confetti` — conversion events

### 4.2 Tailwind Config

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
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-up': 'fadeUp 600ms cubic-bezier(0.16,1,0.3,1) both',
        'gauge-fill': 'gaugeFill 800ms cubic-bezier(0.25,0.46,0.45,0.94) both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float-primary': 'floatPrimary 5s ease-in-out infinite',
        'float-secondary': 'floatSecondary 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(32px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 24px rgba(255,107,43,0.35)' },
          '50%': { boxShadow: '0 0 48px rgba(255,107,43,0.6)' },
        },
        floatPrimary: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':       { transform: 'translateY(-10px) rotate(0.3deg)' },
          '66%':       { transform: 'translateY(-5px) rotate(-0.2deg)' },
        },
        floatSecondary: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%':       { transform: 'translateY(-8px) rotate(-0.3deg)' },
        },
      },
    },
  },
}
```

### 4.3 Shared Animation Hook

Create `src/hooks/useScrollAnimation.ts`:

```typescript
import { useEffect, useRef } from 'react';

export function useScrollAnimation() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Add stagger delays for children
            const children = entry.target.querySelectorAll('[data-delay]');
            children.forEach((child) => {
              const delay = Number((child as HTMLElement).dataset.delay) * 80;
              (child as HTMLElement).style.transitionDelay = `${delay}ms`;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
```

Global CSS for animation states in `src/styles/tokens.css`:

```css
[data-animate] {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}

[data-animate].is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  [data-animate] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

### 4.4 Performance Requirements

| Metric | Target | Method |
|---|---|---|
| LCP | < 1.5s | Preload hero font + above-fold, avoid render-blocking |
| CLS | 0 | Reserve space for async images |
| INP | < 200ms | Offload Gemini API async |
| FCP | < 0.8s | Critical CSS inlined, fonts preloaded |
| Bundle | < 150KB gzipped JS | Tree-shake Lucide, lazy-load non-hero sections |

**Lazy loading rules:**
- AudioPlayer: lazy import
- BookDemo/Calendly: lazy import
- Testimonials: lazy import
- Calculator: lazy import
- All below-fold images: `loading="lazy"`

### 4.5 Accessibility

- **WCAG AAA contrast** on all text
- **Focus states**: orange outline on keyboard focus
  ```css
  :focus-visible { outline: 2px solid #FF6B2B; outline-offset: 3px; }
  ```
- **Touch targets**: minimum 48×48px
- **Motion**: wrap all animations in `prefers-reduced-motion`
- **Screen reader**: AudioPlayer must have text transcript

### 4.6 Mobile-First Rules

- Default layout assumes 375px viewport
- All tap targets ≥ 48px
- Sticky bottom bar always visible on mobile
- Font sizes never below 16px on mobile
- Float animations: reduced to 50% intensity on mobile
- Sticky scroll feature section: stack vertically on mobile (no sticky panel)
- Mouse parallax: disabled on touch devices

### 4.7 File & Component Architecture

```
Trade-receptionist/
├── CLAUDE.md                    ← This file
├── App.tsx                      ← Main page orchestrator
├── index.html                   ← Entry, SEO, font preloads
├── index.tsx                    ← React mount + Lenis init
├── types.ts                     ← Shared TypeScript interfaces
├── tailwind.config.ts           ← Design token layer
├── vite.config.ts               ← Build config
├── src/
│   ├── hooks/
│   │   ├── useScrollAnimation.ts  ← IntersectionObserver hook
│   │   ├── useCounter.ts          ← Animated counter hook
│   │   └── useParallax.ts         ← Mouse parallax hook
│   └── styles/
│       └── tokens.css             ← CSS custom properties + [data-animate] states
├── components/
│   ├── UI.tsx                   ← Button, Card, GlassCard, Section, Badge, StatusGauge
│   ├── AudioPlayer.tsx          ← AI demo audio (Gemini TTS)
│   ├── Calculator.tsx           ← ROI calculator
│   ├── BookDemo.tsx             ← Calendly embed
│   ├── WaitlistModal.tsx        ← Google Sheets form
│   ├── Testimonials.tsx         ← Testimonials carousel
│   ├── BlueprintGrid.tsx        ← Canvas grid background
│   ├── StickyFeatures.tsx       ← NEW: Sticky scroll feature showcase
│   ├── FloatingHeroCards.tsx    ← NEW: Floating glass notification cards
│   ├── AnimatedStats.tsx        ← NEW: Animated counter stats bar
│   └── Logo.tsx                 ← Logo SVG
```

---

## 5. Guardrails & Philosophy

### 5.1 What You Must NEVER Do

| Category | Forbidden | Alternative |
|---|---|---|
| **Colors** | Pure black, pure white, unsaturated grey | Use void/navy/white-primary tokens |
| **Borders** | Any `border-*`, `divide-*`, `hr` for layout | Tonal elevation, glassmorphism, spacing |
| **Borders (exception)** | — | Active feature indicator in sticky scroll: `border-left: 2px solid #FF6B2B` only |
| **Shadows** | `rgba(0,0,0,...)` | Use `rgba(2,13,24,...)` |
| **Typography** | Inter, system-ui, or any non-system font | Space Grotesk + Manrope only |
| **Animation libs** | Framer Motion, GSAP | Lenis + CSS + IntersectionObserver |
| **Animation** | Bouncy spring easing | Mechanical easing only |
| **Animation** | Transforms under 300ms | Minimum 300ms |
| **Motion** | Decorative blobs, particle effects, random orbs | Blueprint grid, floating product UI only |
| **Float** | Floating shapes with no semantic meaning | Only float real product UI elements |
| **Imagery** | AI art, American stock photos, robotic imagery | Real UK trade photography |
| **Copy** | "Get Started", "Learn More", "Powered by AI" | Outcome-first copy per §3.6 |
| **Layout** | Full symmetry on desktop | Asymmetric editorial |
| **Gradients** | Purple-to-pink, rainbow, arbitrary | Only Industrial Luminescence recipes |
| **Gradient text** | Entire headline in gradient | ONE keyword per section only |

### 5.2 The Craftsman Test

Before shipping any UI change, ask: **"Does this feel like a £5,000 precision tool — or a cheap app?"**

A £5,000 tool:
- Has weight and intention in every motion
- Uses space authoritatively
- Has perfect contrast in any light condition
- Makes the user feel they made a wise, professional choice
- Feels **alive** — elements move with purpose, stats count up, sections reveal with craft

A cheap app:
- Animates for the sake of animating
- Has static numbers that just appear
- Has sections that snap into view with no elegance
- Could have been built with a website builder

**If it fails the test: redesign it.**

### 5.3 The Framer Standard

Every section, when scrolled into view, must feel as polished as a Framer-built site. This means:
- No element simply "appears" — everything enters with a purposeful transition
- Stats always count up — never static
- The features section always uses the sticky scroll pattern
- Smooth scrolling is always Lenis — never native browser scroll
- The hero always has floating, breathing UI elements

If a section would look at home on a basic Webflow template, it needs more animation work.

### 5.4 Domain Constraints

- **UK English only** in all copy, labels, placeholders
- **£ not $** in all pricing
- **Phone numbers**: UK format
- **Trade vocabulary**: job, call-out, quote, diary, booking
- **Never claim**: specific legal compliance without legal review

### 5.5 Code Quality Guardrails

- **Read before editing**: always read the target file first
- **No speculative abstractions**
- **No over-engineering**
- **No breaking existing functionality**: AudioPlayer Gemini integration and WaitlistModal Sheets webhook are mission-critical
- **No hardcoded API keys**: use `import.meta.env`

---

## 6. Quick Reference Tables

### 6.1 Complete Color → Tailwind Mapping

| Design Token | Hex / Value | Tailwind Class |
|---|---|---|
| Void | `#020D18` | `bg-void` |
| Navy | `#051426` | `bg-navy` |
| Navy Mid | `#0A2340` | `bg-navy-mid` |
| Navy High | `#0F3060` | `bg-navy-high` |
| Orange | `#FF6B2B` | `bg-orange text-orange` |
| Orange glow | `#FF8C55` | `bg-orange-glow` |
| Orange soft | `#ffb59a` | `text-orange-soft` |
| Blue accent | `#99cbff` | `text-blue-accent` |
| White primary | `#F0F4F8` | `text-white-primary` |
| White secondary | `rgba(240,244,248,0.70)` | `text-white-primary/70` |
| White muted | `rgba(240,244,248,0.40)` | `text-white-primary/40` |
| Glass surface | `rgba(255,255,255,0.06)` | `bg-white/[0.06]` |

### 6.2 Animation Patterns Quick Reference

| Pattern | Section | Implementation |
|---|---|---|
| Scroll entrance | Every section | `[data-animate]` + `useScrollAnimation` hook |
| Stagger | Card grids | `data-delay="N"` on children |
| Counter | Stats bar, hero metrics | `useCounter` hook + `requestAnimationFrame` |
| Float (primary) | Hero phone mockup | `animation: floatPrimary 5s ease-in-out infinite` |
| Float (secondary) | Hero glass cards | `animation: floatSecondary 4s`, staggered delays |
| Sticky scroll | Features section | `StickyFeatures.tsx` component |
| Progress bar | How It Works | `.step-progress-fill` + IntersectionObserver |
| Mouse parallax | Hero only | `useParallax` hook, desktop only |
| Smooth scroll | Entire page | Lenis, init in `index.tsx` |

### 6.3 Conversion Copy Swaps

| Current | Required |
|---|---|
| "Get Started" | "Start Free Trial" |
| "Sign Up" | "Start Free Trial" |
| "Learn More" | "See How It Works" |
| "Contact Us" | "Talk to Our Team" |
| "Features" (heading) | "What You Actually Get" |
| "How it works" (eyebrow) | "THREE STEPS TO ZERO MISSED CALLS" |
| "Pricing" (heading) | "Simple, Honest Pricing" |
| "Testimonials" (eyebrow) | "WHAT UK TRADESPEOPLE SAY" |

### 6.4 Git Commit Convention

```
feat:     New feature or section
fix:      Bug fix
style:    Design/visual change
refactor: Code restructure
perf:     Performance improvement
a11y:     Accessibility improvement
tokens:   Design token change
copy:     Content/copy change
anim:     Animation addition or change
```

---

## 7. First-Run Checklist

Before starting any work in a new session:

- [ ] Read this file fully
- [ ] Read the target file(s) before modifying
- [ ] Confirm stack is Vite + React 19 (not Next.js)
- [ ] Apply the Craftsman Test
- [ ] Apply the Framer Standard — does every section animate in with purpose?
- [ ] Never use arbitrary Tailwind values
- [ ] Never use pure black, pure white, or Inter
- [ ] Verify the No-Line Rule (exception: active feature indicator only)
- [ ] Test mobile view at 375px
- [ ] Check WCAG AAA contrast
- [ ] Verify `import.meta.env` for API keys
- [ ] Confirm Lenis is initialised in `index.tsx`
- [ ] Confirm `[data-animate]` is on every major section element
- [ ] Confirm the Features section uses `StickyFeatures.tsx`
- [ ] Confirm hero has floating cards with staggered animation delays
- [ ] Confirm stat counters animate from 0 on load

---

*End of CLAUDE.md — Trade Receptionist Design Constitution v2.0*
*Built to last. Like the tools it serves. Moving like the machine it is.*
