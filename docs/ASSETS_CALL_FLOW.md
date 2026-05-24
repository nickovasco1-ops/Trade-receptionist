# Call-Flow Assets

This band is powered by raster marketing assets under `public/assets/marketing/call-flow/` and wired into [components/FeaturesGrid.tsx](/Users/nickovasco/Downloads/trade receptionist /repo/components/FeaturesGrid.tsx:1) through [components/featuresGrid.data.ts](/Users/nickovasco/Downloads/trade receptionist /repo/components/featuresGrid.data.ts:1).

## Naming and Paths

- Icons live in `public/assets/marketing/call-flow/icons/`
- Shared proof art lives in `public/assets/marketing/call-flow/panels/`
- Prompt manifest lives in `scripts/call-flow-assets.manifest.json`
- Generation metadata is written to `docs/reference/call-flow-section/generated-metadata/`

Checked-in assets:

- `ringing-smartphone.png`
- `ai-receptionist-headset.png`
- `job-sheet-clipboard.png`
- `whatsapp-summary-bubble.png`
- `booked-diary-calendar.png`
- `phone-clock-247.png`
- `spam-shield-filter.png`
- `urgent-call-siren.png`
- `call-records-notes.png`
- `customer-call-workflow.png`

## Shared Prompt Style

`Premium UK trades SaaS icon or illustration, soft 3D clay render, deep navy background or transparency, warm orange accent glow, subtle blue secondary light, simple readable shapes, dark premium atmosphere, no text, no purple, no generic SaaS blobs, no cartoon mascot, no distorted hands, no warped UI, no extra decorative clutter.`

## Asset Prompts

- `ringing-smartphone`
  `Minimal 3D clay icon of a ringing smartphone with a glowing incoming-call pulse, tailored to a UK trades business receiving a new customer enquiry.`
- `ai-receptionist-headset`
  `Minimal 3D clay icon of a premium receptionist headset with a small call-status light, signalling Trade Receptionist answering professionally in the business name.`
- `job-sheet-clipboard`
  `Minimal 3D clay icon of a clipboard job sheet with tidy customer detail rows and a highlighted call-out note, showing a captured trade enquiry.`
- `whatsapp-summary-bubble`
  `Minimal 3D clay icon of a green chat bubble and summary sheet, a WhatsApp-style handoff for a captured trade job with clean message cues and no branded text.`
- `booked-diary-calendar`
  `Minimal 3D clay icon of a diary calendar with a bold confirmed check mark, showing a real trade job booked into the diary.`
- `phone-clock-247`
  `Minimal 3D clay icon of a phone paired with a clear clock face, showing calls answered 24 hours a day for a busy trade business.`
- `spam-shield-filter`
  `Minimal 3D clay icon of a protective shield filtering nuisance calls, with subtle blocked-call cues and a premium dark SaaS finish.`
- `urgent-call-siren`
  `Minimal 3D clay icon of an urgent call siren with premium orange alert light, representing emergency trade enquiries being prioritised fast.`
- `call-records-notes`
  `Minimal 3D clay icon of layered call notes and transcript records, showing clean post-call records without a voicemail player.`
- `customer-call-workflow`
  `Wide 16:9 workflow illustration reading left to right: incoming customer call, captured job details, green message-summary handoff, and booked diary confirmation for a UK trades business. Use believable trade context cues, subtle connectors, and clean legible UI shapes with no tiny text.`

## Regeneration Commands

OpenAI size note:

- Square icons are generated at `1024x1024`, the current supported square size for GPT Image.
- The workflow panel is generated at `1536x1024`, then rendered into a `16:9` slot in the UI.

- Generate every asset with OpenAI:

```bash
npm run generate:call-flow-assets
```

- Generate one asset:

```bash
npm run generate:call-flow-asset -- --id whatsapp-summary-bubble
```

- Render local placeholder PNGs with the same filenames:

```bash
npm run generate:call-flow-placeholders
```

- Print the screenshot-to-code reference workflow:

```bash
npm run reference:call-flow-layout
```

## Screenshot-to-Code Note

The `screenshot-to-code` output is reference-only. It exists to confirm spacing, hierarchy, and visual-slot sizing for this band. Do not replace the production React component wholesale with generated reference code.
