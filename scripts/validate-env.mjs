#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const VALID_ENVS = new Set(['local', 'test', 'staging', 'production']);

function argValue(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const target = argValue('--env') || process.env.APP_ENV || process.env.NODE_ENV || 'local';
if (!VALID_ENVS.has(target)) {
  console.error(`[env] Unknown environment "${target}". Use one of: ${Array.from(VALID_ENVS).join(', ')}`);
  process.exit(2);
}

const explicitEnvFile = argValue('--env-file');
const defaultEnvFile = target === 'test' ? '.env.test' : target === 'local' ? '.env' : `.env.${target}`;
const envFile = explicitEnvFile || defaultEnvFile;
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}

function rawValue(name) {
  return process.env[name]?.trim() || '';
}

function effectiveValue(name) {
  const raw = rawValue(name);
  if (raw) return raw;

  if (target === 'test') {
    if (name === 'VITE_SUPABASE_URL') return rawValue('SUPABASE_URL');
    if (name === 'VITE_SUPABASE_ANON_KEY') return rawValue('SUPABASE_ANON_KEY');
    if (name === 'TEST_BASE_URL') return 'http://localhost:3000';
    if (name === 'TEST_API_BASE_URL') return 'http://localhost:3001';
  }

  return '';
}

function has(name) {
  return Boolean(effectiveValue(name));
}

function value(name) {
  return effectiveValue(name);
}

