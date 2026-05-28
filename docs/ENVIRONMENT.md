# Environment Validation

Run the pre-release environment validator before staging or production deploys:

```bash
npm run validate:env -- --env=staging
npm run validate:env -- --env=production
```

The script reports only whether variables are present or invalid. It never prints secret values.

You can validate another env file explicitly:

```bash
npm run validate:env -- --env=staging --env-file=.env.staging
```

Supported environments are `local`, `test`, `staging`, and `production`.

## Required By Environment

| Variable | Local | Test | Staging | Production | Notes |
|---|---:|---:|---:|---:|---|
| `VITE_SUPABASE_URL` | Required | Required | Required | Required | Browser Supabase URL. |
| `VITE_SUPABASE_ANON_KEY` | Required | Required | Required | Required | Browser Supabase anon key. |
| `SUPABASE_URL` | Required | Required | Required | Required | API Supabase URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required | Required | Required | Required | Server-side only. Do not expose to Vite. |
| `RETELL_API_KEY` | Required | E2E fake allowed | Required | Required | API boot and Retell webhook verification. |
| `TWILIO_ACCOUNT_SID` | Required | E2E fake allowed | Required | Required | API boot and Twilio integration. |
| `TWILIO_AUTH_TOKEN` | Required | E2E fake allowed | Required | Required | API boot and Twilio integration. |
| `TEST_BASE_URL` | Optional | Required | Optional | Optional | Test runner target; defaults to `http://localhost:3000` in Playwright. |
| `TEST_API_BASE_URL` | Optional | Required | Optional | Optional | Test runner API target; defaults to `http://localhost:3001` in Playwright. |
| `STRIPE_SECRET_KEY` | Optional | Optional | Required | Required | Checkout provisioning and lifecycle lookups. |
| `STRIPE_WEBHOOK_SECRET` | Optional | Optional | Required | Required | Stripe webhook signature verification. |
| `GOOGLE_CLIENT_ID` | Optional | Optional | Required | Required | Calendar OAuth. |
| `GOOGLE_CLIENT_SECRET` | Optional | Optional | Required | Required | Calendar OAuth token exchange. |
| `GOOGLE_OAUTH_SUCCESS_URL` | Optional | Optional | Optional | Required | Production redirect after Google OAuth. |
| `RESEND_API_KEY` | Optional | Optional | Required | Required | Transactional email. |

## Optional Services

| Variable | Service | Current behavior |
|---|---|---|
| `NOTION_API_KEY` | Notion | Optional. Logging no-ops when absent. |
| `NOTION_CALL_LOG_DB_ID` | Notion | Optional unless `NOTION_API_KEY` is present and call logging is wanted. |
| `NOTION_SUBSCRIBERS_DB_ID` | Notion | Optional unless `NOTION_API_KEY` is present and subscriber logging is wanted. |
| `NOTION_INCIDENTS_DB_ID` | Notion | Optional unless `NOTION_API_KEY` is present and incident logging is wanted. |
| `RESEND_FROM_EMAIL` | Resend | Optional. Defaults to `hello@tradereceptionist.com`. |
| `GOOGLE_REDIRECT_URI` | Google OAuth | Optional. Derived from `PUBLIC_API_BASE_URL`, `RETELL_FUNCTION_BASE_URL`, or `RETELL_WEBHOOK_URL`. |
| `GOOGLE_OAUTH_STATE_SECRET` | Google OAuth | Optional. Falls back to `SUPABASE_SERVICE_ROLE_KEY`. |
| `PUBLIC_API_BASE_URL` | API | Optional in code, recommended for deployed environments. |
| `RETELL_WEBHOOK_URL` | Retell | Optional in code, required in Retell dashboard/config for live webhook delivery. |
| `RETELL_FUNCTION_BASE_URL` | Retell | Optional. Used for Retell custom tool URLs. |
| `TWILIO_ADDRESS_SID` | Twilio | Optional in code; needed for some UK number purchase flows. |
| `TWILIO_BUNDLE_SID` | Twilio | Optional in code; needed for some UK number purchase flows. |
| `SENTRY_AUTH_TOKEN` | Sentry | Optional. Enables source-map upload during build. |
| `SITE_URL` | Stripe | Optional. Defaults to `https://tradereceptionist.com`. |

## Stripe Mode

`VITE_STRIPE_MODE=test` forces frontend Payment Links to Stripe test links.

- Staging should normally use `VITE_STRIPE_MODE=test`.
- Production should not use `VITE_STRIPE_MODE=test`; leaving it unset uses live links.

## Safety

The validator is a standalone pre-release check. It does not change runtime production behavior, does not call provider APIs, and does not print secrets.

For `--env=test`, the validator mirrors Playwright behavior: `VITE_SUPABASE_URL` may be satisfied by `SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` may be satisfied by `SUPABASE_ANON_KEY`, and test URLs may use the Playwright defaults.
