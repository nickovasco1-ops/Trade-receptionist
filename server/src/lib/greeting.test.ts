import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_RECEPTIONIST_NAME, openingGreeting } from './greeting';

/**
 * The Terms of Service promise callers are told, at the start of each call,
 * that they are speaking to an AI and that the call may be recorded. Until
 * 2026-09-29 the greeting said neither and the prompt told the agent never to
 * volunteer that it was an AI.
 */
describe('openingGreeting', () => {
  test('tells the caller it is an AI receptionist', () => {
    assert.match(openingGreeting('Smith Plumbing', 'Sarah'), /\bAI receptionist\b/);
  });

  test('tells the caller the call may be recorded', () => {
    assert.match(openingGreeting('Smith Plumbing', 'Sarah'), /\bcall may be recorded\b/);
  });

  test('names the business and the chosen receptionist', () => {
    const greeting = openingGreeting('Smith Plumbing', 'Sarah');
    assert.match(greeting, /thanks for calling Smith Plumbing\./);
    assert.match(greeting, /You're through to Sarah, the AI receptionist\./);
  });

  test('does not say the default name twice', () => {
    const greeting = openingGreeting('Smith Plumbing', DEFAULT_RECEPTIONIST_NAME);
    assert.match(greeting, /You're through to the AI receptionist\./);
    assert.doesNotMatch(greeting, new RegExp(DEFAULT_RECEPTIONIST_NAME));
  });

  test('treats a blank name as the default', () => {
    assert.match(openingGreeting('Smith Plumbing', '   '), /You're through to the AI receptionist\./);
  });

  test('ends by handing over to the caller', () => {
    assert.match(openingGreeting('Smith Plumbing', 'Sarah'), /How can I help\?$/);
  });
});

/**
 * prompt-builder cannot be imported here (it pulls in the Supabase-backed
 * calendar service), so these read its source, as transfer-tool.test.ts does.
 */
describe('prompt-builder uses the disclosed greeting', () => {
  const source = readFileSync(resolve(__dirname, 'prompt-builder.ts'), 'utf8');

  test('both the spoken greeting and the prompt quote come from openingGreeting()', () => {
    const uses = source.match(/openingGreeting\(businessName, receptionistName\)/g) ?? [];
    assert.equal(uses.length, 2, 'buildBeginMessage() and the OPENING section must both call openingGreeting()');
  });

  test('no longer hard-codes a greeting of its own', () => {
    assert.doesNotMatch(source, /`Hello, thanks for calling/);
  });

  test('no longer tells the agent to hide that it is an AI', () => {
    assert.doesNotMatch(source, /never volunteer that you are an AI/i);
    assert.doesNotMatch(source, /Do not mention call recording/i);
  });
});
