import { createClient } from '@supabase/supabase-js';
import type {
  Client, BusinessConfig, Call, Transcript, Lead, Booking,
} from '../../../shared/types';

// Type map so callers get typed results from supabase.from('table')
export interface Database {
  clients:         Client;
  business_config: BusinessConfig;
  calls:           Call;
  transcripts:     Transcript;
  leads:           Lead;
  bookings:        Booking;
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
