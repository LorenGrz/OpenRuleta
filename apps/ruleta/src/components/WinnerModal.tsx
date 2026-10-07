"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

import { siteConfig } from "@openruleta/config";
import { maskDoc } from "@openruleta/core";

import type { Participant } from "@/lib/api";

const m = siteConfig.ruleta.messages;
const doc = siteConfig.form.docField;
const confettiColors = siteConfig.ruleta.confettiColors;

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(siteConfig.locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  winner: Participant;
  busy?: boolean;
  /** Seeds the prize input so the operator doesn't retype the draw title. */
  defaultPrize?: string;
  onConfirm: (prize: string) => void;
  onSpinAgain: () => void;
  /** Shown once confirmed (`winner.wonAt` set): opens the email preview. */
  onNotify?: () => void;
  /** Shown once confirmed: closes the modal. */
  onClose?: () => void;
};

export function WinnerModal({
  winner,
  busy,
  defaultPrize,
  onConfirm,
  onSpinAgain,
  onNotify,
  onClose,
}: Props) {
  const [prize, setPrize] = useState(winner.prize ?? defaultPrize ?? "");
  // The parent swaps in the stored row after confirming, so wonAt flips the
  // modal to its post-confirm step (prize + notify) without remounting.
  const confirmed = Boolean(winner.wonAt);

  useEffect(() => {
    const end = Date.now() + 1200;
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
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1b1b] p-8 text-center shadow-2xl">
        <span className="mb-3 block text-4xl">🎉</span>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#abc7ff]">
          {m.winnerHeading}
        </h3>
        <div className="my-6 rounded-xl border border-white/10 bg-[#151515] p-6">
          <p className="text-3xl font-bold text-white">{winner.name}</p>
          {doc.enabled && winner.docLast3 && (
            <p className="mt-1 font-mono text-sm text-white/50">
              {doc.displayLabel} {maskDoc(winner.docLast3, doc.maskGlyph)}
            </p>
          )}
        </div>
        {confirmed ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="text-sm font-semibold text-green-400">
              {m.winnerConfirmed}
            </p>
            {winner.prize && (
              <p className="text-sm text-white/80">🎁 {winner.prize}</p>
            )}
            {winner.notifiedAt && (
              <p className="text-xs text-white/50">
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-green-400 ring-1 ring-inset ring-green-500/20">
                  <time dateTime={winner.notifiedAt}>
                    {m.notifiedBadge.replace(
                      "{time}",
                      timeLabel(winner.notifiedAt),
                    )}
                  </time>
                </span>
              </p>
            )}
            {onNotify && (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={onNotify}
                  autoFocus
                  disabled={!winner.prize}
                  className={`w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {winner.notifiedAt ? m.resendEmail : m.notifyByEmail}
                </button>
                {/* M6: no prize means nothing to announce, so the operator
                    is told why the button is disabled instead of hitting
                    the route's own no_prize error after the fact. */}
                {!winner.prize && (
                  <p className="text-xs text-white/50">{m.notifyNoPrize}</p>
                )}
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className={`w-full rounded-lg border border-white/20 py-3 font-semibold text-white/80 transition hover:bg-white/5 ${FOCUS_RING}`}
              >
                {m.done}
              </button>
            )}
          </div>
        ) : (
          <>
            <label className="mb-4 block text-left">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                {m.prizeLabel}
              </span>
              <input
                type="text"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) onConfirm(prize);
                }}
                placeholder={m.prizePlaceholder}
                autoFocus
                className="w-full rounded-lg border border-white/15 bg-[#151515] px-3 py-2 text-sm text-white outline-none transition focus:border-primary"
              />
            </label>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => onConfirm(prize)}
                disabled={busy}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
              >
                {busy ? m.saving : m.confirmWinner}
              </button>
              <button
                onClick={onSpinAgain}
                disabled={busy}
                className="w-full rounded-lg border border-white/20 py-3 font-semibold text-white/80 transition hover:bg-white/5 disabled:opacity-50"
              >
                {m.spinAgain}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
