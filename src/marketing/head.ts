// Builds the SEO head for a marketing route, as an HTML string for the
// build-time prerender (scripts/prerender.mjs) to splice into index.html
// between the <!-- seo:head:start --> and <!-- seo:head:end --> markers.

import type { MarketingRoute } from './routes';
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from './site';
import { breadcrumbNode, webPageNode, type JsonLdNode } from './structured-data';

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** JSON inside <script> must not be able to close the tag early. */
function safeJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
}

export function buildJsonLd(route: MarketingRoute, pageNodes: readonly JsonLdNode[]): Record<string, unknown> {
  const nodes: JsonLdNode[] = [];
  // The homepage describes the organisation and product itself; inner pages
  // describe themselves as a WebPage within the site.
  if (route.path !== '/') nodes.push(webPageNode(route.path, route.title, route.description));
  if (route.breadcrumbs && route.breadcrumbs.length > 1) nodes.push(breadcrumbNode(route.breadcrumbs));
  nodes.push(...pageNodes);
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export function buildHeadHtml(route: MarketingRoute, pageNodes: readonly JsonLdNode[]): string {
  const url = absoluteUrl(route.path);
  const title = escapeAttr(route.title);
  const description = escapeAttr(route.description);
  const image = DEFAULT_OG_IMAGE;

  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `<meta property="og:type" content="${route.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${image.url}" />`,
    `<meta property="og:image:width" content="${image.width}" />`,
    `<meta property="og:image:height" content="${image.height}" />`,
    `<meta property="og:image:alt" content="${escapeAttr(image.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image.url}" />`,
    `<script type="application/ld+json">\n${safeJson(buildJsonLd(route, pageNodes))}\n</script>`,
  ];

  return tags.map((tag) => `    ${tag}`).join('\n');
}
