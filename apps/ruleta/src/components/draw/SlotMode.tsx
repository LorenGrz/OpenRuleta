"use client";

import { useState, type CSSProperties } from "react";

import { siteConfig } from "@openruleta/config";

import {
  planSlotReel,
  slotIndexAt,
  slotPositionAt,
  type SlotReelPlan,
} from "@/lib/draw/slotReel";

import type { DrawModeProps } from "./types";
import { SETTLE_GRACE_MS, useDrawRun, useSettleOnce } from "./useDrawRun";

const { wheelDurationMs, drawModes } = siteConfig.ruleta;
const STEPS = 48;
const REDUCED_STEPS = 3;
const REDUCED_DURATION_MS = 600;
/** Pause on the winner before the modal opens. */
const HOLD_MS = 450;
/** Names visible on each side of the selected one. */
const SIDE_ROWS = 3;
const VISIBLE_ROWS = SIDE_ROWS * 2 + 1;
/** Rows rendered around the centre; one extra per side keeps the edges filled mid-scroll. */
const OFFSETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;

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
  const settleOnce = useSettleOnce();
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
      hold = window.setTimeout(() => settleOnce(id, onSettled), HOLD_MS);
    };
    frame = requestAnimationFrame(step);
    // Backstop (I3): settles the run even if the rAF loop above never
    // reaches its own completion handler, so a stuck mode cannot leave the
    // UI parked on "spinning" forever.
    const fallback = window.setTimeout(
      () => settleOnce(id, onSettled),
      durationMs + HOLD_MS + SETTLE_GRACE_MS,
    );
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hold);
      window.clearTimeout(fallback);
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

  // The card sitting in the selection window: the one closest to the centre.
  const selectedOffset = Math.round(frac);
  const accent = settledOnWinner ? drawModes.winColor : "var(--color-primary)";

  return (
    <div
      className="relative w-full max-w-6xl overflow-hidden [container-type:inline-size] [--row:clamp(2.25rem,7dvh,5.5rem)]"
      style={{ height: `calc(var(--row) * ${VISIBLE_ROWS})` }}
      aria-live="off"
    >
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        {OFFSETS.map((offset) => {
          // Distance of this row from the centre line, in rows.
          const d = Math.min(SIDE_ROWS, Math.abs(offset - frac));
          const name = nameAt(offset);
          const isSelected = offset === selectedOffset;
          const won = isSelected && settledOnWinner;
          const top = `calc(var(--row) * ${SIDE_ROWS + offset - frac})`;
          const style: CSSProperties = {
            transform: `scale(${1 - 0.06 * d})`,
            opacity: 1 - 0.18 * d,
            // Long names shrink to fit the reel width instead of being cut off.
            fontSize: `min(calc(var(--row) * 0.5), calc(150cqw / ${Math.max(8, name.length)}))`,
            ...(won
              ? {
                  backgroundColor: drawModes.winColor,
                  color: drawModes.winInk,
                  ["--draw-win" as string]: drawModes.winColor,
                }
              : {}),
          };
          const tone = won
            ? "draw-win-pulse border-transparent"
            : isSelected
              ? "border-transparent bg-primary text-white"
              : "border-white/10 bg-white/[0.06] text-white/85";
          return (
            <div
              key={offset}
              className="absolute inset-x-0 h-[var(--row)] py-1 pr-[calc(var(--row)*0.7)]"
              style={{ top }}
              aria-hidden={offset !== 0}
            >
              <p
                title={name}
                style={style}
                className={`flex h-full items-center justify-center rounded-lg border px-6 text-center font-bold leading-none tracking-tight ${tone}`}
              >
                <span className="truncate">{name}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Selection window: fixed frame on the centre row plus an arrow on the
          right pointing at it, so it is never ambiguous which name is drawn. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-[var(--row)] py-0.5 pr-[calc(var(--row)*0.7)]"
        style={{ top: `calc(var(--row) * ${SIDE_ROWS})` }}
      >
        <div
          className="h-full rounded-xl border-[3px]"
          style={{ borderColor: accent }}
        />
      </div>
      <svg
        aria-hidden
        viewBox="0 0 20 24"
        className="pointer-events-none absolute right-0 h-[calc(var(--row)*0.6)] w-[calc(var(--row)*0.5)]"
        style={{
          top: `calc(var(--row) * ${SIDE_ROWS + 0.2})`,
          filter: `drop-shadow(0 0 6px ${accent})`,
        }}
      >
        <path d="M20 0 L0 12 L20 24 Z" fill={accent} />
      </svg>
    </div>
  );
}
