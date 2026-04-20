# Trade Receptionist — Premium Rebuild Prompt
# Paste this into Claude Code to start the session

---

Read CLAUDE.md in full before writing a single line of code. That file is law.

You are rebuilding the Trade Receptionist landing page to match the premium, Framer-quality animation standard of https://audia.framer.website — but using our Industrial Luminescence design system, our orange/navy colour palette, and our UK tradesperson copy. Do not copy Audia's aesthetic. Mirror its motion quality and scroll experience only.

## Your Mission

Transform the current site from "looks decent" to "looks like it was built in Framer." The gap is almost entirely in animation, motion, and scroll behaviour. The design tokens and colour system are already correct. The content is already correct. What is missing is:

1. Lenis smooth scroll across the entire page
2. Scroll-triggered entrance animations on every section element
3. The sticky scroll feature showcase (the signature Audia pattern)
4. Animated stat counters that count up from zero
5. Floating ambient hero UI cards
6. Mouse parallax on the hero phone mockup
7. Animated progress bars in the How It Works section
8. Staggered entrance delays on card grids

## Step-by-Step Build Order

Work through this in order. Do not skip steps. Complete each step fully before moving to the next.

---

### STEP 1 — Install Lenis and wire it up

```bash
npm install lenis
```

In `index.tsx`, initialise Lenis after React mounts:

```typescript
import Lenis from 'lenis';

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
```

Verify: scroll the page — it should feel buttery and weighted, not native browser snap.

---

### STEP 2 — Create shared animation infrastructure

Create `src/hooks/useScrollAnimation.ts`:
- IntersectionObserver hook that adds `is-visible` class when element enters viewport
- threshold: 0.12, rootMargin: '0px 0px -60px 0px'
- Reads `data-delay` attribute on children for stagger timing (each N * 80ms)
- Fires once only (unobserve after trigger)

Create `src/hooks/useCounter.ts`:
- Accepts: target number, duration (default 1200ms), prefix, suffix
- Uses requestAnimationFrame + easeOutExpo
- Returns current value as string
- Only starts when `shouldStart` boolean is true (triggered by IntersectionObserver)

Create `src/hooks/useParallax.ts`:
- Listens to mousemove on window
- Returns { x, y } offset values (max ±20px for primary, ±8px for secondary)
- Returns { x: 0, y: 0 } on touch devices (check `pointer: coarse`)
- Cleans up event listener on unmount

Add to `src/styles/tokens.css`:
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
  [data-animate] { opacity: 1; transform: none; transition: none; }
}
```

---

### STEP 3 — Rebuild the Hero section

The hero must feel alive the moment the page loads. It has two halves:

**Left half (60% on desktop):**
- Eyebrow: "THE UK'S #1 AI TRADE RECEPTIONIST" in orange-soft
- Headline: "Never Miss A *Call.* Never Lose A *Job.*" — the words "Call" and "Job" are italic + orange gradient text (see CLAUDE.md §2.1 for gradient text recipe)
- Subheadline: "While you're on the tools, Sarah answers every call, books every job, and sends you a WhatsApp summary. 24/7. Never misses."
- Dual CTAs: "Start Free Trial" (orange) + "Hear a Live Demo" (glass blue)
- Stat bar beneath CTAs: three counters that count up from 0 on load:
  - "12,847 calls answered this month"
  - "98.7% answer rate"
  - "£4,200 avg. annual savings"
  All three use `useCounter` hook with easeOutExpo, 1200ms duration

**Right half (40% on desktop):**
- Phone mockup (use existing or a styled div with phone proportions)
- Phone has `animation: floatPrimary 5s ease-in-out infinite`
- Mouse parallax applied via `useParallax` hook
- 3 floating glass notification cards positioned around the phone:
  - Card 1 (top-left of phone): "📞 Incoming call — Dave Hendricks, Plumbing quote" — animation-delay: 0s
  - Card 2 (bottom-right): "✅ Sarah answered. Job booked for Tuesday 9am." — animation-delay: 0.8s
  - Card 3 (above phone): "📊 Calls today: 24 · Booked: 18" pill — animation-delay: 1.6s
  All cards use `animation: floatSecondary 4s ease-in-out infinite`
  All cards are glass cards (rgba(255,255,255,0.06), backdrop-blur-[24px])

On mobile: stack hero vertically (copy first, phone below), disable parallax, reduce float to 50% intensity.

---

### STEP 4 — Create the Sticky Scroll Features section (StickyFeatures.tsx)

This is the most important section. Study the Audia site's features section — this is the pattern.

**Component structure:**
```
<section> (relative, overflow-hidden)
  <div> (two columns, gap-16, items-start)
    
    <!-- LEFT: scrollable feature list -->
    <div> (flex flex-col gap-8, w-[55%])
      {features.map(feature => <FeatureBlock />)}
    </div>
    
    <!-- RIGHT: sticky preview panel -->
    <div> (w-[45%], position sticky, top: 10vh, height: 80vh)
      <PhonePreviewPanel activeFeature={activeIndex} />
    </div>
    
  </div>
