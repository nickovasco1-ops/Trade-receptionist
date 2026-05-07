import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import type { AssetManifest, ManifestEntry, VisualSkillContext } from './types.js';
import { ensureDir, fileExists, timestampStamp } from './utils.js';

export async function applyGeneratedAssets(
  context: VisualSkillContext,
  manifest: AssetManifest,
  selectedAssetIds: string[],
): Promise<AssetManifest> {
  const timestamp = timestampStamp();
  const backupRoot = path.join(context.paths.backupsDir, timestamp);
  const patchPath = path.join(context.paths.patchesDir, `${timestamp}.patch`);
  const selectedIds = new Set(selectedAssetIds);

  await ensureDir(backupRoot);
  await ensureDir(context.paths.patchesDir);

  let patchAccumulator = '';

  const nextAssets = await Promise.all(
    manifest.assets.map(async asset => {
      if (!selectedIds.has(asset.assetId)) {
        return asset;
      }
      if (asset.status !== 'generated') {
        return asset;
      }
      if (asset.applyStrategy !== 'replace-string-literal' || !asset.applySearchValue || !asset.newAssetPath) {
        return {
          ...asset,
          status: 'skipped' as const,
          notes: 'Safe apply requires a direct string-literal asset target. This finding still needs manual integration.',
          updatedAt: new Date().toISOString(),
        };
      }

      const sourceFile = path.join(context.paths.rootDir, asset.applyTargetFile);
      if (!(await fileExists(sourceFile))) {
        return {
          ...asset,
          status: 'failed' as const,
          notes: `Target file not found: ${asset.applyTargetFile}`,
          updatedAt: new Date().toISOString(),
        };
      }

      const original = await readFile(sourceFile, 'utf8');
      const occurrences = original.split(asset.applySearchValue).length - 1;
      if (occurrences === 0) {
        return {
          ...asset,
          status: 'failed' as const,
          notes: `Search value not found in ${asset.applyTargetFile}: ${asset.applySearchValue}`,
          updatedAt: new Date().toISOString(),
        };
      }
      if (occurrences !== 1) {
        return {
          ...asset,
          status: 'failed' as const,
          notes: `Safe apply aborted because ${asset.applySearchValue} matched ${occurrences} times in ${asset.applyTargetFile}.`,
          updatedAt: new Date().toISOString(),
        };
      }

      const updated = original.replaceAll(asset.applySearchValue, asset.newAssetPath);
      const tempDir = await mkdtemp(path.join(os.tmpdir(), 'trade-visual-apply-'));
      const tempPath = path.join(tempDir, path.basename(sourceFile));
      await writeFile(tempPath, updated, 'utf8');
      patchAccumulator += buildDiff(sourceFile, tempPath, asset.applyTargetFile);

      if (context.options.dryRun || !context.options.yes) {
        return {
          ...asset,
          updatedAt: new Date().toISOString(),
          notes: `Previewed safe-apply patch for ${asset.applyTargetFile}. Re-run with --yes to write changes.`,
        };
      }

      const backupPath = path.join(backupRoot, asset.applyTargetFile);
      await ensureDir(path.dirname(backupPath));
      await cp(sourceFile, backupPath);
      await writeFile(sourceFile, updated, 'utf8');

      return {
        ...asset,
        status: 'applied' as const,
        updatedAt: new Date().toISOString(),
        notes: `Applied generated asset to ${asset.applyTargetFile} with backup at ${path.relative(context.paths.rootDir, backupPath).split(path.sep).join('/')}`,
      };
    }),
  );

  if (patchAccumulator.trim()) {
    await writeFile(patchPath, patchAccumulator, 'utf8');
  }

  return {
    ...manifest,
    generatedAt: new Date().toISOString(),
    assets: nextAssets,
  };
}

function buildDiff(originalPath: string, updatedPath: string, repoRelativePath: string): string {
  const label = repoRelativePath.split(path.sep).join('/');
  const result = spawnSync('git', [
    'diff',
    '--no-index',
    '--label',
    `a/${label}`,
    '--label',
    `b/${label}`,
    '--',
    originalPath,
    updatedPath,
  ], {
    encoding: 'utf8',
  });

  if (result.status === 0 || result.status === 1) {
    return result.stdout || result.stderr || '';
  }

  return `# Failed to build patch for ${originalPath}\n${result.stderr}\n`;
}
