# Release Smoke Tests

The release smoke suite is a lightweight, non-destructive Playwright check for a local or deployed Trade Receptionist environment.

It verifies:

- frontend document load
- login page load
- API `/health`
- unauthenticated dashboard redirect
- public routes render without browser runtime crashes

## Local

Start the app and API first with the same env shape as staging. In a normal local setup with `.env` present:

```bash
npm run dev
```

If `.env` is not present, start equivalent local services with `.env.test` or explicit `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `TEST_BASE_URL`, and `TEST_API_BASE_URL` values.

Then run:

```bash
npm run test:smoke
```

By default the smoke suite targets:

```text
TEST_BASE_URL=http://localhost:3000
TEST_API_BASE_URL=http://localhost:3001
```

## Staging

Point the suite at deployed staging URLs:

```bash
TEST_BASE_URL=https://staging.example.com \
TEST_API_BASE_URL=https://staging-api.example.com \
npm run test:smoke
```

Use the real staging frontend URL for `TEST_BASE_URL` and the real staging API origin for `TEST_API_BASE_URL`.

The smoke suite does not create Supabase users, write database records, complete hosted checkout, or call external providers.
