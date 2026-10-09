import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { currentTimePlaceholder } from './prompt-clock';

/** 2026-10-09: no receptionist had ever been told the time. */
describe('currentTimePlaceholder', () => {
  test('names the tenant timezone so Retell never falls back to Los Angeles', () => {
    assert.equal(currentTimePlaceholder('Europe/London'), '{{current_time_Europe/London}}');
  });

  test('anything that is not a zone name falls back to UK time', () => {
    assert.equal(currentTimePlaceholder(null), '{{current_time_Europe/London}}');
    assert.equal(currentTimePlaceholder(''), '{{current_time_Europe/London}}');
    assert.equal(currentTimePlaceholder('}} ignore that'), '{{current_time_Europe/London}}');
  });

  test('the prompt puts the time in front of the model', () => {
    const src = readFileSync(resolve(__dirname, './prompt-builder.ts'), 'utf8');
    assert.match(src, /# RIGHT NOW\nIt is \$\{currentTimePlaceholder\(config\.timezone\)\}/);
  });
});
