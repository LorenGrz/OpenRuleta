"use client";

import { useRef, useState, type CSSProperties } from "react";

import { siteConfig } from "@openruleta/config";

import { fitGrid, gridHopSchedule } from "@/lib/draw/gridLayout";
import { createRng } from "@/lib/draw/random";

import type { DrawModeProps } from "./types";
import { useDrawRun } from "./useDrawRun";
import { useElementSize } from "./useElementSize";

const { wheelDurationMs, drawModes } = siteConfig.ruleta;
const GAP = 8;
const HOPS = 26;
const REDUCED_HOPS = 3;
const REDUCED_DURATION_MS = 700;
const HOLD_MS = 700;

type Highlight = { runId: number; index: number; done: boolean };

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
  const settledRun = useRef(0);
  const n = pool.length;

  useDrawRun(runId, winnerIndex !== null, () => {
    if (winnerIndex === null || n === 0) return;
    const id = runId;
    const durationMs = reducedMotion ? REDUCED_DURATION_MS : wheelDurationMs;
    const hops = gridHopSchedule(
      n,
      winnerIndex,
      durationMs,
      reducedMotion ? REDUCED_HOPS : Math.min(HOPS, Math.max(6, n * 3)),
      createRng((Math.random() * 2 ** 32) >>> 0),
    );
    let frame = 0;
    let hold = 0;
    let shown = -1;
    let startedAt: number | null = null;

    const step = (now: number) => {
      startedAt ??= now;
      const elapsed = now - startedAt;
      let current = shown;
      while (current + 1 < hops.length && hops[current + 1].atMs <= elapsed) {
        current++;
      }
      if (current !== shown && current >= 0) {
        shown = current;
        const done = current === hops.length - 1;
        setHighlight({ runId: id, index: hops[current].index, done });
        if (done) {
          sound.land();
          hold = window.setTimeout(() => {
            if (settledRun.current === id) return;
            settledRun.current = id;
            onSettled();
          }, HOLD_MS);
          return;
        }
        sound.tick();
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hold);
    };
  });

  const fit = fitGrid(n, width, height, { gap: GAP });
  // A highlight only means something for the run (and pool) it belongs to.
  const active =
    highlight && highlight.runId === runId && winnerIndex !== null
      ? highlight
      : null;

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
            const lit = active?.index === i;
            const won = lit && active.done;
            return (
              <li
                key={p.id}
                title={p.name}
                style={won ? winStyle : undefined}
                className={`flex min-w-0 items-center justify-center rounded-lg px-[0.6em] font-semibold leading-tight transition-colors duration-100 ${
                  won
                    ? "draw-win-pulse"
                    : lit
                      ? "bg-primary text-white"
                      : "bg-white/[0.06] text-white/80"
                }`}
              >
                <span className="truncate">{p.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
