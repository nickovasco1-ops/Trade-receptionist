export async function pollUntil<T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
  description: string,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const intervalMs = options.intervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;
  let last: T;

  do {
    last = await read();
    if (predicate(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  } while (Date.now() < deadline);

  throw new Error(`[e2e polling] Timed out waiting for ${description}`);
}
