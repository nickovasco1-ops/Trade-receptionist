import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_RECEPTIONIST_NAME, openingGreeting } from './greeting';

/**
 * Since 2026-10-01 the greeting no longer volunteers that the receptionist is
 * an AI (a tenant's request; Terms §8 changed with it). It must still tell the
 * caller the call is recorded, and the agent must still own up when asked.
 */
describe('openingGreeting', () => {
  test('reads like a person answering the business phone', () => {
    assert.equal(
      openingGreeting('TAPS', 'Amy'),
      'Hello, this is TAPS, Amy speaking. Calls are recorded. How can I help?',
    );
  });

  test('always tells the caller the call is recorded', () => {
    for (const name of ['Amy', DEFAULT_RECEPTIONIST_NAME, '']) {
      assert.match(openingGreeting('Smith Plumbing', name), /\bCalls are recorded\./, name);
    }
  });

  test('does not volunteer that the receptionist is an AI', () => {
    assert.doesNotMatch(openingGreeting('Smith Plumbing', 'Sarah'), /\bAI\b/);
  });

  test('a tenant with no chosen name gets the business alone, not the product name', () => {
    const greeting = openingGreeting('Smith Plumbing', DEFAULT_RECEPTIONIST_NAME);
    assert.equal(greeting, 'Hello, this is Smith Plumbing. Calls are recorded. How can I help?');
    assert.doesNotMatch(greeting, new RegExp(DEFAULT_RECEPTIONIST_NAME));
  });

  test('treats a blank name as the default', () => {
    assert.equal(openingGreeting('Smith Plumbing', '   '), openingGreeting('Smith Plumbing', DEFAULT_RECEPTIONIST_NAME));
  });

  test('ends by handing over to the caller', () => {
    assert.match(openingGreeting('Smith Plumbing', 'Sarah'), /How can I help\?$/);
  });
});

/**
 * prompt-builder cannot be imported here (it pulls in the Supabase-backed
 * calendar service), so these read its source, as transfer-tool.test.ts does.
 */
describe('prompt-builder', () => {
  const source = readFileSync(resolve(__dirname, 'prompt-builder.ts'), 'utf8');

  test('both the spoken greeting and the prompt quote come from openingGreeting()', () => {
    const uses = source.match(/openingGreeting\(businessName, receptionistName\)/g) ?? [];
    assert.equal(uses.length, 2, 'buildBeginMessage() and the OPENING section must both call openingGreeting()');
  });

  test('no longer hard-codes a greeting of its own', () => {
    assert.doesNotMatch(source, /`Hello, thanks for calling/);
  });

  test('still tells the agent to confirm it is an AI when asked, and never to pass as a person', () => {
    assert.match(source, /if the caller asks whether you're a real person, a robot or an AI, always answer honestly/);
    assert.match(source, /Never claim or imply to be a person\./);
  });

  test('does not tell the agent to hide that it is an AI or to stay quiet about recording', () => {
    assert.doesNotMatch(source, /never (volunteer|admit|reveal|say) that you('re| are) an AI/i);
    assert.doesNotMatch(source, /Do not mention call recording/i);
  });
});
