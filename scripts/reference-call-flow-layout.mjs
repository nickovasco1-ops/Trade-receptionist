#!/usr/bin/env node

import path from 'node:path';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');
const screenshotPath = path.join(repoRoot, 'assets', 'reference', 'call-flow-section.png');
const outputDir = path.join(repoRoot, 'docs', 'reference', 'call-flow-section');

try {
  await access(screenshotPath);
} catch {
  console.error('Missing required screenshot: assets/reference/call-flow-section.png');
  console.error('Layout reconstruction is paused until that file exists.');
  console.error(`Expected screenshot path: ${screenshotPath}`);
  process.exit(1);
}

console.log('Screenshot-to-code reference workflow');
console.log('');
console.log(`Input screenshot: ${screenshotPath}`);
console.log(`Reference output folder: ${outputDir}`);
console.log('');
console.log('Recommended external workflow:');
console.log('1. Clone abi/screenshot-to-code outside this repo.');
console.log('2. Run its local frontend/backend per the upstream README.');
console.log('3. Generate React + Tailwind or HTML + Tailwind output from the screenshot.');
console.log('4. Save the reference result into:');
console.log('   - docs/reference/call-flow-section/call-flow-section.reference.react.tsx');
console.log('   - docs/reference/call-flow-section/call-flow-section.reference.html');
console.log('5. Update docs/reference/call-flow-section/asset-slots.md with any spacing changes adopted.');
