import { supabase } from './supabase';

/**
 * Persist the Google Calendar refresh token captured during a Supabase Google
 * OAuth sign-in.
 *
 * When a user signs in with Google (scope `…/auth/calendar`, `access_type=offline`),
 * the resulting Supabase session briefly carries `provider_token` and
 * `provider_refresh_token`. Those are only present on the first page load after the
 * OAuth redirect, so this must run on whichever page the user lands on post-login
 * (onboarding or dashboard).
 *
 * It hands the refresh token to the backend, which stores it against the client's
 * record and rebuilds the AI agent so calendar booking works. Calendar connection is
 * available on every plan — there is no plan gate here or on the server.
 *
 * Safe to call on any authenticated page load: it resolves to `false` (a no-op) when
 * there is no provider refresh token to capture, and never throws.
 */
export async function syncGoogleCalendarToken(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const providerRefreshToken = session.provider_refresh_token;
    if (!providerRefreshToken) return false;

    const res = await fetch('/api/auth/google/save-calendar-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: session.user?.email,
        providerToken: session.provider_token ?? undefined,
        providerRefreshToken,
      }),
    });

    const payload = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return res.ok && payload?.success === true;
  } catch {
    return false;
  }
}
