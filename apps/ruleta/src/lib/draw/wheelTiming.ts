import { cubicBezier, invertEasing, type Easing } from "./easing.ts";

/** Control points of the wheel's CSS transition. One source for CSS and sound. */
export const WHEEL_BEZIER = [0.16, 1, 0.3, 1] as const;
export const WHEEL_TIMING_FUNCTION = `cubic-bezier(${WHEEL_BEZIER.join(", ")})`;
export const wheelEasing: Easing = cubicBezier(...WHEEL_BEZIER);

const mod360 = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * Index of the segment under the pointer (12 o'clock) for a wheel rotated by
 * `rotation` degrees clockwise. Segment i spans [i*seg, (i+1)*seg) in wheel
 * coordinates, starting at 12 o'clock.
 */
export function segmentUnderPointer(rotation: number, count: number): number {
  if (count <= 1) return 0;
  const seg = 360 / count;
  return Math.min(count - 1, Math.floor(mod360(-rotation) / seg));
}

/**
 * Absolute rotation that lands segment `winnerIndex` under the pointer after
 * `spins` full turns. `jitter` in [-0.5, 0.5] offsets the landing inside the
 * segment (kept at 30% of its width either side, never on a boundary).
 */
export function targetRotation(
  previous: number,
  winnerIndex: number,
  count: number,
  spins: number,
  jitter: number,
): number {
  const seg = 360 / Math.max(1, count);
  const mid = winnerIndex * seg + seg / 2;
  const delta = (mod360(360 - mid) - mod360(previous) + 360) % 360;
  return previous + 360 * spins + delta + jitter * seg * 0.6;
}

/** Rotation at `elapsedMs` of a spin from `from` to `to`, following the CSS curve. */
export function rotationAt(
  from: number,
  to: number,
  elapsedMs: number,
  durationMs: number,
  ease: Easing = wheelEasing,
): number {
  if (durationMs <= 0) return to;
  return from + (to - from) * ease(elapsedMs / durationMs);
}

/**
 * Milliseconds (from spin start) at which the pointer crosses a segment
 * boundary, so a tick can play exactly when a peg passes. Boundaries sit
 * every 360/count degrees of rotation. Ticks closer than `minGapMs` to the
 * previous kept tick are dropped — at full speed they would blur into noise.
 */
export function segmentCrossTimesMs(
  from: number,
  to: number,
  count: number,
  durationMs: number,
  minGapMs = 0,
  ease: Easing = wheelEasing,
): number[] {
  if (to <= from || durationMs <= 0 || count < 1) return [];
  const seg = 360 / count;
  const span = to - from;
  const times: number[] = [];
  let last = -Infinity;
  for (let k = Math.floor(from / seg) + 1; k * seg <= to; k++) {
    const p = (k * seg - from) / span;
    const t = invertEasing(ease, p) * durationMs;
    if (t - last >= minGapMs) {
      times.push(t);
      last = t;
    }
  }
  return times;
}
