import { easeOutCubic, type Easing } from "./easing.ts";

/**
 * Slot reel plan: the reel scrolls `steps` names forward from `startIndex`
 * and stops exactly on `winnerIndex`. Names repeat when the pool is shorter
 * than the run, like a real reel.
 */
export type SlotReelPlan = {
  startIndex: number;
  steps: number;
  count: number;
};

export function planSlotReel(
  count: number,
  winnerIndex: number,
  steps: number,
): SlotReelPlan {
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
  const s = Math.max(0, Math.floor(steps));
  const startIndex = (((winnerIndex - s) % count) + count) % count;
  return { startIndex, steps: s, count };
}

/** Continuous reel position (in names) at normalised time t. */
export function slotPositionAt(
  plan: SlotReelPlan,
  t: number,
  ease: Easing = easeOutCubic,
): number {
  return plan.steps * ease(t);
}

/** Pool index shown at an integer offset from the reel position. */
export function slotIndexAt(plan: SlotReelPlan, position: number): number {
  const i = plan.startIndex + Math.floor(position);
  return ((i % plan.count) + plan.count) % plan.count;
}
