/**
 * Bounded retry for database writes. Only covers transient failures (dropped
 * network, Supabase 5xx, Postgres timeout / connection errors). It never
 * retries deterministic errors such as `23505` (duplicate): those must surface
 * on the first attempt so the route can answer 409.
 */

type MaybeError = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
};

/** SQLSTATE codes worth retrying. */
const RETRYABLE_PG_CODES = new Set([
  "57014", // statement_timeout / query cancelled
  "08000", // connection_exception
  "08003", // connection_does_not_exist
  "08006", // connection_failure
  "08P01", // protocol_violation
]);

/** SQLSTATE codes that are NEVER retried (deterministic). */
const TERMINAL_PG_CODES = new Set([
  "23505", // unique_violation (email already registered)
  "23514", // check_violation (doc_last3)
  "23502", // not_null_violation
  "22P02", // invalid_text_representation (bad uuid, etc.)
]);

/** PostgREST HTTP statuses worth a retry. */
const RETRYABLE_HTTP = new Set([429, 500, 502, 503, 504]);

const NETWORK_HINTS = [
  "fetch failed",
  "econnreset",
  "etimedout",
  "econnrefused",
  "und_err",
  "socket hang up",
  "network",
  "terminated",
];

export function isTransientDbError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const e = err as MaybeError;

  const code = typeof e.code === "string" ? e.code : "";
  if (TERMINAL_PG_CODES.has(code)) return false;
  if (RETRYABLE_PG_CODES.has(code)) return true;

  if (typeof e.status === "number" && RETRYABLE_HTTP.has(e.status)) return true;

  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return NETWORK_HINTS.some((hint) => message.includes(hint));
}

export type RetryOptions = {
  /** Total attempts (including the first). Default 3. */
  attempts?: number;
  /** Backoff base in ms. Default 100. */
  baseMs?: number;
  /** Backoff cap in ms. Default 1000. */
  capMs?: number;
  /** Decides whether an error is worth retrying. */
  isRetryable: (err: unknown) => boolean;
  /** Injectable for tests. Default: setTimeout. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable for tests. Default: Math.random. */
  random?: () => number;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn`, retrying while `isRetryable(err)` is true, with exponential
 * backoff and full jitter: `random(0, min(capMs, baseMs * 2**attempt))`.
 * Rethrows the last error once attempts are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseMs = options.baseMs ?? 100;
  const capMs = options.capMs ?? 1000;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLast = attempt === attempts - 1;
      if (isLast || !options.isRetryable(err)) throw err;
      const ceiling = Math.min(capMs, baseMs * 2 ** attempt);
      await sleep(random() * ceiling);
    }
  }
  throw lastError;
}
