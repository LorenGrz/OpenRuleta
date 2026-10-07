"use client";

import { useMemo } from "react";

import { siteConfig } from "@openruleta/config";

import { WHEEL_TIMING_FUNCTION } from "@/lib/draw/wheelTiming";
import {
  INSIDE_HUB_RATIO,
  INSIDE_RIM_RATIO,
  OUTSIDE_RING_END_RATIO,
  chooseLabelPlacement,
  fontSizeFor,
  labelFor,
  maxCharsFor,
  outsideLabelRadiusRatio,
  outsideWheelRatio,
  sparseStep,
} from "@/lib/draw/wheelLabels";

const {
  wheelSegmentFills,
  wheelRimColor,
  wheelLabelInk,
  wheelLabelInks,
  drawModes,
} = siteConfig.ruleta;

/**
 * SVG coordinate space: a fixed 100x100 "wheel" box, plus a margin so outside
 * radial labels (which can reach close to the container edge) are never
 * clipped by the viewBox.
 */
const VB = 100;
const MARGIN = 8;
const VB_TOTAL = VB + MARGIN * 2;
const C = VB / 2;
/** Wheel's own total radius (viewBox units) when it uses the full space. */
const R = 48;
/** Hub ring / clip / logo radii, kept proportional to whatever radius the wheel draws at. */
const HUB_RING_RATIO = 12 / R;
const HUB_CLIP_RATIO = 11.5 / R;
const LOGO_RATIO = 11 / R;

type WheelEntry = { id: string; name: string };

type Props = {
  entries: WheelEntry[];
  /** Absolute rotation in degrees, controlled by the parent. */
  rotation: number;
  /** Spin animation length in ms (from config). */
  durationMs: number;
  spinning: boolean;
  onSettled: () => void;
  /** Rendered CSS pixel size (square) of the wheel; 0 before the first measurement. */
  sizePx: number;
  /** Index, in `entries`, to highlight as the winner once the wheel is at rest. */
  highlightIndex: number | null;
};

function polar(angleDeg: number, radius: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [C + radius * Math.cos(a), C + radius * Math.sin(a)];
}

