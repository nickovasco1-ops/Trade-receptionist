// Canonical types — mirror the Supabase schema exactly.
// Used by both the frontend and backend.

// ── Enums ─────────────────────────────────────────────────────────────────────

export type Plan = 'starter' | 'pro' | 'agency';
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
export type LeadStatus = 'new' | 'contacted' | 'booked' | 'lost' | 'spam';
export type BookingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

// ── Tables ────────────────────────────────────────────────────────────────────

export type NumberMode = 'new_number' | 'keep_existing';

export interface Client {
  id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  owner_mobile: string | null;
  retell_agent_id: string | null;
  twilio_number: string | null;
  own_number: string | null;
  google_cal_id: string | null;
  google_refresh_token: string | null;
  plan: Plan;
  is_active: boolean;
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

export interface BusinessConfig {
  id: string;
  client_id: string;
  receptionist_name: string;
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
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  lead_id: string | null;
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
