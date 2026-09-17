# Onboarding walkthrough — asset manifest

Every source asset used by `TradeReceptionistOnboarding`, the scene it plays in,
and where it came from.

## Where these assets came from — read this first

The brief pointed at `/Users/macos/Developer/Trade-receptionist/onboarding-walkthrough`
for "all the information needed like assets readme files etc". **That directory does
not exist in this repository** — not on this branch, not on `main`, not anywhere in
the history. It is local and uncommitted on the author's machine, and this work was
done in a remote Linux container, so none of it was reachable.

A search of the whole repository found **no product screenshots of any of the twelve
required screens**, no narration recording and no music bed. What exists under
`public/assets/` is marketing illustration and iconography, not captured product UI.

Rather than invent the interface — which the brief rightly forbids — the twelve
screens were **captured from the application itself**, using the public preview
routes the repository already ships (`/onboarding-preview`, `/dashboard-preview/*`)
plus the real `/login`, `/welcome` and marketing pricing surfaces. The capture
script is `capture/capture-screens.mjs` and it is re-runnable.

## Capture settings

| Setting | Value | Why |
|---|---|---|
| Viewport | 1920 x 1080 CSS px | Matches the film's frame, so the UI is at the scale a user sees on a 1080p laptop. |
| Device scale factor | 2 | Captures at 3840 x 2160 and lets Remotion present a 2:1 downscale — supersampled, so 13px UI labels stay crisp. |
| `prefers-reduced-motion` | `reduce` | The app honours it (CLAUDE.md §4.4), so every element is captured in its final state. No half-played entrance animations. |
| Locale / timezone | `en-GB` / `Europe/London` | Dates and numbers render as the product's own audience sees them. |
| Colour profile | sRGB, dark scheme | Matches the film's `bt709` output. |
| Screenshot mode | Viewport clip, never full-page | A full-page stitch would produce a non-16:9 image that then had to be scaled. Every capture is exactly 3840 x 2160. |

## Scene list

Frame numbers at 30 fps. "Cut" is the frame the scene becomes fully opaque.

| # | Scene id | Asset | Source route | Cut @ | Hold | Motion |
|---|---|---|---|---|---|---|
| 1 | `free-trial` | `screens/01-free-trial.png` | `/` → `#pricing` | 0 (0.00s) | 3.0s | push-in 1.0% |
| 2 | `passwordless-signin` | `screens/02-passwordless-signin.png` | `/login` | 90 (3.00s) | 2.0s | — |
| 3 | `receptionist-tone` | `screens/03-receptionist-tone.png` | `/onboarding-preview` step 1 — Voice | 150 (5.00s) | 2.0s | — |
| 4 | `business-details` | `screens/04-business-details.png` | step 2 — Business | 210 (7.00s) | 2.0s | — |
| 5 | `services` | `screens/05-services.png` | step 3 — Services | 270 (9.00s) | 2.0s | — |
| 6 | `working-hours` | `screens/06-working-hours.png` | step 4 — Hours | 330 (11.00s) | 2.0s | — |
| 7 | `setup-review` | `screens/07-setup-review.png` | step 6 — Launch | 390 (13.00s) | 2.0s | — |
| 8 | `receptionist-live` | `screens/08-receptionist-live.png` | `/welcome` | 450 (15.00s) | **3.2s** | push-in 1.5%, 200ms dissolve in |
| 9 | `dashboard` | `screens/09-dashboard.png` | `/dashboard-preview` | 546 (18.20s) | 2.9s | push-in 1.2% |
| 10 | `recent-calls` | `screens/10-recent-calls.png` | `/dashboard-preview/calls` | 633 (21.10s) | 2.9s | — |
| 11 | `settings-diversion` | `screens/11-settings-diversion.png` | `/dashboard-preview/settings` | 720 (24.00s) | 2.2s | — |
| 12 | `connected-calendar` | `screens/12-connected-calendar.png` | `/dashboard-preview/settings`, scrolled to the Google Calendar card | 786 (26.20s) | 2.8s | — |
| 13 | `end-card` | `end-card/TR_Brand_SignatureEndCard_Website_9x16_2026-09-12_v02.mp4` | **supplied** | 870 (29.00s) | 4.6s | 200ms dissolve in |

Scene 8 is the longest product hold, as the brief requires. Exactly three scenes
push in and exactly two cuts dissolve; `timeline.ts` throws at load if either
ceiling is exceeded.

## Spare captures (not in the film)

Kept because they are genuine product screens and may be preferred on a re-cut.

| Asset | What it is | Why it was not used |
|---|---|---|
| `screens/01b-free-trial-checkout.png` | The Stripe checkout modal — literally the "Start your free trial" screen | The modal is ~390 CSS px wide in a 1920px frame, so its copy is small on screen. The pricing section carries the same promise at a readable size. |
| `screens/06b-contact-alerts.png` | Wizard step 5 — Alerts & owner details | The brief's timeline has six wizard beats, not seven. This is the step that was dropped. |
| `screens/11b-settings-divert-code.png` | Settings scrolled to the `**004*…#` divert activation code | The content column sits left of centre with an empty right third. Scene 12 already shows the divert code in a better-balanced frame. |
| `screens/x-leads.png` | `/dashboard-preview/leads` | The dashboard and calls beats already cover lead capture. |

## The one alteration made to the captures

Preview routes render scaffolding that a paying customer never sees. Leaving it in
would have put "This is a safe dummy walkthrough" and "Sample data — inspect the
full UI without signing in" into a customer-facing film. So
`normalisePreviewChrome()` in `capture/capture-screens.mjs` either hides that
scaffolding or replaces it with **the string the same slot renders in production**.
Nothing else was touched: no layout, no colour, no control, no invented element.

