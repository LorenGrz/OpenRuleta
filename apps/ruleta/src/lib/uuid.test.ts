import assert from "node:assert/strict";
import { test } from "node:test";

import { isUuid } from "./uuid.ts";

test("isUuid: accepts a canonical lowercase UUID", () => {
  // Happy path: the exact shape participant ids come in (crypto.randomUUID).
  assert.equal(isUuid("3fa85f64-5717-4562-b3fc-2c963f66afa6"), true);
});

test("isUuid: accepts an uppercase UUID", () => {
  // Happy path: callers (or copy-paste) may send uppercase hex digits.
  assert.equal(isUuid("3FA85F64-5717-4562-B3FC-2C963F66AFA6"), true);
});

test("isUuid: rejects an empty string", () => {
  // Edge case: the route's own non-empty check runs first, but isUuid must
  // be correct standing alone.
  assert.equal(isUuid(""), false);
});

test("isUuid: rejects the right characters without the dash grouping", () => {
  // Edge case: a length/charset-only check would wrongly accept this.
  assert.equal(
    isUuid("3fa85f645717456 2b3fc2c963f66afa6".replace(" ", "")),
    false,
  );
});

test("isUuid: rejects a non-UUID id that used to 500 the notify route (M2)", () => {
  // Error case: Postgres throws 22P02 (invalid uuid syntax) on an id like
  // this; the route must reject it before ever reaching the database.
  assert.equal(isUuid("does-not-exist"), false);
});
