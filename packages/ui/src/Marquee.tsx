"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { copiesNeeded, durationFor } from "./marqueeMath.ts";

type Props = {
  ariaLabel: string;
  /** Loop length in seconds. Overrides the speed-based duration when set. */
  durationSeconds?: number;
  /** Constant scroll speed in px/s, used when `durationSeconds` is not set. */
  speedPxPerSecond?: number;
  className?: string;
  /** One track's worth of items. Repeated as many times as needed per track. */
  children: ReactNode;
};

const DEFAULT_SPEED_PX_PER_SECOND = 40;
/** Safe guess before the first measurement (SSR or pre-`ResizeObserver`): wide
 * enough that a track never shows a gap while we wait to measure for real. */
const DEFAULT_COPIES = 2;

/**
 * Full-bleed marquee: two identical tracks side by side, the wrapper animates
 * `translateX(-50%)` (exactly one track). Each track repeats the children
 * enough times to be at least as wide as the container, so the loop never
 * shows a gap or jumps. Pauses on hover, respects `prefers-reduced-motion`.
 * The animation itself lives in `theme.css`.
 */
export function Marquee({
  ariaLabel,
  durationSeconds,
  speedPxPerSecond = DEFAULT_SPEED_PX_PER_SECOND,
  className,
  children,
}: Props) {
  const containerRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(DEFAULT_COPIES);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const items = itemsRef.current;
    if (!container || !items) return;

    let containerWidth = 0;
    let itemsWidth = 0;

    const recalc = () => {
      const nextCopies = copiesNeeded(containerWidth, itemsWidth);
      setCopies(nextCopies);
      setTrackWidth(itemsWidth * nextCopies);
    };

    const containerObserver = new ResizeObserver((entries) => {
      containerWidth = entries[0]?.contentRect.width ?? containerWidth;
      recalc();
    });
    const itemsObserver = new ResizeObserver((entries) => {
      itemsWidth = entries[0]?.contentRect.width ?? itemsWidth;
      recalc();
    });

    containerObserver.observe(container);
    itemsObserver.observe(items);

    return () => {
      containerObserver.disconnect();
      itemsObserver.disconnect();
    };
  }, []);

  const duration =
    durationSeconds ??
    (trackWidth > 0 ? durationFor(trackWidth, speedPxPerSecond) : undefined);
  const style = duration
    ? ({ "--marquee-duration": `${duration}s` } as CSSProperties)
    : undefined;

  const copyIndexes = Array.from({ length: copies }, (_, index) => index);

  return (
    <section
      ref={containerRef}
      aria-label={ariaLabel}
      className={`marquee-paused relative w-full overflow-hidden ${className ?? ""}`}
    >
      {/* Invisible, out-of-flow: measures one copy's width for `copiesNeeded`/`durationFor`. */}
      <div
        ref={itemsRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex shrink-0"
      >
        {children}
      </div>
      <div className="animate-marquee flex w-max" style={style}>
        <div className="flex shrink-0">
          {copyIndexes.map((index) => (
            <div
              key={index}
              className="flex shrink-0"
              aria-hidden={index > 0 ? true : undefined}
            >
              {children}
            </div>
          ))}
        </div>
        <div className="flex shrink-0" aria-hidden>
          {copyIndexes.map((index) => (
            <div key={index} className="flex shrink-0">
              {children}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
