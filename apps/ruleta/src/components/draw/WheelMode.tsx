"use client";

import { useState, type ComponentProps } from "react";

import { siteConfig } from "@openruleta/config";

import { Wheel } from "@/components/Wheel";
import { segmentCrossTimesMs, targetRotation } from "@/lib/draw/wheelTiming";

import type { DrawModeProps } from "./types";
import { useDrawRun, useSettleOnce } from "./useDrawRun";

const { wheelSpins, wheelDurationMs } = siteConfig.ruleta;
const REDUCED_DURATION_MS = 900;
/** Ticks closer than this blur into noise at full speed. */
const MIN_TICK_GAP_MS = 28;
/** Safety net if `transitionend` never fires (hidden tab, zero-length move). */
const SETTLE_GRACE_MS = 400;

type Spin = { runId: number; from: number; to: number; durationMs: number };

type WheelModeProps = DrawModeProps &
  Pick<
    ComponentProps<typeof Wheel>,
    "fills" | "fullLabels" | "maxWidthClassName"
  >;

export function WheelMode({
  pool,
  winnerIndex,
  runId,
  onSettled,
  sound,
  reducedMotion,
  fills,
  fullLabels,
  maxWidthClassName,
}: WheelModeProps) {
  const [rotation, setRotation] = useState(0);
  const [spin, setSpin] = useState<Spin | null>(null);
  const settleOnce = useSettleOnce();
  const n = pool.length;

  function settle(id: number) {
    settleOnce(id, () => {
      setSpin(null);
      sound.land();
      onSettled();
    });
  }

  useDrawRun(runId, winnerIndex !== null, () => {
    if (winnerIndex === null || n === 0) return;
    const durationMs = reducedMotion ? REDUCED_DURATION_MS : wheelDurationMs;
    const spins = reducedMotion ? 1 : wheelSpins;
    const from = rotation;
    const to = targetRotation(from, winnerIndex, n, spins, Math.random() - 0.5);
    const id = runId;

    sound.wheel(segmentCrossTimesMs(from, to, n, durationMs, MIN_TICK_GAP_MS));

    const frame = requestAnimationFrame(() => {
      setSpin({ runId: id, from, to, durationMs });
      setRotation(to);
    });
    const fallback = window.setTimeout(
      () => settle(id),
      durationMs + SETTLE_GRACE_MS,
    );
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  });

  return (
    <Wheel
      entries={pool}
      rotation={rotation}
      durationMs={spin?.durationMs ?? wheelDurationMs}
      spinning={spin !== null}
      onSettled={() => spin && settle(spin.runId)}
      fills={fills}
      fullLabels={fullLabels}
      maxWidthClassName={maxWidthClassName}
    />
  );
}
