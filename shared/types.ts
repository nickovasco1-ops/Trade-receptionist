// Canonical types — mirror the Supabase schema exactly.
// Used by both the frontend and backend.

// ── Enums ─────────────────────────────────────────────────────────────────────

export type Plan = 'starter' | 'pro' | 'business' | 'agency';
export type CallDirection = 'inbound' | 'outbound';
export type CallOutcome =
  | 'booked'
  | 'lead_captured'
  | 'enquiry'
  | 'spam'
  | 'voicemail'
  | 'transferred'
  | 'emergency'
  | 'no_answer';
export type LeadUrgency = 'routine' | 'urgent' | 'emergency';
export type LeadPropertyType = 'residential' | 'commercial' | 'unknown';
export type LeadStatus = 'new' | 'contacted' | 'booked' | 'lost' | 'spam' | 'flagged_for_review';
export type BookingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

// ── Tables ────────────────────────────────────────────────────────────────────

export type NumberMode = 'new_number' | 'keep_existing';

/** Mirrors the clients_subscription_status_check constraint. */
export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'canceled'
  | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';

/** Mirrors the clients_payment_status_check constraint. */
export type PaymentStatus = 'current' | 'failed' | 'canceled';

/**
 * Where a tenant keeps their diary. Mirrors clients_calendar_provider_check
 * (migration 019) — widening this union without widening that constraint fails
 * at INSERT time, not at compile time. See the 018 landmine in CLAUDE.md §10.
 *
 * `caldav` covers Apple iCloud and any other CalDAV server. Apple offers no
 * OAuth for calendar data at all, so it is the one provider that cannot be a
 * single tap: the tenant generates an app-specific password. Every vendor that
 * claims seamless iCloud sync does exactly this underneath.
 */
export type CalendarProvider = 'google' | 'microsoft' | 'caldav';

/** Mirrors clients_calendar_status_check (migration 019). */
export type CalendarStatus = 'none' | 'connected' | 'needs_reconnect';

