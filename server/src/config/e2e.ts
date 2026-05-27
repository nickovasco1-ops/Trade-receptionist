export function isE2ETestMode() {
  return process.env.E2E_TEST_MODE === 'true';
}

export function applyE2ETestProviderEnv() {
  if (!isE2ETestMode()) return;

  process.env.RETELL_API_KEY ||= 'e2e-retell-api-key';
  process.env.TWILIO_ACCOUNT_SID ||= 'AC00000000000000000000000000000000';
  process.env.TWILIO_AUTH_TOKEN ||= 'e2e-twilio-auth-token';
}
