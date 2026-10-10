// Usage: node render.mjs stills <t1,t2,...>   |   node render.mjs frames
import { createRequire } from 'node:module';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30, DURATION = 21.0;

const [mode, list] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(here, 'index.html'));
await page.evaluate(async () => {
  await window.ready;
  const loads = [
    '700 96px "Space Grotesk"', '600 40px "Space Grotesk"', '500 40px "Space Grotesk"',
    '400 20px Manrope', '500 20px Manrope', '600 20px Manrope', '700 20px Manrope', '800 20px Manrope',
    '500 20px "JetBrains Mono"',
  ];
  await Promise.all(loads.map((f) => document.fonts.load(f, 'Aa£✓—')));
  await document.fonts.ready;
});

async function shot(t, file) {
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.screenshot({ path: file, type: 'png' });
}

if (mode === 'stills') {
  const dir = path.join(here, 'stills'); mkdirSync(dir, { recursive: true });
  for (const t of list.split(',').map(Number)) await shot(t, path.join(dir, `t${t.toFixed(2)}.png`));
} else {
  const dir = path.join(here, 'frames'); mkdirSync(dir, { recursive: true });
  const total = Math.round(FPS * DURATION);
  for (let i = 0; i < total; i++) {
    const file = path.join(dir, `f${String(i).padStart(4, '0')}.png`);
    if (existsSync(file)) continue; // resumable
    for (let attempt = 1; ; attempt++) {
      try { await shot(i / FPS, file); break; }
      catch (err) { if (attempt >= 3) throw err; console.log(`frame ${i} retry ${attempt}`); }
    }
    if (i % 60 === 0) console.log(`frame ${i}/${total}`);
  }
}
await browser.close();
