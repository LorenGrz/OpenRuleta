import { clamp01 } from "./easing.ts";

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
 * Full laps the sweep completes before settling, shorter for the brief
 * reduced-motion duration so the pass still reads as "several laps" without
 * packing hundreds of hops into under a second.
 */
function sweepLaps(durationMs: number): number {
  return Math.max(2, Math.min(6, Math.round(durationMs / 900)));
}

/** Pause between the last two hops: the speed the sweep settles into. */
export const GRID_MAX_LAST_GAP_MS = 380;

/** Final-hop pause for a run, shrunk for short (reduced-motion) runs. */
export function gridLastGapMs(durationMs: number): number {
  return Math.min(GRID_MAX_LAST_GAP_MS, durationMs / 8);
}
/** How sharply the sweep brakes; higher keeps it fast longer, then settles. */
const BRAKE_POWER = 4;

/**
 * Sweep progress (0..1) at time `t` (0..1). Speed eases from fast down to
 * `endSpeed` (relative to the average speed) and arrives there with zero
 * slope, so the last hops stretch out gradually instead of one sudden stall:
 * v(t) = a + (v0 - a)·(1 - t)^k, with v0 chosen so progress ends at 1.
 */
function sweepProgress(endSpeed: number, t: number): number {
  const a = clamp01(endSpeed);
  const k = BRAKE_POWER;
  const v0 = a + (1 - a) * (k + 1);
  return a * t + ((v0 - a) * (1 - (1 - t) ** (k + 1))) / (k + 1);
}

/** Inverse of sweepProgress, by bisection to full double precision. */
function sweepTimeAt(endSpeed: number, p: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (sweepProgress(endSpeed, mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Highlight hops for the grid draw: a linear sweep in reading order
 * (0, 1, 2, ..., count-1, 0, ...), several full laps, ending on `winnerIndex`
 * at exactly `durationMs`. Gaps between hops grow via ease-out, so the sweep
 * starts fast and brakes into the landing, settling at
 * about gridLastGapMs per hop.
 */
export function gridSweepSchedule(
  count: number,
  winnerIndex: number,
  durationMs: number,
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
  if (count === 1) return [{ index: 0, atMs: Math.max(0, durationMs) }];

  // Sweep starts at index 0 and keeps going forward; the last lap stops
  // partway through, exactly on winnerIndex.
  const lastGapMs = gridLastGapMs(durationMs);
  // Tiny pools get extra laps so there are enough hops to brake through.
  const laps = Math.max(
    sweepLaps(durationMs),
    Math.ceil(durationMs / (lastGapMs * count)),
  );
  const total = laps * count + winnerIndex + 1;
  // Step index i is evenly spaced "progress" through the sweep; inverting
  // the ease-out curve gives the time each step needs, so steps bunch up early and spread out as the
  // sweep brakes into the landing.
  // Final gap ~ durationMs / ((total - 1) * endSpeed); pick endSpeed so it
  // lands near the cap (linear when the sweep is short enough already).
  const endSpeed = durationMs / ((total - 1) * lastGapMs);
  const hops: GridHop[] = new Array(total);
  for (let i = 0; i < total; i++) {
    const p = total === 1 ? 1 : i / (total - 1);
    const atMs =
      i === total - 1 ? durationMs : durationMs * sweepTimeAt(endSpeed, p);
    hops[i] = { index: i % count, atMs };
  }
  return hops;
}
