/**
 * Pure geometry/text helpers for the wheel's name labels (see Wheel.tsx and
 * WheelMode.tsx). All ratios are relative to the wheel's own total available
 * radius, so the same numbers hold at any projector size.
 *
 * Placement has three tiers:
 *   - "inside"  — labels run radially inside the wheel, rim to hub, when
 *     every name reads cleanly at that radius.
 *   - "outside" — labels run in a corona just outside a (smaller) wheel.
 *   - "sparse"  — like "outside", but only every `sparseStep` segment gets a
 *     label, because even the generous outside ring can't fit a legible font.
 */

export type LabelPlacement = "inside" | "outside" | "sparse";

/** Smallest font (real CSS px, 1920x1080 reference) still legible on a projector. */
export const MIN_READABLE_FONT_PX = 12;
/** Largest font a single label is ever drawn at. */
export const MAX_LABEL_FONT_PX = 22;

/** Average glyph width as a fraction of font size, for a proportional sans. */
const CHAR_WIDTH_RATIO = 0.58;
/** Share of a segment's arc a label may use; leaves a gap to its neighbours. */
const ARC_FONT_RATIO = 0.82;

/** Inside placement: labels run from just under the rim to just past the hub. */
export const INSIDE_RIM_RATIO = 0.95;
export const INSIDE_HUB_RATIO = 0.3;

/** Outside placement: the ring reaches out to near the container edge. */
export const OUTSIDE_RING_END_RATIO = 0.97;
/** Gap kept between the (shrunk) wheel's edge and the first outside label. */
const OUTSIDE_RING_GAP_RATIO = 0.03;

/**
 * Font size (real px) that fits the arc at `radiusPx` for `n` equal segments,
 * clamped to a legible range.
 */
export function fontSizeFor(n: number, radiusPx: number): number {
  return Math.min(
    MAX_LABEL_FONT_PX,
    Math.max(MIN_READABLE_FONT_PX, idealFontSizeFor(n, radiusPx)),
  );
}

/**
 * Same as `fontSizeFor` but unclamped at the low end, so callers can tell
 * whether a font would actually fall under the legible floor.
 */
function idealFontSizeFor(n: number, radiusPx: number): number {
  if (n <= 0 || radiusPx <= 0) return MAX_LABEL_FONT_PX;
  return ((2 * Math.PI * radiusPx) / n) * ARC_FONT_RATIO;
}

/** How many characters fit in `lengthPx` of radial room at `fontSizePx`. */
export function maxCharsFor(fontSizePx: number, lengthPx: number): number {
  if (fontSizePx <= 0 || lengthPx <= 0) return 0;
  return Math.max(0, Math.floor(lengthPx / (fontSizePx * CHAR_WIDTH_RATIO)));
}

/**
 * `name` shortened to fit `maxChars`: the full name if it fits, else "First
 * L." (first name + last-name initial) if that fits, else the first name,
 * else the first name cut with "…", else initials. Never a bare "…", so every
 * segment keeps something identifiable.
 */
export function labelFor(name: string, maxChars: number): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (maxChars <= 0 || trimmed.length === 0) return "";
  if (trimmed.length <= maxChars) return trimmed;
  const parts = trimmed.split(" ");
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    const short = `${parts[0]} ${last[0].toUpperCase()}.`;
    if (short.length <= maxChars) return short;
  }
  const first = parts[0];
  if (first.length <= maxChars) return first;
  if (maxChars >= 4) return `${first.slice(0, maxChars - 1)}…`;
  return parts
    .map((p) => p[0].toUpperCase())
    .join("")
    .slice(0, maxChars);
}

/**
 * Fraction of the total radius the wheel disc keeps when labels sit outside
 * it. More segments and longer names both need a wider ring, so the wheel
 * gives up a little more space, never below 0.5.
 */
export function outsideWheelRatio(n: number, names: string[]): number {
  const longest = names.reduce(
    (max, name) => Math.max(max, name.trim().length),
    0,
  );
  const base = n <= 40 ? 0.65 : n <= 90 ? 0.6 : 0.55;
  return longest > 24 ? Math.max(0.5, base - 0.05) : base;
}

/** Midpoint radius ratio (of the total radius) used to size outside/sparse labels. */
export function outsideLabelRadiusRatio(n: number, names: string[]): number {
  const start = outsideWheelRatio(n, names) + OUTSIDE_RING_GAP_RATIO;
  return (start + OUTSIDE_RING_END_RATIO) / 2;
}

/**
 * Whether names fit *inside* the wheel (radial labels from rim to hub), have
 * to sit *outside* in a corona, or — if not even that generous ring gives a
 * legible font — fall back to a *sparse* corona.
 *
 * "Fits inside" means both: the font the inner arc allows is at least
 * `MIN_READABLE_FONT_PX`, and the inner radial room fits every name as a
 * full name or a "First L." short form, with no name needing an ellipsis.
 */
export function chooseLabelPlacement(
  n: number,
  wheelRadiusPx: number,
  names: string[],
): LabelPlacement {
  if (n <= 0 || wheelRadiusPx <= 0) return "inside";

  const insideRadiusPx =
    wheelRadiusPx * ((INSIDE_RIM_RATIO + INSIDE_HUB_RATIO) / 2);
  const insideLengthPx = wheelRadiusPx * (INSIDE_RIM_RATIO - INSIDE_HUB_RATIO);
  if (idealFontSizeFor(n, insideRadiusPx) >= MIN_READABLE_FONT_PX) {
    const maxChars = maxCharsFor(
      fontSizeFor(n, insideRadiusPx),
      insideLengthPx,
    );
    if (names.every((name) => labelFor(name, maxChars) !== "…")) {
      return "inside";
    }
  }

  const outsideRadiusPx = wheelRadiusPx * outsideLabelRadiusRatio(n, names);
  return idealFontSizeFor(n, outsideRadiusPx) >= MIN_READABLE_FONT_PX
    ? "outside"
    : "sparse";
}

/**
 * Smallest step `k` (1 = every segment) such that keeping one label every
 * `k` segments gives a legible font at `labelRadiusPx`.
 */
export function sparseStep(n: number, labelRadiusPx: number): number {
  if (n <= 1) return 1;
  let k = 1;
  while (
    k < n &&
    idealFontSizeFor(Math.max(1, Math.ceil(n / k)), labelRadiusPx) <
      MIN_READABLE_FONT_PX
  ) {
    k++;
  }
  return k;
}
