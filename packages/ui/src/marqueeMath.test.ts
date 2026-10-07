import assert from "node:assert/strict";
import { test } from "node:test";

import { copiesNeeded, durationFor } from "./marqueeMath.ts";

test("copiesNeeded: real ruleta case (1480px container, 870px items) needs 2 copies", () => {
  assert.equal(copiesNeeded(1480, 870), 2);
});

test("copiesNeeded: items already wider than the container needs only 1 copy", () => {
  assert.equal(copiesNeeded(500, 800), 1);
});

test("copiesNeeded: exact fit still rounds up to cover the container", () => {
  assert.equal(copiesNeeded(900, 300), 3);
});

test("copiesNeeded: zero or negative items width falls back to 1 (avoids Infinity/NaN)", () => {
  assert.equal(copiesNeeded(1000, 0), 1);
  assert.equal(copiesNeeded(1000, -10), 1);
});

test("copiesNeeded: non-finite inputs fall back to 1", () => {
  assert.equal(copiesNeeded(NaN, 100), 1);
  assert.equal(copiesNeeded(1000, NaN), 1);
  assert.equal(copiesNeeded(Infinity, 100), 1);
});

test("durationFor: constant px/s speed scales with track width", () => {
  assert.equal(durationFor(1740, 40), 43.5);
  assert.equal(durationFor(3480, 40), 87);
});

test("durationFor: unmeasured track (0 width) has 0 duration", () => {
  assert.equal(durationFor(0, 40), 0);
});

test("durationFor: non-positive speed falls back to 1px/s instead of dividing by 0", () => {
  assert.equal(durationFor(100, 0), 100);
  assert.equal(durationFor(100, -5), 100);
});
