// Bake real HTML, per-page head tags, sitemap.xml and llms.txt into dist/.
//
// Why this exists: the SPA ships `<body><div id="root"></div><script/></body>`,
// and before this script every route also shipped the homepage's <head>. So
// /privacy, /terms and /partner each told Google they were copies of the
// homepage (same title, same canonical), and anything that does not run
// JavaScript (most AI crawlers, Google's OAuth verifier) saw an empty page.
//
// Every public marketing page is listed once in src/marketing/routes.ts. For
// each one this script:
//   - writes its own title, description, canonical, Open Graph and JSON-LD
//     into the head (between the seo:head markers in index.html);
//   - for `prerender: 'full'` pages, renders the body to static HTML so a
//     crawler sees the content without running JavaScript;
//   - lists it in sitemap.xml and llms.txt.
//
// The homepage and /partner are 'head' only: App.tsx owns Lenis,
// IntersectionObserver and parallax and reads localStorage while rendering, so
// it has no server equivalent. The homepage keeps its <noscript> summary.
//
// The React app still mounts over the static HTML on load (index.tsx preloads
// the page chunk first, so there is no blank frame). This only changes what a
// non-JS fetch receives.
//
// Vercel checks the filesystem before the `/(.*)` → /index.html rewrite, so
// dist/trades/plumbers/index.html is served at /trades/plumbers unchanged.
//
// Every check below throws. A prerender that silently writes less than it
// should reads as a clean build, which is the failure mode this codebase keeps
// rediscovering (CLAUDE.md §10).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ROOT_DIV = '<div id="root"></div>';
const HEAD_BLOCK = /<!-- seo:head:start -->[\s\S]*?<!-- seo:head:end -->/;
const NOSCRIPT_BLOCK = /[ \t]*<!-- noscript:start -->[\s\S]*?<!-- noscript:end -->\n?/;

const TITLE_MAX = 59;       // "under 60"
const DESCRIPTION_MAX = 154; // "under 155"
const DESCRIPTION_MIN = 70;
const MIN_MARKUP = 500;

