"use client";

import { siteConfig } from "@openruleta/config";

import { pickSegmentFill } from "@/lib/wheelFills";
import {
  fitLabel,
  LABEL_LINE_HEIGHT,
  LABEL_TEXT_END_RADIUS,
} from "@/lib/wheelLabel";

const { wheelSegmentFills, wheelRimColor } = siteConfig.ruleta;

const VB = 100;
const C = VB / 2;
const R = 48;

type WheelEntry = { id: string; name: string };

type Props = {
  entries: WheelEntry[];
  /** Absolute rotation in degrees, controlled by the parent. */
  rotation: number;
  /** Spin animation length in ms (from config). */
  durationMs: number;
  spinning: boolean;
  onSettled: () => void;
  /** Segment fills; defaults to the raffle's two-colour `wheelSegmentFills`. */
  fills?: readonly string[];
  /** Show each entry's whole name (radial, up to two lines) instead of its
   *  first word or initials. */
  fullLabels?: boolean;
  /** Tailwind max-width of the wheel; defaults to the raffle's 460px. */
  maxWidthClassName?: string;
};

function polar(angleDeg: number, radius: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [C + radius * Math.cos(a), C + radius * Math.sin(a)];
}

function segmentPath(i: number, seg: number): string {
  const [x1, y1] = polar(i * seg, R);
  const [x2, y2] = polar((i + 1) * seg, R);
  const largeArc = seg > 180 ? 1 : 0;
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function label(name: string, count: number): string {
  const parts = name.trim().split(/\s+/);
  if (count <= 10) {
    return parts[0].length > 12 ? `${parts[0].slice(0, 11)}…` : parts[0];
  }
  if (count <= 32) {
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  return "";
}

/**
 * Presentational wheel. All spin math lives in the parent event handler; this
 * component only renders `rotation` and reports when the CSS transition ends.
 */
export function Wheel({
  entries,
  rotation,
  durationMs,
  spinning,
  onSettled,
  fills = wheelSegmentFills,
  fullLabels = false,
  maxWidthClassName = "max-w-[460px]",
}: Props) {
  const n = entries.length;
  const seg = n > 0 ? 360 / n : 360;
  const fontSize = n <= 8 ? 3.8 : n <= 16 ? 3 : n <= 32 ? 2.2 : 0;
  const mid = (i: number) => i * seg + seg / 2;

  return (
    <div className={`relative aspect-square w-full ${maxWidthClassName}`}>
      <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 drop-shadow-lg">
        <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden>
          <path d="M17 30 L0 0 L34 0 Z" fill="#ffffff" />
        </svg>
      </div>

      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        className="h-full w-full rounded-full shadow-[0_0_60px_rgba(37,99,235,0.35)]"
      >
        <defs>
          <clipPath id="wheel-hub-clip">
            <circle cx={C} cy={C} r={11.5} />
          </clipPath>
        </defs>

        <circle cx={C} cy={C} r={R} fill={wheelRimColor} />
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "50% 50%",
            transition: `transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
          onTransitionEnd={() => {
            if (spinning) onSettled();
          }}
        >
          {n === 0 && <circle cx={C} cy={C} r={R} fill={wheelRimColor} />}
          {n === 1 && <circle cx={C} cy={C} r={R} fill={fills[0]} />}
          {n > 1 &&
            entries.map((entry, i) => (
              <path
                key={entry.id}
                d={segmentPath(i, seg)}
                fill={pickSegmentFill(i, n, fills)}
                stroke="#ffffff"
                strokeWidth={0.5}
              />
            ))}

          {fullLabels &&
            n > 1 &&
            entries.map((entry, i) => {
              const { lines, fontSize: size } = fitLabel(entry.name, n);
              const lineHeight = size * LABEL_LINE_HEIGHT;
              return (
                <text
                  key={`t-${entry.id}`}
                  x={C + LABEL_TEXT_END_RADIUS}
                  y={C}
                  fill="#ffffff"
                  fontSize={size}
                  fontWeight={600}
                  textAnchor="end"
                  dominantBaseline="central"
                  transform={`rotate(${mid(i) - 90} ${C} ${C})`}
                >
                  {lines.map((line, k) => (
                    <tspan
                      key={k}
                      x={C + LABEL_TEXT_END_RADIUS}
                      dy={
                        k === 0
                          ? -((lines.length - 1) * lineHeight) / 2
                          : lineHeight
                      }
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}

          {!fullLabels &&
            fontSize > 0 &&
            entries.map((entry, i) => {
              const text = label(entry.name, n);
              if (!text) return null;
              return (
                <text
                  key={`t-${entry.id}`}
                  x={C}
                  y={C - R * 0.62}
                  fill="#ffffff"
                  fontSize={fontSize}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid(i)} ${C} ${C})`}
                >
                  {text}
                </text>
              );
            })}
        </g>

        <circle
          cx={C}
          cy={C}
          r={12}
          fill="#ffffff"
          stroke="#0b1220"
          strokeWidth={1.2}
        />
        <image
          href={siteConfig.assets.wheelLogo}
          x={C - 11}
          y={C - 11}
          width={22}
          height={22}
          clipPath="url(#wheel-hub-clip)"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    </div>
  );
}
