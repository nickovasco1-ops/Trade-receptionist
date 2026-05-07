import path from 'node:path';

import type { BrandConfig, VisualSkillPaths } from './types.js';
import { readText } from './utils.js';

export async function loadBrandConfig(paths: VisualSkillPaths): Promise<BrandConfig> {
  const raw = await readText(paths.brandConfigPath);
  return JSON.parse(raw) as BrandConfig;
}

export function defaultAssetOutputDir(paths: VisualSkillPaths): string {
  return path.join(paths.rootDir, 'public', 'assets', 'generated', 'trade-receptionist');
}
