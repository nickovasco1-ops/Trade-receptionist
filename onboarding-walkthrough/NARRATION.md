# Narration

**No narration recording exists in this repository.** Nothing under
`public/assets/` is a voiceover — `public/assets/generated/sample-call.wav` is the
marketing demo-call audio used by `components/AudioPlayer.tsx`, which is a staged
customer call, not narration. No external generation service was called to make
one, per the brief.

The film is cut to this script's timing and the audio mix is wired and waiting.

## Script

Verbatim copy also in [`narration/narration-script.txt`](narration/narration-script.txt).

> Start your free trial. Sign in securely. Choose how your receptionist should
> sound. Add your business, services, and working hours. Review the setup and go
> live. From one dashboard, see every call, lead, booking, and urgent job. Update
> your details anytime. Divert your existing number and keep your calendar
> connected. Trade Receptionist. Never miss another job.

## Where each line lands

Timings are the scene cuts in the rendered film, so a read paced to this table
lands on picture without re-editing.

| Line | In | Out | Scene |
|---|---|---|---|
| "Start your free trial." | 0.2s | 3.0s | Free trial |
| "Sign in securely." | 3.1s | 5.0s | Passwordless sign-in |
| "Choose how your receptionist should sound." | 5.1s | 7.0s | Receptionist tone |
| "Add your business, services, and working hours." | 7.1s | 13.0s | Business details → Services → Working hours |
| "Review the setup and go live." | 13.1s | 18.2s | Setup review → Receptionist live |
| "From one dashboard, see every call, lead, booking, and urgent job." | 18.3s | 24.0s | Dashboard → Recent calls |
| "Update your details anytime." | 24.1s | 26.2s | Settings / call diversion |
| "Divert your existing number and keep your calendar connected." | 26.3s | 29.0s | Connected calendar |
| "Trade Receptionist. Never miss another job." | 29.4s | 33.0s | Supplied end card |

The fourth line spans three cuts and the fifth spans two, which is deliberate —
those are the beats where the wizard should feel like one continuous action rather
than six separate chores.

## Dropping the audio in

1. Put the files in `remotion/public/audio/` — e.g. `narration.wav` (48 kHz,
   mono or stereo, peaks at or below −3 dBFS) and `bed.wav`.
2. Point `AUDIO` in `remotion/src/timeline.ts` at them:

   ```ts
   export const AUDIO: AudioConfig = {
     narrationSrc: 'audio/narration.wav',
     narrationGainDb: 0,
     musicSrc: 'audio/bed.wav',
     musicGainDb: -20,        // relative to narration; brief asks for >= -16 dB
     musicFadeSeconds: 1.2,
     liveTickSrc: null,       // or 'audio/tick.wav'
   };
   ```
3. `npm run render:onboarding`.

`Soundtrack.tsx` handles the levels, the bed's head and tail fades, and the
optional tick at the go-live cut. No other file needs to change.

## Missing sound assets, named

| Asset | Expected path | Status |
|---|---|---|
| Narration | `remotion/public/audio/narration.wav` | **missing** — must be recorded |
| Music bed | `remotion/public/audio/bed.wav` | **missing** — must be licensed or chosen |
| Go-live tick | `remotion/public/audio/tick.wav` | **missing** — not generated; the brief allows one here |

The end card's own brand sound is present and plays at −18 dB, which covers the
brief's second permitted cue ("one when the end frame appears").
