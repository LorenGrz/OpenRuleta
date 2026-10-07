import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countRights,
  generatePlinkoPaths,
  plinkoDropTimes,
} from "./plinkoPaths.ts";

const SIZES = [1, 2, 50, 80, 300];
const SEEDS = [1, 7, 42, 1337, 0xdeadbeef];
const ROWS = 12;

// The core guarantee of the mode: exactly one ball (the pre-chosen winner) in
// the golden bin, every other path valid and outside it.
test("exactly one ball, the winner, lands in the prize bin for every size and seed", () => {
  for (const count of SIZES) {
    for (const seed of SEEDS) {
      const winnerIndex = seed % count;
      const plan = generatePlinkoPaths({
        count,
        winnerIndex,
        rows: ROWS,
        seed,
      });
      assert.equal(plan.paths.length, count);
      assert.equal(plan.prizeBin, ROWS / 2);
      assert.equal(plan.bins, ROWS + 1);
      const inPrize = plan.paths
        .map((p, i) => (p.bin === plan.prizeBin ? i : -1))
        .filter((i) => i >= 0);
      assert.deepEqual(inPrize, [winnerIndex], `count=${count} seed=${seed}`);
    }
  }
});

// A path that leaves the triangle would render a ball outside the board.
test("every path is valid: one L/R per row and a bin inside the board", () => {
  for (const count of SIZES) {
    for (const seed of SEEDS) {
      const plan = generatePlinkoPaths({
        count,
        winnerIndex: count - 1,
        rows: ROWS,
        seed,
      });
      for (const path of plan.paths) {
        assert.equal(path.moves.length, ROWS);
        assert.ok(path.moves.every((m) => m === "L" || m === "R"));
        assert.equal(path.bin, countRights(path.moves));
        assert.ok(path.bin >= 0 && path.bin <= ROWS);
        // Walk the board: the slot index must stay within 0..row at each row.
        let k = 0;
        path.moves.forEach((m, row) => {
          if (m === "R") k++;
          assert.ok(k >= 0 && k <= row + 1);
        });
      }
    }
  }
});

// Determinism lets the animation be replayed and tested.
test("same seed gives the same paths; different seeds differ", () => {
  const a = generatePlinkoPaths({
    count: 80,
    winnerIndex: 3,
    rows: ROWS,
    seed: 99,
  });
  const b = generatePlinkoPaths({
    count: 80,
    winnerIndex: 3,
    rows: ROWS,
    seed: 99,
  });
  const c = generatePlinkoPaths({
    count: 80,
    winnerIndex: 3,
    rows: ROWS,
    seed: 100,
  });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.paths, c.paths);
});

// Smallest board still has a centre bin.
test("works with the minimum board of 2 rows", () => {
  const plan = generatePlinkoPaths({
    count: 2,
    winnerIndex: 1,
    rows: 2,
    seed: 5,
  });
  assert.equal(plan.paths[1].bin, 1);
  assert.notEqual(plan.paths[0].bin, 1);
});

// Bad input must fail loudly instead of drawing a board with no winner.
test("rejects invalid pools and boards", () => {
  assert.throws(
    () => generatePlinkoPaths({ count: 0, winnerIndex: 0, rows: 12, seed: 1 }),
    RangeError,
  );
  assert.throws(
    () => generatePlinkoPaths({ count: 3, winnerIndex: 3, rows: 12, seed: 1 }),
    RangeError,
  );
  assert.throws(
    () => generatePlinkoPaths({ count: 3, winnerIndex: -1, rows: 12, seed: 1 }),
    RangeError,
  );
  assert.throws(
    () => generatePlinkoPaths({ count: 3, winnerIndex: 0, rows: 11, seed: 1 }),
    RangeError,
  );
});

// Big pools must still finish within the budget, with the winner falling last.
test("drop times fit the budget and the winner drops last", () => {
  const totalMs = 9000;
  const fallMs = 2600;
  for (const count of SIZES) {
    for (const seed of SEEDS) {
      const winnerIndex = Math.floor(count / 2);
      const starts = plinkoDropTimes({
        count,
        winnerIndex,
        totalMs,
        fallMs,
        maxBatches: 16,
        seed,
      });
      assert.equal(starts.length, count);
      for (const s of starts) {
        assert.ok(s >= 0 && s + fallMs <= totalMs, `start ${s} over budget`);
      }
      assert.equal(Math.max(...starts), starts[winnerIndex]);
      assert.equal(starts[winnerIndex], totalMs - fallMs);
    }
  }
});

// Budgets shorter than one fall (reduced motion) collapse to an immediate drop.
test("a budget shorter than the fall drops everyone at 0", () => {
  const starts = plinkoDropTimes({
    count: 5,
    winnerIndex: 2,
    totalMs: 300,
    fallMs: 600,
    maxBatches: 4,
    seed: 1,
  });
  assert.deepEqual(starts, [0, 0, 0, 0, 0]);
});
