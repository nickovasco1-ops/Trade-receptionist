#!/usr/bin/env node

/**
 * Generates one premium landing-page image for the marketing site when the
 * required OpenAI credentials are present, and always writes the reusable
 * prompt to disk for future iterations.
 *
 * Usage:
 *   OPENAI_API_KEY=<key> OPENAI_IMAGE_MODEL=<model> npm run generate:landing-asset
 *
 * Notes:
 * - The model is intentionally driven by OPENAI_IMAGE_MODEL so the project can
 *   use whichever GPT Image model is enabled in the active environment.
 * - If OPENAI_API_KEY or OPENAI_IMAGE_MODEL is missing, the script exits
 *   cleanly after writing the prompt file and printing setup instructions.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, '..', 'public', 'assets', 'generated');
const PROMPT_PATH = join(OUTPUT_DIR, 'landing-hero.prompt.txt');
const IMAGE_PATH = join(OUTPUT_DIR, 'landing-hero-generated.png');

const MODEL = process.env.OPENAI_IMAGE_MODEL || process.env.OPENAI_MODEL || '';
const API_KEY = process.env.OPENAI_API_KEY || '';

const prompt = [
  'Premium cinematic image for a UK tradesperson’s business: dark navy/charcoal premium SaaS aesthetic with subtle warm orange accent, phone handled in the background, organised tools, calm professional mood, no readable text, no logos, no distorted hands, no app UI, no fake screens, realistic UK trades context.',
  'Composition should leave clean negative space for homepage copy on the left.',
  'Use realistic workshop or van-adjacent context, soft practical lighting, and a polished premium feel rather than gritty chaos.',
  'Avoid purple gradients, cartoon styling, fake dashboards, or floating interface mockups.',
].join('\n');

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(PROMPT_PATH, `${prompt}\n`, 'utf8');

  if (!API_KEY || !MODEL) {
    console.log('Landing asset prompt prepared:');
    console.log(`  ${PROMPT_PATH}`);
    console.log('');
    console.log('To generate the image file as well, set:');
    console.log('  OPENAI_API_KEY=<your key>');
    console.log('  OPENAI_IMAGE_MODEL=<gpt image model enabled for this project>');
    console.log('');
    console.log('If generated successfully, the homepage hero will automatically try this asset first:');
    console.log(`  ${IMAGE_PATH}`);
    process.exit(0);
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: '1536x1024',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Image generation failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const imageBase64 = payload?.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error('Image generation response did not include image data.');
  }

  await writeFile(IMAGE_PATH, Buffer.from(imageBase64, 'base64'));

  console.log('Landing asset generated successfully:');
  console.log(`  Prompt: ${PROMPT_PATH}`);
  console.log(`  Image:  ${IMAGE_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
