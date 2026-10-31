import assert from "node:assert/strict";
import { test } from "node:test";

import { pickSegmentFill } from "./wheelFills.ts";

const three = ["A", "B", "C"];

test("pickSegmentFill: alternates the first two fills for an even count", () => {
  const got = [0, 1, 2, 3].map((i) => pickSegmentFill(i, 4, three));
  assert.deepEqual(got, ["A", "B", "A", "B"]);
});

test("pickSegmentFill: odd count uses the third fill only on the last segment", () => {
  const got = [0, 1, 2, 3, 4].map((i) => pickSegmentFill(i, 5, three));
  assert.deepEqual(got, ["A", "B", "A", "B", "C"]);
});

test("pickSegmentFill: two fills behave as before, odd or even", () => {
  const got = [0, 1, 2].map((i) => pickSegmentFill(i, 3, ["A", "B"]));
  assert.deepEqual(got, ["A", "B", "A"]);
});

test("pickSegmentFill: a single segment keeps the first fill", () => {
  assert.equal(pickSegmentFill(0, 1, three), "A");
});
