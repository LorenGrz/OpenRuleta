"use client";

import { useState } from "react";

import { siteConfig } from "@openruleta/config";

import { Wheel } from "@/components/Wheel";
import {
  rotationAt,
  segmentCrossTimesMs,
  segmentUnderPointer,
  targetRotation,
} from "@/lib/draw/wheelTiming";

import type { DrawModeProps } from "./types";
import { useDrawRun, useSettleOnce } from "./useDrawRun";
import { useElementSize } from "./useElementSize";

const { wheelSpins, wheelDurationMs, drawModes } = siteConfig.ruleta;
/** Above this, the wheel's own labels can get tiny/sparse, so a live banner also names the pointer. */
const LABEL_LIMIT = 32;
const REDUCED_DURATION_MS = 900;
/** Ticks closer than this blur into noise at full speed. */
const MIN_TICK_GAP_MS = 28;
/** Safety net if `transitionend` never fires (hidden tab, zero-length move). */
const SETTLE_GRACE_MS = 400;

type Spin = { runId: number; from: number; to: number; durationMs: number };

export function WheelMode({
  pool,
  winnerIndex,
  runId,
  onSettled,
  sound,
  reducedMotion,
}: DrawModeProps) {
  const [rotation, setRotation] = useState(0);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [livePointer, setLivePointer] = useState<number | null>(null);
  const settleOnce = useSettleOnce();
  const n = pool.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(stageRef);
  const sizePx = Math.max(0, Math.min(width, height));

  function settle(id: number) {
    settleOnce(id, () => {
      setSpin(null);
      setLivePointer(null);
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

    let frame = requestAnimationFrame((startedAt) => {
      setSpin({ runId: id, from, to, durationMs });
      setRotation(to);
      if (n <= LABEL_LIMIT) return;
      // Follow the CSS curve to name whoever is under the pointer right now.
      const follow = (now: number) => {
        const r = rotationAt(from, to, now - startedAt, durationMs);
        const idx = segmentUnderPointer(r, n);
        setLivePointer((prev) => (prev === idx ? prev : idx));
        if (now - startedAt < durationMs) frame = requestAnimationFrame(follow);
      };
      frame = requestAnimationFrame(follow);
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

  const pointerIndex = livePointer ?? segmentUnderPointer(rotation, n);
  const pointerName = n > 0 ? (pool[pointerIndex]?.name ?? "") : "";
  const showBanner = n > LABEL_LIMIT;
  const settledOnWinner = !spin && winnerIndex !== null;
  const highlightIndex = settledOnWinner ? pointerIndex : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center gap-4">
      <div
        ref={stageRef}
        className="flex min-h-0 w-full flex-1 items-center justify-center"
      >
        <Wheel
          entries={pool.map((p) => ({ id: p.id, name: p.name }))}
          rotation={rotation}
          durationMs={spin?.durationMs ?? wheelDurationMs}
          spinning={spin !== null}
          onSettled={() => spin && settle(spin.runId)}
          sizePx={sizePx}
          highlightIndex={highlightIndex}
        />
      </div>
      {showBanner && (
        <div className="flex w-full max-w-3xl flex-col items-center gap-1 text-center">
          <span className="text-xs font-medium text-white/50">
            {drawModes.pointerLabel}
          </span>
          <p
            title={pointerName}
            style={settledOnWinner ? { color: drawModes.winColor } : undefined}
            className="w-full truncate text-4xl font-bold text-white tabular-nums lg:text-5xl"
          >
            {pointerName}
          </p>
        </div>
      )}
    </div>
  );
}
