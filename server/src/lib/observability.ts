import type { Request } from 'express';
import * as Sentry from '@sentry/node';

type LogLevel = 'info' | 'warn' | 'error';
type SafeValue = string | number | boolean | null | undefined;
type SafeFields = Record<string, SafeValue>;

export function requestId(req: Request): string | undefined {
  const candidates = [
    req.headers['x-request-id'],
    req.headers['x-correlation-id'],
    req.headers['stripe-request-id'],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 120);
  }

  return undefined;
}

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/\s+/g, ' ').slice(0, 500);
}

/**
 * Structured log + Sentry capture for error-level events.
 *
 * - All levels → Railway structured JSON log
 * - level === 'error' → also sent to Sentry as a captureMessage so alerts fire
 *   (Sentry's Express error handler only catches unhandled exceptions — it misses
 *    caught-and-logged errors like notification failures and webhook drops)
 */
export function logEvent(level: LogLevel, event: string, fields: SafeFields = {}): void {
  const payload: SafeFields = {
    level,
    event,
    timestamp: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) payload[key] = value;
  }

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    // Forward to Sentry so alerts fire — no PII in the structured fields
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(event, {
        level: 'error',
        extra: fields as Record<string, unknown>,
      });
    }
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Capture an actual Error object to Sentry with context, then log it.
 * Use this in catch blocks where you have the original exception.
 */
export function captureError(event: string, error: unknown, fields: SafeFields = {}): void {
  logEvent('error', event, { ...fields, error: errorMessage(error) });
  if (process.env.SENTRY_DSN && error instanceof Error) {
    Sentry.withScope((scope) => {
      scope.setExtra('event', event);
      for (const [k, v] of Object.entries(fields)) scope.setExtra(k, v);
      Sentry.captureException(error);
    });
  }
}
