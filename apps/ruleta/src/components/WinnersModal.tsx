"use client";

import { useEffect } from "react";

import { siteConfig } from "@openruleta/config";

import type { Participant } from "@/lib/api";

const m = siteConfig.ruleta.messages;

type Props = {
  winners: Participant[];
  busy?: boolean;
  onClose: () => void;
  onExportCsv: () => void;
  onUndo: (id: string) => void;
  onEditPrize: (id: string, name: string, prize: string | null) => void;
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(siteConfig.locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WinnersModal({
  winners,
  busy,
  onClose,
  onExportCsv,
  onUndo,
  onEditPrize,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#1b1b1b] shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#abc7ff]">
            {m.winnersHeading.replace("{n}", String(winners.length))}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportCsv}
              disabled={winners.length === 0}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20 disabled:opacity-40"
            >
              {m.exportCsv}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20"
            >
              {m.close}
            </button>
          </div>
        </header>

        {winners.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-white/50">
            {m.noWinners}
          </p>
        ) : (
          <ul className="flex-1 divide-y divide-white/5 overflow-y-auto px-6 py-2">
            {winners.map((w, i) => (
              <li key={w.id} className="flex items-center gap-3 py-3">
                <span className="w-6 flex-none text-right font-mono text-sm text-white/40">
                  {winners.length - i}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {w.name}
                    {w.wonAt && (
                      <span className="ml-2 text-xs font-normal text-white/40">
                        {timeLabel(w.wonAt)}
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => onEditPrize(w.id, w.name, w.prize)}
                    disabled={busy}
                    title={m.prizeLabel}
                    className="mt-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70 transition hover:bg-white/20 hover:text-white disabled:opacity-40"
                  >
                    {w.prize ? `🎁 ${w.prize}` : m.addPrize}
                  </button>
                </div>
                <button
                  onClick={() => onUndo(w.id)}
                  disabled={busy}
                  title={m.undoWinner}
                  className="flex-none text-white/40 transition hover:text-white disabled:opacity-40"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
