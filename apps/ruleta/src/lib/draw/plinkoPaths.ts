import { createRng, randomInt, shuffled } from "./random.ts";

export type PlinkoMove = "L" | "R";

/** One ball: the side it bounces to at every peg row, and the bin it ends in. */
export type PlinkoPath = { moves: PlinkoMove[]; bin: number };

export type PlinkoPlan = {
  rows: number;
  /** Bins under the board: `rows + 1`, indexed left to right. */
  bins: number;
  /** The single golden bin, dead centre. */
  prizeBin: number;
  /** One path per participant, same order as the pool. */
  paths: PlinkoPath[];
};

export type PlinkoPathOptions = {
  count: number;
  winnerIndex: number;
  /** Peg rows. Must be even so the board has a centre bin. */
  rows: number;
  seed: number;
};

function assertPool(count: number, winnerIndex: number): void {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`count must be a positive integer, got ${count}`);
  }
  if (
    !Number.isInteger(winnerIndex) ||
    winnerIndex < 0 ||
    winnerIndex >= count
  ) {
    throw new RangeError(
      `winnerIndex ${winnerIndex} out of range [0, ${count})`,
    );
  }
}

/**
 * Deterministic plinko trajectories. The bin of a path is its number of "R"
 * moves (a Galton board), so every path stays inside the triangle by
 * construction. Only `winnerIndex` gets exactly `rows / 2` rights and lands in
 * the prize bin; any loser that would land there gets one move flipped, which
 * sends it to a neighbouring bin — a near miss, never a second winner.
 */
export function generatePlinkoPaths({
  count,
  winnerIndex,
  rows,
  seed,
}: PlinkoPathOptions): PlinkoPlan {
  assertPool(count, winnerIndex);
  if (!Number.isInteger(rows) || rows < 2 || rows % 2 !== 0) {
    throw new RangeError(`rows must be an even integer >= 2, got ${rows}`);
  }
  const rng = createRng(seed);
  const prizeBin = rows / 2;
  const paths: PlinkoPath[] = [];

  for (let i = 0; i < count; i++) {
    let moves: PlinkoMove[];
    if (i === winnerIndex) {
      const half: PlinkoMove[] = Array.from({ length: rows }, (_, k) =>
        k < prizeBin ? "R" : "L",
      );
      moves = shuffled(half, rng);
    } else {
      moves = Array.from({ length: rows }, () => (rng() < 0.5 ? "L" : "R"));
      if (countRights(moves) === prizeBin) {
        const k = randomInt(rng, rows);
        moves[k] = moves[k] === "L" ? "R" : "L";
      }
    }
    paths.push({ moves, bin: countRights(moves) });
  }

  return { rows, bins: rows + 1, prizeBin, paths };
}

export function countRights(moves: readonly PlinkoMove[]): number {
  return moves.reduce((n, m) => (m === "R" ? n + 1 : n), 0);
}

export type PlinkoDropOptions = {
  count: number;
  winnerIndex: number;
  /** Whole animation budget: the last ball lands by then. */
  totalMs: number;
  /** Time one ball takes from the top to its bin. */
  fallMs: number;
  /** Upper bound on drop waves; large pools fall in this many staggered batches. */
  maxBatches: number;
  seed: number;
};

/**
 * Start time (ms) of every ball. Balls fall in staggered batches so even
 * 300 participants finish within `totalMs`; the winner always drops last.
 */
export function plinkoDropTimes({
  count,
  winnerIndex,
  totalMs,
  fallMs,
  maxBatches,
  seed,
}: PlinkoDropOptions): number[] {
  assertPool(count, winnerIndex);
  const rng = createRng(seed ^ 0x9e3779b9);
  const window = Math.max(0, totalMs - fallMs);
  const starts = new Array<number>(count).fill(0);
  starts[winnerIndex] = window;
  if (count === 1) return starts;

  const losers = shuffled(
    [...Array(count).keys()].filter((i) => i !== winnerIndex),
    rng,
  );
  const batches = Math.max(1, Math.min(losers.length, Math.floor(maxBatches)));
  const perBatch = Math.ceil(losers.length / batches);
  // Batches spread over the window, the last one leaving room for the winner.
  const gap = batches > 1 ? (window * 0.85) / (batches - 1) : 0;
  const spread = Math.min(260, gap * 0.8, window);
  losers.forEach((ball, order) => {
    const batch = Math.floor(order / perBatch);
    starts[ball] = Math.min(window, batch * gap + rng() * spread);
  });
  return starts;
}
