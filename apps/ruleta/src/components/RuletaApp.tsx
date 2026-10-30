"use client";

import { PrizeWheelClient } from "@/components/PrizeWheelClient";
import { RuletaClient } from "@/components/RuletaClient";
import { useAppMode } from "@/components/useAppMode";

/** Picks the raffle or the stand prize wheel from the stored app mode. */
export function RuletaApp() {
  const [mode] = useAppMode();
  return mode === "prizeWheel" ? <PrizeWheelClient /> : <RuletaClient />;
}
