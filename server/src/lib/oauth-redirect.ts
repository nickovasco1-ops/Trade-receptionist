// Where a calendar provider sends the tenant back after consent.
//
// Pure and free of side-effecting imports so it can be unit-tested: the services
// that use it import the Supabase client, which throws at import time without
// credentials. Same reason stripe-signature.ts lives apart from its route.
//
// This logic had the precedence inverted — `derived ?? override` — so the explicit
// GOOGLE_REDIRECT_URI / MICROSOFT_REDIRECT_URI were dead code whenever
// PUBLIC_API_BASE_URL was set, which it is in production. Nothing caught it because
// derivation produced a URI that worked; it was simply not the one configured.

export type OAuthProvider = 'google' | 'microsoft';

/** Env this resolver reads. Passed in rather than read off process.env so it is testable. */
export interface RedirectEnv {
  GOOGLE_REDIRECT_URI?:    string | undefined;
  MICROSOFT_REDIRECT_URI?: string | undefined;
  PUBLIC_API_BASE_URL?:    string | undefined;
  RETELL_FUNCTION_BASE_URL?: string | undefined;
  RETELL_WEBHOOK_URL?:     string | undefined;
}

export function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, '') : null;
}

/** Canonical public origin of the backend, or null if nothing says what it is. */
export function backendBaseUrl(env: RedirectEnv): string | null {
  const explicit = trimEnv(env.PUBLIC_API_BASE_URL);
  if (explicit) return explicit;

  const retellFunctionBase = trimEnv(env.RETELL_FUNCTION_BASE_URL);
  if (retellFunctionBase) return retellFunctionBase;

  const webhookUrl = trimEnv(env.RETELL_WEBHOOK_URL);
  if (!webhookUrl) return null;

  try {
    return new URL(webhookUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Resolve the OAuth callback URL for a provider.
 *
 * The explicit override wins over the derived value. That ordering is load-bearing,
 * not a preference: Google's OAuth verification requires every authorised domain to
 * be one you can verify in Search Console, and `*.up.railway.app` is not. The
 * callback therefore has to be movable onto the owned domain — e.g.
 * `https://tradereceptionist.com/api/auth/google/callback`, which Vercel already
 * rewrites to the Railway backend — without relocating the backend itself.
 *
 * Throws rather than guessing: a wrong redirect URI is rejected by the provider with
 * an error the tenant sees, so failing at the point of misconfiguration is kinder.
 */
export function resolveRedirectUri(provider: OAuthProvider, env: RedirectEnv): string {
  const override = provider === 'google'
    ? trimEnv(env.GOOGLE_REDIRECT_URI)
    : trimEnv(env.MICROSOFT_REDIRECT_URI);

  if (override) return override;

  const base = backendBaseUrl(env);
  if (base) return `${base}/auth/${provider}/callback`;

  throw new Error(
    `Cannot derive the ${provider} redirect URI — set PUBLIC_API_BASE_URL or `
    + `${provider === 'google' ? 'GOOGLE' : 'MICROSOFT'}_REDIRECT_URI`,
  );
}
