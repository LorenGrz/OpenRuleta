import type { SoundEngine } from "@/lib/sound/types";

export const DRAW_MODE_IDS = ["wheel", "slot", "grid", "plinko"] as const;

export type DrawModeId = (typeof DRAW_MODE_IDS)[number];

export function isDrawModeId(value: unknown): value is DrawModeId {
  return (
    typeof value === "string" &&
    (DRAW_MODE_IDS as readonly string[]).includes(value)
  );
}

/** What a draw mode needs of each entry: raffle participants and prizes both fit. */
export type DrawEntry = { id: string; name: string };

/**
 * Contract every draw mode implements. The winner is chosen by the client
 * before any animation; a mode only animates towards `pool[winnerIndex]`.
 */
export type DrawModeProps = {
  /** Frozen pool while a draw runs; the live pool otherwise. */
  pool: DrawEntry[];
  /** Pre-chosen winner, or null when no draw is running or awaiting confirmation. */
  winnerIndex: number | null;
  /** Bumped once per Spin click; a new value with a winner starts an animation. */
  runId: number;
  /** Call exactly once per run, when the animation has come to rest. */
  onSettled(): void;
  sound: SoundEngine;
  reducedMotion: boolean;
};
