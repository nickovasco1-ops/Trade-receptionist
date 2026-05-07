import path from 'node:path';

import type {
  ImageReference,
  RepoInspection,
  RouteInfo,
  TokenMap,
  VisualArea,
  VisualSkillContext,
} from './types.js';
import {
  fileExists,
  getLineNumber,
  readText,
  relativePath,
  unique,
  walkFiles,
} from './utils.js';

const TEXT_FILE_RE = /\.(ts|tsx|js|jsx|css|html|json|md)$/i;
const IMAGE_FILE_RE = /\.(png|jpg|jpeg|webp|svg|gif|webm|wav)$/i;

export async function inspectRepository(context: VisualSkillContext): Promise<RepoInspection> {
  const { rootDir } = context.paths;
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(await readText(packageJsonPath)) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const filePaths = await walkFiles(rootDir, {
    include: (filePath) => TEXT_FILE_RE.test(filePath) || IMAGE_FILE_RE.test(filePath),
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'server', '.next']),
  });

  const framework = await detectFramework(rootDir, packageJson);
  const routes = await detectRoutes(rootDir);
  const pageFiles = filePaths
    .filter(filePath => /(^|\/)(App\.tsx|src\/pages\/.+\.tsx)$/.test(relativePath(rootDir, filePath)));
  const componentFiles = filePaths.filter(filePath =>
    /(^|\/)(components\/.+\.tsx|src\/components\/.+\.tsx)$/.test(relativePath(rootDir, filePath)),
  );
  const assetFolders = await detectAssetFolders(rootDir);
  const imageReferences = await detectImageReferences(rootDir, filePaths);
  const tokens = await detectTokens(rootDir);
  const brandColors = unique(Object.values(tokens.colors)).slice(0, 12);
  const landingVisualAreas = detectLandingVisualAreas(rootDir);
  const imageComponents = await detectImageComponents(rootDir, componentFiles);
  const detectedFormats = unique(
    imageReferences
      .map(reference => path.extname(reference.assetPath).replace('.', '').toLowerCase())
      .filter(Boolean),
  );

  return {
    rootDir,
    framework,
    routing: {
      type: 'react-router-dom BrowserRouter',
      routes,
    },
    pageFiles: pageFiles.map(filePath => relativePath(rootDir, filePath)),
    componentFiles: componentFiles.map(filePath => relativePath(rootDir, filePath)),
    assetFolders: assetFolders.map(filePath => relativePath(rootDir, filePath)),
    imageReferences,
    imageConventions: {
      publicAssetRoot: 'public/assets',
      preferredGeneratedDir: 'public/assets/generated',
      detectedFormats,
    },
    tokens,
    brandColors,
    imageComponents,
    landingVisualAreas,
  };
}

async function detectFramework(
  rootDir: string,
  packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
): Promise<string> {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  if (await fileExists(path.join(rootDir, 'vite.config.ts'))) {
    if (deps.react && deps['react-router-dom']) {
      return 'Vite + React + React Router + TypeScript';
    }
    if (deps.react) {
      return 'Vite + React + TypeScript';
    }
    return 'Vite application';
  }
  if (await fileExists(path.join(rootDir, 'next.config.js')) || await fileExists(path.join(rootDir, 'next.config.mjs'))) {
    return 'Next.js';
  }
  if (await fileExists(path.join(rootDir, 'astro.config.mjs')) || await fileExists(path.join(rootDir, 'astro.config.ts'))) {
    return 'Astro';
  }
  if (deps.vue) {
    return 'Vue';
  }
  return 'Unknown TypeScript web application';
}

async function detectRoutes(rootDir: string): Promise<RouteInfo[]> {
  const entryPath = path.join(rootDir, 'index.tsx');
  if (!(await fileExists(entryPath))) {
    return [];
  }
  const source = await readText(entryPath);
  const routeMatches = [...source.matchAll(/<Route\s+path="([^"]+)"/g)];
  return routeMatches.map(match => ({
    path: match[1],
    sourceFile: 'index.tsx',
  }));
}

async function detectAssetFolders(rootDir: string): Promise<string[]> {
  const publicDir = path.join(rootDir, 'public');
  if (!(await fileExists(publicDir))) {
    return [];
  }
  const folders: string[] = [];

  async function visit(currentDir: string): Promise<void> {
    const entries = await walkFiles(currentDir, {
      include: () => false,
      ignoreDirs: new Set(),
    }).catch(() => []);
    void entries;
  }

  const queue = [publicDir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    folders.push(current);
    const children = await import('node:fs/promises').then(fs => fs.readdir(current, { withFileTypes: true }));
    for (const child of children) {
      if (child.isDirectory()) {
        queue.push(path.join(current, child.name));
      }
    }
  }

  return folders
    .filter(folder => folder.includes(`${path.sep}assets`) || folder.endsWith(`${path.sep}public`))
    .sort((a, b) => a.localeCompare(b));
}

