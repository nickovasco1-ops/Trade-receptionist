import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  AssetManifest,
  GeneratedAssetMetadata,
  ManifestEntry,
  PromptDefinition,
  VisualSkillContext,
} from './types.js';
import { ensureDir, timestampStamp, writeJson } from './utils.js';

const OPENAI_IMAGES_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const REQUESTED_SIZE = '1792x1024';
const REQUESTED_ASPECT_RATIO = '16:9';
const REQUESTED_QUALITY = 'premium';

export async function generateAssets(
  context: VisualSkillContext,
  manifest: AssetManifest,
  prompts: PromptDefinition[],
  selectedAssetIds: string[],
): Promise<AssetManifest> {
  const promptMap = new Map(prompts.map(prompt => [prompt.assetId, prompt]));
  const selectedIds = new Set(selectedAssetIds);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = context.options.model || process.env.IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  await ensureDir(context.paths.assetOutputDir);

  if (!apiKey) {
    return updateManifestStatuses(
      manifest,
      manifest.assets
        .filter(asset => selectedIds.has(asset.assetId))
        .map(asset => ({
          assetId: asset.assetId,
        status: 'failed' as const,
        notes: 'OPENAI_API_KEY was not set. Prompt files were generated, but no images were created.',
        })),
    );
  }

  const updates: Array<{ assetId: string; status: ManifestEntry['status']; newAssetPath?: string; metadataPath?: string; notes?: string }> = [];

  for (const asset of manifest.assets) {
    if (!selectedIds.has(asset.assetId)) {
      continue;
    }
    const promptDefinition = promptMap.get(asset.assetId);
    if (!promptDefinition) {
      updates.push({
        assetId: asset.assetId,
        status: 'failed',
        notes: 'Prompt definition was missing for this asset.',
      });
      continue;
    }

    const fileName = buildAssetFileName(asset.section, asset.assetId);
    const assetPath = path.join(context.paths.assetOutputDir, `${fileName}.png`);
    const metadataPath = path.join(context.paths.assetOutputDir, `${fileName}.json`);

    try {
      const response = await fetch(OPENAI_IMAGES_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: promptDefinition.prompt,
          size: REQUESTED_SIZE,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Image generation failed (${response.status}): ${details}`);
      }

      const payload = await response.json() as {
        data?: Array<{ b64_json?: string; url?: string }>;
      };

      const buffer = await resolveImageBuffer(payload);
      await writeFile(assetPath, buffer);

      const metadata: GeneratedAssetMetadata = {
        assetId: asset.assetId,
        originalComponentLocation: asset.componentPath,
        promptUsed: promptDefinition.prompt,
        modelUsed: model,
        dateGenerated: new Date().toISOString(),
        assetPath: path.relative(context.paths.rootDir, assetPath).split(path.sep).join('/'),
        altText: asset.altText,
        auditSeverity: asset.severity,
        integrationTarget: {
          filePath: asset.applyTargetFile,
          strategy: asset.applyStrategy,
          searchValue: asset.applySearchValue,
        },
        generationSettings: {
          requestedSize: REQUESTED_SIZE,
          requestedAspectRatio: REQUESTED_ASPECT_RATIO,
          requestedQuality: REQUESTED_QUALITY,
          format: 'png',
        },
        safeApplyStatus: 'generated',
      };

      await writeJson(metadataPath, metadata);
      updates.push({
        assetId: asset.assetId,
        status: 'generated',
        newAssetPath: `/${path.relative(path.join(context.paths.rootDir, 'public'), assetPath).split(path.sep).join('/')}`,
        metadataPath: path.relative(context.paths.rootDir, metadataPath).split(path.sep).join('/'),
      });
    } catch (error) {
      updates.push({
        assetId: asset.assetId,
        status: 'failed',
        notes: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return updateManifestStatuses(manifest, updates);
}

async function resolveImageBuffer(payload: { data?: Array<{ b64_json?: string; url?: string }> }): Promise<Buffer> {
  const first = payload.data?.[0];
  if (!first) {
    throw new Error('Image generation response did not include any image output.');
  }
  if (first.b64_json) {
    return Buffer.from(first.b64_json, 'base64');
  }
  if (first.url) {
    const imageResponse = await fetch(first.url);
    if (!imageResponse.ok) {
      throw new Error(`Generated image URL download failed (${imageResponse.status}).`);
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error('Image generation response did not include b64_json or url.');
}

function buildAssetFileName(section: string, assetId: string): string {
  return `trade-receptionist-${section}-${assetId}-v001`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function updateManifestStatuses(
  manifest: AssetManifest,
  updates: Array<{ assetId: string; status: ManifestEntry['status']; newAssetPath?: string; metadataPath?: string; notes?: string }>,
): AssetManifest {
  const updateMap = new Map(updates.map(update => [update.assetId, update]));
  return {
    ...manifest,
    generatedAt: new Date().toISOString(),
    assets: manifest.assets.map(asset => {
      const update = updateMap.get(asset.assetId);
      if (!update) {
        return asset;
      }
      return {
        ...asset,
        status: update.status,
        newAssetPath: update.newAssetPath ?? asset.newAssetPath,
        metadataPath: update.metadataPath ?? asset.metadataPath,
        notes: update.notes ?? asset.notes,
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}
