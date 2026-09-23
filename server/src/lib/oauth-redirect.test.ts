import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { backendBaseUrl, resolveRedirectUri, trimEnv } from './oauth-redirect';

/**
 * The override-wins ordering is the whole point of these tests.
 *
 * The original read `derived ?? override`, so GOOGLE_REDIRECT_URI and
 * MICROSOFT_REDIRECT_URI did nothing at all whenever PUBLIC_API_BASE_URL was set —
 * which it is in production. Nothing noticed, because derivation produced a URI that
 * worked; it was just not the configured one. It surfaced only when Google's OAuth
 * verification demanded that every authorised domain be verifiable in Search Console,
 * making `*.up.railway.app` unusable and the override the only way to move the
 * callback onto the owned domain.
 */
describe('resolveRedirectUri', () => {
  test('the explicit override wins over a derivable base', () => {
    assert.equal(
      resolveRedirectUri('google', {
        GOOGLE_REDIRECT_URI: 'https://tradereceptionist.com/api/auth/google/callback',
        PUBLIC_API_BASE_URL: 'https://trade-receptionist-production.up.railway.app',
      }),
      'https://tradereceptionist.com/api/auth/google/callback',
    );
  });

  test('each provider reads only its own override', () => {
    const env = {
      GOOGLE_REDIRECT_URI:    'https://tradereceptionist.com/api/auth/google/callback',
      MICROSOFT_REDIRECT_URI: 'https://tradereceptionist.com/api/auth/microsoft/callback',
    };
    assert.equal(resolveRedirectUri('google', env), env.GOOGLE_REDIRECT_URI);
    assert.equal(resolveRedirectUri('microsoft', env), env.MICROSOFT_REDIRECT_URI);
  });

  test('a Google override does not leak into the Microsoft URI', () => {
    assert.equal(
      resolveRedirectUri('microsoft', {
        GOOGLE_REDIRECT_URI: 'https://tradereceptionist.com/api/auth/google/callback',
        PUBLIC_API_BASE_URL: 'https://api.example.com',
      }),
      'https://api.example.com/auth/microsoft/callback',
    );
  });

  test('derives from the backend base when no override is set', () => {
    assert.equal(
      resolveRedirectUri('google', { PUBLIC_API_BASE_URL: 'https://api.example.com' }),
      'https://api.example.com/auth/google/callback',
    );
  });

  test('an empty or whitespace override is not an override', () => {
    assert.equal(
      resolveRedirectUri('google', {
        GOOGLE_REDIRECT_URI: '   ',
        PUBLIC_API_BASE_URL: 'https://api.example.com',
      }),
      'https://api.example.com/auth/google/callback',
    );
  });

  test('a trailing slash on the override is stripped, not doubled', () => {
    assert.equal(
      resolveRedirectUri('google', {
        GOOGLE_REDIRECT_URI: 'https://tradereceptionist.com/api/auth/google/callback/',
      }),
      'https://tradereceptionist.com/api/auth/google/callback',
    );
  });

  test('throws when nothing says where the callback lives', () => {
    assert.throws(
      () => resolveRedirectUri('google', {}),
      /Cannot derive the google redirect URI/,
    );
  });
});

describe('backendBaseUrl', () => {
  test('prefers PUBLIC_API_BASE_URL', () => {
    assert.equal(
      backendBaseUrl({
        PUBLIC_API_BASE_URL:      'https://first.example.com',
        RETELL_FUNCTION_BASE_URL: 'https://second.example.com',
        RETELL_WEBHOOK_URL:       'https://third.example.com/webhooks/retell',
      }),
      'https://first.example.com',
    );
  });

  test('falls back to RETELL_FUNCTION_BASE_URL, then the webhook origin', () => {
    assert.equal(
      backendBaseUrl({ RETELL_FUNCTION_BASE_URL: 'https://second.example.com' }),
      'https://second.example.com',
    );
    assert.equal(
      backendBaseUrl({ RETELL_WEBHOOK_URL: 'https://third.example.com/webhooks/retell' }),
      'https://third.example.com',
    );
  });

  test('strips a trailing slash', () => {
    assert.equal(
      backendBaseUrl({ PUBLIC_API_BASE_URL: 'https://api.example.com/' }),
      'https://api.example.com',
    );
  });

  test('returns null when the webhook URL is unparseable, rather than throwing', () => {
    assert.equal(backendBaseUrl({ RETELL_WEBHOOK_URL: 'not a url' }), null);
    assert.equal(backendBaseUrl({}), null);
  });
});

describe('trimEnv', () => {
  test('treats undefined, empty and whitespace alike as absent', () => {
    assert.equal(trimEnv(undefined), null);
    assert.equal(trimEnv(''), null);
    assert.equal(trimEnv('   '), null);
  });
});
