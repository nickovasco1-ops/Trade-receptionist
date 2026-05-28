import type { Request } from 'express';

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
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
