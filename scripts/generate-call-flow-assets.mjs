#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');
const manifestPath = path.join(__dirname, 'call-flow-assets.manifest.json');
const metadataRoot = path.join(repoRoot, 'docs', 'reference', 'call-flow-section', 'generated-metadata');

loadDotenv({ path: path.join(repoRoot, '.env') });
loadDotenv({ path: path.join(repoRoot, '.env.local'), override: true });

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const args = process.argv.slice(2);
  const selectedAssetIds = new Set();
  let generateAll = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--all') {
      generateAll = true;
      continue;
    }
    if (flag === '--id') {
      const assetId = args[index + 1];
      if (!assetId) {
        throw new Error('Missing value for --id');
      }
      selectedAssetIds.add(assetId);
      index += 1;
      continue;
    }
    throw new Error(`Unknown flag "${flag}". Use --all or --id <asset-id>.`);
  }

  if (!generateAll && selectedAssetIds.size === 0) {
    throw new Error('Select at least one asset with --all or --id <asset-id>.');
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const availableAssets = manifest.assets;
  const targets = generateAll
    ? availableAssets
    : availableAssets.filter((asset) => selectedAssetIds.has(asset.id));

  if (targets.length === 0) {
    throw new Error('No assets matched the requested ids.');
  }

  const apiKey = process.env.OPENAI_API_KEY || '';
  const model = process.env.IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set, so no images were generated.');
    console.error('The prompt manifest is ready at: scripts/call-flow-assets.manifest.json');
    console.error('To render local fallbacks instead, run: npm run generate:call-flow-placeholders');
    process.exit(1);
  }

  for (const asset of targets) {
    const outputPath = path.join(repoRoot, asset.output);
    const metadataPath = path.join(metadataRoot, `${asset.id}.json`);
    const prompt = `${manifest.baseStylePrompt} ${asset.promptSuffix}`;

    await mkdir(path.dirname(outputPath), { recursive: true });
    await mkdir(path.dirname(metadataPath), { recursive: true });

    console.log(`Generating ${asset.id} -> ${asset.output}`);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        size: asset.size,
        quality: asset.quality,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(formatApiError(asset.id, response.status, details));
    }

    const payload = await response.json();
    const imageBase64 = payload?.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error(`OpenAI did not return image data for ${asset.id}.`);
    }

    await writeFile(outputPath, Buffer.from(imageBase64, 'base64'));
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          id: asset.id,
          output: asset.output,
          model,
          size: asset.size,
          quality: asset.quality,
          alt: asset.alt,
          prompt,
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  }

  console.log(`Generated ${targets.length} call-flow asset${targets.length === 1 ? '' : 's'}.`);
}

function formatApiError(assetId, status, details) {
  try {
    const parsed = JSON.parse(details);
    const message = parsed?.error?.message || 'Unknown API error.';
    const code = parsed?.error?.code || '';

    if (code === 'billing_hard_limit_reached') {
      return `Image generation failed for ${assetId} (${status}): OpenAI billing hard limit reached for the active key. Update billing or use a different key, then rerun the asset command.`;
    }

    if (code === 'insufficient_quota') {
      return `Image generation failed for ${assetId} (${status}): OpenAI quota is exhausted for the active key. Refresh quota or use a different key, then rerun the asset command.`;
    }

    if (code === 'invalid_api_key') {
      return `Image generation failed for ${assetId} (${status}): the supplied OpenAI API key was rejected. Check the key and rerun the asset command.`;
    }

    return `Image generation failed for ${assetId} (${status}): ${message}`;
  } catch {
    return `Image generation failed for ${assetId} (${status}): ${details}`;
  }
}
