# Onboarding walkthrough film

A 33.6-second 1920 x 1080 product film covering signup, the six-step onboarding
wizard, going live, and the dashboard — built with Remotion.

**Output:** [`video/Trade-Receptionist-Onboarding-Remotion.mp4`](video/Trade-Receptionist-Onboarding-Remotion.mp4)

| | |
|---|---|
| Composition id | `TradeReceptionistOnboarding` |
| Resolution | 1920 x 1080 (16:9) |
| Frame rate | 30 fps |
| Duration | 1008 frames — 33.60s video, 33.64s container |
| Video | H.264 High, yuv420p, bt709, CRF 16, ~2.11 Mbps |
| Audio | AAC-LC stereo 48 kHz, ~317 kbps — end card brand sound only (see `NARRATION.md`) |
| File size | 10.2 MB |

## Commands

```bash
# Preview in the Remotion Studio (http://localhost:3000)
npm --prefix onboarding-walkthrough/remotion install     # once
npm --prefix onboarding-walkthrough/remotion run preview

# Render the MP4 from the repository root
npm run render:onboarding
```

`render:onboarding` writes to `onboarding-walkthrough/video/Trade-Receptionist-Onboarding-Remotion.mp4`.

On a machine without its own Chrome Headless Shell, point Remotion at one you
already have:

```bash
REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell npm run render:onboarding
```

Remotion downloads its own if the variable is unset. Note that a **full Chromium
build will not work** — Remotion launches in old headless mode, which current
Chrome binaries have removed; use `chrome-headless-shell`.

## Re-capturing the screens

The twelve screens are captured from the running application, not drawn. To
refresh them after a UI change:

```bash
# terminal 1 — the app (any Supabase values will do; preview routes use fixtures)
VITE_SUPABASE_URL=https://preview.supabase.co \
VITE_SUPABASE_ANON_KEY=preview-anon-key \
npx vite --port 3000

# terminal 2
node onboarding-walkthrough/capture/capture-screens.mjs http://127.0.0.1:3000
```

Writes 3840 x 2160 PNGs into `remotion/public/screens/`. See `ASSET-MANIFEST.md`
for the capture settings and for the one alteration the script makes (normalising
preview-only chrome to the copy production renders).

## Retiming the film

`remotion/src/timeline.ts` is the only file that holds timing. Change
`holdSeconds` on a scene and the whole edit re-flows; the composition length
follows automatically. The same file enforces the brief's restraint rules and
throws at load if one is broken:

- at most **three** scenes may set `pushIn`, none above **2%**
- at most **two** scenes may set `dissolveInMs`, each within **150–200ms**
- total running time must stay under **34s**

## Layout

```
onboarding-walkthrough/
├── ASSET-MANIFEST.md        every asset, its scene, and where it came from
├── NARRATION.md             the script, its timing, and how to drop audio in
├── README.md
├── capture/
│   └── capture-screens.mjs  Playwright capture from the app's own preview routes
├── narration/
│   └── narration-script.txt verbatim script
├── remotion/
│   ├── package.json         isolated — no Remotion dependency touches the root manifest
│   ├── remotion.config.ts   encoder settings
│   ├── public/
│   │   ├── screens/         3840x2160 product captures
│   │   └── end-card/        the supplied brand end card
│   └── src/
│       ├── index.ts         registerRoot
│       ├── Root.tsx         the Composition
│       ├── timeline.ts      the whole edit, as typed data
│       ├── theme.ts         colour and easing tokens
│       ├── OnboardingFilm.tsx
│       └── components/
│           ├── ScreenScene.tsx    full-frame screenshot + optional push-in
│           ├── EndCardScene.tsx   the supplied end card, presented exactly
│           └── Soundtrack.tsx     narration / bed / tick mix
└── video/                   render output
```

## Design decisions worth knowing

- **Clean cuts are the default.** Eleven of the twelve product transitions are
  hard cuts. Two dissolves, both 200ms: into "receptionist live", and into the end
  card.
- **Three push-ins, 1.0–1.5%**, each eased with `ease-precision`
  (`cubic-bezier(0.25, 0.46, 0.45, 0.94)`) across the whole hold so there is no
  perceptible start or stop. No other scene moves at all.
- **Screenshots are never scaled to fit.** Captures are exactly 16:9, so they land
  pixel-aligned at 1920 x 1080 as a 2:1 supersampled downscale. `object-fit` is
  used rather than a stretch, so the aspect ratio holds even if an asset is swapped.
- **CRF 16, not the default 18.** This palette is large flat navy gradients, which
  is exactly where H.264 bands; 16 keeps them clean at a 10 MB cost.
- **Remotion is fully isolated** in `remotion/package.json`. The failure catalogue
  (`.claude/health/FAILURE_CATALOG.md`, deploy-config class) records a previous
  Remotion scaffold clobbering the root manifest — the root only gains one script
  line and no dependency.
- **Hyperframes is not used.** It is HeyGen's standalone HTML/GSAP video framework
  with its own compiler, `puppeteer-core` renderer and frame adapters — not a set
  of motion primitives that plugs into Remotion. Adding it would have meant a
  second renderer plus a GSAP runtime, which both the brief ("do not introduce
  another animation framework") and CLAUDE.md §9.3 forbid. Its only pure-function
  motion exports, `spring-ease` and `wiggle-ease`, produce exactly the bounce the
  brief rules out. Remotion's `interpolate` plus the §4.1 easings cover everything
  this film needs.

## Known gaps

1. **No narration and no music bed exist.** See `NARRATION.md`. The film renders
   silent until ~28s.
2. **The supplied end card is 9:16, not 16:9.** It is presented complete and
   uncropped in a centred 608 x 1080 column on a matched field, which is the only
   treatment that preserves it. A 16:9 master is the real fix —
   `ASSET-MANIFEST.md` has the measurements and the alternative.
3. **`DashboardShell.tsx` has a sticky-positioning bug** found while capturing: the
   sidebar is `position: sticky` inside an `overflow-hidden` ancestor, so it
   scrolls away instead of sticking. Unrelated to this film, worth fixing.
