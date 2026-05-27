import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const testBaseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const testApiBaseURL = process.env.TEST_API_BASE_URL || 'http://localhost:3001';
const webPort = new URL(testBaseURL).port || (testBaseURL.startsWith('https:') ? '443' : '80');
const apiPort = new URL(testApiBaseURL).port || (testApiBaseURL.startsWith('https:') ? '443' : '80');

process.env.TEST_BASE_URL = testBaseURL;
process.env.TEST_API_BASE_URL = testApiBaseURL;
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
process.env.VITE_STRIPE_MODE = 'test';
process.env.E2E_TEST_MODE = 'true';
process.env.RETELL_API_KEY ||= 'e2e-retell-api-key';
process.env.TWILIO_ACCOUNT_SID ||= 'AC00000000000000000000000000000000';
process.env.TWILIO_AUTH_TOKEN ||= 'e2e-twilio-auth-token';
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_e2e_fixture_secret';

const e2eEnv = {
  ...process.env,
  TEST_BASE_URL: testBaseURL,
  TEST_API_BASE_URL: testApiBaseURL,
  PORT: apiPort,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  VITE_STRIPE_MODE: 'test',
  E2E_TEST_MODE: 'true',
  RETELL_API_KEY: process.env.RETELL_API_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  CORS_ORIGINS: testBaseURL,
};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  globalTeardown: './e2e/global-teardown.ts',
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: testBaseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `npm run dev:web -- --host 0.0.0.0 --port ${webPort}`,
      url: testBaseURL,
      env: e2eEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'cd server && ./node_modules/.bin/tsx --env-file=../.env.test src/index.ts',
      url: `${testApiBaseURL}/health`,
      env: e2eEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: [/.*\.setup\.ts/, /mobile\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile',
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices['iPhone SE'],
        browserName: 'chromium',
      },
    },
  ],
});
