import { testRunId, uniqueEmail } from './env';
import {
  createConfirmedUser as createConfirmedSupabaseUser,
  deleteAuthUserByEmail,
  listAuthUsers,
} from './supabase-admin';

export interface TestUser {
  email: string;
}

export function testUserMetadata(extra: Record<string, unknown> = {}) {
  return {
    e2e: true,
    e2e_run_id: testRunId,
    created_by: 'playwright',
    ...extra,
  };
}

export function generateTestEmail(prefix = 'user') {
  return uniqueEmail(prefix);
}

export async function createConfirmedTestUser(email = generateTestEmail(), metadata = {}) {
  await createConfirmedSupabaseUser(email, testUserMetadata(metadata));
  return { email };
}

export async function deleteTestUser(email: string) {
  await deleteAuthUserByEmail(email);
}

export async function listTestUsersForRun(runId = testRunId) {
  return (await listAuthUsers()).filter((user) =>
    user.email?.includes(`+${runId}-`) || user.user_metadata?.e2e_run_id === runId
  );
}
