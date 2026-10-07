import type { PlinkoPath } from "./plinkoPaths.ts";

/** Pixel geometry of a plinko board drawn in a `width` x `height` box. */
export type PlinkoGeometry = {
  width: number;
  height: number;
  rows: number;
  /** Horizontal distance between neighbouring pegs (and bin width). */
  spacing: number;
  /** Vertical distance between peg rows. */
  rowGap: number;
  centerX: number;
  /** y of the first peg row. */
  top: number;
  /** y where bins start (just under the last peg row). */
  binTop: number;
  binHeight: number;
  pegRadius: number;
  ballRadius: number;
};

export function plinkoGeometry(
  width: number,
  height: number,
  rows: number,
): PlinkoGeometry {
  const bins = rows + 1;
  // Widest peg row has rows + 2 pegs; bins span rows + 1 spacings.
  const spacing = Math.max(
    4,
    Math.min(width / (bins + 1.5), height / (rows + 4)),
  );
  const rowGap = spacing * 0.92;
  const binHeight = spacing * 2.2;
  const boardHeight = rowGap * rows + binHeight;
  const top = Math.max(
    spacing * 0.9,
    (height - boardHeight) / 2 + spacing * 0.4,
  );
  return {
    width,
    height,
    rows,
    spacing,
    rowGap,
    centerX: width / 2,
    top,
    binTop: top + rowGap * (rows - 0.5),
    binHeight,
    pegRadius: Math.max(1.5, spacing * 0.08),
    ballRadius: Math.max(3, spacing * 0.3),
  };
}

/** x of logical slot `k` (0..row) on peg row `row`. */
export function slotX(g: PlinkoGeometry, row: number, k: number): number {
  return g.centerX + (k - row / 2) * g.spacing;
}

/** Peg x positions on `row`: the logical slots plus one guard peg each side. */
export function pegXs(g: PlinkoGeometry, row: number): number[] {
  return Array.from(
    { length: row + 3 },
    (_, j) => g.centerX + (j - (row + 2) / 2) * g.spacing,
  );
}

export function pegY(g: PlinkoGeometry, row: number): number {
  return g.top + row * g.rowGap;
}

export function binX(g: PlinkoGeometry, bin: number): number {
  return slotX(g, g.rows, bin);
}

export type BallPoint = { x: number; y: number; row: number; landed: boolean };

/**
 * Ball position at normalised fall progress `u` in [0, 1]. The fall is split
 * into `rows + 1` hops (drop to the first peg, one per row, then into the
 * bin); every hop arcs up off the peg before falling, so it reads as a bounce.
 * `bounce` scales the arc (0 = straight lines, for reduced motion).
 */
export function ballPositionAt(
  g: PlinkoGeometry,
  path: PlinkoPath,
  u: number,
  bounce = 1,
): BallPoint {
  const rows = g.rows;
  const hops = rows + 1;
  const clamped = u <= 0 ? 0 : u >= 1 ? 1 : u;
  const f = clamped * hops;
  const hop = Math.min(hops - 1, Math.floor(f));
  const v = f - hop;
  const contact = g.ballRadius + g.pegRadius;

  if (hop === 0) {
    // Entry: fall straight onto the apex peg.
    const y0 = g.top - g.rowGap * 1.2;
    return {
      x: g.centerX,
      y: y0 + (pegY(g, 0) - contact - y0) * v * v,
      row: -1,
      landed: false,
    };
  }

  const row = hop - 1;
  let k = 0;
  for (let i = 0; i < row; i++) if (path.moves[i] === "R") k++;
  const fromX = slotX(g, row, k);
  const fromY = pegY(g, row) - contact;
  const nextK = path.moves[row] === "R" ? k + 1 : k;
  const toX = slotX(g, row + 1, nextK);
  const isLast = row === rows - 1;
  const toY = isLast
    ? g.binTop + g.binHeight - g.ballRadius - 1
    : pegY(g, row + 1) - contact;
  const ease = v * v * (3 - 2 * v);
  const arc =
    bounce * g.rowGap * 0.45 * Math.sin(Math.PI * v) * (isLast ? 0.4 : 1);
  return {
    x: fromX + (toX - fromX) * ease,
    y: fromY + (toY - fromY) * v * v - arc,
    row,
    landed: clamped >= 1,
  };
}
