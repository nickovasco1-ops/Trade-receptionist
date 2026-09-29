# SEO Audit: tradereceptionist.com

Audited 2026-09-29 on branch `seo-overhaul`, before any change. Findings are from the
source tree and a local production build (`npm run build`, served with SPA fallback to
mimic `vercel.json`). The live domain is blocked from the audit container, so nothing
here was fetched from production.

Confidence tags: **[Certain]** = reproduced or read in source. **[Likely]** = strong
inference. **[Guessing]** = needs a human to confirm.

---

## 1. How the marketing site is built and rendered

| Item | Finding |
|---|---|
| Framework | Vite 6 + React 19 SPA, Tailwind v4, `react-router-dom` 7. Routes are declared in `index.tsx`. **[Certain]** |
| Hosting | Vercel. `vercel.json` rewrites `/(.*)` to `/index.html` after a filesystem check. **[Certain]** |
| Rendering | Client-side only. Every route ships `<div id="root"></div>` and a script. **[Certain]** |
| Exceptions | `/privacy` and `/terms` are prerendered to static HTML by `scripts/prerender-legal.mjs`. **[Certain]** |
| Homepage body without JS | Only a `<noscript>` summary (3 short paragraphs, 2 links). **[Certain]** |
| Public marketing URLs | `/`, `/partner`, `/privacy`, `/terms`. Everything else is app (`/login`, `/dashboard/*`, `/onboarding`, `/welcome`, `/test-call`) or sales demo (`/dashboard-preview/*`, `/onboarding-preview`). **[Certain]** |

**Impact.** Googlebot renders JavaScript, so it can see the homepage, but on a second,
deferred pass. GPTBot, ClaudeBot and PerplexityBot generally do not run JavaScript
**[Likely]**, so to them the homepage is the noscript blurb and `/partner` is an empty
document. There is also exactly one indexable page that talks about the product, so
there is nothing to rank for any trade-specific or problem-led query.

## 2. Page-level metadata

| Check | `/` | `/partner` | `/privacy` | `/terms` |
|---|---|---|---|---|
| `<title>` in served HTML | "Trade Receptionist \| AI Receptionist for UK Tradespeople" (58) | **same as home** | **same as home** | **same as home** |
| Meta description | 186 chars, **over 155**, truncated in results | same as home | same as home | same as home |
| Canonical | `https://tradereceptionist.com` | **points to home** | **points to home** | **points to home** |
| OG / Twitter | Present, but Twitter tags use `property=` instead of `name=` | home's | home's | home's |
| JSON-LD | SoftwareApplication, Organization, FAQPage | home's | **home's FAQPage** | **home's FAQPage** |
| H1 count | 1 | 1 | 1 | 1 |

All **[Certain]**, reproduced with `curl` against the built output.

Key problems:

1. **Duplicate titles and canonicals.** `/privacy`, `/terms` and `/partner` all tell
   Google they are copies of the homepage. `/partner` only fixes its title after JS runs
   (`document.title` in a `useEffect`).
