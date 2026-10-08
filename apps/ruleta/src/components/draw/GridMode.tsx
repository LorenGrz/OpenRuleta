"use client";

import { useRef, useState, type CSSProperties } from "react";

import { siteConfig } from "@openruleta/config";

import {
  fitGrid,
  gridSweepSchedule,
  type GridHop,
} from "@/lib/draw/gridLayout";

import type { DrawModeProps } from "./types";
import { SETTLE_GRACE_MS, useDrawRun, useSettleOnce } from "./useDrawRun";
import { useElementSize } from "./useElementSize";

const { wheelDurationMs, drawModes } = siteConfig.ruleta;
const GAP = 8;
const REDUCED_DURATION_MS = 700;
const HOLD_MS = 700;
/** Cards behind the sweep's head that still glow, fading out with distance. */
const TRAIL_LENGTH = 5;
/** Sound ticks never play closer together than this, however fast the sweep. */
const TICK_MIN_GAP_MS = 28;

type Highlight = {
  runId: number;
  hops: GridHop[];
  step: number;
  done: boolean;
};

export function GridMode({
  pool,
  winnerIndex,
  runId,
  onSettled,
  sound,
  reducedMotion,
}: DrawModeProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(boxRef);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const settleOnce = useSettleOnce();
  const n = pool.length;

  useDrawRun(runId, winnerIndex !== null, () => {
    if (winnerIndex === null || n === 0) return;
    const id = runId;
    const durationMs = reducedMotion ? REDUCED_DURATION_MS : wheelDurationMs;
    const hops = gridSweepSchedule(n, winnerIndex, durationMs);
    let frame = 0;
    let hold = 0;
    let step = -1;
    let startedAt: number | null = null;
    let lastTickAt = -Infinity;

    const tick = (now: number) => {
      startedAt ??= now;
      const elapsed = now - startedAt;
      let current = step;
      while (current + 1 < hops.length && hops[current + 1].atMs <= elapsed) {
        current++;
      }
      if (current !== step && current >= 0) {
        step = current;
        const done = current === hops.length - 1;
        setHighlight({ runId: id, hops, step: current, done });
        if (done) {
          sound.land();
          hold = window.setTimeout(() => settleOnce(id, onSettled), HOLD_MS);
          return;
        }
        // Throttled (I-grid): at the sweep's fastest, several hops land per
        // animation frame; without this the tick would saturate into noise.
        if (now - lastTickAt >= TICK_MIN_GAP_MS) {
          sound.tick();
          lastTickAt = now;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
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

  const fit = fitGrid(n, width, height, { gap: GAP });
  // A highlight only means something for the run (and pool) it belongs to.
  const active =
    highlight && highlight.runId === runId && winnerIndex !== null
      ? highlight
      : null;
  const currentIndex = active
    ? (active.hops[active.step]?.index ?? null)
    : null;

  // Chase-light trail: the cards the sweep crossed just before the current
  // one, fading out with distance. Only while still moving — once it settles
  // the winner's own pulse takes over and the rest of the grid dims instead.
  const trailAges = new Map<number, number>();
  if (active && !active.done) {
    for (let age = 1; age <= TRAIL_LENGTH; age++) {
      const hop = active.hops[active.step - age];
      if (!hop || hop.index === currentIndex) break;
      if (!trailAges.has(hop.index)) trailAges.set(hop.index, age);
    }
  }

  const winStyle: CSSProperties = {
    backgroundColor: drawModes.winColor,
    color: drawModes.winInk,
    ["--draw-win" as string]: drawModes.winColor,
  };

  return (
    <div ref={boxRef} className="h-full w-full min-h-0 overflow-hidden py-2">
      {width > 0 && (
        <ul
          className="grid h-full w-full"
          style={{
            gap: GAP,
            gridTemplateColumns: `repeat(${fit.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${fit.rows}, minmax(0, 1fr))`,
            fontSize: fit.fontSize,
          }}
        >
          {pool.map((p, i) => {
            const isCurrent = currentIndex === i;
            const won = isCurrent && (active?.done ?? false);
            const trailAge = won ? undefined : trailAges.get(i);
            const dimmed = (active?.done ?? false) && !won;

            let tone =
              "bg-gradient-to-br from-white/[0.08] to-white/[0.02] text-white/80";
            let style: CSSProperties | undefined;
            if (won) {
              tone = "draw-win-pulse";
              style = winStyle;
            } else if (isCurrent || trailAge !== undefined) {
              tone = "bg-primary text-white";
              if (trailAge !== undefined) {
                // Furthest trail card (age === TRAIL_LENGTH) fades almost out;
                // the one right behind the head (age === 1) stays nearly lit.
                const t = 1 - (trailAge - 1) / TRAIL_LENGTH;
                style = {
                  opacity: 0.2 + 0.5 * t,
                  boxShadow: `0 0 ${4 + 10 * t}px var(--color-primary)`,
                };
              }
            } else if (dimmed) {
              style = { opacity: 0.55 };
            }

            return (
              <li
                key={p.id}
                title={p.name}
                style={style}
                className={`relative flex min-w-0 items-center justify-center rounded-lg px-[0.6em] font-semibold leading-tight transition-colors duration-100 ${tone}`}
              >
                <span className="truncate">{p.name}</span>
                {!won && (
                  <span className="absolute left-1 top-0.5 text-[0.5em] font-normal text-white/25">
                    {i + 1}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
