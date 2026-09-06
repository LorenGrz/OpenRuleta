import type { CSSProperties, ReactNode } from "react";

type Props = {
  ariaLabel: string;
  /** Loop length in seconds. Longer list -> larger value keeps the speed even. */
  durationSeconds?: number;
  className?: string;
  /** One track's worth of items. Rendered twice for a seamless loop. */
  children: ReactNode;
};

/**
 * Full-bleed marquee: two identical tracks side by side, the wrapper animates
 * `translateX(-50%)` (exactly one track). Pauses on hover, respects
 * `prefers-reduced-motion`. The animation itself lives in `theme.css`.
 */
export function Marquee({
  ariaLabel,
  durationSeconds,
  className,
  children,
}: Props) {
  const style = durationSeconds
    ? ({ "--marquee-duration": `${durationSeconds}s` } as CSSProperties)
    : undefined;

  return (
    <section
      aria-label={ariaLabel}
      className={`marquee-paused w-full overflow-hidden ${className ?? ""}`}
    >
      <div className="animate-marquee flex w-max" style={style}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </section>
  );
}
