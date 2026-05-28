import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const testBaseURL = (process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const testApiBaseURL = (process.env.TEST_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

process.env.TEST_BASE_URL = testBaseURL;
process.env.TEST_API_BASE_URL = testApiBaseURL;

export default defineConfig({
  testDir: './e2e',
  testMatch: /release-smoke\.spec\.ts/,
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: testBaseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'release-smoke',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