function isUrl(name) {
  if (!has(name)) return false;
  try {
    const parsed = new URL(value(name));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function rule(name, service, requiredBy, note, check = has) {
  return { name, service, requiredBy, note, check };
}

const runtimeRequired = [
  rule('VITE_SUPABASE_URL', 'Supabase frontend', ['local', 'test', 'staging', 'production'], 'Required by the Vite app.', isUrl),
  rule('VITE_SUPABASE_ANON_KEY', 'Supabase frontend', ['local', 'test', 'staging', 'production'], 'Required by the Vite app.'),
  rule('SUPABASE_URL', 'Supabase backend', ['local', 'test', 'staging', 'production'], 'Required by the API service.', isUrl),
  rule('SUPABASE_SERVICE_ROLE_KEY', 'Supabase backend', ['local', 'test', 'staging', 'production'], 'Required by the API service and server-side Supabase writes.'),
  rule('RETELL_API_KEY', 'Retell', ['local', 'staging', 'production'], 'Required by API boot and Retell webhook HMAC verification.'),
  rule('TWILIO_ACCOUNT_SID', 'Twilio', ['local', 'staging', 'production'], 'Required by API boot and Twilio provisioning/import.'),
  rule('TWILIO_AUTH_TOKEN', 'Twilio', ['local', 'staging', 'production'], 'Required by API boot and Twilio provisioning/import.'),
  rule('TEST_BASE_URL', 'Test runner', ['test'], 'Required for Playwright E2E/smoke targets.', isUrl),
  rule('TEST_API_BASE_URL', 'Test runner', ['test'], 'Required for Playwright E2E/smoke API target.', isUrl),
];

const releaseRequired = [
  rule('STRIPE_SECRET_KEY', 'Stripe', ['staging', 'production'], 'Required for checkout provisioning and lifecycle lookups.'),
  rule('STRIPE_WEBHOOK_SECRET', 'Stripe', ['staging', 'production'], 'Required to verify Stripe webhook signatures.'),
  rule('GOOGLE_CLIENT_ID', 'Google OAuth', ['staging', 'production'], 'Required for Calendar OAuth connection.'),
  rule('GOOGLE_CLIENT_SECRET', 'Google OAuth', ['staging', 'production'], 'Required for Calendar OAuth callback token exchange.'),
  rule('GOOGLE_OAUTH_SUCCESS_URL', 'Google OAuth', ['production'], 'Recommended production redirect after calendar connection.', isUrl),
  rule('RESEND_API_KEY', 'Resend', ['staging', 'production'], 'Required for welcome, booking, and post-call emails.'),
];

const optional = [
  rule('PORT', 'API', ['local', 'test', 'staging', 'production'], 'Optional; defaults to 3001.'),
  rule('CORS_ORIGINS', 'API', ['local', 'test', 'staging', 'production'], 'Optional locally; recommended in deployed environments.'),
  rule('PUBLIC_API_BASE_URL', 'API public URL', ['staging', 'production'], 'Optional if RETELL_WEBHOOK_URL or RETELL_FUNCTION_BASE_URL can derive the public backend URL.', isUrl),
  rule('RETELL_WEBHOOK_URL', 'Retell', ['staging', 'production'], 'Optional in code but required in Retell dashboard/config for live call events.', isUrl),
  rule('RETELL_FUNCTION_BASE_URL', 'Retell', ['staging', 'production'], 'Optional; custom tool base URL can be derived from PUBLIC_API_BASE_URL or RETELL_WEBHOOK_URL.', isUrl),
  rule('TWILIO_ADDRESS_SID', 'Twilio', ['staging', 'production'], 'Optional in code; required only for UK number purchase flows that need regulatory address data.'),
  rule('TWILIO_BUNDLE_SID', 'Twilio', ['staging', 'production'], 'Optional in code; required only for UK number purchase flows that need regulatory bundle data.'),
  rule('GOOGLE_REDIRECT_URI', 'Google OAuth', ['local', 'test', 'staging', 'production'], 'Optional; derived from PUBLIC_API_BASE_URL, RETELL_FUNCTION_BASE_URL, or RETELL_WEBHOOK_URL when absent.', isUrl),
  rule('GOOGLE_OAUTH_STATE_SECRET', 'Google OAuth', ['local', 'test', 'staging', 'production'], 'Optional; falls back to SUPABASE_SERVICE_ROLE_KEY.'),
  rule('RESEND_FROM_EMAIL', 'Resend', ['local', 'test', 'staging', 'production'], 'Optional; defaults to hello@tradereceptionist.com.'),
  rule('NOTION_API_KEY', 'Notion', ['local', 'test', 'staging', 'production'], 'Optional; Notion logging silently no-ops when absent.'),
  rule('NOTION_CALL_LOG_DB_ID', 'Notion', ['local', 'test', 'staging', 'production'], 'Optional; used only when NOTION_API_KEY is present.'),
  rule('NOTION_SUBSCRIBERS_DB_ID', 'Notion', ['local', 'test', 'staging', 'production'], 'Optional; used only when NOTION_API_KEY is present.'),
  rule('NOTION_INCIDENTS_DB_ID', 'Notion', ['local', 'test', 'staging', 'production'], 'Optional; used only when NOTION_API_KEY is present.'),
  rule('SENTRY_AUTH_TOKEN', 'Sentry', ['staging', 'production'], 'Optional; enables source-map upload at build time.'),
  rule('SITE_URL', 'Stripe', ['staging', 'production'], 'Optional; Stripe welcome/login links default to https://tradereceptionist.com.', isUrl),
];

function applies(ruleDef) {
  return ruleDef.requiredBy.includes(target);
}

function statusFor(ruleDef) {
  if (!has(ruleDef.name)) return 'missing';
  return ruleDef.check(ruleDef.name) ? 'present' : 'invalid';
}

const required = [...runtimeRequired, ...releaseRequired].filter(applies);
const optionalForEnv = optional.filter(applies);
const missing = [];
const invalid = [];

console.log(`[env] Validating ${target} environment`);
console.log(`[env] Env file: ${fs.existsSync(envPath) ? envFile : `${envFile} (not found; using process env only)`}`);
console.log('[env] Secret values are never printed.');
console.log('');

console.log('Required');
for (const item of required) {
  const status = statusFor(item);
  if (status === 'missing') missing.push(item);
  if (status === 'invalid') invalid.push(item);
  console.log(`- ${item.name}: ${status} (${item.service})`);
}

console.log('');
console.log('Optional');
for (const item of optionalForEnv) {
  console.log(`- ${item.name}: ${statusFor(item)} (${item.service})`);
}

const warnings = [];
if (target === 'production' && value('VITE_STRIPE_MODE') === 'test') {
  warnings.push('VITE_STRIPE_MODE is "test" in production; production should use live Stripe links.');
}
if (target === 'staging' && value('VITE_STRIPE_MODE') !== 'test') {
  warnings.push('VITE_STRIPE_MODE is not "test" in staging; confirm this staging environment is intentionally using live Stripe links.');
}
if (has('NOTION_API_KEY')) {
  for (const db of ['NOTION_CALL_LOG_DB_ID', 'NOTION_SUBSCRIBERS_DB_ID', 'NOTION_INCIDENTS_DB_ID']) {
    if (!has(db)) warnings.push(`${db} is missing while NOTION_API_KEY is present; that Notion log path will no-op.`);
  }
}
if (['staging', 'production'].includes(target) && !has('PUBLIC_API_BASE_URL') && !has('RETELL_WEBHOOK_URL') && !has('RETELL_FUNCTION_BASE_URL')) {
  warnings.push('No PUBLIC_API_BASE_URL, RETELL_WEBHOOK_URL, or RETELL_FUNCTION_BASE_URL is set; Google redirect/custom tool URLs may not derive correctly.');
}

if (warnings.length > 0) {
  console.log('');
  console.log('Warnings');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (missing.length || invalid.length) {
  console.log('');
  if (missing.length) {
    console.log('Missing required variables');
    for (const item of missing) console.log(`- ${item.name}: ${item.note}`);
  }
  if (invalid.length) {
    console.log('Invalid required variables');
    for (const item of invalid) console.log(`- ${item.name}: expected a valid value. ${item.note}`);
  }
  process.exit(1);
}

console.log('');
console.log(`[env] ${target} environment validation passed.`);
