import path from 'node:path';

import type { AssetManifest, AuditFinding, ManifestEntry, PromptDefinition, VisualSkillContext } from './types.js';
import { ensureDir, fileExists, readText, writeJson } from './utils.js';

export async function loadManifest(context: VisualSkillContext): Promise<AssetManifest> {
  await ensureDir(context.paths.manifestDir);
  if (!(await fileExists(context.paths.manifestPath))) {
    return {
      repo: 'trade-receptionist',
      generatedAt: new Date().toISOString(),
      assets: [],
    };
  }

  return JSON.parse(await readText(context.paths.manifestPath)) as AssetManifest;
}

export async function saveManifest(context: VisualSkillContext, manifest: AssetManifest): Promise<void> {
  await writeJson(context.paths.manifestPath, manifest);
}

export function mergePlanIntoManifest(
  manifest: AssetManifest,
  findings: AuditFinding[],
  prompts: PromptDefinition[],
  rootDir?: string,
): AssetManifest {
  const existingById = new Map(manifest.assets.map(asset => [asset.assetId, asset]));
  const promptMap = new Map(prompts.map(prompt => [prompt.assetId, prompt]));
  const nextAssets: ManifestEntry[] = [];
  const selectedIds = new Set(findings.map(finding => finding.assetId));

  for (const finding of findings) {
    const existing = existingById.get(finding.assetId);
    const prompt = promptMap.get(finding.assetId);
    const now = new Date().toISOString();
    const nextEntry: ManifestEntry = {
      assetId: finding.assetId,
      section: finding.section,
      pagePath: finding.pagePath,
      componentPath: finding.componentPath,
      oldAssetPath: finding.oldAssetPath,
      promptPath: prompt
        ? (rootDir
            ? prompt.promptPath.replace(`${rootDir}${path.sep}`, '').split(path.sep).join('/')
            : prompt.promptPath)
        : '',
      altText: finding.suggestedAltText,
      severity: finding.severity,
      integrationRisk: finding.integrationRisk,
      status: existing?.status ?? 'planned',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      currentVisualSource: finding.currentVisualSource,
      applyStrategy: finding.integrationTarget.strategy,
      applyTargetFile: finding.integrationTarget.filePath,
      applySearchValue: finding.integrationTarget.searchValue,
      notes: finding.recommendedReplacementDirection,
    };

    nextAssets.push({
      ...existing,
      ...nextEntry,
    });
  }

  for (const asset of manifest.assets) {
    if (!selectedIds.has(asset.assetId)) {
      nextAssets.push(asset);
    }
  }

  return {
    ...manifest,
    generatedAt: new Date().toISOString(),
    assets: nextAssets.sort((a, b) => a.assetId.localeCompare(b.assetId)),
  };
}
