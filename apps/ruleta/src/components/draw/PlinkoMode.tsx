"use client";

import { useEffect, useRef, useState } from "react";

import { siteConfig } from "@openruleta/config";

import {
  ballPositionAt,
  binX,
  pegXs,
  pegY,
  plinkoGeometry,
  type PlinkoGeometry,
} from "@/lib/draw/plinkoBoard";
import {
  generatePlinkoPaths,
  plinkoDropTimes,
  type PlinkoPlan,
} from "@/lib/draw/plinkoPaths";

import type { DrawModeProps } from "./types";
import { SETTLE_GRACE_MS, useDrawRun, useSettleOnce } from "./useDrawRun";
import { useElementSize } from "./useElementSize";

const { drawModes } = siteConfig.ruleta;
const colors = {
  win: drawModes.winColor,
  winInk: drawModes.winInk,
  peg: drawModes.plinko.pegColor,
  balls: drawModes.plinko.ballColors,
  ballInk: drawModes.plinko.ballInk,
  rim: siteConfig.ruleta.wheelRimColor,
};
const text = drawModes.plinko;

/** Even, so the board has a dead-centre prize bin. */
const ROWS = 12;
const MAX_BATCHES = 16;
const TIMING = {
  normal: { totalMs: 9000, fallMs: 2800, fallLargeMs: 2200, finaleMs: 1600 },
  reduced: { totalMs: 1200, fallMs: 900, fallLargeMs: 900, finaleMs: 500 },
};
const LARGE_POOL = 150;
const TICKER_SIZE = 10;
const TICKER_FLUSH_MS = 120;

/** Mutable per-run state, owned by the animation loop (never by render). */
type Run = {
  id: number;
  plan: PlinkoPlan;
  starts: number[];
  fallMs: number;
  bounce: number;
  winnerIndex: number;
  initials: string[];
  startedAt: number | null;
  /** Last hop index per ball, to fire `peg()` once per hit. */
  lastRow: Int16Array;
  /** Landing order inside its bin, -1 while falling. */
  stackSlot: Int32Array;
  binFill: number[];
  winnerLanded: boolean;
};

type TickerItem = { key: number; name: string; prize: boolean };
type Finale = { runId: number; name: string; initials: string };

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  g: PlinkoGeometry,
  prizeBin: number,
  font: string,
): void {
  // Bins.
  const half = g.spacing / 2;
  const labelSize = Math.max(9, Math.min(16, g.spacing * 0.22));
  for (let b = 0; b <= g.rows; b++) {
    const x = binX(g, b) - half;
    const prize = b === prizeBin;
    ctx.globalAlpha = prize ? 0.95 : 1;
    ctx.fillStyle = prize ? colors.win : colors.rim;
    ctx.beginPath();
    ctx.roundRect(x + 2, g.binTop, g.spacing - 4, g.binHeight, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = prize ? colors.winInk : colors.peg;
    ctx.globalAlpha = prize ? 1 : 0.55;
    ctx.font = `${prize ? 700 : 500} ${labelSize}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      prize ? text.prizeLabel : text.outLabel,
      x + half,
      g.binTop + g.binHeight - 4,
      g.spacing - 8,
    );
    ctx.globalAlpha = 1;
  }
  // Pegs.
  ctx.fillStyle = colors.peg;
  for (let r = 0; r < g.rows; r++) {
    const y = pegY(g, r);
    for (const x of pegXs(g, r)) {
      ctx.beginPath();
      ctx.arc(x, y, g.pegRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  label: string | null,
  font: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (label && radius >= 8) {
    ctx.fillStyle = colors.ballInk;
    ctx.font = `700 ${Math.round(radius * 0.9)}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y + radius * 0.05, radius * 1.7);
  }
}

