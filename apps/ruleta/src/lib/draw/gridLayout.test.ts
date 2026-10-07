import assert from "node:assert/strict";
import { test } from "node:test";

import { fitGrid, gridHopSchedule } from "./gridLayout.ts";
import { createRng } from "./random.ts";
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

// The hop animation must end on the winner and slow down, never repeat a card.
test("gridHopSchedule ends on the winner, slows down and never repeats a card", () => {
  for (const count of [2, 3, 50, 120]) {
    const hops = gridHopSchedule(count, count - 1, 4000, 24, createRng(count));
    assert.equal(hops.length, 24);
    assert.equal(hops[hops.length - 1].index, count - 1);
    assert.equal(hops[hops.length - 1].atMs, 4000);
    for (let i = 1; i < hops.length; i++) {
      assert.notEqual(hops[i].index, hops[i - 1].index);
      assert.ok(hops[i].index >= 0 && hops[i].index < count);
      if (i > 1) {
        const gap = hops[i].atMs - hops[i - 1].atMs;
        const prevGap = hops[i - 1].atMs - hops[i - 2].atMs;
        assert.ok(gap >= prevGap - 1e-9);
      }
    }
  }
});

test("gridHopSchedule with one participant lights it once", () => {
  assert.deepEqual(gridHopSchedule(1, 0, 900, 10, createRng(1)), [
    { index: 0, atMs: 900 },
  ]);
});

test("gridHopSchedule rejects an out-of-range winner", () => {
  assert.throws(() => gridHopSchedule(3, 3, 1000, 5, createRng(1)), RangeError);
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
