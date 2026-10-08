import assert from "node:assert/strict";
import { test } from "node:test";

import { fitGrid, gridLastGapMs, gridSweepSchedule } from "./gridLayout.ts";
import { planSlotReel, slotIndexAt, slotPositionAt } from "./slotReel.ts";

// Projector target: 80-120 names in the stage area left by header, panel and buttons.
test("fitGrid fits 120 names on a 1920x1080 stage with a readable font", () => {
  const fit = fitGrid(120, 1440, 620);
  assert.ok(fit.columns * fit.rows >= 120);
  const usedW = fit.columns * fit.cellWidth + (fit.columns - 1) * 8;
  const usedH = fit.rows * fit.cellHeight + (fit.rows - 1) * 8;
  assert.ok(usedW <= 1440 + 1e-6 && usedH <= 620 + 1e-6);
  assert.ok(fit.fontSize >= 14, `font ${fit.fontSize}`);
});

test("fitGrid gives a single huge card for one name", () => {
  const fit = fitGrid(1, 1200, 600);
  assert.equal(fit.columns, 1);
  assert.equal(fit.rows, 1);
  assert.equal(fit.fontSize, 44);
});

test("fitGrid survives a zero-size container", () => {
  const fit = fitGrid(10, 0, 0);
  assert.ok(fit.columns >= 1);
  assert.ok(fit.fontSize >= 11);
});

// The sweep must visit cards in linear reading order, several full laps,
// braking (ease-out: each gap at least as long as the one before) into an
// exact landing on the winner.
test("gridSweepSchedule sweeps linearly, slows down and ends on the winner", () => {
  for (const count of [2, 100, 300]) {
    for (const winnerIndex of [0, count - 1]) {
      const hops = gridSweepSchedule(count, winnerIndex, 4000);
      assert.ok(hops.length >= 2 * count, "covers at least two full laps");
      assert.equal(hops[hops.length - 1].index, winnerIndex);
      assert.equal(hops[hops.length - 1].atMs, 4000);
      for (let i = 0; i < hops.length; i++) {
        // Linear sweep: each hop is the next card in reading order.
        assert.equal(hops[i].index, i % count);
        if (i > 0) {
          assert.ok(hops[i].atMs >= hops[i - 1].atMs);
        }
        if (i > 1) {
          const gap = hops[i].atMs - hops[i - 1].atMs;
          const prevGap = hops[i - 1].atMs - hops[i - 2].atMs;
          assert.ok(gap >= prevGap - 1e-9);
        }
      }
    }
  }
});

// The braking must settle gradually, not end in a long stall before the winner.
test("gridSweepSchedule caps the final pause", () => {
  for (const count of [2, 30, 100, 300]) {
    for (const durationMs of [700, 4600]) {
      const hops = gridSweepSchedule(count, count - 1, durationMs);
      const last = hops[hops.length - 1].atMs - hops[hops.length - 2].atMs;
      assert.ok(
        last <= gridLastGapMs(durationMs) * 1.05,
        `count ${count}, ${durationMs}ms: last gap ${last}`,
      );
      if (hops.length > 3) {
        const prev = hops[hops.length - 2].atMs - hops[hops.length - 3].atMs;
        assert.ok(last <= prev * 1.5, `abrupt final hop: ${prev} -> ${last}`);
      }
    }
  }
});

test("gridSweepSchedule with one participant lights it once", () => {
  assert.deepEqual(gridSweepSchedule(1, 0, 900), [{ index: 0, atMs: 900 }]);
});

test("gridSweepSchedule rejects an out-of-range winner", () => {
  assert.throws(() => gridSweepSchedule(3, 3, 1000), RangeError);
});

// The reel stops on the winner regardless of pool size or step count.
test("slot reel stops on the winner", () => {
  for (const count of [1, 2, 7, 80, 300]) {
    for (const steps of [0, 5, 48, 1000]) {
      const winner = count > 1 ? count - 2 : 0;
      const plan = planSlotReel(count, winner, steps);
      assert.equal(slotIndexAt(plan, slotPositionAt(plan, 1)), winner);
      const start = slotIndexAt(plan, slotPositionAt(plan, 0));
      assert.equal(start, plan.startIndex);
      // Neighbours wrap around the pool.
      assert.ok(slotIndexAt(plan, -1) >= 0 && slotIndexAt(plan, -1) < count);
    }
  }
});

test("planSlotReel rejects an empty pool", () => {
  assert.throws(() => planSlotReel(0, 0, 10), RangeError);
});
