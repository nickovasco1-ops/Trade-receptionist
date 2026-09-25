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
  toE164,
  chooseCallerNumber,
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

// ── Contact numbers ───────────────────────────────────────────────────────────
//
// The case that prompted these: a live booking on 2026-09-25 where the agent
// transcribed a UK mobile one digit short. Twilio rejected the confirmation SMS
// (21211) and the short number went into the tradesperson's diary event, while
// the caller ID on the same request was correct all along.

describe('toE164', () => {
  test('accepts a UK mobile in every shape a caller or the LLM produces', () => {
    for (const raw of [
      '07700900123',
      '07700 900123',
      '07700 900 123',
      '07700-900-123',
      '+447700900123',
      '+44 7700 900123',
      '+44 (0)7700 900123',
      '447700900123',
      '00447700900123',
    ]) {
      assert.equal(toE164(raw), '+447700900123', raw);
    }
  });

  // The production failure, stated as an assertion.
  test('rejects a UK mobile one digit short', () => {
    assert.equal(toE164('+44770090012'), null);
    assert.equal(toE164('0770090012'), null);
  });

  test('rejects a UK mobile one digit long', () => {
    assert.equal(toE164('077009001234'), null);
  });

  test('accepts UK landlines, including the nine-digit geographic areas', () => {
    assert.equal(toE164('020 7946 0123'), '+442079460123');
    assert.equal(toE164('01632 960123'), '+441632960123');
    assert.equal(toE164('016977 3456'), '+44169773456');
  });

  test('passes through a foreign number already in international form', () => {
    assert.equal(toE164('+353 85 123 4567'), '+353851234567');
    assert.equal(toE164('00353851234567'), '+353851234567');
  });

  test('refuses anything that is not a number at all', () => {
    for (const raw of [null, undefined, '', '   ', 'anonymous', 'withheld', '0770O900123', '7700900123']) {
      assert.equal(toE164(raw), null, String(raw));
    }
  });
});

describe('chooseCallerNumber', () => {
  test('prefers a valid number the caller gave — they may want texts elsewhere', () => {
    assert.deepEqual(
      chooseCallerNumber('07700 900456', '+447700900123'),
      { number: '+447700900456', source: 'heard' },
    );
  });

  test('falls back to caller ID when the heard number cannot exist', () => {
    assert.deepEqual(
      chooseCallerNumber('+44770090012', '+447700900123'),
      { number: '+447700900123', source: 'caller_id' },
    );
  });

  test('uses caller ID when the agent passed no number', () => {
    assert.deepEqual(
      chooseCallerNumber(undefined, '+447700900123'),
      { number: '+447700900123', source: 'caller_id' },
    );
  });

  test('gives up cleanly when neither is usable, e.g. a withheld number', () => {
    assert.deepEqual(
      chooseCallerNumber('+44770090012', 'anonymous'),
      { number: null, source: 'none' },
    );
  });
});