/** Paint one frame. Returns ball indices that landed during this frame. */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  g: PlinkoGeometry,
  run: Run | null,
  now: number,
  onPeg: (pitch: number) => void,
  font: string,
): number[] {
  ctx.clearRect(0, 0, g.width, g.height);
  drawBoard(ctx, g, ROWS / 2, font);
  if (!run || run.startedAt === null) return [];

  const landedNow: number[] = [];
  const elapsed = now - run.startedAt;
  const dot = g.ballRadius * 0.55;
  const perRow = Math.max(1, Math.floor((g.spacing - 6) / (dot * 2)));
  const binBottom = g.binTop + g.binHeight - g.spacing * 0.42;

  for (let i = 0; i < run.plan.paths.length; i++) {
    const t = elapsed - run.starts[i];
    if (t < 0) continue;
    const path = run.plan.paths[i];
    const fill = colors.balls[i % colors.balls.length];

    if (t >= run.fallMs) {
      if (run.stackSlot[i] < 0) {
        run.stackSlot[i] = run.binFill[path.bin]++;
        landedNow.push(i);
      }
      if (i === run.winnerIndex) continue; // drawn last, on top
      // Landed losers settle as small dots stacked in their bin.
      const slot = run.stackSlot[i];
      const col = slot % perRow;
      const row = Math.floor(slot / perRow);
      const x = binX(g, path.bin) + (col - (perRow - 1) / 2) * dot * 2;
      const y = Math.max(g.binTop + dot, binBottom - dot - row * dot * 1.8);
      drawBall(ctx, x, y, dot, fill, null, font);
      continue;
    }

    const pos = ballPositionAt(g, path, t / run.fallMs, run.bounce);
    if (pos.row >= 0 && pos.row !== run.lastRow[i]) {
      run.lastRow[i] = pos.row;
      onPeg((pos.x - g.centerX) / (g.rows * g.spacing) + 0.5);
    }
    if (i !== run.winnerIndex) {
      drawBall(ctx, pos.x, pos.y, g.ballRadius, fill, run.initials[i], font);
    }
  }

  // The winner is painted last so no other ball hides it.
  const w = run.winnerIndex;
  const tw = elapsed - run.starts[w];
  if (tw >= 0) {
    const pos = ballPositionAt(
      g,
      run.plan.paths[w],
      tw / run.fallMs,
      run.bounce,
    );
    const fill = colors.balls[w % colors.balls.length];
    if (pos.landed) {
      ctx.strokeStyle = colors.winInk;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, g.ballRadius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawBall(ctx, pos.x, pos.y, g.ballRadius, fill, run.initials[w], font);
  }
  return landedNow;
}

type Painter = { ctx: CanvasRenderingContext2D; font: string };

/** Size the backing store for the device pixel ratio and paint one frame. */
function paintCanvas(
  canvas: HTMLCanvasElement | null,
  g: PlinkoGeometry,
  run: Run | null,
): Painter | null {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(g.width * dpr);
  const h = Math.round(g.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Canvas fonts cannot read CSS variables; use the resolved brand stack.
  const font = getComputedStyle(canvas).fontFamily || "sans-serif";
  drawFrame(ctx, g, run, performance.now(), () => {}, font);
  return { ctx, font };
}

export function PlinkoMode({
  pool,
  winnerIndex,
  runId,
  onSettled,
  sound,
  reducedMotion,
}: DrawModeProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useElementSize(boxRef);
  const runRef = useRef<Run | null>(null);
  const settleOnce = useSettleOnce();
  const [ticker, setTicker] = useState<{ runId: number; items: TickerItem[] }>({
    runId: 0,
    items: [],
  });
  const [finale, setFinale] = useState<Finale | null>(null);
  const n = pool.length;

  // Repaint on resize and when a finished run is cleared (winner confirmed).
  useEffect(() => {
    if (winnerIndex === null) runRef.current = null;
    if (width > 0 && height > 0) {
      paintCanvas(
        canvasRef.current,
        plinkoGeometry(width, height, ROWS),
        runRef.current,
      );
    }
  }, [width, height, winnerIndex]);

  useDrawRun(runId, winnerIndex !== null, () => {
    const id = runId;
    const box = boxRef.current;
    if (winnerIndex === null || n === 0) return;
    if (!box) {
      // No box to measure yet: nothing will animate, so settle right away
      // instead of leaving the UI parked on "spinning" (I3).
      settleOnce(id, onSettled);
      return;
    }
    const timing = reducedMotion ? TIMING.reduced : TIMING.normal;
    const fallMs = n > LARGE_POOL ? timing.fallLargeMs : timing.fallMs;
    const seed = (Math.random() * 2 ** 32) >>> 0;
    const names = pool.map((p) => p.name);
    const run: Run = {
      id,
      plan: generatePlinkoPaths({ count: n, winnerIndex, rows: ROWS, seed }),
      starts: plinkoDropTimes({
        count: n,
        winnerIndex,
        totalMs: timing.totalMs,
        fallMs,
        maxBatches: MAX_BATCHES,
        seed,
      }),
      fallMs,
      bounce: reducedMotion ? 0 : 1,
      winnerIndex,
      initials: names.map(initialsOf),
      startedAt: null,
      lastRow: new Int16Array(n).fill(-1),
      stackSlot: new Int32Array(n).fill(-1),
      binFill: new Array<number>(ROWS + 1).fill(0),
      winnerLanded: false,
    };
    runRef.current = run;

    let frame = 0;
    let finaleTimer = 0;
    let lastFlush = 0;
    let pending: TickerItem[] = [];
    const painter = paintCanvas(
      canvasRef.current,
      plinkoGeometry(box.clientWidth, box.clientHeight, ROWS),
      run,
    );
    if (!painter) {
      // No 2D context available: same as the missing-box case above, settle
      // instead of leaving the UI stuck "spinning" (I3).
      settleOnce(id, onSettled);
      return;
    }

    const loop = (now: number) => {
      run.startedAt ??= now;
      // Re-measured every frame so a resize mid-run keeps balls on the pegs.
      const g = plinkoGeometry(box.clientWidth, box.clientHeight, ROWS);
      const landed = drawFrame(
        painter.ctx,
        g,
        run,
        now,
        (p) => sound.peg(p),
        painter.font,
      );
      for (const i of landed) {
        pending.push({
          key: i,
          name: names[i],
          prize: run.plan.paths[i].bin === run.plan.prizeBin,
        });
      }
      if (pending.length && now - lastFlush > TICKER_FLUSH_MS) {
        const batch = pending;
        pending = [];
        lastFlush = now;
        setTicker((prev) => ({
          runId: id,
          items: [
            ...batch.reverse(),
            ...(prev.runId === id ? prev.items : []),
          ].slice(0, TICKER_SIZE),
        }));
      }
      if (!run.winnerLanded && run.stackSlot[winnerIndex] >= 0) {
        run.winnerLanded = true;
        sound.land();
        setFinale({
          runId: id,
          name: names[winnerIndex],
          initials: run.initials[winnerIndex],
        });
        finaleTimer = window.setTimeout(() => {
          sound.win();
          finaleTimer = window.setTimeout(() => {
            settleOnce(id, onSettled);
          }, timing.finaleMs);
        }, timing.finaleMs / 3);
      }
      // Keep painting until every ball has landed (losers may trail the winner).
      const allDown = run.stackSlot.every((s) => s >= 0);
      if (!allDown || pending.length) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    // Backstop (I3): settles the run even if the loop above never reaches
    // its own completion handler, so a stuck mode cannot leave the UI
    // parked on "spinning" forever.
    const fallback = window.setTimeout(
      () => settleOnce(id, onSettled),
      timing.totalMs + timing.finaleMs * 2 + SETTLE_GRACE_MS,
    );
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(finaleTimer);
      window.clearTimeout(fallback);
    };
  });

  const showFinale = finale && finale.runId === runId && winnerIndex !== null;
  const tickerItems =
    ticker.runId === runId && winnerIndex !== null ? ticker.items : [];

  return (
    <div className="flex h-full w-full min-h-0 gap-4">
      <div ref={boxRef} className="relative min-h-0 min-w-0 flex-1">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={text.boardAriaLabel}
          className="absolute inset-0 h-full w-full"
        />
        {showFinale && (
          <div
            className="plinko-finale absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/60 backdrop-blur-[2px]"
            role="status"
          >
            <span
              aria-hidden
              className="flex h-28 w-28 items-center justify-center rounded-full text-4xl font-bold"
              style={{
                backgroundColor: colors.win,
                color: colors.winInk,
                boxShadow: `0 0 60px 10px ${colors.win}`,
              }}
            >
              {finale.initials}
            </span>
            <p
              title={finale.name}
              className="max-w-[90%] truncate text-5xl font-bold text-white lg:text-6xl"
            >
              {finale.name}
            </p>
          </div>
        )}
      </div>
      <aside
        className="hidden w-52 flex-none flex-col gap-2 overflow-hidden xl:flex"
        aria-label={text.tickerHeading}
      >
        <h3 className="text-xs font-semibold text-white/50">
          {text.tickerHeading}
        </h3>
        <ol className="flex flex-col gap-1.5" aria-live="off">
          {tickerItems.map((item) => (
            <li
              key={item.key}
              title={item.name}
              className="flex items-center justify-between gap-2 rounded-md bg-white/[0.06] px-2.5 py-1.5 text-sm text-white/85"
              style={
                item.prize
                  ? { backgroundColor: colors.win, color: colors.winInk }
                  : undefined
              }
            >
              <span className="truncate font-medium">{item.name}</span>
              <span className="flex-none text-xs opacity-70">
                {item.prize ? text.prizeLabel : text.outLabel}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
