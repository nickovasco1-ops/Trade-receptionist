#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');
const manifestPath = path.join(__dirname, 'call-flow-assets.manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'call-flow-placeholders-'));

try {
  execFileSync('qlmanage', ['-h'], { stdio: 'ignore' });
} catch {
  console.error('The placeholder raster step requires macOS `qlmanage`.');
  process.exit(1);
}

try {
  for (const asset of manifest.assets) {
    const outputPath = path.join(repoRoot, asset.output);
    const svgPath = path.join(tempDir, `${asset.id}.svg`);
    const svg = buildSvg(asset.placeholderKind, asset.type === 'panel');

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(svgPath, svg, 'utf8');

    execFileSync('qlmanage', ['-t', '-s', asset.type === 'panel' ? '1536' : '768', '-o', tempDir, svgPath], {
      stdio: 'ignore',
    });

    await copyFile(`${svgPath}.png`, outputPath);
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log(`Rendered ${manifest.assets.length} placeholder call-flow PNG assets.`);

function buildSvg(kind, isPanel) {
  return isPanel ? buildPanelSvg(kind) : buildIconSvg(kind);
}

function buildIconSvg(kind) {
  const accent = '#FF6B2B';
  const accentSoft = '#FF8C55';
  const blue = '#99CBFF';
  const navy = '#051426';
  const navyHigh = '#0F3060';
  const green = '#33D17A';

  const body = {
    'ringing-smartphone': `
      <rect x="250" y="142" width="268" height="484" rx="56" fill="url(#phoneGradient)" stroke="rgba(255,255,255,0.16)" stroke-width="10"/>
      <rect x="286" y="196" width="196" height="336" rx="28" fill="rgba(240,244,248,0.08)"/>
      <circle cx="384" cy="574" r="22" fill="rgba(240,244,248,0.18)"/>
      <path d="M205 248c-48 30-78 80-78 136" stroke="${accent}" stroke-width="24" stroke-linecap="round" fill="none"/>
      <path d="M173 186c-70 45-112 117-112 198" stroke="${accentSoft}" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.75"/>
      <path d="M563 248c48 30 78 80 78 136" stroke="${accent}" stroke-width="24" stroke-linecap="round" fill="none"/>
      <path d="M595 186c70 45 112 117 112 198" stroke="${accentSoft}" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.75"/>
    `,
    'ai-receptionist-headset': `
      <path d="M224 366c0-120 72-214 160-214s160 94 160 214" stroke="${blue}" stroke-width="44" stroke-linecap="round" fill="none"/>
      <rect x="186" y="348" width="84" height="168" rx="34" fill="url(#accentGradient)"/>
      <rect x="498" y="348" width="84" height="168" rx="34" fill="url(#accentGradient)"/>
      <path d="M292 498c28 42 68 64 120 64 55 0 94-20 122-64" stroke="rgba(240,244,248,0.88)" stroke-width="26" stroke-linecap="round" fill="none"/>
      <rect x="418" y="470" width="88" height="32" rx="16" fill="${green}" opacity="0.9"/>
      <circle cx="543" cy="316" r="22" fill="${accentSoft}"/>
    `,
    'job-sheet-clipboard': `
      <rect x="206" y="138" width="356" height="492" rx="42" fill="url(#cardGradient)" stroke="rgba(255,255,255,0.16)" stroke-width="10"/>
      <rect x="308" y="106" width="152" height="68" rx="24" fill="${blue}" opacity="0.92"/>
      <rect x="264" y="236" width="240" height="24" rx="12" fill="rgba(240,244,248,0.74)"/>
      <rect x="264" y="292" width="180" height="20" rx="10" fill="rgba(240,244,248,0.40)"/>
      <rect x="264" y="342" width="196" height="20" rx="10" fill="rgba(240,244,248,0.40)"/>
      <rect x="264" y="392" width="220" height="20" rx="10" fill="rgba(240,244,248,0.40)"/>
      <rect x="264" y="462" width="204" height="84" rx="22" fill="rgba(255,107,43,0.18)" stroke="${accent}" stroke-width="10"/>
      <path d="M296 502l34 34 64-70" stroke="${accentSoft}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `,
    'whatsapp-summary-bubble': `
      <path d="M194 224c0-54 44-98 98-98h176c54 0 98 44 98 98v154c0 54-44 98-98 98H362l-98 82 20-82h8c-54 0-98-44-98-98z" fill="${green}" opacity="0.94"/>
      <rect x="304" y="242" width="164" height="22" rx="11" fill="rgba(255,255,255,0.88)"/>
      <rect x="304" y="292" width="128" height="18" rx="9" fill="rgba(255,255,255,0.56)"/>
      <rect x="304" y="338" width="144" height="18" rx="9" fill="rgba(255,255,255,0.56)"/>
      <rect x="246" y="474" width="292" height="126" rx="28" fill="url(#cardGradient)" stroke="rgba(255,255,255,0.12)" stroke-width="8"/>
      <rect x="282" y="512" width="162" height="18" rx="9" fill="${blue}" opacity="0.82"/>
      <rect x="282" y="552" width="210" height="18" rx="9" fill="rgba(240,244,248,0.46)"/>
    `,
    'booked-diary-calendar': `
      <rect x="186" y="164" width="396" height="424" rx="42" fill="url(#cardGradient)" stroke="rgba(255,255,255,0.16)" stroke-width="10"/>
      <rect x="186" y="164" width="396" height="112" rx="42" fill="url(#accentGradient)"/>
      <rect x="246" y="116" width="34" height="92" rx="17" fill="${blue}"/>
      <rect x="488" y="116" width="34" height="92" rx="17" fill="${blue}"/>
      <rect x="248" y="330" width="88" height="72" rx="18" fill="rgba(255,255,255,0.08)"/>
      <rect x="356" y="330" width="88" height="72" rx="18" fill="rgba(255,255,255,0.08)"/>
      <rect x="464" y="330" width="88" height="72" rx="18" fill="rgba(255,255,255,0.08)"/>
      <circle cx="384" cy="492" r="78" fill="${green}" opacity="0.94"/>
      <path d="M344 492l26 26 56-62" stroke="white" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `,
    'phone-clock-247': `
      <rect x="196" y="190" width="248" height="388" rx="54" fill="url(#phoneGradient)" stroke="rgba(255,255,255,0.16)" stroke-width="10"/>
      <rect x="232" y="236" width="176" height="278" rx="28" fill="rgba(240,244,248,0.08)"/>
      <circle cx="530" cy="506" r="122" fill="url(#clockGradient)" stroke="rgba(255,255,255,0.18)" stroke-width="10"/>
      <path d="M530 436v80l52 30" stroke="white" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="530" cy="506" r="12" fill="white"/>
      <circle cx="586" cy="408" r="20" fill="${accentSoft}" opacity="0.9"/>
    `,
    'spam-shield-filter': `
      <path d="M384 126l204 72v146c0 140-84 238-204 294-120-56-204-154-204-294V198z" fill="url(#cardGradient)" stroke="rgba(255,255,255,0.16)" stroke-width="10"/>
      <path d="M384 204l118 42v84c0 84-44 146-118 188-74-42-118-104-118-188v-84z" fill="${blue}" opacity="0.88"/>
      <path d="M302 460l164-164" stroke="${accent}" stroke-width="28" stroke-linecap="round"/>
      <circle cx="270" cy="492" r="54" fill="rgba(255,107,43,0.18)" stroke="${accent}" stroke-width="10"/>
      <path d="M246 492h48" stroke="${accentSoft}" stroke-width="16" stroke-linecap="round"/>
    `,
    'urgent-call-siren': `
      <rect x="258" y="464" width="252" height="78" rx="28" fill="url(#cardGradient)" stroke="rgba(255,255,255,0.12)" stroke-width="8"/>
      <path d="M298 446c0-78 38-152 86-198 48 46 86 120 86 198z" fill="url(#accentGradient)"/>
      <rect x="322" y="542" width="124" height="26" rx="13" fill="${blue}" opacity="0.8"/>
      <path d="M248 286l-58-44" stroke="${accentSoft}" stroke-width="20" stroke-linecap="round"/>
      <path d="M520 286l58-44" stroke="${accentSoft}" stroke-width="20" stroke-linecap="round"/>
      <path d="M384 210v-82" stroke="${accentSoft}" stroke-width="20" stroke-linecap="round"/>
      <circle cx="384" cy="324" r="20" fill="rgba(255,255,255,0.24)"/>
    `,
    'call-records-notes': `
      <rect x="244" y="188" width="268" height="360" rx="34" fill="url(#cardGradient)" stroke="rgba(255,255,255,0.16)" stroke-width="10"/>
      <rect x="192" y="238" width="268" height="360" rx="34" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="8"/>
      <rect x="278" y="274" width="176" height="20" rx="10" fill="${blue}" opacity="0.82"/>
      <rect x="278" y="320" width="192" height="18" rx="9" fill="rgba(240,244,248,0.42)"/>
      <rect x="278" y="366" width="166" height="18" rx="9" fill="rgba(240,244,248,0.42)"/>
      <rect x="278" y="432" width="130" height="82" rx="22" fill="rgba(255,107,43,0.18)" stroke="${accent}" stroke-width="10"/>
      <path d="M312 474l28 28 54-60" stroke="${accentSoft}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `,
  }[kind];

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${navyHigh}"/>
        <stop offset="100%" stop-color="${navy}"/>
      </linearGradient>
      <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.16)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0.06)"/>
      </linearGradient>
      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="100%" stop-color="${accentSoft}"/>
      </linearGradient>
      <linearGradient id="phoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#123764"/>
        <stop offset="100%" stop-color="#0A2340"/>
      </linearGradient>
      <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#123764"/>
        <stop offset="100%" stop-color="#0A2340"/>
      </linearGradient>
      <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="26"/>
      </filter>
    </defs>
    <rect width="768" height="768" rx="176" fill="url(#bgGradient)"/>
    <circle cx="164" cy="156" r="132" fill="rgba(255,107,43,0.22)" filter="url(#softGlow)"/>
    <circle cx="620" cy="132" r="114" fill="rgba(153,203,255,0.14)" filter="url(#softGlow)"/>
    <circle cx="598" cy="618" r="124" fill="rgba(51,209,122,0.10)" filter="url(#softGlow)"/>
    ${body}
  </svg>`;
}

function buildPanelSvg() {
  const accent = '#FF6B2B';
  const accentSoft = '#FF8C55';
  const blue = '#99CBFF';
  const navy = '#051426';
  const navyHigh = '#0F3060';
  const green = '#33D17A';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1536" height="864" viewBox="0 0 1536 864">
    <defs>
      <linearGradient id="panelBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${navyHigh}"/>
        <stop offset="100%" stop-color="${navy}"/>
      </linearGradient>
      <linearGradient id="cardGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.16)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0.06)"/>
      </linearGradient>
      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="100%" stop-color="${accentSoft}"/>
      </linearGradient>
      <filter id="panelBlur" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="46"/>
      </filter>
    </defs>
    <rect width="1536" height="864" rx="54" fill="url(#panelBg)"/>
    <circle cx="240" cy="180" r="180" fill="rgba(255,107,43,0.16)" filter="url(#panelBlur)"/>
    <circle cx="1250" cy="170" r="160" fill="rgba(153,203,255,0.14)" filter="url(#panelBlur)"/>
    <circle cx="1210" cy="710" r="180" fill="rgba(51,209,122,0.10)" filter="url(#panelBlur)"/>

    <rect x="110" y="206" width="264" height="434" rx="36" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" stroke-width="6"/>
    <rect x="150" y="248" width="184" height="296" rx="28" fill="#0A2340"/>
    <circle cx="242" cy="572" r="22" fill="rgba(240,244,248,0.18)"/>
    <path d="M88 310c-30 20-50 52-50 88" stroke="${accent}" stroke-width="18" stroke-linecap="round" fill="none"/>
    <path d="M398 310c30 20 50 52 50 88" stroke="${accent}" stroke-width="18" stroke-linecap="round" fill="none"/>

    <rect x="462" y="238" width="274" height="372" rx="34" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" stroke-width="6"/>
    <rect x="552" y="214" width="94" height="42" rx="18" fill="${blue}" opacity="0.92"/>
    <rect x="514" y="314" width="170" height="18" rx="9" fill="rgba(240,244,248,0.78)"/>
    <rect x="514" y="358" width="130" height="14" rx="7" fill="rgba(240,244,248,0.44)"/>
    <rect x="514" y="398" width="146" height="14" rx="7" fill="rgba(240,244,248,0.44)"/>
    <rect x="514" y="452" width="170" height="74" rx="18" fill="rgba(255,107,43,0.16)" stroke="${accent}" stroke-width="8"/>
    <path d="M540 492l24 24 42-48" stroke="${accentSoft}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

    <path d="M394 420h44" stroke="rgba(255,255,255,0.20)" stroke-width="8" stroke-linecap="round"/>
    <path d="M760 420h44" stroke="rgba(255,255,255,0.20)" stroke-width="8" stroke-linecap="round"/>

    <path d="M820 248c0-42 34-76 76-76h154c42 0 76 34 76 76v114c0 42-34 76-76 76h-78l-58 48 12-48h-30c-42 0-76-34-76-76z" fill="${green}" opacity="0.94"/>
    <rect x="904" y="260" width="130" height="18" rx="9" fill="rgba(255,255,255,0.88)"/>
    <rect x="904" y="300" width="98" height="14" rx="7" fill="rgba(255,255,255,0.54)"/>
    <rect x="904" y="336" width="118" height="14" rx="7" fill="rgba(255,255,255,0.54)"/>
    <rect x="836" y="500" width="272" height="110" rx="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" stroke-width="6"/>
    <rect x="882" y="536" width="154" height="16" rx="8" fill="${blue}" opacity="0.82"/>
    <rect x="882" y="572" width="194" height="14" rx="7" fill="rgba(240,244,248,0.44)"/>

    <path d="M1138 420h44" stroke="rgba(255,255,255,0.20)" stroke-width="8" stroke-linecap="round"/>

    <rect x="1220" y="228" width="206" height="226" rx="30" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" stroke-width="6"/>
    <rect x="1220" y="228" width="206" height="60" rx="30" fill="url(#accentGradient)"/>
    <rect x="1260" y="196" width="18" height="58" rx="9" fill="${blue}"/>
    <rect x="1368" y="196" width="18" height="58" rx="9" fill="${blue}"/>
    <circle cx="1324" cy="368" r="46" fill="${green}" opacity="0.94"/>
    <path d="M1302 368l16 16 34-38" stroke="white" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="1216" y="514" width="214" height="86" rx="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" stroke-width="6"/>
    <rect x="1252" y="546" width="144" height="14" rx="7" fill="rgba(240,244,248,0.60)"/>
  </svg>`;
}