function segmentPath(i: number, seg: number, radius: number): string {
  const [x1, y1] = polar(i * seg, radius);
  const [x2, y2] = polar((i + 1) * seg, radius);
  const largeArc = seg > 180 ? 1 : 0;
  return `M ${C} ${C} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

type RadialLabel = {
  id: string;
  text: string;
  fill: string;
  fontSizeVb: number;
  fontWeight: number;
  x: number;
  y: number;
  rotateDeg: number;
  textAnchor: "start" | "end";
};

/**
 * Geometry for one radial name label anchored near the rim, reading outward
 * (`inward = false`) or toward the hub (`inward = true`). Flipped 180° in the
 * left half of the wheel so the text is never upside down on screen.
 */
function radialTransform(
  mid: number,
  fromR: number,
  inward: boolean,
): { x: number; y: number; rotateDeg: number; textAnchor: "start" | "end" } {
  const normalizedMid = ((mid % 360) + 360) % 360;
  const flip = normalizedMid > 180;
  const base: "start" | "end" = inward ? "end" : "start";
  const textAnchor = flip ? (base === "start" ? "end" : "start") : base;
  const rotateDeg = flip ? mid + 90 : mid - 90;
  const [x, y] = polar(mid, fromR);
  return { x, y, rotateDeg, textAnchor };
}

type Layout = {
  wheelR: number;
  labels: RadialLabel[];
};

const EMPTY_LAYOUT: Layout = { wheelR: R, labels: [] };

/**
 * Presentational wheel. All spin math lives in WheelMode; this component only
 * renders `rotation` and reports when the CSS transition ends.
 */
export function Wheel({
  entries,
  rotation,
  durationMs,
  spinning,
  onSettled,
  sizePx,
  highlightIndex,
}: Props) {
  const n = entries.length;
  const seg = n > 0 ? 360 / n : 360;
  // Real px per viewBox unit, used to size fonts/lengths in real pixels.
  const scale = sizePx > 0 ? sizePx / VB_TOTAL : 0;
  const namesKey = entries.map((e) => e.name).join("\u0000");

  const layout = useMemo<Layout>(() => {
    if (n === 0 || scale <= 0) return EMPTY_LAYOUT;
    const names = entries.map((e) => e.name);
    const wheelRadiusPx = R * scale;
    const placement = chooseLabelPlacement(n, wheelRadiusPx, names);
    const wheelRatio = placement === "inside" ? 1 : outsideWheelRatio(n, names);
    const wheelR = R * wheelRatio;

    const inward = placement === "inside";
    const fromRVb = inward
      ? wheelR * INSIDE_RIM_RATIO
      : R * (wheelRatio + 0.03);
    const toRVb = inward
      ? wheelR * INSIDE_HUB_RATIO
      : R * OUTSIDE_RING_END_RATIO;
    const fontRadiusPx = inward
      ? wheelRadiusPx * ((INSIDE_RIM_RATIO + INSIDE_HUB_RATIO) / 2)
      : wheelRadiusPx * outsideLabelRadiusRatio(n, names);

    const fontSizePx = fontSizeFor(n, fontRadiusPx);
    const fontSizeVb = fontSizePx / scale;
    const lengthPx = Math.abs(fromRVb - toRVb) * scale;
    const maxChars = maxCharsFor(fontSizePx, lengthPx);

    const step = placement === "sparse" ? sparseStep(n, fontRadiusPx) : 1;

    const labels: RadialLabel[] = [];
    for (let i = 0; i < n; i++) {
      const highlighted = highlightIndex === i;
      if (placement === "sparse" && i % step !== 0 && !highlighted) continue;
      const text = labelFor(names[i], maxChars);
      if (!text) continue;
      const mid = i * seg + seg / 2;
      const { x, y, rotateDeg, textAnchor } = radialTransform(
        mid,
        fromRVb,
        inward,
      );
      const fill = highlighted
        ? drawModes.winColor
        : inward
          ? wheelLabelInks[i % 2]
          : wheelLabelInk;
      labels.push({
        id: entries[i].id,
        text,
        fill,
        fontSizeVb: highlighted ? fontSizeVb * 1.25 : fontSizeVb,
        fontWeight: highlighted ? 800 : 600,
        x,
        y,
        rotateDeg,
        textAnchor,
      });
    }
    return { wheelR, labels };
    // `entries` is recreated every render by the caller; `namesKey` plus `n`
    // stand in for its content so this only recomputes when the pool, size or
    // winner highlight actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, namesKey, scale, highlightIndex]);

  const { wheelR, labels } = layout;
  const hubRingR = wheelR * HUB_RING_RATIO;
  const hubClipR = wheelR * HUB_CLIP_RATIO;
  const logoR = wheelR * LOGO_RATIO;
  const strokeWidth = 0.5 * (wheelR / R);

  return (
    <div
      className="relative"
      style={{ width: sizePx || undefined, height: sizePx || undefined }}
    >
      <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 drop-shadow-lg">
        <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden>
          <path d="M17 30 L0 0 L34 0 Z" fill="#ffffff" />
        </svg>
      </div>

      <svg
        viewBox={`${-MARGIN} ${-MARGIN} ${VB_TOTAL} ${VB_TOTAL}`}
        className="h-full w-full overflow-visible"
      >
        <defs>
          <clipPath id="wheel-hub-clip">
            <circle cx={C} cy={C} r={hubClipR} />
          </clipPath>
        </defs>

        <circle cx={C} cy={C} r={wheelR} fill={wheelRimColor} />
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "50% 50%",
            transition: `transform ${durationMs}ms ${WHEEL_TIMING_FUNCTION}`,
          }}
          onTransitionEnd={() => {
            if (spinning) onSettled();
          }}
        >
          {n === 0 && <circle cx={C} cy={C} r={wheelR} fill={wheelRimColor} />}
          {n === 1 && (
            <circle cx={C} cy={C} r={wheelR} fill={wheelSegmentFills[0]} />
          )}
          {n > 1 &&
            entries.map((entry, i) => (
              <path
                key={entry.id}
                d={segmentPath(i, seg, wheelR)}
                fill={wheelSegmentFills[i % 2]}
                stroke="#ffffff"
                strokeWidth={strokeWidth}
              />
            ))}

          {labels.map((l) => (
            <text
              key={`t-${l.id}`}
              x={l.x}
              y={l.y}
              fill={l.fill}
              fontSize={l.fontSizeVb}
              fontWeight={l.fontWeight}
              textAnchor={l.textAnchor}
              dominantBaseline="middle"
              paintOrder="stroke"
              stroke="#0b1220"
              strokeWidth={l.fontSizeVb * 0.06}
              transform={`rotate(${l.rotateDeg} ${l.x} ${l.y})`}
            >
              {l.text}
            </text>
          ))}
        </g>

        <circle
          cx={C}
          cy={C}
          r={hubRingR}
          fill="#ffffff"
          stroke="#0b1220"
          strokeWidth={1.2 * (wheelR / R)}
        />
        <image
          href={siteConfig.assets.wheelLogo}
          x={C - logoR}
          y={C - logoR}
          width={logoR * 2}
          height={logoR * 2}
          clipPath="url(#wheel-hub-clip)"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    </div>
  );
}
