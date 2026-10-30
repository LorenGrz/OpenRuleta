/** Top-level app mode: the participant raffle or the stand prize wheel. A
 *  separate axis from the raffle's draw modes (wheel / slot / grid / plinko). */
export const APP_MODES = ["raffle", "prizeWheel"] as const;

export type AppMode = (typeof APP_MODES)[number];

export function isAppMode(value: unknown): value is AppMode {
  return (
    typeof value === "string" &&
    (APP_MODES as readonly string[]).includes(value)
  );
}
