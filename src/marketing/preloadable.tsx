// React.lazy with a preload handle.
//
// Marketing pages arrive as prerendered HTML. index.tsx mounts with
// createRoot, which replaces that HTML on its first commit. With a plain
// React.lazy the first commit is the Suspense fallback, so the visitor would
// see the page, then a blank frame while the chunk loads, then the page again.
// index.tsx calls preload() for the current URL before mounting, so the first
// commit already renders the real page and the swap is invisible.

import React, { useState, type ComponentType } from 'react';
import type { MarketingModule, MarketingPageProps } from './routes';

export interface PreloadableComponent {
  (props: MarketingPageProps): React.ReactElement;
  preload: () => Promise<unknown>;
}

export function preloadable(load: () => Promise<MarketingModule>): PreloadableComponent {
  let loaded: ComponentType<MarketingPageProps> | null = null;

  const loadComponent = async (): Promise<{ default: ComponentType<MarketingPageProps> }> => {
    const mod = await load();
    if (!mod.default) throw new Error('Marketing page module has no default export');
    loaded = mod.default;
    return { default: mod.default };
  };

  const Lazy = React.lazy(loadComponent);

  function Page(props: MarketingPageProps): React.ReactElement {
    // Decide once per mount, so a chunk that resolves mid-life does not swap
    // the element type and remount the page.
    const [Component] = useState<ComponentType<MarketingPageProps>>(() => loaded ?? Lazy);
    return (
      <React.Suspense fallback={null}>
        <Component {...props} />
      </React.Suspense>
    );
  }

  Page.preload = loadComponent;
  return Page;
}
