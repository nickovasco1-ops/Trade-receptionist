/**
 * Auth guards for the data plane.
 *
 * The server uses the Supabase **service-role** key, which bypasses RLS entirely
 * (§8.4). There is therefore no database-level backstop: any route that returns
 * or mutates tenant data must be gated here and scoped in application code.
 *
 * Two levels:
 *   requireAdmin — ops/provisioning surface. Cross-tenant reads, destructive
 *                  writes, and anything that spends money (Twilio numbers,
 *                  Retell agents). Gated on ADMIN_API_KEY via `x-admin-key`.
 *   requireUser  — dashboard surface. Verifies a Supabase JWT and puts the
 *                  caller's email on res.locals.ownerEmail so the handler can
 *                  scope its query. A valid admin key also satisfies this and
 *                  sets res.locals.isAdmin, which lifts per-tenant scoping.
 *
 * Handlers that take a :id client param should follow requireUser with
 * requireClientOwnership so one tenant cannot address another's row.
 */
import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';
import { logEvent } from '../lib/observability';
import type { ApiResponse } from '../../../shared/types';

export function bearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim() || null;
}

/**
 * True only when ADMIN_API_KEY is configured AND the request presents it.
 * An unset ADMIN_API_KEY must never authorise a request — it fails closed,
 * unlike the Stripe webhook secret (see the §10 landmine).
 */
export function hasAdminKey(req: Request): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  return Boolean(adminKey) && req.headers['x-admin-key'] === adminKey;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (hasAdminKey(req)) {
    res.locals.isAdmin = true;
    next();
    return;
  }
  logEvent('warn', 'auth.admin_denied', { path: req.path, method: req.method });
  res.status(401).json({ success: false, error: 'Unauthorised' } satisfies ApiResponse);
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (hasAdminKey(req)) {
    res.locals.isAdmin = true;
    next();
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Missing authentication token' } satisfies ApiResponse);
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  const ownerEmail = data.user?.email;
  if (error || !ownerEmail) {
    res.status(401).json({ success: false, error: 'Invalid authentication token' } satisfies ApiResponse);
    return;
  }

  res.locals.ownerEmail = ownerEmail.toLowerCase();
  res.locals.isAdmin = false;
  next();
}

/**
 * Confirms the client id in the route params belongs to the authenticated user.
 * Must run after requireUser. Admin callers pass through.
 */
export async function requireClientOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (res.locals.isAdmin) {
    next();
    return;
  }

  const ownerEmail = res.locals.ownerEmail as string | undefined;
  const clientId = req.params.id;
  if (!ownerEmail || !clientId) {
    res.status(401).json({ success: false, error: 'Unauthorised' } satisfies ApiResponse);
    return;
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('owner_email', ownerEmail)
    .maybeSingle();

  if (error || !data) {
    // 404 rather than 403 — do not confirm the existence of another tenant's row.
    logEvent('warn', 'auth.ownership_denied', { clientId: String(clientId), path: req.path });
    res.status(404).json({ success: false, error: 'Client not found' } satisfies ApiResponse);
    return;
  }

  next();
}

/** Client ids owned by the caller — used to scope list endpoints. */
export async function ownedClientIds(res: Response): Promise<string[]> {
  const ownerEmail = res.locals.ownerEmail as string | undefined;
  if (!ownerEmail) return [];
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('owner_email', ownerEmail);
  return (data ?? []).map((row) => (row as { id: string }).id);
}
