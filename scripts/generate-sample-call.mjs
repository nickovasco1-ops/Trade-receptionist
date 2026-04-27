#!/usr/bin/env node
/**
 * Generates the demo call audio as a static WAV asset.
 *
 * Run once (or whenever the script or voice config changes):
 *   GEMINI_API_KEY=<key> node scripts/generate-sample-call.mjs
 *
 * Then commit public/assets/generated/sample-call.wav to your repository.
 *
 * This key is NEVER bundled into the frontend — it is server-side / build-time only.
 * Do NOT use VITE_GEMINI_API_KEY. Do NOT use the Gemini API from the browser.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = join(__dirname, '..', 'public', 'assets', 'generated');
const OUT_PATH  = join(OUT_DIR, 'sample-call.wav');

// ── Script ────────────────────────────────────────────────────────────────────

const CALL_SCRIPT = `
Receptionist (Sarah): Good afternoon, you've reached Hendricks Plumbing — I'm Sarah, how can I help?
Caller (Mike): Hi yeah — my bathroom radiator's just started leaking, it's dripping onto the floorboards. I'm worried it's gonna go through to the ceiling below.
Receptionist (Sarah): Oh right, okay — so it's actively leaking at the moment. Is the water coming from the valve at the side, or from where the pipe meets the wall?
Caller (Mike): Erm — the pipe at the bottom, I think. Near where it connects in.
Receptionist (Sarah): Got you. Right — first thing, can you turn the radiator valves off on both sides? There's one at each end. Just turn them both clockwise as far as they'll go — that'll slow it right down while we get someone out to you.
Caller (Mike): Yeah — yeah, I can do that. Hang on — right, done it. That's already helped actually, it's just dripping now.
Receptionist (Sarah): Brilliant, good work. Right, let me get this booked in for you. What area are you in? Postcode if you've got it?
Caller (Mike): SE24 — SE24 0EB.
Receptionist (Sarah): Perfect — that's Herne Hill. Dave covers that area and he's got a gap this afternoon, around half three. Does that work for you?
Caller (Mike): Oh — that'd be great, yeah.
Receptionist (Sarah): Lovely. And the name for the booking?
Caller (Mike): Mike — Mike Patterson.
Receptionist (Sarah): Great, Mike. And a mobile number so Dave can ring when he's about twenty minutes away?
Caller (Mike): Yeah — it's 07831 440 295.
Receptionist (Sarah): Perfect, so that's 07831 — 440 295. Right, I've got you booked in for today, half three, SE24 0EB. You'll get a text confirmation shortly, and Dave will give you a ring when he's on his way. Is there anything else I can help with?
Caller (Mike): No, that's brilliant — thank you so much.
Receptionist (Sarah): Absolute pleasure, Mike. We'll get that sorted for you. Bye for now.
`.trim();

const DIRECTOR_NOTES = `[DIRECTOR NOTES — READ CAREFULLY BEFORE SPEAKING:
- Language: English (United Kingdom). Locale: en-GB. Do NOT use American English pronunciation, vocabulary, or intonation under any circumstances.
- Both speakers have natural South-East England / Greater London accents. Non-rhotic. Glottal stops on "t" mid-word are natural.
- Character Sarah: Female, 30s, warm and professionally efficient. Genuine South London warmth — like a brilliant GP receptionist. Never robotic. Uses natural British verbal acknowledgements: "right", "got you", "brilliant", "lovely", "spot on". Speaks at a natural conversational pace, not rushed.
- Character Mike: Male, 40s, stressed homeowner, working-class South London. Natural hesitations ("erm", "yeah"), slightly relieved as the call progresses and things get sorted.
- Prosody: Sarah should sound like she's genuinely listening and caring, not reading from a script. Natural rising intonation on questions. Slight warmth/smile in the voice throughout.
- Pace: Sarah speaks clearly but not slowly — confident and in control. Mike is slightly rushed at the start, then relaxes.]`;

// ── WAV encoder ───────────────────────────────────────────────────────────────

/** Prepend a standard 44-byte WAV header to raw 16-bit little-endian PCM data. */
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const byteRate   = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const header     = Buffer.alloc(44);

  header.write('RIFF',  0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE',  8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16,          16); // PCM chunk size
  header.writeUInt16LE(1,           20); // PCM format = 1
  header.writeUInt16LE(channels,    22);
  header.writeUInt32LE(sampleRate,  24);
  header.writeUInt32LE(byteRate,    28);
  header.writeUInt16LE(blockAlign,  32);
  header.writeUInt16LE(bitDepth,    34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length,  40);

  return Buffer.concat([header, pcm]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('\nERROR: GEMINI_API_KEY environment variable is not set.');
    console.error('This is a SERVER-SIDE key — never use VITE_GEMINI_API_KEY for this.\n');
    console.error('Usage:  GEMINI_API_KEY=<your-key> node scripts/generate-sample-call.mjs\n');
    process.exit(1);
  }

  console.log('Calling Gemini TTS — this takes 10–30 seconds for a full conversation…');

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: `${DIRECTOR_NOTES}\n\n${CALL_SCRIPT}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Sarah', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            { speaker: 'Mike',  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
          ],
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error('No audio data in Gemini response. Model may have changed — check API docs.');

  const pcm = Buffer.from(base64Audio, 'base64');
  const wav = pcmToWav(pcm);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, wav);

  const mb   = (wav.length / 1_048_576).toFixed(2);
  const secs = Math.round(pcm.length / (24000 * 2));

  console.log(`\n✓  Written: ${OUT_PATH}`);
  console.log(`   Duration: ~${secs}s   Size: ${mb} MB`);
  console.log('\nNext steps:');
  console.log('  git add public/assets/generated/sample-call.wav');
  console.log('  git commit -m "feat: add pre-rendered demo call audio"\n');
}

main().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
