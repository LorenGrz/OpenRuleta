import assert from "node:assert/strict";
import { test } from "node:test";

import { createId } from "./id.ts";

test("createId: uses randomUUID when present", () => {
  assert.equal(createId({ randomUUID: () => "fixed" }), "fixed");
});

test("createId: builds a v4 UUID from getRandomValues", () => {
  const id = createId({
    getRandomValues: (a) => {
      new Uint8Array(a.buffer).fill(255);
      return a;
    },
  });
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("createId: without crypto still yields distinct ids", () => {
  const ids = new Set([createId(), createId(), createId(undefined)]);
  assert.equal(ids.size, 3);
});
