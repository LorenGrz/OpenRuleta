/** A unit easing: maps normalised time t in [0, 1] to progress in [0, 1]. */
export type Easing = (t: number) => number;

export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - clamp01(t), 3);

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * CSS `cubic-bezier(x1, y1, x2, y2)` as a function of time, solved the same
 * way browsers do: find the curve parameter whose x equals t, return its y.
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Easing {
  const bez = (p1: number, p2: number, s: number) =>
    3 * p1 * s * (1 - s) ** 2 + 3 * p2 * s ** 2 * (1 - s) + s ** 3;
  return (t) => {
    const x = clamp01(t);
    if (x === 0 || x === 1) return x;
    // x(s) is monotonic for 0 <= x1, x2 <= 1, so bisection always converges.
    let lo = 0;
    let hi = 1;
    let s = x;
    for (let i = 0; i < 40; i++) {
      const xs = bez(x1, x2, s);
      if (Math.abs(xs - x) < 1e-7) break;
      if (xs < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return bez(y1, y2, s);
  };
}

/** Inverse of a monotonic easing: the t at which progress reaches `p`. */
export function invertEasing(ease: Easing, p: number): number {
  const target = clamp01(p);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
