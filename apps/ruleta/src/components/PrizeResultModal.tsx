"use client";

import { useEffect, useId, useRef } from "react";
import confetti from "canvas-confetti";

import { siteConfig } from "@openruleta/config";

import { useDialog } from "./useDialog";

const m = siteConfig.ruleta.prizeWheel.messages;
const confettiColors = siteConfig.ruleta.confettiColors;

type Props = {
  prize: string;
  reducedMotion: boolean;
  onClose: () => void;
};

/** Shows the prize that came up, with confetti. Nothing is stored. */
export function PrizeResultModal({ prize, reducedMotion, onClose }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialog(dialogRef, closeRef, onClose);

  useEffect(() => {
    if (reducedMotion) return;
    const end = Date.now() + 1200;
    let frame = 0;
    const tick = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: confettiColors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: confettiColors,
      });
      if (Date.now() < end) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      confetti.reset();
    };
  }, [reducedMotion]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1b1b] p-8 text-center shadow-2xl"
      >
        <span aria-hidden className="mb-3 block text-4xl">
          🎁
        </span>
        <h3
          id={titleId}
          className="text-sm font-semibold uppercase tracking-[0.2em] text-[#abc7ff]"
        >
          {m.resultHeading}
        </h3>
        <p className="my-6 break-words rounded-xl border border-white/10 bg-[#151515] p-6 text-3xl font-bold text-white">
          {prize}
        </p>
        <button
          ref={closeRef}
          onClick={onClose}
          className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {m.resultClose}
        </button>
      </div>
    </div>
  );
}
