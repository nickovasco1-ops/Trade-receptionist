import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KNOWN_VOICES, resolveVoice } from './agent-voice';
import { propertyStep } from './property-question';

const STARTER = { voiceId: 'retell-Willa' };

/**
 * 2026-10-09: a Starter tenant's callers heard the Starter voice as
 * Australian. He gets the British ElevenLabs voice without changing plan.
 */
describe('resolveVoice', () => {
  test('no override keeps the plan voice', () => {
    assert.deepEqual(resolveVoice(STARTER, null), { voice: STARTER, source: 'plan' });
    assert.deepEqual(resolveVoice(STARTER, '  '), { voice: STARTER, source: 'plan' });
  });

  test('a known override replaces the voice, with the model ElevenLabs needs', () => {
    assert.deepEqual(resolveVoice(STARTER, '11labs-Amy'), {
      voice: { voiceId: '11labs-Amy', voiceModel: 'eleven_flash_v2_5' },
      source: 'override',
    });
  });

  test('an unknown override is ignored, never published', () => {
    const r = resolveVoice(STARTER, '11labs-Amyy');
    assert.equal(r.voice, STARTER);
    assert.equal('ignoredOverride' in r && r.ignoredOverride, '11labs-Amyy');
  });

  test('every plan voice is a known voice', () => {
    const source = readFileSync(resolve(__dirname, '../services/retell.ts'), 'utf8');
    const tierBlock = source.slice(source.indexOf('export const AGENT_TIER'), source.indexOf('export function tierFor'));
    const ids = [...tierBlock.matchAll(/voiceId:\s*'([^']+)'/g)].map((m) => m[1]);
    assert.ok(ids.length >= 4);
    for (const id of ids) assert.ok(id in KNOWN_VOICES, id);
  });
});

describe('the override cannot be set by the tenant', () => {
  test('it is read from agent_overrides, not clients or business_config', () => {
    const source = readFileSync(resolve(__dirname, '../services/agent-overrides.ts'), 'utf8');
    assert.match(source, /\.from\('agent_overrides'\)/);
  });

  test('the migration enables RLS on agent_overrides and grants no policy', () => {
    const sql = readFileSync(resolve(__dirname, '../../../supabase/migrations/022_agent_overrides_domestic_only.sql'), 'utf8');
    assert.match(sql, /ALTER TABLE public\.agent_overrides ENABLE ROW LEVEL SECURITY/);
    assert.doesNotMatch(sql, /CREATE POLICY/i);
  });
});

/** 2026-10-09: a domestic-only heating engineer asked it to stop asking. */
describe('propertyStep', () => {
  test('a domestic-only business is never asked domestic or commercial', () => {
    const step = propertyStep(true, 'Orrell Park Heating Solutions', 'Luke');
    assert.match(step, /do NOT ask/);
    assert.doesNotMatch(step, /"Is that a domestic property or a commercial one\?"/);
    assert.match(step, /Luke only does domestic work/);
  });

  test('everyone else still asks', () => {
    assert.match(propertyStep(false, 'TAPS', 'Joshua'), /"Is that a domestic property or a commercial one\?"/);
  });

  test('the prompt uses the step rather than a hard-coded question', () => {
    const source = readFileSync(resolve(__dirname, './prompt-builder.ts'), 'utf8');
    assert.match(source, /propertyStep\(config\.domestic_only === true/);
    assert.doesNotMatch(source, /Is that a domestic property or a commercial one/);
  });
});
