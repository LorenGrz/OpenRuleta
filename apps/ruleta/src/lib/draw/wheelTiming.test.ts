import assert from "node:assert/strict";
import { test } from "node:test";

import { cubicBezier, invertEasing } from "./easing.ts";
import {
  rotationAt,
  segmentCrossTimesMs,
  segmentUnderPointer,
  targetRotation,
  wheelEasing,
} from "./wheelTiming.ts";

// The landing segment is the whole point of the wheel: it must match the pre-chosen winner.
test("targetRotation lands the winner under the pointer for any start and jitter", () => {
  for (const count of [1, 2, 3, 7, 33, 80, 300]) {
    for (const previous of [0, 123.4, 3600 + 17, -50]) {
      for (const jitter of [-0.5, 0, 0.49]) {
        const winner = count - 1;
        const r = targetRotation(previous, winner, count, 6, jitter);
        // At least the requested turns (minus the in-segment jitter).
        assert.ok(r > previous + 360 * 5);
        assert.equal(segmentUnderPointer(r, count), winner);
      }
    }
  }
});

// The live banner reads the segment at the pointer, which moves the other way.
test("segmentUnderPointer maps rotation to the segment at 12 o'clock", () => {
  assert.equal(segmentUnderPointer(0, 4), 0);
  assert.equal(segmentUnderPointer(-91, 4), 1);
  assert.equal(segmentUnderPointer(1, 4), 3);
  assert.equal(segmentUnderPointer(720 + 1, 4), 3);
  assert.equal(segmentUnderPointer(42, 1), 0);
});

// The JS curve must match the CSS transition or the sound drifts from the picture.
test("cubicBezier matches known CSS curve values", () => {
  const linear = cubicBezier(0, 0, 1, 1);
  assert.ok(Math.abs(linear(0.3) - 0.3) < 1e-4);
  // CSS "ease" = cubic-bezier(0.25, 0.1, 0.25, 1); at t=0.5 it is ~0.8024.
  assert.ok(Math.abs(cubicBezier(0.25, 0.1, 0.25, 1)(0.5) - 0.8024) < 1e-3);
  assert.equal(wheelEasing(0), 0);
  assert.equal(wheelEasing(1), 1);
  assert.ok(
    Math.abs(invertEasing(wheelEasing, wheelEasing(0.37)) - 0.37) < 1e-4,
  );
});

test("rotationAt follows the curve from start to target", () => {
  assert.equal(rotationAt(10, 370, 0, 1000), 10);
  assert.equal(rotationAt(10, 370, 1000, 1000), 370);
  assert.equal(rotationAt(10, 370, 5, 0), 370);
  assert.ok(rotationAt(10, 370, 500, 1000) > 190); // ease-out: past halfway at half time
});

// One tick per boundary crossed, in order, all inside the spin, slowing down.
test("segmentCrossTimesMs gives one increasing time per boundary crossed", () => {
  const count = 8;
  const times = segmentCrossTimesMs(0, 720, count, 4000);
  assert.equal(times.length, 16);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1]);
  assert.ok(times[times.length - 1] <= 4000 + 1e-6);
  // Ease-out: the last gap is far longer than the first.
  assert.ok(times[15] - times[14] > (times[1] - times[0]) * 5);
  // Each time, the rotation is on a boundary.
  for (const [i, t] of times.entries()) {
    assert.ok(Math.abs(rotationAt(0, 720, t, 4000) - (i + 1) * 45) < 0.01);
  }
});

// At 80+ names the start of the spin crosses boundaries faster than audio can resolve.
test("segmentCrossTimesMs thins ticks closer than minGapMs", () => {
  const times = segmentCrossTimesMs(0, 360 * 6, 80, 4600, 30);
  for (let i = 1; i < times.length; i++)
    assert.ok(times[i] - times[i - 1] >= 30);
  assert.ok(times.length < 80 * 6);
});

test("segmentCrossTimesMs is empty for degenerate spins", () => {
  assert.deepEqual(segmentCrossTimesMs(100, 100, 8, 4000), []);
  assert.deepEqual(segmentCrossTimesMs(0, 360, 8, 0), []);
  assert.deepEqual(segmentCrossTimesMs(0, 360, 0, 4000), []);
});
