"use client";

import { useRef, useState, type CSSProperties } from "react";

import { siteConfig } from "@openruleta/config";

import {
  planSlotReel,
  slotIndexAt,
  slotPositionAt,
  type SlotReelPlan,
} from "@/lib/draw/slotReel";

import type { DrawModeProps } from "./types";
import { useDrawRun } from "./useDrawRun";

const { wheelDurationMs, drawModes } = siteConfig.ruleta;
const STEPS = 48;
const REDUCED_STEPS = 3;
const REDUCED_DURATION_MS = 600;
/** Pause on the winner before the modal opens. */
const HOLD_MS = 450;
/** Rows rendered around the centre; ±2 keeps the edges filled mid-scroll. */
const OFFSETS = [-2, -1, 0, 1, 2] as const;

type Reel = { plan: SlotReelPlan; position: number; done: boolean };

export function SlotMode({
  pool,
  winnerIndex,
  runId,
  onSettled,
  sound,
  reducedMotion,
}: DrawModeProps) {
  const [reel, setReel] = useState<Reel | null>(null);
  const settledRun = useRef(0);
  const n = pool.length;

  useDrawRun(runId, winnerIndex !== null, () => {
    if (winnerIndex === null || n === 0) return;
    const id = runId;
    const durationMs = reducedMotion ? REDUCED_DURATION_MS : wheelDurationMs;
    const plan = planSlotReel(
      n,
      winnerIndex,
      reducedMotion ? REDUCED_STEPS : STEPS,
    );
    let frame = 0;
    let hold = 0;
    let lastStep = -1;
    let startedAt: number | null = null;

    const step = (now: number) => {
      startedAt ??= now;
      const t = Math.min(1, (now - startedAt) / durationMs);
      const position = slotPositionAt(plan, t);
      const whole = Math.floor(position);
      if (whole !== lastStep) {
        if (lastStep !== -1) sound.tick();
        lastStep = whole;
      }
      setReel({ plan, position, done: t >= 1 });
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      sound.land();
      hold = window.setTimeout(() => {
        if (settledRun.current === id) return;
        settledRun.current = id;
        onSettled();
      }, HOLD_MS);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hold);
    };
  });

  if (n === 0) return null;

  // Between draws the reel rests where it stopped (pool may have shrunk).
  const plan = reel && reel.plan.count === n ? reel.plan : null;
  const position = plan && reel ? reel.position : 0;
  const centre = Math.floor(position);
  const frac = reducedMotion ? 0 : position - centre;
  const settledOnWinner = winnerIndex !== null && (reel?.done ?? false);

  const nameAt = (offset: number) => {
    const idx = plan
      ? slotIndexAt(plan, centre + offset)
      : ((offset % n) + n) % n;
    return pool[idx]?.name ?? "";
  };

  return (
    <div
      className="relative w-full max-w-6xl overflow-hidden [container-type:inline-size] [--row:clamp(4.5rem,15dvh,10rem)] [mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)]"
      style={{ height: "calc(var(--row) * 3)" }}
      aria-live="off"
    >
      {OFFSETS.map((offset) => {
        // Distance of this row from the centre line, in rows.
        const d = Math.min(1.6, Math.abs(offset - frac));
        const near = Math.min(1, d);
        const name = nameAt(offset);
        const isCentre = offset === 0;
        const style: CSSProperties = {
          top: `calc(var(--row) * ${1 + offset - frac})`,
          transform: `scale(${1 - 0.5 * near})`,
          opacity: 1 - 0.7 * near,
          filter: reducedMotion
            ? undefined
            : `blur(${(near * 3).toFixed(2)}px)`,
          color: isCentre && settledOnWinner ? drawModes.winColor : undefined,
          // Long names shrink to fit the reel width instead of being cut off.
          fontSize: `min(calc(var(--row) * 0.58), calc(150cqw / ${Math.max(8, name.length)}))`,
        };
        return (
          <p
            key={offset}
            title={name}
            aria-hidden={!isCentre}
            style={style}
            className="absolute inset-x-0 flex h-[var(--row)] items-center justify-center truncate px-6 text-center font-bold leading-none tracking-tight text-white"
          >
            <span className="truncate">{name}</span>
          </p>
        );
      })}
    </div>
  );
}