export interface Client {
  id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  owner_mobile: string | null;
  retell_agent_id: string | null;
  twilio_number: string | null;
  own_number: string | null;
  // Google-specific columns, kept because the dashboard, tenant-integrity
  // checks and Notion sync all read them. Written in step with the generic
  // calendar_* columns below whenever the provider is Google.
  google_cal_id: string | null;
  google_refresh_token: string | null;
  // Provider-neutral calendar connection (migration 019). Prefer these: read
  // them through calendarConnection() in services/calendar rather than testing
  // a provider column directly, or the next provider gets missed at half the
  // call sites the way Google was the only one for months.
  calendar_provider: CalendarProvider | null;
  calendar_id: string | null;
  /** SECRET. Never select into the browser — see migration 019's RLS note. */
  calendar_credentials: string | null;
  calendar_status: CalendarStatus;
  calendar_last_error: string | null;
  calendar_connected_at: string | null;
  calendar_checked_at: string | null;
  plan: Plan;
  is_active: boolean;
  onboarding_complete: boolean;
  // Stripe lifecycle (migration 011). These existed in the DB but not on this
  // type, so server code touching them had to cast around the gap.
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus | null;
  payment_status: PaymentStatus | null;
  current_period_end: string | null;
  last_payment_at: string | null;
  last_payment_failed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Returned from POST /clients/provision and POST /clients/:id/assign-number.
// Extends Client with the computed divert activation code (not stored in DB).
export interface ClientProvisionResponse extends Client {
  number_mode: NumberMode;
  activation_code: string | null;
  activation_instructions: string | null;
}

export type ReceptionistTone = 'friendly' | 'professional' | 'efficient';

export interface BusinessConfig {
  id: string;
  client_id: string;
  receptionist_name: string;
  receptionist_tone: ReceptionistTone;
  after_hours_message: string | null;
  services: string[];
  service_areas: string[];
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  emergency_keywords: string[];
  business_hours_start: string | null; // "HH:MM" e.g. "08:00"
  business_hours_end: string | null;
  working_days: number[];              // 0 = Sun … 6 = Sat
  timezone: string;
  system_prompt_override: string | null;
  avg_job_value: number | null;           // £ used for missed revenue estimate
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  client_id: string;
  retell_call_id: string | null;
  caller_number: string | null;
  direction: CallDirection;
  duration_secs: number | null;
  outcome: CallOutcome | null;
  is_emergency: boolean;
  recording_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  call_id: string;
  full_text: string | null;
  summary: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  call_id: string | null;
  caller_name: string | null;
  caller_number: string | null;
  caller_email: string | null;
  postcode: string | null;
  job_type: string | null;
  urgency: LeadUrgency | null;
  property_type: LeadPropertyType | null;
  customer_availability: string | null;
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  lead_id: string | null;
  call_id: string | null;
  google_event_id: string | null;
  scheduled_at: string;
  job_type: string | null;
  address: string | null;
  status: BookingStatus;
  created_at: string;
}

// ── Insert DTOs (omit generated fields) ──────────────────────────────────────

export type ClientInsert = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type BusinessConfigInsert = Omit<BusinessConfig, 'id' | 'created_at' | 'updated_at'>;
export type CallInsert = Omit<Call, 'id' | 'created_at'>;
export type TranscriptInsert = Omit<Transcript, 'id' | 'created_at'>;
export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at'>;
export type BookingInsert = Omit<Booking, 'id' | 'created_at'>;

// ── API envelope ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

// ── Retell webhook payloads ───────────────────────────────────────────────────

export interface RetellCallStartedEvent {
  event: 'call_started';
  call_id: string;
  agent_id: string;
  from_number: string;
  to_number: string;
  metadata?: Record<string, unknown>;
}

export interface RetellCallEndedEvent {
  event: 'call_ended';
  call_id: string;
  agent_id: string;
  from_number: string;
  to_number: string;
  duration_ms: number;
  call_status: string;
  start_timestamp?: number;  // Unix ms
  end_timestamp?: number;    // Unix ms
  recording_url?: string;
  disconnection_reason?: string;
  transcript?: string;
  transcript_object?: Array<{
    role: 'agent' | 'user';
    content: string;
  }>;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
}

export interface RetellCallAnalyzedEvent {
  event: 'call_analyzed';
  call_id: string;
  agent_id: string;
  // Retell sometimes only attaches the recording + transcript to this later event,
  // so the call_analyzed handler reads them to backfill what call_ended may have missed.
  recording_url?: string;
  transcript?: string;
  call_analysis: {
    call_summary?: string;
    user_sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown';
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
}

export type RetellWebhookEvent =
  | RetellCallStartedEvent
  | RetellCallEndedEvent
  | RetellCallAnalyzedEvent;

// ── Google Calendar OAuth scopes ─────────────────────────────────────────────
//
// One list, because there are two places that ask Google for calendar access and
// they drifted:
//
//   1. `server/src/services/calendar-providers.ts` — the Diary connect flow.
//   2. `src/pages/LoginPage.tsx` — "Sign in with Google", whose returned token is
//      captured by `src/lib/calendar.ts` as the zero-tap calendar connection.
//
// The first was deliberately narrowed from `auth/calendar` (full read/write over
// every calendar the person owns) to these two. The second was missed and kept
// asking for the broad scope, so the login button requested far more access than
// the feature needs — and contradicted the "request minimum scopes" requirement in
// Google's own OAuth verification review.
//
// `calendar.freebusy` must stay: it is NOT covered by `calendar.events`, and
// dropping it breaks every availability check while still compiling.
export const GOOGLE_CALENDAR_SCOPES: readonly string[] = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

/** Space-delimited, the form both Google and Supabase's `signInWithOAuth` expect. */
export const GOOGLE_CALENDAR_SCOPE_STRING = GOOGLE_CALENDAR_SCOPES.join(' ');