2. **FAQPage schema does not match the page.** The JSON-LD lists 4 questions ("Does it
   sound robotic?", "How long does setup take?"...) that do not appear on the page, which
   has 7 different ones. Google's guidelines require marked-up FAQs to be visible. The
   same FAQPage block is also served on `/privacy` and `/terms`.
3. **Stale and non-standard head tags.** `meta keywords` (ignored by Google),
   `meta name="title"`, `meta name="language"`, and `geo.placename=London` (no evidence
   the business is London-based **[Guessing]**).
4. **OG image dimensions are wrong.** The tags declare 1200x630; `og-image.png` is
   1792x1024 and 1.7 MB. A correct 1200x630 crop (`og-image-cropped.png`, 226 KB)
   already exists but is unused. Both versions contain AI-garbled text ("Plumbing
   qutle", "Sarah answved"), which looks poor when a link is shared.
5. **Organization `logo` is the OG image**, not the logo.

## 3. Crawl and index controls

| Check | Finding |
|---|---|
| `robots.txt` | Exists. Allows all, disallows `/dashboard`, `/settings`, `/onboarding`, `/welcome`, `/login`, `/api/`. Does not mention `/dashboard-preview`, `/onboarding-preview`, `/test-call`. No AI-crawler groups. **[Certain]** |
| `sitemap.xml` | **Does not exist.** `robots.txt` points to it; the SPA rewrite answers `/sitemap.xml` with `200 text/html` (the homepage). Search Console will report it as invalid. **[Certain]** |
| Stray `noindex` | None found. **[Certain]** |
| 404 handling | Every unknown URL returns **200** with the homepage head and canonical, then renders `NotFoundPage` client-side. Classic soft 404. **[Certain]** |
| Redirects | `www` 308s to apex (per CLAUDE.md, not verifiable from here). `/settings` redirects client-side. No redirect chains in `vercel.json`. **[Likely]** |
| `llms.txt` | Does not exist. **[Certain]** |
| Trailing slash | `/privacy` and `/privacy/` both serve 200. Harmless once canonicals are self-referencing. **[Certain]** |

## 4. Structured data

- SoftwareApplication has four Offers with price and currency but no VAT flag, billing
  period, or URL. The site says prices are "+VAT"; the markup implies VAT-inclusive.
- No `WebSite` node, no `@id` links between nodes, no BreadcrumbList.
- No `aggregateRating` / `review`. **Keep it that way** (see §8): there is no
  substantiated rating to mark up.
- Organization `email` is `hello@tradereceptionist.co.uk`; the backend and CLAUDE.md
  use `hello@tradereceptionist.com`. One of them is wrong. **[Guessing]** which.

## 5. Headings, content and internal linking

- Homepage has one H1 ("Missed calls are costing you jobs."). Heading order skips a
  level in the features grid (H4 after H2). **[Certain]**, Lighthouse `heading-order`.
- **Internal linking is almost nil.** The homepage links out to `/partner`, `/terms`,
  `/privacy` and `/login`. Header and footer "links" are `<button>`s that scroll, so
  crawlers see no URLs to follow. **[Certain]**
- The footer lists "Plumbers, Electricians, Builders, HVAC, Carpenters" as plain
  `<span>`s: the obvious place for trade-page links.
- `UseCases`, `PainPoints` and `HowItWorks` in `App.tsx` are defined but not rendered.
  **[Certain]**

## 6. Images and media

| Asset | Size | Use | Problem |
|---|---|---|---|
| `generated/landing-hero-generated.png` | **4.9 MB**, 5504x3072 | Hero, `loading="eager"` | **This is the LCP element.** Displayed at most ~1344 CSS px wide. |
| `generated/sample-call.wav` | **3.9 MB** | Demo player | `preload='auto'` downloads it on every homepage load, before anyone presses play. |
| `marketing/call-flow/panels/customer-call-workflow.png` | 1.6 MB | Video poster | Loaded on first view of the features grid. |
| `marketing/call-flow/icons/*.png` (9) | ~1.2 MB each, 1024x1024 | Features grid | Displayed at 48 to 56 px. ~11 MB for nine icons. |
| `logo.png` | 78 KB, 512x512 | Header/footer | No `width`/`height` (Lighthouse `unsized-images`). |

Alt text: content images have alt text; the hero image is correctly `alt=""` and
`aria-hidden`. **[Certain]**

## 7. Performance (Lighthouse 13.5, mobile, simulated throttling)

Run against the local production build. Google Fonts, Sentry, Crisp and Vercel scripts
were blocked because the container cannot reach them, so **real-world FCP will be
somewhat worse** than shown (the font stylesheet is render-blocking).

| Page | Perf | SEO | A11y | BP | FCP | LCP | TBT | CLS | Transfer |
|---|---|---|---|---|---|---|---|---|---|
| `/` | **43** | 100 | 95 | 100 | 2.6 s | **52.9 s** | **2,020 ms** | 0 | **11,652 KiB** |
| `/privacy` | 89 | 100 | 88 | 100 | 2.6 s | 2.9 s | 190 ms | 0 | 379 KiB |
| `/partner` | 90 | 100 | 100 | 100 | 2.7 s | 2.9 s | 120 ms | 0 | 305 KiB |

Lighthouse's SEO score is 100 because it only checks tag presence, not uniqueness or
correctness. It does not catch any of the problems in §2 and §3.

Homepage Core Web Vitals problems:

1. **LCP 52.9 s** (lab). The LCP element is the 4.9 MB hero PNG.
2. **Page weight 11.6 MB**, of which ~10 MB is the hero PNG, the WAV and the video poster.
3. **TBT 2,020 ms.** JS on the homepage is ~245 KB gzipped (budget in CLAUDE.md §9.8 is
   150 KB): Sentry 92 KB, the app chunk 80 KB, and **Supabase 52 KB**, pulled in by the
   auth guard in `index.tsx` even though the marketing page never uses it.
4. Render-blocking Google Fonts stylesheet (~150 ms in lab, more on a real network).
5. CLS is 0. Not a problem.

## 8. Claims that affect what SEO copy may say

These are not SEO bugs, but they constrain what the new pages can repeat, and two of
them are legal exposure under CLAUDE.md §1.1 (DMCC Act 2024, CAP Code):

- **"27% of callers never ring back" and "3 in 5 jobs go to whoever answers first"** are
  live in `ROI_STATS` on the homepage with no cited source. CLAUDE.md already lists them
  as outstanding. **Not repeated anywhere in the new pages.**
- **Testimonials** (`components/Testimonials.tsx`): six named quotes with a 5-star
  display, one from a yoga studio. I cannot verify these are real customers who gave
  permission. **Not marked up as reviews, not repeated.**
- **Yearly pricing** (£39/£74/£132/£207) is shown by the homepage toggle, but
  `src/lib/plans.ts` only has monthly Payment Links. There is no way to buy the yearly
  price. **[Certain]** from source. The new pricing page shows monthly only.
- **"Avg. setup time 14 min"** is shown as a measured average. **[Guessing]** whether
  it is measured. Not repeated as an average.

## 9. Fix list (what Phase 2 will do)

Safe to fix in this branch:

1. One route registry for every public marketing page: title, description, canonical,
   OG, JSON-LD and sitemap entry come from one place.
2. Generalise the prerender to every public marketing page, so non-JS crawlers get
   full HTML and each page gets its own head. Homepage and `/partner` get correct head
   tags (their bodies stay client-rendered; see §10).
3. Generate `sitemap.xml` from the registry at build time; fail the build if a page is
   missing or a title/description is over length.
4. Rewrite `robots.txt`: explicit groups for Googlebot, Bingbot, GPTBot, ClaudeBot,
   PerplexityBot; exclude app, demo and API routes.
5. JSON-LD: Organization, WebSite, SoftwareApplication with VAT-exclusive monthly
   Offers, FAQPage matching visible FAQs only, BreadcrumbList on inner pages.
6. Add `noindex` to the client-rendered 404 page.
7. Hero image to WebP with `srcset`, `fetchpriority="high"` and dimensions; WAV to
   `preload="metadata"`; icons and poster to right-sized WebP; logo dimensions.
8. Add `llms.txt`.
9. Real `<a href>` links from the homepage footer to trade pages, guides and pricing.

Not safe to fix here (see SEO_REPORT.md for the full list):

- Removing Supabase from the marketing bundle (touches the auth guard).
- Returning a real 404 status (requires replacing the catch-all rewrite with an
  explicit list of app routes; a missed route breaks the app).
- Server-rendering the homepage body (`App.tsx` depends on `window`, `localStorage`,
  Lenis and IntersectionObserver at render time).
- The claims in §8.

## 10. Why the homepage body is not prerendered

`App.tsx` reads `localStorage` inside a `useState` initialiser and relies on Lenis,
IntersectionObserver and mouse parallax. The existing prerender script already chose
not to render it for this reason. Googlebot renders it fine; the gap is AI crawlers,
which this branch addresses by expanding the `<noscript>` block with a factual summary
and real links, and by adding `llms.txt`.
