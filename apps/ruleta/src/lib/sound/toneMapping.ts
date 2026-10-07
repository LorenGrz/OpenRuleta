/**
 * Pure, audio-free helpers for the Tone.js engine. Kept separate from
 * `toneEngine.ts` so the mapping and throttle logic can be unit tested
 * without a real AudioContext.
 */

/** C major pentatonic across two octaves, low to high: no wrong notes to hit. */
export const PENTATONIC_SCALE = [
  "C4",
  "D4",
  "E4",
  "G4",
  "A4",
  "C5",
  "D5",
  "E5",
  "G5",
  "A5",
] as const;

/** Minimum time between two peg hits that are allowed to sound, in ms. */
export const PEG_THROTTLE_MS = 25;

/**
 * Maps a peg `pitch` in [0, 1] (low to high, left to right column) onto the
 * pentatonic scale, clamping out-of-range input instead of throwing.
 */
export function pitchToPentatonicNote(
  pitch: number,
  scale: readonly string[] = PENTATONIC_SCALE,
): string {
  const clamped = Math.min(1, Math.max(0, pitch));
  const index = Math.round(clamped * (scale.length - 1));
  return scale[index];
}

/**
 * Throttle gate for bursts of peg hits (many balls can land in the same
 * frame): true if enough time passed since the last hit that was allowed
 * to sound.
 */
export function shouldAllowPeg(
  lastPlayedMs: number,
  nowMs: number,
  minGapMs: number = PEG_THROTTLE_MS,
): boolean {
  return nowMs - lastPlayedMs >= minGapMs;
}
