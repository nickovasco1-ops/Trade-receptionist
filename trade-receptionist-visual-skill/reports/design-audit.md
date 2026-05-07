# Trade Receptionist Visual Design Audit

Generated: 2026-05-07T10:04:26.316Z

## Repository detection

- Framework: Vite + React + React Router + TypeScript
- Routing: react-router-dom BrowserRouter
- Route count: 16
- Public asset root: public/assets
- Preferred generated asset dir: public/assets/generated
- Image formats seen: png, webp, wav

## Routes

- `/` via `index.tsx`
- `/login` via `index.tsx`
- `/dashboard` via `index.tsx`
- `/dashboard/calls` via `index.tsx`
- `/dashboard/leads` via `index.tsx`
- `/settings` via `index.tsx`
- `/onboarding` via `index.tsx`
- `/onboarding-preview` via `index.tsx`
- `/dashboard-preview` via `index.tsx`
- `/dashboard-preview/calls` via `index.tsx`
- `/dashboard-preview/leads` via `index.tsx`
- `/dashboard-preview/settings` via `index.tsx`
- `/welcome` via `index.tsx`
- `/terms` via `index.tsx`
- `/privacy` via `index.tsx`
- `*` via `index.tsx`

## Landing visuals inspected

- Homepage hero — page `/` — component `App.tsx` — Hero scene with product image background and primary conversion copy.
- Missed-call calculator — page `/` — component `App.tsx` — Calculator proof block with stat cards and ROI explainer.
- Workflow timeline — page `/` — component `components/FeaturesGrid.tsx` — Outcome-led workflow and compact feature cards.
- Testimonials — page `/` — component `components/Testimonials.tsx` — Floating testimonial carousel with glass cards.
- Sample call demo — page `/` — component `App.tsx` — Audio-led call proof block with supporting card UI.
- Pricing — page `/` — component `App.tsx` — Scrollable pricing cards and contract reassurance.
- FAQ / objection handling — page `/` — component `App.tsx` — Accordion proof section near bottom funnel.
- Final CTA — page `/` — component `App.tsx` — Bottom conversion block with glow-only support visuals.

## Findings

| Area | Page | Component | Category | Severity | Conversion impact | Integration risk | Replacement |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| Homepage hero visual | `/` | `App.tsx` | Low trust dashboard | 4 | high | low | image |

### Homepage hero visual

- Page path: `/`
- File/component: `App.tsx`
- Current visual source: Hero scene image in App.tsx using /assets/generated/landing-hero-generated.png with fallback /assets/hero-phone-upscaled-transparent.png | Framework: Vite + React + React Router + TypeScript | Component: App.tsx
- Why it weakens conversion: The hero currently leans on a single floating product-device composite. It signals polish, but it underplays the real-world trade context and customer-to-job handoff that first-time visitors need to trust within seconds.
- Category: Low trust dashboard
- Severity: 4
- Conversion impact: high
- Integration risk: low
- Recommended replacement direction: Replace the hero art with a clearer 16:9 trade-call composition that keeps strong negative space on the left, shows one crisp phone UI, and adds believable customer-summary / routing cues for a real trade business.
- Suggested alt text: Trade Receptionist phone interface showing answered customer calls, captured job details, and routed summaries for a trade business.
- Replacement type: image

