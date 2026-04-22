import { sendWhatsApp } from '../services/twilio';
import { sendEmail } from '../services/resend';
import type { Client, Call } from '../../../shared/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmergencyLevel = 'none' | 'urgent' | 'high' | 'critical';

// ── Keyword sets ──────────────────────────────────────────────────────────────

/**
 * Base set of emergency phrases used by default for all trade businesses.
 * Append config.emergency_keywords to extend per client.
 */
export const BASE_EMERGENCY_KEYWORDS: readonly string[] = [
  // Critical — life safety / 999 territory
  'gas leak', 'gas smell', 'smell of gas',
  'carbon monoxide', 'co alarm', 'co detector',
  'electrocution', 'electrical fire', 'house fire', 'on fire',
  'structural collapse', 'roof collapsed', 'ceiling collapsed',
  'person trapped', 'trapped inside',
  // High — immediate trade emergency
  'flooding', 'flood', 'water everywhere', 'water pouring', 'water gushing',
  'burst pipe', 'pipe burst', 'burst water main',
  'no power', 'power cut', 'power out', 'blackout', 'total power loss',
  'sparking', 'sparks flying', 'exposed wire', 'electric shock', 'got a shock',
  'no heating',
] as const;

// Critical: immediate danger to life — advise 999 and/or specialist emergency line
const CRITICAL_KEYWORDS: readonly string[] = [
  'gas leak', 'gas smell', 'smell of gas',
  'carbon monoxide', 'co alarm', 'co detector',
  'electrocution', 'electrical fire', 'house fire', 'on fire',
  'structural collapse', 'roof collapsed', 'ceiling collapsed',
  'person trapped', 'trapped inside',
];

// High: major property damage risk or complete loss of essential service — call back immediately
const HIGH_KEYWORDS: readonly string[] = [
  'flooding', 'flood', 'water everywhere', 'water pouring', 'water gushing',
  'burst pipe', 'pipe burst', 'burst water main',
  'no power', 'power cut', 'power out', 'blackout', 'total power loss',
  'sparking', 'sparks flying', 'exposed wire', 'electric shock', 'got a shock',
  'no heating',
];

// Urgent: significant inconvenience or escalation risk — same-day response expected
const URGENT_KEYWORDS: readonly string[] = [
  'boiler broken', 'boiler not working', 'boiler dead', 'boiler failure',
  'no hot water',
  'water leak', 'slow leak', 'dripping pipe', 'damp patch',
  'blocked drain', 'drain blocked', 'toilet blocked', 'overflowing toilet',
  'tripped circuit', 'fuse box tripped', 'rcd tripped',
  'partial power', 'lights out',
];

// ── Core functions ────────────────────────────────────────────────────────────

function containsAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Returns true if the transcript matches any emergency keyword.
 * Pass config.emergency_keywords as customKeywords to extend the base set.
 */
export function detectEmergency(
  transcript: string,
  customKeywords: readonly string[] = [],
): boolean {
  const all = customKeywords.length
    ? ([...BASE_EMERGENCY_KEYWORDS, ...customKeywords] as readonly string[])
    : BASE_EMERGENCY_KEYWORDS;
  const lower = transcript.toLowerCase();
  return all.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Returns the highest matched emergency level for a transcript.
 * Checks critical → high → urgent in priority order.
 */
export function getEmergencyLevel(transcript: string): EmergencyLevel {
  if (containsAny(transcript, CRITICAL_KEYWORDS)) return 'critical';
  if (containsAny(transcript, HIGH_KEYWORDS))     return 'high';
  if (containsAny(transcript, URGENT_KEYWORDS))   return 'urgent';
  return 'none';
}

// ── Escalation ────────────────────────────────────────────────────────────────

export async function escalateEmergency(
  client: Client,
  call: Call,
  summary?: string,
): Promise<void> {
  const caller  = call.caller_number ?? 'Unknown number';
  const level   = summary ? getEmergencyLevel(summary) : 'high';
  const tag     = level === 'critical' ? 'CRITICAL EMERGENCY' : 'EMERGENCY';
  const body    = summary ?? 'Emergency call — no summary available';
  const action  = level === 'critical'
    ? 'IMMEDIATE ACTION REQUIRED. Call back now or contact emergency services.'
    : 'Please call back as soon as possible.';

  const message = [
    `${tag} — Trade Receptionist`,
    `Caller: ${caller}`,
    '',
    body,
    '',
    action,
  ].join('\n');

  const tasks: Promise<unknown>[] = [];

  if (client.owner_mobile) {
    tasks.push(
      sendWhatsApp(client.owner_mobile, message).catch((err: unknown) => {
        console.error('[emergency] WhatsApp failed', err);
      }),
    );
  }

  tasks.push(
    sendEmail({
      to:      client.owner_email,
      subject: `${tag}: Call from ${caller}`,
      html:    `<pre style="font-family:sans-serif;white-space:pre-wrap;color:#1a1a1a">${message}</pre>`,
    }).catch((err: unknown) => {
      console.error('[emergency] email failed', err);
    }),
  );

  await Promise.all(tasks);
}
