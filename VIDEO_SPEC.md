# Trade Receptionist: Remotion Video Production Blueprint

---

## 1. PROJECT CORE & ARCHITECTURE

### Product Identity & Core Message

Trade Receptionist is a premium, authoritative AI virtual receptionist built for UK tradespeople to ensure they never lose a job while "on the tools." The core message is:

> **"You miss calls, you lose money; Sarah answers, qualifies, and books your diary 24/7."**

---

### Visual Identity Matrix

**Aesthetic:** "Industrial Luminescence" — master craftsman's workshop feel with warm industrial lighting on dark cast iron.

**Color Palette (Hex):**

| Token | Hex | Usage |
|---|---|---|
| `--void` | `#020D18` | Deepest background |
| `--navy` | `#051426` | Primary background |
| `--navy-mid` | `#0A2340` | Surfaces |
| `--orange` | `#FF6B2B` | Primary CTA |
| `--orange-soft` | `#ffb59a` | Eyebrows / accents |
| `--offwhite` | `#F0F4F8` | Primary text |

**Typography:**

| Role | Font | Notes |
|---|---|---|
| Display / Headings | Space Grotesk | Negative letter-spacing |
| Body / Labels | Manrope | — |
| Metrics | JetBrains Mono | — |

**Required Tailwind Classes:**
- `bg-void`
- `text-offwhite/70` (body text)
- `shadow-orange-glow`
- `glass` (6% opacity, 24px blur)

**Motion Standard:** Mechanical and intentional transitions (min 300ms). Strictly no bouncy or springy motion.

---

## 2. COMPONENT DECONSTRUCTION & LOGIC

### Root Composition

- **Wrapper:** `PublicPageShell` with `BlueprintGrid` background (40px grid)
- **Global Effects:** Grain texture overlay (2% opacity) and `AmbientDrift` radial blobs

---

### Component Tree

#### `HeroHeadline`

| Prop | Type |
|---|---|
| `text` | `string` |
| `highlightIndex` | `number` |

**Logic:** Split text into words; target word uses `text-transparent bg-clip-text bg-gradient-to-br from-orange to-orange-glow italic`.

---

#### `PhoneMockup`

| Prop | Type |
|---|---|
| `activeScreen` | `'incoming' \| 'whatsapp' \| 'diary'` |
| `isFloating` | `boolean` |

**Constraints:** Max 240px width; `rounded-[36px]`; `animate-float-primary`.

---

#### `GlassNotification`

| Prop | Type |
|---|---|
| `title` | `string` |
| `body` | `string` |
| `delay` | `number` |
| `icon` | `LucideIcon` |

**Constraints:** `glass` class; stagger-N delay logic; absolute positioning around `PhoneMockup`.

---

#### `StatCounter`

| Prop | Type |
|---|---|
| `value` | `number` |
| `prefix` | `string` |
| `label` | `string` |

**Logic:** `useCurrentFrame` interpolation from `0` to `value` over 1200ms using `easeOutExpo`.

---

#### `StatusGauge`

| Prop | Type |
|---|---|
| `value` | `number` |
| `label` | `string` |

**Logic:** SVG `<circle>` with `stroke-dashoffset` animation (800ms ease-precision).

---

## 3. DETERMINISTIC TIMELINE ENGINE (30fps)

| Scene | Frames | Narration Script | Visual / Layout | Animation Logic |
|---|---|---|---|---|
| **Intro** | 0–60 | *(No audio / Ambient industrial hum)* | Central `Logo.tsx` fades in over `BlueprintGrid`. | `opacity: interpolate(f, [0, 30], [0, 1])` |
| **Problem** | 60–180 | "You miss calls. You lose money. We fix that." | Text: "Never Miss A Call." — Left-aligned `display-2xl`. `StatCounter` for £4,200 loss appears. | `translateY: spring({f, from: 32, to: 0})` (Stiff) |
| **Solution** | 180–360 | "While you're on the tools, Sarah answers every call professionally." | `PhoneMockup` slides in from right. `GlassNotification` "Incoming Call" pops top-left. | `float-primary` (infinite loop) + Slide entrance (400ms) |
| **Workflow** | 360–540 | "She qualifies the job and sends a WhatsApp summary instantly." | Phone screen transitions to WhatsApp UI. Second `GlassNotification`: "Job booked for Tuesday." | `opacity: interpolate(f, [360, 390], [0, 1])` |
| **Social Proof** | 540–750 | "Join 500+ UK tradespeople already filling their diaries." | Marquee of `TradeCards` (Mario, Dean, etc.) scrolling horizontally. | `translateX: interpolate(f, [540, 750], [0, -500])` |
| **Outro / CTA** | 750–900 | "Start your 14-day free trial today. No card required." | Big "Start Free Trial" button. Subhead: "Simple, Honest Pricing." Final Logo pulse. | `scale: spring({f, from: 0.9, to: 1})` (Mechanical) |

**Total duration:** 900 frames = 30 seconds at 30fps.

---

## 4. INSTRUCTIONS FOR THE AGENT

You are a Remotion Developer. Strictly follow these implementation rules.

### Hooks Usage

- Use `useCurrentFrame()` and `useVideoConfig()` for all time-based logic.
- For entrances, use `interpolate` to map frames to `translateY` (initial 32px → 0) and `opacity` (0 → 1).
- All transforms **must** last at least 9 frames (300ms at 30fps).

### Spring Physics — The "No Bouncy" Rule

You must **not** use default spring settings. Use high damping to ensure a "Mechanical" feel.

```ts
// Reference config — use this for ALL spring animations
spring(frame, {
  fps,
  config: { stiffness: 100, damping: 20, mass: 1 },
})
```

### Styling

- Use Tailwind CSS exclusively for layout.
- Apply `backdrop-blur-[24px]` and `bg-white/6` for all Glass components.
- Headings must be `font-display` (Space Grotesk) with `tracking-[-0.03em]`.

### Composition Standards

- Anchor animations to the specific frame intervals defined in the Timeline Table above.
- Ensure `BlueprintGrid` is a constant background layer with `opacity-20`.
- Implement `prefers-reduced-motion` logic by checking `window.matchMedia` and disabling transforms if true.
