/**
 * UK divert-code formatting.
 *
 * The test that would have caught it: every call site interpolated the stored
 * E.164 number straight into the MMI string, producing `**004*+4473...#`. UK
 * networks require national format with the leading zero, so the code never
 * registered — on any network, for any customer, since the feature shipped.
 * Nothing failed loudly; the customer simply received no calls.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toNationalDialling,
  divertActivationCode,
  DIVERT_CANCEL_ALL,
  DIVERT_CHECK,
} from '../../../shared/phone';

describe('toNationalDialling', () => {
  test('converts E.164 to national format with the leading zero', () => {
    assert.equal(toNationalDialling('+447365080267'), '07365080267');
    assert.equal(toNationalDialling('+447700900123'), '07700900123');
  });

  test('accepts the other international spellings', () => {
    assert.equal(toNationalDialling('00447700900123'), '07700900123');
    assert.equal(toNationalDialling('447700900123'), '07700900123');
  });

  test('passes through a number already in national format', () => {
    assert.equal(toNationalDialling('07700900123'), '07700900123');
  });

  test('tolerates spaces and punctuation', () => {
    assert.equal(toNationalDialling('+44 7700 900123'), '07700900123');
    assert.equal(toNationalDialling('(07700) 900-123'), '07700900123');
  });

  test('returns null rather than a broken code for non-UK or junk input', () => {
    for (const bad of ['', null, undefined, '+13105551234', 'not a number', '12345']) {
      assert.equal(toNationalDialling(bad as string), null, `expected null for ${String(bad)}`);
    }
  });
});

describe('divertActivationCode', () => {
  test('builds a dialable code — no plus sign anywhere', () => {
    const code = divertActivationCode('+447365080267');
    assert.equal(code, '**004*07365080267#');
    assert.ok(!code!.includes('+'), 'a divert code containing "+" cannot register');
  });

  // This is the regression itself, stated as an assertion.
  test('never emits the E.164 form that shipped', () => {
    assert.notEqual(divertActivationCode('+447365080267'), '**004*+447365080267#');
  });

  test('returns null when no code can be built, so callers render nothing', () => {
    assert.equal(divertActivationCode(null), null);
    assert.equal(divertActivationCode('+13105551234'), null);
  });
});

describe('divert control codes', () => {
  test('cancel-all clears every divert type, not just the conditional set', () => {
    // ##004# clears only conditional forwarding and leaves an unconditional
    // divert in place, which is the state a confused customer ends up in.
    assert.equal(DIVERT_CANCEL_ALL, '##002#');
  });

  test('a check code exists so a customer can confirm it registered', () => {
    assert.equal(DIVERT_CHECK, '*#004#');
  });
});
