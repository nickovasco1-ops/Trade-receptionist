// Bake real HTML into /privacy and /terms so a crawler that does not run
// JavaScript still sees the policy.
//
// Why this exists: the SPA ships `<body><div id="root"></div><script/></body>`.
// Every route therefore serves an empty document to anything that does not
// execute JS. Google's OAuth verification fetches the homepage, the privacy
// policy and the terms, and rejected this project once already with "Your home
// page URL is unresponsive" — a blank body is indistinguishable from a dead one.
//
// Only the two legal pages are prerendered. They are pure presentational React
// with no data fetching, so rendering them statically is sound. App.tsx is not:
// it owns Lenis, IntersectionObserver and mouse parallax, none of which have a
// server equivalent, and its <head> already carries the metadata and JSON-LD a
// crawler reads.
//
// The React app still hydrates and takes over on load, so what a person sees is
// unchanged. This only alters what a non-JS fetch receives.
//
// Vercel checks the filesystem before applying the `/(.*)` → /index.html rewrite,
// so dist/privacy/index.html is served at /privacy without a config change.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ROUTES = [
  { path: 'privacy', module: 'src/pages/legal/PrivacyPage.tsx' },
  { path: 'terms',   module: 'src/pages/legal/TermsPage.tsx' },
];

/** The marker the Vite build leaves for the app to mount into. */
const ROOT_DIV = '<div id="root"></div>';

async function main() {
  const template = await readFile(resolve(root, 'dist/index.html'), 'utf8');
  if (!template.includes(ROOT_DIV)) {
    // Fail loudly. A prerender that silently writes nothing is the exact shape of
    // bug this codebase keeps rediscovering — it would read as a clean build.
    throw new Error(`dist/index.html does not contain ${ROOT_DIV} — did the build output change?`);
  }

  // Vite in middleware mode resolves the TSX, the path aliases and the CSS
  // imports the same way the real build does, so the prerender cannot drift from
  // what ships.
  const vite = await createServer({
    root,
    appType: 'custom',
    server: { middlewareMode: true },
    logLevel: 'warn',
    // react-router-dom is CommonJS. Externalised, Vite's SSR loader cannot read its
    // named exports; bundled, it dies on a bare `module` reference. The pages use
    // only <Link>, so the stub sidesteps both — see scripts/prerender/router-stub.jsx.
    resolve: {
      alias: [{ find: /^react-router-dom$/, replacement: resolve(root, 'scripts/prerender/router-stub.jsx') }],
    },
    // The browser dep-scanner is useless here — we only ssrLoadModule two files —
    // and it races vite.close(), printing an esbuild stack after a successful run.
    // A success that prints a stack trace gets read as a failure.
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  try {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');

    for (const route of ROUTES) {
      const mod = await vite.ssrLoadModule(`/${route.module}`);
      const Page = mod.default;
      if (typeof Page !== 'function') {
        throw new Error(`${route.module} has no default-exported component`);
      }

      const markup = renderToStaticMarkup(React.createElement(Page));

      if (markup.length < 500) {
        throw new Error(
          `${route.module} rendered only ${markup.length} characters — that is not a policy page`,
        );
      }

      const html = template.replace(ROOT_DIV, `<div id="root">${markup}</div>`);
      const outDir = resolve(root, 'dist', route.path);
      await mkdir(outDir, { recursive: true });
      await writeFile(resolve(outDir, 'index.html'), html, 'utf8');

      console.log(`prerendered /${route.path} — ${markup.length} characters of markup`);
    }
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('prerender failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
