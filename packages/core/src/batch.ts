import { isTransientDbError, withRetry, type RetryOptions } from "./retry.ts";
import type { ParticipantInput } from "./types.ts";

/** Rows per query: keeps the `.in()` URL and the insert payload small. */
export const BATCH_SIZE = 100;

/** Upper bound of rows accepted by one import request. */
export const MAX_IMPORT_ROWS = 10_000;

export type BatchResult = { inserted: number; duplicates: number };

/** Minimal database surface the batch import needs (faked in tests). */
export type BatchDb = {
  /** Which of the (lowercased) `emails` are already registered. The real
   *  lookup is case-sensitive, so mixed-case rows can be missed; the unique
   *  index (23505 fallback) is the safety net. */
  existingEmails(emails: string[]): Promise<string[]>;
  /** Inserts new participants (won_at null). Throws on any DB error. */
  insert(rows: ParticipantInput[]): Promise<void>;
};

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

/**
 * Value of a PostgREST `in` filter: `("a","b")`. Every value is quoted with
 * `\` and `"` escaped, because postgrest-js' `.in()` does not escape them and
 * an email like `a,b"c@x.com` would produce an invalid filter.
 */
export function buildInFilter(values: readonly string[]): string {
  const quoted = values.map(
    (v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  );
  return `(${quoted.join(",")})`;
}

export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

/** Keeps the first row per email; `duplicates` counts the dropped ones. */
export function dedupeByEmail(inputs: readonly ParticipantInput[]): {
  unique: ParticipantInput[];
  duplicates: number;
} {
  const seen = new Set<string>();
  const unique: ParticipantInput[] = [];
  for (const input of inputs) {
    const key = emailKey(input.email);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(input);
  }
  return { unique, duplicates: inputs.length - unique.length };
}

/**
 * Inserts participants in chunks of {@link BATCH_SIZE}, skipping emails that
 * already exist (never overwrites, so a winner is never reset). Repeats inside
 * `inputs` (also across chunks) count as duplicates. If a chunk hits a unique
 * violation (a sign-up raced the import), that chunk is retried row by row:
 * 23505 adds to `duplicates`, any other error propagates. Transient errors are
 * retried with backoff.
 */
export async function insertParticipantsBatch(
  db: BatchDb,
  inputs: readonly ParticipantInput[],
  retry: Omit<RetryOptions, "isRetryable"> = {},
): Promise<BatchResult> {
  const options: RetryOptions = { ...retry, isRetryable: isTransientDbError };
  const { unique, duplicates: repeated } = dedupeByEmail(inputs);
  let inserted = 0;
  let duplicates = repeated;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const chunk = unique.slice(i, i + BATCH_SIZE);
    const existing = new Set(
      (
        await withRetry(
          () => db.existingEmails(chunk.map((c) => emailKey(c.email))),
          options,
        )
      ).map(emailKey),
    );
    const fresh = chunk.filter((c) => !existing.has(emailKey(c.email)));
    duplicates += chunk.length - fresh.length;
    if (fresh.length === 0) continue;

    try {
      await withRetry(() => db.insert(fresh), options);
      inserted += fresh.length;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      for (const row of fresh) {
        try {
          await withRetry(() => db.insert([row]), options);
          inserted++;
        } catch (rowErr) {
          if (!isUniqueViolation(rowErr)) throw rowErr;
          duplicates++;
        }
      }
    }
  }
  return { inserted, duplicates };
}
