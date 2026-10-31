"use client";

import { useState } from "react";

import { PrizeWheelClient } from "@/components/PrizeWheelClient";
import { RuletaClient } from "@/components/RuletaClient";
import { useAppMode } from "@/components/useAppMode";

/** Picks the raffle or the stand prize wheel from the stored app mode. */
export function RuletaApp() {
  const [mode] = useAppMode();
  // Session-only skips ("skip and spin again"): NOT persisted, that person did
  // not win. Kept here so they survive switching to the prize wheel and back.
  const [skipIds, setSkipIds] = useState<Set<string>>(new Set());
  // Mount nothing until the browser's stored mode is known: the server
  // snapshot is null, so a reload in prize wheel mode never mounts (and never
  // polls from) the raffle client.
  if (mode === null) return <div className="h-dvh bg-[#050505]" />;
  return mode === "prizeWheel" ? (
    <PrizeWheelClient />
  ) : (
    <RuletaClient skipIds={skipIds} setSkipIds={setSkipIds} />
  );
}
