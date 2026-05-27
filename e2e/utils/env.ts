import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.resolve(repoRoot, '.env.test') });

function value(name: string, fallback?: string) {
  return process.env[name] || fallback || '';
}

export function requireEnv(name: string, raw = process.env[name]): string {
  if (!raw) {
    throw new Error(`[e2e env] Missing required environment variable: ${name}`);
  }
  return raw;
}

export const baseURL = value('TEST_BASE_URL', 'http://localhost:3000').replace(/\/$/, '');
export const apiBaseURL = value('TEST_API_BASE_URL', 'http://localhost:3001').replace(/\/$/, '');
export const testPhone = value('TEST_PHONE', '+447700900123');
export const testRunId = value('E2E_RUN_ID', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

export const supabaseUrl = value('SUPABASE_URL', process.env.VITE_SUPABASE_URL);
export const supabaseAnonKey = value('SUPABASE_ANON_KEY', process.env.VITE_SUPABASE_ANON_KEY);
export const supabaseServiceRoleKey = value('SUPABASE_SERVICE_ROLE_KEY');

export function validateE2EEnv() {
  requireEnv('SUPABASE_URL', supabaseUrl);
  requireEnv('SUPABASE_ANON_KEY', supabaseAnonKey);
  requireEnv('SUPABASE_SERVICE_ROLE_KEY', supabaseServiceRoleKey);
  return {
    baseURL,
    apiBaseURL,
    testPhone,
    testRunId,
  };
}

export function uniqueId(prefix = 'e2e') {
  return `${prefix}_${testRunId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}+${testRunId}-${Math.random().toString(36).slice(2, 10)}@tradereceptionist.test`;
}

export const requiredEnvStatus = [
  'TEST_BASE_URL',
  'TEST_API_BASE_URL',
  'TEST_PHONE',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_MODE',
  'E2E_TEST_MODE',
  'RETELL_API_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
].map((name) => ({
  name,
  status: process.env[name] ? 'present' : 'missing',
}));
