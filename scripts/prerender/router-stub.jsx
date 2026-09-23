// Stand-in for react-router-dom during the legal-page prerender.
//
// The pages use exactly one thing from the router: <Link to="...">. In a static
// render that is an anchor and nothing more — there is no history, no navigation
// and no route matching to honour. Substituting it is not a shortcut around the
// real router; it avoids pulling a CommonJS package through Vite's ESM SSR
// loader, which resolves its named exports to undefined and then dies on a bare
// `module` reference.
//
// If a legal page ever needs more of the router than this, the prerender should
// fail loudly rather than quietly render less — hence no catch-all export.

export function Link({ to, children, ...rest }) {
  return <a href={typeof to === 'string' ? to : '#'} {...rest}>{children}</a>;
}