async function detectImageReferences(rootDir: string, filePaths: string[]): Promise<ImageReference[]> {
  const references: ImageReference[] = [];
  const candidateFiles = filePaths.filter(filePath => /\.(tsx|ts|css|html)$/i.test(filePath));
  const assetPattern = /\/assets\/[A-Za-z0-9\-_/\.]+\.(?:png|jpe?g|webp|svg|gif|webm|wav)/gi;

  for (const filePath of candidateFiles) {
    const content = await readText(filePath);
    const matches = [...content.matchAll(assetPattern)];
    for (const match of matches) {
      const assetPath = match[0];
      const lineNumber = getLineNumber(content, assetPath);
      const before = content.slice(Math.max(0, match.index ?? 0 - 80), (match.index ?? 0) + 80);
      const sourceType: ImageReference['sourceType'] = before.includes('background') || before.includes('url(')
        ? 'css-background'
        : before.includes('<img') || before.includes('src=')
          ? 'img-tag'
          : 'asset-string';

      references.push({
        filePath: relativePath(rootDir, filePath),
        lineNumber,
        assetPath,
        sourceType,
      });
    }
  }

  return references;
}

async function detectTokens(rootDir: string): Promise<TokenMap> {
  const tokenMap: TokenMap = {
    colors: {},
    fonts: {},
    radii: {},
  };

  const cssPath = path.join(rootDir, 'index.css');
  if (await fileExists(cssPath)) {
    const css = await readText(cssPath);
    for (const match of css.matchAll(/--(color-[a-z0-9-]+):\s*([^;]+);/gi)) {
      tokenMap.colors[match[1]] = match[2].trim();
    }
    for (const match of css.matchAll(/--(font-[a-z0-9-]+):\s*([^;]+);/gi)) {
      tokenMap.fonts[match[1]] = match[2].trim();
    }
    for (const match of css.matchAll(/--(radius-[a-z0-9-]+):\s*([^;]+);/gi)) {
      tokenMap.radii[match[1]] = match[2].trim();
    }
  }

  const tailwindPath = path.join(rootDir, 'tailwind.config.ts');
  if (await fileExists(tailwindPath)) {
    const tailwind = await readText(tailwindPath);
    for (const match of tailwind.matchAll(/([A-Za-z0-9-]+):\s*'(#?[A-Za-z0-9(),.%\s-]+)'/g)) {
      const key = match[1];
      const value = match[2];
      if (value.startsWith('#')) {
        tokenMap.colors[`tailwind-${key}`] = value;
      }
    }
  }

  return tokenMap;
}

function detectLandingVisualAreas(rootDir: string): VisualArea[] {
  const homepageComponent = relativePath(rootDir, path.join(rootDir, 'App.tsx'));
  return [
    {
      areaName: 'Homepage hero',
      pagePath: '/',
      componentPath: homepageComponent,
      rendered: true,
      notes: 'Hero scene with product image background and primary conversion copy.',
    },
    {
      areaName: 'Missed-call calculator',
      pagePath: '/',
      componentPath: homepageComponent,
      rendered: true,
      notes: 'Calculator proof block with stat cards and ROI explainer.',
    },
    {
      areaName: 'Workflow timeline',
      pagePath: '/',
      componentPath: 'components/FeaturesGrid.tsx',
      rendered: true,
      notes: 'Outcome-led workflow and compact feature cards.',
    },
    {
      areaName: 'Testimonials',
      pagePath: '/',
      componentPath: 'components/Testimonials.tsx',
      rendered: true,
      notes: 'Floating testimonial carousel with glass cards.',
    },
    {
      areaName: 'Sample call demo',
      pagePath: '/',
      componentPath: homepageComponent,
      rendered: true,
      notes: 'Audio-led call proof block with supporting card UI.',
    },
    {
      areaName: 'Pricing',
      pagePath: '/',
      componentPath: homepageComponent,
      rendered: true,
      notes: 'Scrollable pricing cards and contract reassurance.',
    },
    {
      areaName: 'FAQ / objection handling',
      pagePath: '/',
      componentPath: homepageComponent,
      rendered: true,
      notes: 'Accordion proof section near bottom funnel.',
    },
    {
      areaName: 'Final CTA',
      pagePath: '/',
      componentPath: homepageComponent,
      rendered: true,
      notes: 'Bottom conversion block with glow-only support visuals.',
    },
  ];
}

async function detectImageComponents(rootDir: string, componentFiles: string[]): Promise<string[]> {
  const imageComponents: string[] = [];
  for (const filePath of componentFiles) {
    const content = await readText(filePath);
    if (content.includes('<img')) {
      imageComponents.push(relativePath(rootDir, filePath));
    }
  }

  if (imageComponents.length === 0) {
    return ['No custom image wrapper detected; plain <img> is the current convention.'];
  }
  return imageComponents;
}
