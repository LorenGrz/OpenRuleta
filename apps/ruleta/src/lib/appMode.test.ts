import assert from "node:assert/strict";
import { test } from "node:test";

import { isAppMode } from "./appMode.ts";

test("isAppMode: accepts the known modes only", () => {
  assert.equal(isAppMode("raffle"), true);
  assert.equal(isAppMode("prizeWheel"), true);
  assert.equal(isAppMode("slot"), false);
  assert.equal(isAppMode(null), false);
});
