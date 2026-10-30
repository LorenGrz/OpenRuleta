/**
 * Fill of wheel segment `index` out of `count`. Fills alternate [0], [1]; with
 * an odd count the last segment would touch the first one in the same colour,
 * so it takes `fills[2]` when one is given (the raffle wheel passes two).
 */
export function pickSegmentFill(
  index: number,
  count: number,
  fills: readonly string[],
): string {
  if (count > 1 && count % 2 === 1 && index === count - 1 && fills[2]) {
    return fills[2];
  }
  return fills[index % 2];
}
