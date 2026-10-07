"use client";

import { useEffect, useEffectEvent, useRef } from "react";

/**
 * Runs `start` once per draw run (a new `runId` with a winner) and its
 * cleanup on the next run or unmount. `start` sees the latest props without
 * restarting the animation when they change mid-run.
 */
export function useDrawRun(
  runId: number,
  hasWinner: boolean,
  start: () => (() => void) | void,
): void {
  const onRun = useEffectEvent(start);
  useEffect(() => {
    if (!hasWinner) return;
    return onRun();
    // Only a new run restarts the animation, not a pool or prop change.
  }, [runId, hasWinner]);
}

/** Added to a mode's own nominal animation length for its backstop timeout
 *  (I3): the margin between the normal completion path and the moment a
 *  stalled run (e.g. a dropped rAF loop) is forced to settle instead. */
export const SETTLE_GRACE_MS = 400;

/**
 * Guards a draw mode's settle side effects (state resets, sound, `onSettled`)
 * so they run at most once per run id, whichever path reaches them first:
 * the mode's own animation-complete handler, or a backstop timeout (I3).
 */
export function useSettleOnce(): (id: number, run: () => void) => void {
  const settledRun = useRef(0);
  return (id, run) => {
    if (settledRun.current === id) return;
    settledRun.current = id;
    run();
  };
}
