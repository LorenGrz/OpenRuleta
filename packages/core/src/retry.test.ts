import assert from "node:assert/strict";
import { test } from "node:test";

import { isTransientDbError, withRetry } from "./retry.ts";

const noSleep = (): Promise<void> => Promise.resolve();

test("retries a transient error and eventually resolves", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw { status: 503, message: "Service Unavailable" };
      return "ok";
    },
    { isRetryable: isTransientDbError, sleep: noSleep, random: () => 0 },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("does not retry a 23505: rejects on the first attempt", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls++;
        throw { code: "23505", message: "duplicate key value" };
      },
      { isRetryable: isTransientDbError, sleep: noSleep, random: () => 0 },
    ),
    (err: unknown) => (err as { code?: string }).code === "23505",
  );
  assert.equal(calls, 1);
});

test("exhausts attempts and rethrows the last error", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls++;
        throw { message: "fetch failed" };
      },
      {
        attempts: 3,
        isRetryable: isTransientDbError,
        sleep: noSleep,
        random: () => 0,
      },
    ),
    (err: unknown) => (err as { message?: string }).message === "fetch failed",
  );
  assert.equal(calls, 3);
});

test("isTransientDbError: classifies edge cases", () => {
  // Transient
  assert.equal(isTransientDbError({ code: "57014" }), true);
  assert.equal(isTransientDbError({ code: "08006" }), true);
  assert.equal(isTransientDbError({ status: 429 }), true);
  assert.equal(
    isTransientDbError({ message: "TypeError: fetch failed" }),
    true,
  );
  assert.equal(isTransientDbError({ message: "read ECONNRESET" }), true);
  // Terminal
  assert.equal(isTransientDbError({ code: "23505" }), false);
  assert.equal(isTransientDbError({ code: "23514" }), false);
  assert.equal(isTransientDbError({ status: 422 }), false);
  assert.equal(isTransientDbError(new Error("boom")), false);
  assert.equal(isTransientDbError(null), false);
  assert.equal(isTransientDbError(undefined), false);
});

test("jitter respects the ceiling min(capMs, baseMs * 2**attempt)", async () => {
  const delays: number[] = [];
  const recordingSleep = (ms: number): Promise<void> => {
    delays.push(ms);
    return Promise.resolve();
  };
  await assert.rejects(
    withRetry(
      async () => {
        throw { status: 503 };
      },
      {
        attempts: 4,
        baseMs: 100,
        capMs: 1000,
        isRetryable: isTransientDbError,
        sleep: recordingSleep,
        random: () => 1, // jitter at max
      },
    ),
  );
  // 3 waits between 4 attempts: 100, 200, 400 (all < capMs).
  assert.deepEqual(delays, [100, 200, 400]);
});