const fail = (message) => { throw new Error(message); };

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlText(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function validateRegistry(routes) {
  const seen = { path: new Set(), title: new Set(), description: new Set(), keyword: new Set() };
  for (const route of routes) {
    const where = `route ${route.path}`;
    if (!route.path.startsWith('/') || (route.path !== '/' && route.path.endsWith('/'))) {
      fail(`${where}: paths start with / and have no trailing slash`);
    }
    if (route.title.length > TITLE_MAX) fail(`${where}: title is ${route.title.length} chars (max ${TITLE_MAX})`);
    if (route.description.length > DESCRIPTION_MAX) {
      fail(`${where}: description is ${route.description.length} chars (max ${DESCRIPTION_MAX})`);
    }
    if (route.description.length < DESCRIPTION_MIN) {
      fail(`${where}: description is ${route.description.length} chars (min ${DESCRIPTION_MIN})`);
    }
    if (/[—]/.test(route.title + route.description)) fail(`${where}: em dash in title or description`);
    for (const [key, value] of [['path', route.path], ['title', route.title], ['description', route.description]]) {
      if (seen[key].has(value)) fail(`${where}: duplicate ${key} "${value}"`);
      seen[key].add(value);
    }
    if (route.primaryKeyword) {
      if (seen.keyword.has(route.primaryKeyword)) {
        fail(`${where}: primary keyword "${route.primaryKeyword}" is already targeted by another page`);
      }
      seen.keyword.add(route.primaryKeyword);
    }
  }
}

function validateMarkup(route, markup, nodes) {
  const where = `route ${route.path}`;
  if (markup.length < MIN_MARKUP) fail(`${where}: rendered only ${markup.length} characters`);
  const h1s = markup.match(/<h1[\s>]/g) ?? [];
  if (h1s.length !== 1) fail(`${where}: has ${h1s.length} <h1> elements, expected exactly 1`);
  if (route.spaRoute && markup.includes('—')) fail(`${where}: em dash in page copy`);

  // FAQPage markup must describe questions the page actually shows.
  for (const node of nodes) {
    if (node['@type'] !== 'FAQPage') continue;
    for (const question of node.mainEntity) {
      if (!markup.includes(escapeHtmlText(question.name))) {
        fail(`${where}: FAQ "${question.name}" is in the JSON-LD but not on the page`);
      }
    }
  }
}

function buildSitemap(routes, siteUrl) {
  const urls = routes.map((route) => {
    const loc = route.path === '/' ? `${siteUrl}/` : `${siteUrl}${route.path}`;
    return [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${route.lastmod}</lastmod>`,
      `    <changefreq>${route.sitemap.changefreq}</changefreq>`,
      `    <priority>${route.sitemap.priority.toFixed(1)}</priority>`,
      '  </url>',
    ].join('\n');
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

async function main() {
  const template = await readFile(resolve(root, 'dist/index.html'), 'utf8');
  if (!template.includes(ROOT_DIV)) fail(`dist/index.html does not contain ${ROOT_DIV}`);
  if (!HEAD_BLOCK.test(template)) fail('dist/index.html has no <!-- seo:head:start/end --> block');
  if (!NOSCRIPT_BLOCK.test(template)) fail('dist/index.html has no <!-- noscript:start/end --> block');

  // Vite in middleware mode resolves the TSX, path aliases and CSS imports the
  // same way the real build does, so the prerender cannot drift from what ships.
  const vite = await createServer({
    root,
    appType: 'custom',
    server: { middlewareMode: true },
    logLevel: 'warn',
    // react-router-dom is CommonJS. Externalised, Vite's SSR loader cannot read
    // its named exports; bundled, it dies on a bare `module` reference. The
    // prerendered pages use only <Link>; see scripts/prerender/router-stub.jsx.
    resolve: {
      alias: [{ find: /^react-router-dom$/, replacement: resolve(root, 'scripts/prerender/router-stub.jsx') }],
    },
    // The browser dep-scanner is useless here and races vite.close(), printing
    // an esbuild stack after a successful run.
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  try {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MARKETING_ROUTES } = await vite.ssrLoadModule('/src/marketing/routes.ts');
    const { buildHeadHtml } = await vite.ssrLoadModule('/src/marketing/head.ts');
    const { SITE_URL } = await vite.ssrLoadModule('/src/marketing/site.ts');
    const { buildLlmsTxt } = await vite.ssrLoadModule('/src/marketing/llms.ts');

    validateRegistry(MARKETING_ROUTES);

    let homeHtml = null;
    for (const route of MARKETING_ROUTES) {
      const mod = await route.load();
      const nodes = typeof mod.structuredData === 'function' ? mod.structuredData(route) : [];
      let html = template.replace(HEAD_BLOCK, `<!-- seo:head:start -->\n${buildHeadHtml(route, nodes)}\n    <!-- seo:head:end -->`);

      if (route.prerender === 'full') {
        const Page = mod.default;
        if (typeof Page !== 'function') fail(`route ${route.path}: module has no default-exported component`);
        const markup = renderToStaticMarkup(React.createElement(Page, route.props ?? {}));
        validateMarkup(route, markup, nodes);
        html = html.replace(ROOT_DIV, `<div id="root">${markup}</div>`).replace(NOSCRIPT_BLOCK, '');
        console.log(`prerendered ${route.path} (${markup.length} chars, ${nodes.length} JSON-LD nodes)`);
      } else {
        console.log(`head only   ${route.path} (${nodes.length} JSON-LD nodes)`);
      }

      if (route.path === '/') {
        // Written last: dist/index.html is the template and the SPA fallback.
        homeHtml = html;
        continue;
      }
      const outDir = resolve(root, 'dist', route.path.slice(1));
      await mkdir(outDir, { recursive: true });
      await writeFile(resolve(outDir, 'index.html'), html, 'utf8');
    }

    if (!homeHtml) fail('no route for / in src/marketing/routes.ts');
    await writeFile(resolve(root, 'dist/index.html'), homeHtml, 'utf8');

    const sitemap = buildSitemap(MARKETING_ROUTES, SITE_URL);
    const listed = (sitemap.match(/<loc>/g) ?? []).length;
    if (listed !== MARKETING_ROUTES.length) fail(`sitemap lists ${listed} URLs, registry has ${MARKETING_ROUTES.length}`);
    await writeFile(resolve(root, 'dist/sitemap.xml'), sitemap, 'utf8');
    console.log(`wrote sitemap.xml (${listed} URLs)`);

    const llms = buildLlmsTxt(MARKETING_ROUTES);
    await writeFile(resolve(root, 'dist/llms.txt'), llms, 'utf8');
    console.log(`wrote llms.txt (${llms.length} chars)`);
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('prerender failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
