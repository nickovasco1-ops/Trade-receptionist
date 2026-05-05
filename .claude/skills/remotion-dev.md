# Remotion Dev — Video Composition Development

## Trigger
Invoked as `/remotion-dev`

Optional flags:
- `/remotion-dev new:<composition-name>` — scaffold a new Remotion composition
- `/remotion-dev render:<composition-id>` — render a specific composition to MP4
- `/remotion-dev setup` — initialize Remotion in the project (first-time setup)

## Purpose
Create, modify, and render Remotion video compositions for Trade Receptionist. Use Remotion to produce branded promotional videos, feature demos, and social media content.

---

## First-Time Setup

If Remotion is not yet installed:

```bash
npm install remotion @remotion/renderer @remotion/bundler @remotion/cli
```

Create the `remotion/` directory structure:

```
remotionr/
├── index.ts                  ← Entry point — registers all compositions
├── Root.tsx                  ← Root component listing all Compositions
└── compositions/
    ├── PromoVideo.tsx         ← 30s brand promo (1920×1080)
    ├── SocialClip.tsx        ← 15s 9:16 social clip (1080×1920)
    └── FeatureDemo.tsx        ← Feature walkthrough
```

Add to `package.json` scripts:
```json
{
  "remotion:studio": "remotion studio remotion/index.ts",
  "remotion:render": "remotion render remotion/index.ts"
}
```

Add to `.gitignore`:
```
out/
```

---

## File: `remotion/index.ts`

```ts
import { registerRoot } from 'remotion';
import { Root } from './Root';

registerRoot(Root);
```

## File: `remotion/Root.tsx`

```tsx
import React from 'react';
import { Composition } from 'remotion';
import { PromoVideo } from './compositions/PromoVideo';
import { SocialClip } from './compositions/SocialClip';

export const Root: React.FC = () => (
  <>
    <Composition
      id="PromoVideo"
      component={PromoVideo}
      durationInFrames={900}   // 30s × 30fps
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        headline: 'Never Miss a Job Again',
        subtext: 'AI-powered call answering for tradespeople',
      }}
    />
    <Composition
      id="SocialClip"
      component={SocialClip}
      durationInFrames={450}   // 15s × 30fps
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        hookText: 'You just missed a £500 job.',
      }}
    />
  </>
);
```

---

## Composition Anatomy

