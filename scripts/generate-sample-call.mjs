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
Caller (Jess): Hi—sorry, I'm hoping you can help. Our boiler's just gone off and the house is freezing.
Receptionist (Sam): Oh no—right, okay. You've done the right thing calling. Is it showing an error code, or is it completely dead?
Caller (Jess): It's got, um… "EA" something? And there's no heating at all.
Receptionist (Sam): Mm, got you. And just to check—have you also got no hot water, or is it only the heating?
Caller (Jess): No hot water either.
Receptionist (Sam): Okay, thanks. I'll log this as urgent. Whereabouts are you—what's the postcode?
Caller (Jess): It's SE19 2—uh—SE19 2DP.
Receptionist (Sam): Perfect, SE19 2DP. And what's the best name for the booking?
Caller (Jess): Jess Carter.
Receptionist (Sam): Lovely—Jess. And a mobile number, in case the engineer needs to ring you on the way?
Caller (Jess): Yeah, it's 07—
Receptionist (Sam): —Yep, go on.
Caller (Jess): 7702 118 64.
Receptionist (Sam): Brilliant—so that's 07702 118 64. Right. I'm going to message the on-call engineer now. If we can't get someone there today, we'll aim for first slot tomorrow morning—sorry, Wednesday morning. Is anyone at the property all day?
Caller (Jess): I can be, yeah.
Receptionist (Sam): Spot on. One last thing—any smell of gas at all?
Caller (Jess): No, nothing like that.
Receptionist (Sam): Okay, good. Leave it with me—I'll come straight back to you within the next twenty minutes with a time window. And if anything changes—like you do smell gas—get outside and call the emergency line immediately, yeah?
Caller (Jess): Yeah, understood. Thank you.
Receptionist (Sam): No worries at all, Jess. We'll get you sorted. Speak in a bit—bye for now.
`.trim();

const DIRECTOR_NOTES = `[DIRECTOR NOTES — READ CAREFULLY BEFORE SPEAKING:
- Language: English (United Kingdom). Locale: en-GB. Do NOT use American English pronunciation, vocabulary, or intonation under any circumstances.
- Both speakers have natural South-East England / Greater London accents. Non-rhotic. Glottal stops on "t" mid-word are natural.
- Character Sam (Receptionist): Female, 30s, warm and professionally efficient. Genuine South London warmth — like a brilliant GP receptionist. Never robotic. Uses natural British verbal acknowledgements: "right", "got you", "brilliant", "lovely", "spot on". Speaks at a natural conversational pace, not rushed.
- Character Jess (Caller): Female, 30s, stressed homeowner, South London. Natural hesitations ("um", "uh"), slightly relieved and grateful as the call progresses.
- Prosody: Sam should sound like she's genuinely listening and caring, not reading from a script. Natural rising intonation on questions. Slight warmth/smile in the voice throughout.
- Pace: Sam speaks clearly but not slowly — confident and in control. Jess is slightly anxious at the start, then relaxes as things get sorted.]`;

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
            { speaker: 'Sam',  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            { speaker: 'Jess', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
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
