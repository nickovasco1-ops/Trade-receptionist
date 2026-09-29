# SEO Report: `seo-overhaul`

What changed, what was measured, what I deliberately left alone, and what needs a
human. The starting point is in `SEO_AUDIT.md`.

**The uncomfortable part first:** new pages and clean markup do not rank on their
own. The domain has almost no authority, and the biggest ranking lever left
(links from UK trade sites, directories and suppliers) is off-page work nobody can
do from this repo. Also, two claims on the live homepage ("27% of callers never
ring back", "3 in 5 jobs go to whoever answers first") are uncited, and the new
cost guide says openly that no independent figure like that exists. Remove them
before sending traffic to both pages.

---

## 1. What changed

### Technical layer

| Change | Where |
|---|---|
| One registry for every public URL: title, description, canonical, OG, JSON-LD, sitemap and llms.txt all come from it | `src/marketing/routes.ts` |
| Build-time prerender for every public page, each with its own head. Build **fails** on long/duplicate titles or descriptions, shared primary keywords, not exactly one H1, em dashes in new copy, or FAQ markup that is not on the page | `scripts/prerender.mjs` (replaces `prerender-legal.mjs`) |
| `sitemap.xml` generated from the registry (18 URLs); previously did not exist | build output |
| `robots.txt`: named groups for Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot; excludes `/api/`, `/dashboard*`, `/onboarding*`, `/settings`, `/login`, `/welcome`, `/test-call` | `public/robots.txt` |
| `llms.txt` generated from the registry and `plans.ts` | `src/marketing/llms.ts` |
| JSON-LD: Organization, WebSite, SoftwareApplication with VAT-exclusive monthly Offers (from `plans.ts`), FAQPage only where FAQs are visible, BreadcrumbList and WebPage on inner pages, Article on guides | `src/marketing/structured-data.ts` |
| Homepage FAQ markup now matches the 7 visible questions (was 4 different ones) | `src/marketing/content/home-faqs.ts` |
| Removed `meta keywords`, `meta title`, `meta language`, `geo.placename=London`; Twitter tags now `name=` | `index.html` |
| OG image now the correct 1200x630 crop (was a 1792x1024 file declared as 1200x630) | `src/marketing/site.ts` |
| Client-rendered 404 adds `noindex` and drops the canonical | `src/pages/NotFoundPage.tsx` |
| Homepage `<noscript>` expanded with a factual summary and links to every new page, for crawlers that do not run JS | `index.html` |
| Homepage footer: trade chips are now links to all 8 trade pages; added Pricing, Trades, Guides links | `App.tsx` |
| `/partner` client title no longer has an em dash and matches the head | `src/pages/PartnerPage.tsx` |

### Performance

| Change | Effect |
|---|---|
| Hero served as WebP at 768/1280/1920w with `srcset`, `fetchpriority="high"`, dimensions, and a homepage-only preload | LCP image 4,925 KB → ~220 KB |
| Nine features-grid icons as 192px WebP | ~11 MB → ~27 KB total |
| Features video poster as 1280w WebP | 1,607 KB → 25 KB |
| Demo WAV `preload='auto'` → `'metadata'` | 3.9 MB no longer downloaded on page load |
| Logo gets intrinsic `width`/`height` | fixes `unsized-images` |

PNG masters are kept; the WebPs are derivatives (see §5, item 12).

### Content (14 new pages)

| URL | Primary keyword |
|---|---|
| `/` (existing) | ai receptionist for tradespeople |
| `/pricing` | ai receptionist pricing uk |
| `/trades` (hub) | call answering service for tradesmen |
| `/trades/plumbers` | ai receptionist for plumbers |
| `/trades/electricians` | ai receptionist for electricians |
| `/trades/builders` | answering service for builders |
| `/trades/heating-engineers` | answering service for heating engineers |
| `/trades/roofers` | answering service for roofers |
| `/trades/locksmiths` | 24 hour answering service for locksmiths |
| `/trades/landscapers` | answering service for landscapers |
| `/trades/carpenters-and-joiners` | answering service for carpenters and joiners |
| `/guides` (hub) | none (navigation) |
| `/guides/ai-receptionist-vs-answering-service-vs-voicemail` | ai receptionist vs answering service |
| `/guides/cost-of-missed-calls-for-tradespeople` | cost of missed calls for tradespeople (also answers "how much do missed calls cost a plumber") |
| `/guides/how-to-never-miss-a-call-on-the-job` | never miss a call on the job (also "missed call solutions for tradespeople", UK divert codes) |

The build enforces that no two pages share a primary keyword. **[Guessing]** on
exact phrasing: no keyword-volume tool was available, so "AI receptionist for X"
vs "answering service for X" was chosen per trade by judgement. Check in Search
Console after 6 to 8 weeks and swap the phrase in the title/H1 if impressions
favour the other one.

Each trade page has its own pain points, three example calls, setup notes, FAQs
(4 to 5, marked up), related trades and guides, pricing link and CTA. Every
capability described was checked against `prompt-builder.ts` and `emergency.ts`
(which phrases escalate, what safety advice is given, what the agent never
promises). Example calls are labelled "Example call" and say they are not
recordings. No statistics, customer names, ratings or testimonials.

## 2. Measured before and after

Lighthouse 13.5, mobile, simulated throttling, on the local production build.
Google Fonts, Sentry, Crisp and Vercel scripts were blocked in both runs because
the container cannot reach them, so absolute FCP is optimistic; the comparison is
like for like.

| Page | Perf | SEO | A11y | FCP | LCP | TBT | CLS | Transfer |
|---|---|---|---|---|---|---|---|---|
| `/` before | 43 | 100 | 95 | 2.6 s | **52.9 s** | 2,020 ms | 0 | 11,652 KiB |
| `/` after | **86** | 100 | 95 | 2.6 s | **3.3 s** | 180 ms | 0 | **1,459 KiB** |
| `/privacy` before / after | 89 / 90 | 100 | 88 | 2.6 / 2.7 s | 2.9 / 2.9 s | 190 / 90 ms | 0 | 379 / 383 KiB |
| `/partner` before / after | 90 / 89 | 100 | 100 | 2.7 s | 2.9 s | 120 / 160 ms | 0 | 305 / 309 KiB |
| `/trades/plumbers` (new) | 86 | 100 | 100 | 2.9 s | 3.4 s | 120 ms | 0 | 400 KiB |
| `/pricing` (new) | 87 | 100 | 100 | 2.7 s | 3.0 s | 190 ms | 0 | 388 KiB |
| `/guides/cost-of-missed-calls...` (new) | 91 | 100 | 100 | 2.6 s | 2.9 s | 100 ms | 0 | 389 KiB |

Lighthouse's SEO score was already 100 and cannot show what was actually wrong
(duplicate canonicals, missing sitemap, mismatched FAQ markup). Those were
verified by a script over `dist/`: **18 sitemap URLs, each with a file, a
self-referencing canonical, a unique title, exactly one H1 and one parseable
JSON-LD graph with the required properties per type. 0 problems.**

Other checks:

| Check | Result |
|---|---|
| `npm run build` (incl. prerender checks) | Pass |
| `npm run typecheck` | Pass |
| `npm run build:api` | Pass (no server code changed) |
| `npm test --prefix server` | 222 / 222 pass (unchanged count; no server tests added) |
| Lint | **Not run: the repo has no lint script** |
| `npm run test:e2e` | **Not run.** It boots the API with `.env.test` secrets this container does not have, and pins a Playwright browser build not installed here. Run it in CI before merging. |
| Rich Results Test / Schema validator | **Not run: Google's tools are unreachable from here.** Structured data was checked locally (above). Run the live URLs through search.google.com/test/rich-results after deploy. |
| 375 px and 1366 px screenshots of new pages | No horizontal scroll, one H1, correct titles, no page errors |

## 3. What I deliberately did not do

- **Prerender the homepage body.** `App.tsx` reads `localStorage` while rendering
  and depends on Lenis, IntersectionObserver and parallax. Googlebot renders it; the
  noscript summary and `llms.txt` cover crawlers that do not.
- **Return a real 404 status.** Needs `vercel.json`'s catch-all narrowed to the app
  routes; a missed route breaks the app. Mitigated with client-side `noindex`.
- **Remove Supabase (52 KB gz) from the homepage bundle.** It is pulled in by the
  auth guard in `index.tsx`. Out of scope (auth), but it is the biggest remaining
  JS cost on marketing pages.
- **Self-host fonts / make them non-blocking.** Making the Google Fonts stylesheet
  async would cause a visible font swap on a 5rem H1, trading render-blocking time
  for CLS.
- **Touch the uncited stats, testimonials or yearly pricing on the homepage.**
  These are business and legal decisions (§4), not SEO fixes.
- **Add AggregateRating or Review schema.** There is no substantiated rating.
- **Call Pro "Most popular" on `/pricing`.** It is labelled "Recommended" instead:
  popularity is a customer-numbers claim (CLAUDE.md §1.1). The homepage still says
  "Most Popular", as CLAUDE.md §6.3 prescribes; the two rules conflict and need a
  decision.
- **City or town pages.** Nothing in the repo supports unique local content per
  town; they would be doorway pages.
- **Embed or link the homepage demo audio from new pages.** It is a scripted TTS
  dramatisation that promises a callback time the real agent never gives (§4).
- **Scroll-entrance animation on SEO page copy.** `[data-animate]` hides text until
  JS runs. The hero uses the CSS-only entrance instead. Recorded in CLAUDE.md §6.6.

## 4. Remaining actions for a human, in priority order

1. **Remove or source the homepage stats** "27% of callers never ring back" and
   "3 in 5 jobs go to whoever answers first" (`App.tsx`, `ROI_STATS`). Uncited, live,
   and now contradicted by `/guides/cost-of-missed-calls-for-tradespeople`. DMCC Act
   exposure per CLAUDE.md §1.1.
2. **Verify the testimonials** in `components/Testimonials.tsx` are real, permitted
   and accurate (one is a yoga studio; all show 5 stars). If not, remove them.
3. **Fix the Terms vs checkout contradiction.** Terms §3 says "No payment card is
   required to start a trial"; CLAUDE.md says every Payment Link collects a card.
   Terms §4 says annual billing is available; there are no annual Payment Links,
   yet the homepage toggle shows yearly prices.
4. **AI and recording disclosure.** Terms §8 says the agent discloses at the start
   of each call that it is AI and may be recorded. `buildBeginMessage()` says
   neither. Legal check needed; not an SEO item but found during this work.
5. **Replace the demo audio** with a recording of the real agent, or label it a
   dramatisation (see CLAUDE.md §10).
6. **Deploy, then submit `https://tradereceptionist.com/sitemap.xml` in Google
   Search Console and Bing Webmaster Tools**, and request indexing for `/trades` and
   `/pricing`.
7. **Run the live URLs through the Rich Results Test** and fix anything it flags.
8. **Confirm the contact email** (`.co.uk` on the site vs `.com` in the backend).
   `TODO(human)` in `src/marketing/site.ts`.
9. **Replace the OG image.** The current artwork has AI-garbled text ("Plumbing
   qutle"). `TODO(human)` in `src/marketing/site.ts`.
10. **Pricing gaps**: state what happens over the call allowance and what counts
    as a call. `TODO(human)` in `src/marketing/pages/PricingPage.tsx`.
11. **Locksmith urgent keywords**: the locksmith FAQ says other urgent situations
    can be added on the setup call. Confirm ops sets
    `business_config.emergency_keywords` for locksmiths. `TODO(human)` in
    `src/marketing/content/trades/locksmiths.ts`.
12. **Image pipeline**: if a call-flow icon or the hero PNG is regenerated, the
    WebP derivatives must be regenerated too (done here with `sharp`, not a repo
    dependency). Consider adding it to the generation scripts.
13. **Off-page**: Google Business Profile, listings on trade directories and
    supplier sites, and links from trade associations. This is where rankings for
    a new domain will actually come from.
14. **Run `npm run test:e2e` in CI** on this branch before merging.
15. **Next content, once 1 to 13 are done**: plasterers, painters and decorators,
    drainage, gas engineers (separate from heating if Search Console shows demand),
    and a guide to call handling for small trade firms with 2 to 10 staff.

## 5. How to add a page later

Add an entry to `src/marketing/routes.ts` and a module with a default-exported
component (plus `structuredData()` if it has FAQs). The build handles the head,
sitemap, llms.txt and client route, and fails if the title, description, keyword,
H1 or FAQ markup is wrong. See CLAUDE.md §6.6.
