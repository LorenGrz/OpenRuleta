"use client";

import { useEffect, useEffectEvent } from "react";

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
