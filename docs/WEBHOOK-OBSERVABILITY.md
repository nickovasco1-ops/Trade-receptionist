# Webhook Observability

Trade Receptionist webhook routes use structured JSON logs with safe identifiers only.

Safe fields include:

- `event`
- `eventType`
- `requestId`
- `clientId`
- provider name
- coarse failure category
- short error message

Logs must not include:

- webhook signatures
- API tokens or secrets
- raw webhook bodies
- provider auth credentials
- customer phone numbers or email addresses

## Stripe

`POST /webhooks/stripe` acknowledges with `200` before parsing or processing. This preserves the existing behavior and avoids Stripe retry storms while the app records invalid signature, malformed payload, ignored event, DB persistence failure, provider failure, and lifecycle update outcomes in logs.

Invalid signatures and malformed payloads are logged as safe structured events, not raw payloads.

## Retell

`POST /webhooks/retell` returns `200` for invalid signatures and acknowledges valid signatures before async processing. This is intentional to avoid repeated provider retries and log spam for rejected or malformed events.

The route logs invalid signatures, malformed payloads, missing clients, DB persistence failures, lead upserts, and processed call events without logging raw call payloads.

## Provider Boundaries

Provider failures are logged by provider name only:

- `retell`
- `twilio`
- `google`
- `resend`
- `notion`
- `supabase_auth`

These logs are intended to make release debugging easier without changing webhook status-code behavior or exposing secrets.
