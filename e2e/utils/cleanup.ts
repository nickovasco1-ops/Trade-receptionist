import { testRunId } from './env';
import { restDelete, restGet } from './supabase-admin';
import { deleteTestUser, listTestUsersForRun } from './test-users';

export async function cleanupClientDataByEmail(email: string) {
  const rows = await restGet<{ id: string }>('clients', `owner_email=eq.${encodeURIComponent(email)}&select=id`).catch(() => []);
  await Promise.all(rows.map((row) => restDelete('clients', `id=eq.${row.id}`).catch(() => undefined)));
}

export async function cleanupTestUserAndData(email: string) {
  await cleanupClientDataByEmail(email);
  await deleteTestUser(email).catch(() => undefined);
}

export async function cleanupByTestRunId(runId = testRunId) {
  const users = await listTestUsersForRun(runId).catch(() => []);
  await Promise.all(
    users
      .filter((user): user is { id: string; email: string } => Boolean(user.email && user.id))
      .map((user) => cleanupTestUserAndData(user.email))
  );
}