</section>
```

**FeatureBlock component:**
Each feature block has:
- An IntersectionObserver that fires when the block is 40% visible
- When active: `border-left: 2px solid #FF6B2B` + `background: rgba(255,107,43,0.04)`
- Feature number (01, 02, 03, 04) in orange-soft/40
- Feature name in display-sm Space Grotesk
- Description in body-md
- Outcome badge ("So you never miss a booking")
- Transition: 300ms for background + border changes

**The 4 features:**
1. **Always-On Call Answering** — Sarah answers every call 24/7 in a natural British accent. Callers never know it's AI. Outcome: "So every enquiry becomes a lead"
2. **Instant WhatsApp Summaries** — Get a WhatsApp message after every call: who called, what they need, what was said. Outcome: "So you're always in the loop, even on the tools"
3. **Smart Spam Filtering** — PPI calls, cold callers, and time-wasters get handled automatically. Outcome: "So you only deal with real customers"
4. **Diary Integration** — Sarah books jobs directly into your calendar. Customer gets a confirmation. Outcome: "So you wake up to a full diary"

**PhonePreviewPanel:**
Shows a styled glass phone UI that transitions between 4 different "screens" based on which feature is active:
- Feature 1 active → shows an active call screen ("Answering call... Dave Hendricks")
- Feature 2 active → shows a WhatsApp-style message card
- Feature 3 active → shows a spam call blocked notification
- Feature 4 active → shows a calendar booking confirmation

Transitions between panels: opacity 0 → translateY(-16px) exit, opacity 1 → translateY(0) enter, 400ms.

On mobile: remove sticky, stack vertically, show each feature with its preview directly below.

---

### STEP 5 — Animated How It Works section

3 steps. Each step has an animated progress bar that fills to 100% when the step enters viewport.

**Step structure:**
```
[Step number in orange]
[Step title: "01 — Build Your Profile"]
[Progress bar — fills on viewport entry]
[Step description]
```

The 3 steps:
1. **Build** — "Give Sarah your business name, services, pricing, and availability. 14 minutes. No technical knowledge needed."
2. **Divert** — "Forward your business number to Sarah — or get a dedicated number. She answers every call instantly, 24/7."
3. **Focus** — "Get on with the job. Sarah handles every call, books every appointment, and sends you a WhatsApp summary."

Progress bar fills: 1200ms, cubic-bezier(0.16, 1, 0.3, 1), orange gradient.
Bar only fills once (use `started` flag).

---

### STEP 6 — Apply scroll entrance animations to ALL sections

Every section that doesn't already have animation needs `data-animate` + the `useScrollAnimation` hook.

Go through `App.tsx` section by section. For each:
1. Add `data-animate` to the section container
2. Call `useScrollAnimation()` and attach the ref to the section
3. For sections with grids of cards, add `data-delay="N"` (N = 0,1,2,3...) to each card

Sections to animate:
- Pain Points section (cards: data-delay 0,1,2)
- ROI Calculator section
- Comparison table
- Use Cases section (cards: data-delay 0,1,2,3)
- Testimonials section (cards: data-delay 0,1,2)
- Pricing section (cards: data-delay 0,1,2)
- FAQ section (each accordion item: data-delay 0–7)
- Final CTA section

---

### STEP 7 — Animated stat counters

If there's a stats/social proof bar (calls answered, trades served, etc.), replace all static numbers with animated counters using `useCounter`.

Trigger via IntersectionObserver. Format with `toLocaleString('en-GB')`.

Existing stats to animate:
- Total calls answered (e.g. 847,293)
- Trades served (e.g. 500+)
- Average savings per tradesperson (£4,200)
- Answer rate (98.7%)

---

### STEP 8 — Polish pass

After all sections are animated:

1. **Timing audit** — scroll through the full page. Any section that feels "snappy" or instant needs a longer transition. Any animation that feels "laggy" needs its threshold adjusted.

2. **Stagger audit** — any grid of cards that all appear at the same time needs staggered delays.

3. **Mobile audit** — at 375px viewport:
   - Sticky features section must stack vertically
   - Float animations must be at 50% translateY intensity
   - Hero phone must be below the copy, not beside it
   - All touch targets ≥ 48px

4. **Reduced motion audit** — add `prefers-reduced-motion` wrapping to all CSS animations.

5. **Performance audit** — no animation should cause layout shifts. All transitions use `transform` and `opacity` only. No `width`, `height`, `top`, `left` animations.

---

## What NOT to Do

- Do not install Framer Motion
- Do not install GSAP
- Do not add purple, pink, or gradient backgrounds
- Do not add decorative floating blobs or abstract shapes
- Do not use border as a divider anywhere (the active feature border-left is the only exception)
- Do not use Inter or system-ui fonts
- Do not change the colour palette — it is correct as-is
- Do not touch the AudioPlayer Gemini TTS integration
- Do not touch the WaitlistModal Google Sheets webhook
- Do not change the Calendly embed in BookDemo.tsx
- Do not add animations under 300ms for transforms

## Quality Bar

When you're done, this page should feel indistinguishable from audia.framer.website in terms of scroll polish and motion quality — while looking completely different in terms of aesthetic (dark navy/orange, industrial, UK trade, not light/minimal/American SaaS).

If a senior designer at a Framer-specialist agency scrolled this page, they should say: "this was hand-crafted."

If they'd say: "this was made with AI" — keep going.
