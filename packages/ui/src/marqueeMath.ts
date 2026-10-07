/**
 * Pure math behind the seamless `Marquee`: how many copies of one track are
 * needed to cover the container (no gap), and how long one loop should take
 * to keep a constant px/s speed regardless of content length.
 */

/**
 * Number of times to repeat one copy of the items so a single track is at
 * least as wide as the container. With `copies >= ceil(container / items)`,
 * each track is `>= containerWidth`, so the `translateX(-50%)` loop never
 * reveals a gap.
 */
export function copiesNeeded(
  containerWidth: number,
  itemsWidth: number,
): number {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(itemsWidth) ||
    itemsWidth <= 0
  ) {
    return 1;
  }
  return Math.max(1, Math.ceil(containerWidth / itemsWidth));
}

/**
 * Animation duration (seconds) for a track of `trackWidth` px moving at
 * `pxPerSecond`, so the loop speed stays visually constant no matter how
 * many copies/items a given track ends up with.
 */
export function durationFor(trackWidth: number, pxPerSecond: number): number {
  const width = Number.isFinite(trackWidth) && trackWidth > 0 ? trackWidth : 0;
  const speed =
    Number.isFinite(pxPerSecond) && pxPerSecond > 0 ? pxPerSecond : 1;
  return width / speed;
}