| Preview string | Replaced with | Production source |
|---|---|---|
| `Preview mode` (wizard header pill) | `About 3 minutes` | `src/pages/OnboardingPage.tsx:961` |
| "This is a safe dummy walkthrough…" | *hidden* — production does not render it | `src/pages/OnboardingPage.tsx:1006-1014` |
| `Preview` (dashboard hero eyebrow) | `Overview` | `src/pages/DashboardPage.tsx:435` |
| "Sample data — inspect the full UI without signing in." | "What was handled, what was captured, and what needs you next." | `src/pages/DashboardPage.tsx:440` |
| `Preview mode` (dashboard hero pill) | *hidden* — production does not render it | `src/pages/DashboardPreviewPage.tsx:363` |
| `Preview mode` (shell account label) | `Signed in` | `src/components/dashboard/DashboardShell.tsx:197` |
| `Exit preview` | `Sign out` | `src/components/dashboard/DashboardShell.tsx:207` |
| `preview@tradereceptionist…` | `dave@hendricksplumbing.co.uk` | Matches the demo tenant already in the preview fixtures (Hendricks Plumbing & Heating / Dave Hendricks) |
| "This is shown in preview so you can inspect the elevated utility treatment…" | *hidden* — production does not render it | `src/pages/DashboardPreviewPage.tsx:1018` |
| WhatsApp float, Crisp widget | *hidden* | Third-party overlays, not product UI — `App.tsx:1693` |

Two further omissions, both by framing rather than edit:

- On scenes 11b and 12 the dashboard shell's account panel is hidden. It is
  `position: sticky` inside an `overflow-hidden` ancestor, so on a scrolled page
  it detaches and floats alone in the gutter with the nav links gone. That is
  genuine app behaviour and it looks like a rendering fault, so it is omitted
  rather than shown. **This is a real CSS bug in `DashboardShell.tsx` worth fixing
  independently of this film.**
- Scene 7's `LAUNCH REVIEW` eyebrow is clipped at the top edge by a few pixels.
  The wizard's review column is taller than 1080px and the frame was positioned to
  keep the full review list and the `Activate Trade Receptionist` button, which
  matter more than a decorative label.

## The supplied end card — the one unresolved conflict

The brief says *"Use this supplied **image** as the exact final frame"* and leaves
`END_FRAME_PATH` unsubstituted. What was actually supplied is a **video**:

| Property | Value |
|---|---|
| Dimensions | **1080 x 1920 — portrait 9:16** |
| Codec | H.264 (avc1), High profile, 2.42 Mbps |
| Duration | 4.533s video / 4.608s audio, 30 fps |
| Audio | AAC stereo 48 kHz — a soft riser (0–2s), then a logo accent peaking at **−10.1 dBFS** (2.4–3.4s), then silence |
| Field colour at the corners | rgb(0, 0, 10) — near black, **not** the `--color-navy` token |

A 9:16 asset cannot fill a 16:9 frame without being cropped. The measurements:

- The card's content (logo mark, wordmark, `www.tradereceptionist.com`, corner
  brackets, ambient glow) spans **y 285–1627 of 1920** — about 1340px tall.
- A full-width 16:9 centre crop keeps only **y 656–1264 — 608px**. That cuts the
  top of the logo and the URL entirely, and it would upscale a 1080px-wide source
  to 1920px, softening the fine URL text by 1.78x.

So the film uses `fit: 'contain'`: **the entire card, at native scale, nothing
cropped and nothing upscaled**, occupying a centred 608 x 1080 column. The pad
either side is `#00000A`, sampled from the card's own corner pixels, so it does
not read as a letterbox bar — verified on the rendered frames, where the finale
looks like one continuous dark field with the lockup centred.

Two caveats, stated plainly:

1. During the card's first ~1.5s a hairline graphic spans its full width and
   therefore terminates at the column edge. It is very faint (within ~4% of
   background) but it is the one moment the column boundary is inferable.
2. `#00000A` is near-black, which CLAUDE.md §0 Law 2 and §3.2 forbid. The pad
   matches the **supplied asset**, which is itself near-black at the edges;
   matching the asset was judged more important than matching the palette, because
   a `#051426` pad would have been visibly lighter than the card and would have
   read as letterboxing. Flagging it rather than hiding it.

**The real fix is a 1920 x 1080 master of the end card.** With one in hand, drop it
into `remotion/public/end-card/`, point `SCENES` at it, and it will fill the frame.
Failing that, `fit: 'cover'` in `timeline.ts` is a one-word switch to the crop —
with the losses measured above.

The card's own audio is kept, at **−18 dB** (rendered peak −28.25 dBFS) so it reads
as the brief's "one subtle cue when the end frame appears" rather than the
cinematic hit the brief rules out, with a 0.35s tail fade to silence.

## Missing assets

| Asset | Status |
|---|---|
| Narration recording | **Absent.** Nothing in the repository is a voiceover. `public/assets/generated/sample-call.wav` is the marketing demo-call audio, not narration. The script is in `NARRATION.md` and `narration/narration-script.txt`; the film is cut to its timing and the mix is wired and waiting. No external generation service was called. |
| Music bed | **Absent.** The mix layer exists with its level pre-set to −20 dB relative to narration. |
| Go-live interface tick | **Absent and not invented.** The slot exists in `AUDIO.liveTickSrc`. |

With all three absent the rendered film is silent from 0.00s to ~28s and carries
only the end card's brand sound. That is the honest state of the audio, not a
rendering fault.
