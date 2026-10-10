# /brag plan: Trade Receptionist

## What it is
An AI receptionist for UK tradespeople. It answers the phone when they can't, takes the customer's details, and sends the job to their phone as a text or puts it in their diary.

## Answers
- **For whom / what it does:** UK plumbers, electricians, builders, roofers and heating engineers who lose jobs because they can't pick up while working.
- **What sets it apart:** each business gets its own receptionist that answers in that business's name, and every call ends as something the trade can use: a text with the caller's name, job and postcode, or a booking in their Google, Outlook or iCloud diary.
- **Most impressive claim:** "answers when you can't" (the hero copy).
- **Visual hook:** a phone ringing with nobody free to answer it. "You're under a sink."
- **Real UI / flow shown:** the real opening greeting (`server/src/lib/greeting.ts`), the real owner SMS format (`sendOwnerSms` in `server/src/services/twilio.ts`, including `Job booked ✓`), and the diary booking.
- **Tone:** `default`, in the brand's Industrial Luminescence style (navy, high-vis orange, mechanical easing, nothing bouncy).
- **Share caption:** see `share-copy.txt`.

## Claims floor (CLAUDE.md §1.1)
- The video carries no performance, customer-volume or outcome numbers.
- The hero phone render (`hero-phone-upscaled-transparent.png`) is excluded because it shows invented figures ("1,452", "98%").
- The only numbers used are checkable: £49 (`src/lib/plans.ts`), 14-day trial, and "No charge today".
- "14 min setup" is excluded.
- Illustrative UI content is fictional and marked as such by construction:
  - business: "Hughes Plumbing"
  - caller: "Sarah"
  - number: Ofcom drama range 07700 900xxx
- No real tenant names are used.

## Visual identity
- Colours: void `#020D18`, navy `#051426`, navy-mid `#0A2340`, orange `#FF6B2B` to `#FF8C55`, accent `#99cbff`, offwhite `#F0F4F8`.
- Type: Space Grotesk (display, tight negative tracking), Manrope (body and eyebrows), JetBrains Mono (SMS and metrics).
- Logo: `logo-mark.png` (house and phone glyph).
- Blueprint grid texture with no layout lines. Glass cards. One orange keyword per headline.

## Storyboard (1920×1080, 30fps, 21.0s, 120 BPM so cuts land on beats)

| # | Time | Scene | On screen | Sound |
|---|---|---|---|---|
| 1 | 0.0–3.0 | **Hook** | An incoming-call card shakes: "Sarah · Mobile · 07700 900123". Headline: "You're under a sink." then "Your phone's ringing." | A soft two-tone ring in key, over a low pad |
| 2 | 3.0–7.0 | **Reveal** | The ring stops and the call connects (00:01). Eyebrow: TRADE RECEPTIONIST. The greeting types into a bubble: "Hello, this is Hughes Plumbing, Amy speaking. Calls are recorded. How can I help?" Headline: "Answers when you *can't*." | Kick enters; a soft click on connect |
| 3 | 7.0–11.0 | **Highlight 1** | Caller bubble: "Boiler's packed in. No hot water." Detail chips tick in: Name Sarah · Job Boiler repair · Postcode M14 · Best time Thu morning. Headline: "Takes the customer's *details*." | Pops on each chip, tuned to the chord |
| 4 | 11.0–15.0 | **Highlight 2** | An SMS slides onto the owner's lock screen in the real format: "Trade Receptionist: Job booked ✓ / From: 07700 900123 / Name: Sarah / Job: Boiler repair, M14 / — Hughes Plumbing". Headline: "Sent straight to your *phone*." | A two-note chime in key |
| 5 | 15.0–18.0 | **Highlight 3** | Week diary. A Thursday 10:00 block drops in: "Boiler repair · Sarah". Sub: "Google, Outlook or iCloud diary." Headline: "Or straight into your *diary*." | A soft thunk on the drop |
| 6 | 18.0–21.0 | **Outro** | Logo mark, "Trade Receptionist", "Start Free Trial", "14-day free trial. No charge today. Plans from £49/month.", tradereceptionist.com | Music resolves and the pad swells out |

Scene durations are 3 + 4 + 4 + 4 + 3 + 3, which comes to 21s.

## Transitions
- Old content moves out (up and fading, 300ms) before new content comes in (rising 32px, 500ms ease-smooth).
- There are no crossfades between busy layouts.
- The phone/device card persists across scenes 1 to 3, so the call reads as one continuous call.

## Poster
The scene 4 frame with the SMS fully landed and the headline settled. It says the most on its own.
