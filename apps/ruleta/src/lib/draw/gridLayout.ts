import { randomInt, type Rng } from "./random.ts";

export type GridFit = {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  fontSize: number;
};

export type GridFitOptions = {
  gap: number;
  /** Preferred width/height ratio of a name card. */
  cardAspect: number;
  minFont: number;
  maxFont: number;
};

const DEFAULT_FIT: GridFitOptions = {
  gap: 8,
  cardAspect: 4,
  minFont: 11,
  maxFont: 44,
};

/**
 * Picks the column count that gives every card the largest readable size in
 * a `width` x `height` box. Font size follows the card height, capped so long
 * names still fit a few words per line.
 */
export function fitGrid(
  count: number,
  width: number,
  height: number,
  options: Partial<GridFitOptions> = {},
): GridFit {
  const o = { ...DEFAULT_FIT, ...options };
  const n = Math.max(1, Math.floor(count));
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  let best: GridFit | null = null;
  let bestScore = -Infinity;
  for (let columns = 1; columns <= n; columns++) {
    const rows = Math.ceil(n / columns);
    const cellWidth = (w - o.gap * (columns - 1)) / columns;
    const cellHeight = (h - o.gap * (rows - 1)) / rows;
    if (cellWidth <= 0 || cellHeight <= 0) continue;
    // Usable card height when the card keeps its preferred aspect.
    const score = Math.min(cellHeight, cellWidth / o.cardAspect);
    if (score > bestScore) {
      bestScore = score;
      const fontSize = Math.max(o.minFont, Math.min(o.maxFont, score * 0.42));
      best = { columns, rows, cellWidth, cellHeight, fontSize };
    }
  }
  return (
    best ?? {
      columns: 1,
      rows: n,
      cellWidth: w,
      cellHeight: h / n,
      fontSize: o.minFont,
    }
  );
}

export type GridHop = { index: number; atMs: number };

/**
 * Highlight hops for the grid draw: random cards, never the same one twice in
 * a row, each gap longer than the last, ending on `winnerIndex` at exactly
 * `durationMs`.
 */
export function gridHopSchedule(
  count: number,
  winnerIndex: number,
  durationMs: number,
  hops: number,
  rng: Rng,
): GridHop[] {
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
  const total = Math.max(1, Math.floor(hops));
  if (count === 1) return [{ index: 0, atMs: Math.max(0, durationMs) }];

  // Built backwards from the winner so no card is ever lit twice in a row.
  const indices: number[] = new Array(total);
  indices[total - 1] = winnerIndex;
  for (let i = total - 2; i >= 0; i--) {
    const offset = 1 + randomInt(rng, count - 1);
    indices[i] = (indices[i + 1] + offset) % count;
  }

  // atMs = duration * (1 - sqrt(1 - p)): every gap is longer than the one before.
  return indices.map((index, i) => {
    const p = total === 1 ? 1 : i / (total - 1);
    const atMs =
      i === total - 1 ? durationMs : durationMs * (1 - Math.sqrt(1 - p));
    return { index, atMs };
  });
}
