"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { siteConfig } from "@openruleta/config";
import { Wordmark } from "@openruleta/ui";

import { AppModeToggle } from "@/components/AppModeToggle";
import { CollaboratorCarousel } from "@/components/CollaboratorCarousel";
import type { DrawEntry } from "@/components/draw/types";
import { useReducedMotion } from "@/components/draw/useReducedMotion";
import { WheelMode } from "@/components/draw/WheelMode";
import { HeaderMenu } from "@/components/HeaderMenu";
import { PrizeResultModal } from "@/components/PrizeResultModal";
import { PrizesEditorModal } from "@/components/PrizesEditorModal";
import { SponsorCarousel } from "@/components/SponsorCarousel";
import { usePrizes } from "@/components/usePrizes";
import { useSoundPreference } from "@/components/useSoundPreference";
import { pickWeightedIndex } from "@/lib/prizes";
import { useSoundEngine } from "@/lib/sound/useSoundEngine";

const pw = siteConfig.ruleta.prizeWheel;
const m = pw.messages;

// Larger than the raffle wheel: there is no participants panel. Bounded by the
// height of its own container (cqh), which is whatever is left between title
// and buttons, so nothing overlaps at any window size.
const WHEEL_SIZE = "max-w-[min(760px,calc(100cqh-16px))]";

/**
 * Stand prize wheel: spins over the configured prizes, shows the result and
 * leaves the wheel as it was. No stock, history, API or participants.
 */
export function PrizeWheelClient() {
  const { prizes, defaults, save, restoreDefaults } = usePrizes();
  const [soundOn, toggleSound] = useSoundPreference();
  const sound = useSoundEngine(soundOn);
  const reducedMotion = useReducedMotion();

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<DrawEntry | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [draw, setDraw] = useState<{
    runId: number;
    // Frozen at spin time: prizes edited from another tab mid-spin must not
    // change what the running wheel resolves against.
    pool: DrawEntry[];
    winnerIndex: number;
  } | null>(null);

  const spinningRef = useRef(false);

  const modalOpen = result !== null || showEditor;
  const hasWinnable = prizes.some((p) => p.weight > 0);
  const canSpin = !spinning && !modalOpen && hasWinnable;
  const drawInFlight = draw !== null && (spinning || result !== null);

  function spin() {
    if (!canSpin) return;
    const idx = pickWeightedIndex(prizes);
    if (idx < 0) return;
    sound.unlock();
    spinningRef.current = true;
    setDraw((prev) => ({
      runId: (prev?.runId ?? 0) + 1,
      pool: prizes,
      winnerIndex: idx,
    }));
    setSpinning(true);
  }

  function handleSettled() {
    // A remounted wheel replays its animation; only a spin in flight counts.
    if (!spinningRef.current || !draw) return;
    spinningRef.current = false;
    setSpinning(false);
    const won = draw.pool[draw.winnerIndex];
    if (won) setResult(won);
  }

  // Enter spins, unless a dialog is open or the focus is on a control that
  // would handle Enter itself.
  const onEnter = useEffectEvent(spin);
  useEffect(() => {
    if (modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el?.closest(
          "input, textarea, select, button, a, [contenteditable], [role=dialog]",
        )
      ) {
        return;
      }
      e.preventDefault();
      onEnter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  return (
    <div className="flex h-dvh flex-col bg-[#050505] text-white">
      <header className="flex h-16 flex-none items-center justify-between border-b border-white/10 px-6">
        <Wordmark
          src={siteConfig.assets.logo}
          alt={siteConfig.name}
          className="h-11"
        />
        <div className="flex items-center gap-3">
          <AppModeToggle disabled={spinning || modalOpen} />
          <HeaderMenu
            raffle={false}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        </div>
      </header>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex-none pt-3">
          <SponsorCarousel />
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8 py-4">
          <h1 className="text-3xl font-bold text-white">{pw.title}</h1>

          <div className="flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]">
            <WheelMode
              pool={drawInFlight ? draw.pool : prizes}
              winnerIndex={drawInFlight ? draw.winnerIndex : null}
              runId={draw?.runId ?? 0}
              onSettled={handleSettled}
              sound={sound}
              reducedMotion={reducedMotion}
              fills={pw.segmentFills}
              fullLabels
              maxWidthClassName={WHEEL_SIZE}
            />
          </div>

          <div className="flex flex-none flex-col items-center gap-2">
            {!hasWinnable && (
              <p role="alert" className="text-sm text-error">
                {m.noWinnablePrize}
              </p>
            )}
            <div className="flex items-center gap-6">
              <button
                onClick={spin}
                disabled={!canSpin}
                className="rounded-pill bg-primary px-14 py-4 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition hover:scale-105 hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {spinning ? m.spinning : m.spin}
              </button>
              <button
                onClick={() => setShowEditor(true)}
                disabled={spinning || modalOpen}
                className="text-sm text-white/40 underline transition hover:text-white disabled:opacity-40"
              >
                {m.editPrizes}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-none pb-3">
          <CollaboratorCarousel />
        </div>
      </main>

      {result && (
        <PrizeResultModal
          prize={result.name}
          reducedMotion={reducedMotion}
          onClose={() => setResult(null)}
        />
      )}

      {showEditor && (
        <PrizesEditorModal
          prizes={prizes}
          defaults={defaults}
          onSave={save}
          onRestore={restoreDefaults}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
