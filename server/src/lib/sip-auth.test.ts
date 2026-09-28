import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sipAuthFromEnv } from './sip-auth';

/**
 * Transfers were refused by the trunk because Retell was never given the
 * credentials its Termination side demands (2026-09-28).
 */
describe('sipAuthFromEnv', () => {
  test('both set → credentials', () => {
    assert.deepEqual(
      sipAuthFromEnv({ RETELL_SIP_AUTH_USERNAME: ' retell ', RETELL_SIP_AUTH_PASSWORD: 'Secret-Pass-123' }),
      { ok: true, auth: { username: 'retell', password: 'Secret-Pass-123' } },
    );
  });

  test('neither set → unset', () => {
    assert.deepEqual(sipAuthFromEnv({}), { ok: false, reason: 'unset' });
  });

  test('only one set → partial, never half-applied', () => {
    assert.deepEqual(sipAuthFromEnv({ RETELL_SIP_AUTH_USERNAME: 'retell' }), { ok: false, reason: 'partial' });
    assert.deepEqual(sipAuthFromEnv({ RETELL_SIP_AUTH_PASSWORD: 'x' }), { ok: false, reason: 'partial' });
  });
});

describe('number registration', () => {
  // The regression itself: a number imported without credentials cannot transfer.
  test('importTwilioNumber sends the trunk credentials', () => {
    const source = readFileSync(resolve(__dirname, '../services/retell.ts'), 'utf8');
    const body = source.slice(source.indexOf('export async function importTwilioNumber'));
    const fn = body.slice(0, body.indexOf('\n}\n'));
    assert.ok(fn.includes('sip_trunk_auth_username'), 'import must send sip_trunk_auth_username');
    assert.ok(fn.includes('sip_trunk_auth_password'), 'import must send sip_trunk_auth_password');
  });
});