```tsx
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';

type Props = {
  headline: string;
  subtext?: string;
};

export const PromoVideo: React.FC<Props> = ({ headline, subtext }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const headlineOpacity = spring({ frame, fps, config: { damping: 20 } });
  const headlineY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0A' }}>
      {/* Background */}
      <AbsoluteFill
        style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 100%)' }}
      />

      {/* Headline */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 80 }}>
        <h1 style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          color: '#FFFFFF',
          fontSize: 72,
          fontWeight: 800,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          lineHeight: 1.1,
          margin: 0,
        }}>
          {headline}
        </h1>

        {subtext && (
          <Sequence from={30}>
            <p style={{
              color: '#A0A0A0',
              fontSize: 32,
              fontFamily: 'Inter, sans-serif',
              textAlign: 'center',
              marginTop: 24,
            }}>
              {subtext}
            </p>
          </Sequence>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Remotion Animation APIs

### spring() — physics-based easing
```ts
const value = spring({
  frame,
  fps,
  config: { damping: 20, stiffness: 80, mass: 1 },
  from: 0,
  to: 1,
  delay: 10,        // start after N frames
});
```

### interpolate() — keyframe mapping
```ts
const x = interpolate(
  frame,
  [0, 15, 45, 60],          // input keyframes (frames)
  [0, 1, 1, 0],             // output values
  { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
);
```

### Sequence — time-offset a child
```tsx
<Sequence from={30} durationInFrames={60}>
  <MyScene />
</Sequence>
```

### Series — sequential scenes with automatic timing
```tsx
import { Series } from 'remotion';

<Series>
  <Series.Sequence durationInFrames={90}><Scene1 /></Series.Sequence>
  <Series.Sequence durationInFrames={90}><Scene2 /></Series.Sequence>
</Series>
```

### Audio
```tsx
import { Audio, staticFile } from 'remotion';

<Audio src={staticFile('audio/background.mp3')} volume={0.3} />
```

### Video overlay
```tsx
import { OffthreadVideo } from 'remotion';

<OffthreadVideo src={staticFile('video/demo.mp4')} />
```

---

## Useful Animation Patterns

### Fade in
```ts
const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
```

### Fade in, hold, fade out
```ts
const opacity = interpolate(
  frame,
  [0, 15, durationInFrames - 15, durationInFrames],
  [0, 1, 1, 0],
  { extrapolateRight: 'clamp' }
);
```

### Slide up entrance
```ts
const y = interpolate(frame, [0, 20], [50, 0], { extrapolateRight: 'clamp' });
// transform: `translateY(${y}px)`
```

### Scale pop
```ts
const scale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
// transform: `scale(${scale})`
```

### Staggered list items
```tsx
{items.map((item, i) => {
  const delay = i * 8;
  const itemOpacity = spring({ frame: Math.max(0, frame - delay), fps });
  return <div key={i} style={{ opacity: itemOpacity }}>{item}</div>;
})}
```

### Count-up number
```ts
const displayed = Math.round(
  interpolate(frame, [0, 60], [0, targetNumber], { extrapolateRight: 'clamp' })
);
```

### Typewriter effect
```ts
const charsToShow = Math.floor(
  interpolate(frame, [0, 60], [0, text.length], { extrapolateRight: 'clamp' })
);
const displayed = text.slice(0, charsToShow);
```

---

## Rendering

### Remotion Studio (interactive preview)
```bash
npm run remotion:studio
# Opens browser at localhost:3000
# — scrub the timeline
# — edit default props live
# — select any composition from the dropdown
```

### Render to MP4
```bash
# Render a composition
npx remotion render remotion/index.ts PromoVideo --output out/promo.mp4

# With custom props
npx remotion render remotion/index.ts PromoVideo \
  --props='{"headline":"Custom Headline"}' \
  --output out/custom-promo.mp4

# Portrait social clip
npx remotion render remotion/index.ts SocialClip --output out/social-clip.mp4
```

### Render flags
| Flag | Purpose |
|------|---------|
| `--codec h264` | H.264 MP4 (default, most compatible) |
| `--quality 80` | CRF quality 0–100 |
| `--scale 0.5` | Half resolution (fast preview render) |
| `--frames 0-90` | Render only frames 0–90 |
| `--concurrency 4` | Parallel rendering threads |

---

## Composition Sizing Reference

| Format | Width | Height | Use case |
|--------|-------|--------|---------|
| 16:9 landscape | 1920 | 1080 | YouTube, LinkedIn |
| 9:16 portrait | 1080 | 1920 | TikTok, Instagram Reels |
| 1:1 square | 1080 | 1080 | Instagram feed |
| 4:5 portrait | 1080 | 1350 | Instagram portrait |

---

## Creating a New Composition

### Step 1 — Register in `remotion/Root.tsx`
```tsx
import { NewComposition } from './compositions/NewComposition';

// Inside Root:
<Composition
  id="NewComposition"
  component={NewComposition}
  durationInFrames={300}    // 10s × 30fps
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{ ... }}
/>
```

### Step 2 — Create the component
`remotion/compositions/NewComposition.tsx` — see anatomy above.

### Step 3 — Preview in Studio
```bash
npm run remotion:studio
```
Select `NewComposition` from the composition dropdown. Scrub the timeline. Adjust default props.

### Step 4 — Render
```bash
npx remotion render remotion/index.ts NewComposition --output out/new-composition.mp4
```

---

## Brand Guidelines for Compositions

Check `tailwind.config.ts` for the current brand colour palette, then apply consistently:

- **Background**: `#0A0A0A` (near-black) or brand dark gradient
- **Primary text**: `#FFFFFF`
- **Accent**: current brand accent from `tailwind.config.ts`
- **Font**: Inter (import via `@remotion/google-fonts` or embed as static asset)
- **Tone**: confident, direct, trade-professional
- **CTA language**: "Never miss a job again." or "tradereceptionist.com"

### Loading Google Fonts in Remotion
```ts
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont();
// Then use fontFamily in styles
```

Install the fonts package if needed:
```bash
npm install @remotion/google-fonts
```

---

## Rules
- Always run Remotion Studio before reporting a composition as done — visual verification is required
- Always set `extrapolateRight: 'clamp'` on `interpolate()` to prevent values running past keyframes
- Keep social clips under 30s; promo videos under 60s
- Never hardcode text that belongs in props — make everything a prop with a sensible default
- Output MP4s to `out/` (ensure `out/` is in `.gitignore`)
- Match composition dimensions to the target platform before rendering
