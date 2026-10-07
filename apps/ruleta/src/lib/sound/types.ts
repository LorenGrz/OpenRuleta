/**
 * Everything the draw modes can play. Modes only talk to this interface, so
 * the WebAudio implementation can be swapped (e.g. for Tone.js) without
 * touching them.
 */
export interface SoundEngine {
  /** Create/resume the audio context. Call from a user gesture (the Spin click). */
  unlock(): void;
  /** Schedule one tick per wheel segment crossing, in ms from now. */
  wheel(segmentCrossTimesMs: number[]): void;
  /** A single reel/grid step tick, now. */
  tick(): void;
  /** A peg hit; `pitch` in [0, 1], low to high (left to right column). */
  peg(pitch: number): void;
  /** The animation came to rest on the winner. */
  land(): void;
  /** Winner reveal flourish. */
  win(): void;
  /** Mute/unmute. While disabled every call is a no-op and scheduled sounds are cut. */
  setEnabled(enabled: boolean): void;
}
