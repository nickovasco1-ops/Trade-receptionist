import { createClient } from '@supabase/supabase-js';
import { baseURL, requireEnv, supabaseServiceRoleKey, supabaseUrl, validateE2EEnv } from './env';

validateE2EEnv();

const url = () => requireEnv('SUPABASE_URL', supabaseUrl);
const key = () => requireEnv('SUPABASE_SERVICE_ROLE_KEY', supabaseServiceRoleKey);

export const supabaseAdminClient = createClient(url(), key(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function headers(extra?: Record<string, string>) {
  return {
    apikey: key(),
    Authorization: `Bearer ${key()}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/**
 * Transient failures worth retrying: a dropped connection (surfaces as
 * `TypeError: fetch failed`), a rate limit, or a 5xx. Playwright runs specs in
 * parallel against one Supabase project, so fixture seeding — especially the
 * 50-row calls dataset — intermittently lost its connection and failed a test
 * that passes in isolation. Retrying here fixes the whole suite rather than
 * papering over one spec.
 */
function isTransient(status: number): boolean {
  // Deliberately NOT 429. Retrying a rate limit makes it worse: the auth
  // endpoints throttle hard, and retrying there cascaded into suite-wide
  // timeouts. Only server-side faults are retried; a 429 fails fast.
  return status >= 500;
}

const RETRIES = 3;

export async function supabaseAdmin<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(`${url()}${path}`, {
        ...options,
        headers: headers(options.headers as Record<string, string> | undefined),
      });
    } catch (err: unknown) {
      // Connection-level failure only ("TypeError: fetch failed") — the actual
      // flake seen when parallel workers seed fixtures against one project.
      lastError = err;
      if (attempt === RETRIES) break;
      await new Promise((r) => setTimeout(r, attempt * 250));
      continue;
    }

    const text = await res.text();

    if (!res.ok) {
      if (isTransient(res.status) && attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 400));
        continue;
      }
      throw new Error(`[supabase-admin] ${options.method ?? 'GET'} ${path} failed: ${res.status} ${text}`);
    }

    return (text ? JSON.parse(text) : null) as T;
  }

  throw new Error(
    `[supabase-admin] ${options.method ?? 'GET'} ${path} failed after ${RETRIES} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function authAdmin<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return supabaseAdmin<T>(`/auth/v1/admin/${path}`, options);
}

export async function createConfirmedUser(
  email: string,
  userMetadata: Record<string, unknown> = {}
) {
  const body = {
    email,
    email_confirm: true,
    user_metadata: userMetadata,
  };

  try {
    return await authAdmin<{ id?: string; email?: string }>('users', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = String(error).toLowerCase();
    if (!message.includes('already') && !message.includes('registered') && !message.includes('exist')) {
      throw error;
    }
    return null;
  }
}

export async function magicLinkFor(email: string, redirectTo = `${baseURL}/dashboard`) {
  const link = await authAdmin<{ action_link?: string; properties?: { action_link?: string } }>('generate_link', {
    method: 'POST',
    body: JSON.stringify({
      type: 'magiclink',
      email,
    }),
  });

  const raw = link.action_link || link.properties?.action_link;
  if (!raw) throw new Error(`[supabase-admin] Missing magic-link URL for ${email}`);

  const verifyUrl = new URL(raw);
  verifyUrl.searchParams.set('redirect_to', redirectTo);
  return verifyUrl.toString();
}

export async function restInsert<T>(table: string, values: Record<string, unknown>): Promise<T> {
  const rows = await supabaseAdmin<T[]>(`/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(values),
  });
  return rows[0] as T;
}

export async function restPatch<T>(
  table: string,
  query: string,
  values: Record<string, unknown>
): Promise<T[]> {
  return supabaseAdmin<T[]>(`/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(values),
  });
}

export async function restGet<T>(table: string, query: string): Promise<T[]> {
  return supabaseAdmin<T[]>(`/rest/v1/${table}?${query}`, {
    headers: {
      Prefer: 'return=representation',
    },
  });
}

export async function restDelete(table: string, query: string) {
  await supabaseAdmin(`/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal',
    },
  });
}

export async function tableHasColumn(table: string, column: string) {
  try {
    await restGet(table, `select=${column}&limit=1`);
    return true;
  } catch (error) {
    if (String(error).includes(column)) return false;
    throw error;
  }
}

export async function listAuthUsers() {
  const page = await authAdmin<{ users?: Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }> }>(
    'users?page=1&per_page=200'
  );
  return page.users ?? [];
}

export async function deleteAuthUserByEmail(email: string) {
  const user = (await listAuthUsers()).find((candidate) => candidate.email === email);
  if (!user) return;

  await authAdmin(`users/${user.id}`, {
    method: 'DELETE',
  });
}
