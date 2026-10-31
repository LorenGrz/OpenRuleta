"use client";

import { siteConfig } from "@openruleta/config";

import { APP_MODES, type AppMode } from "@/lib/appMode";

import { useAppMode } from "./useAppMode";

const m = siteConfig.ruleta.prizeWheel.messages;

const LABELS: Record<AppMode, string> = {
  raffle: m.raffleMode,
  prizeWheel: m.prizeWheelMode,
};

type Props = {
  /** True during a spin or with a modal open: switching would unmount it. */
  disabled: boolean;
};

/** Raffle / Prize wheel switch: a group of `aria-pressed` buttons, reachable
 *  and operable with Tab and Enter/Space. */
export function AppModeToggle({ disabled }: Props) {
  const [mode, setMode] = useAppMode();
  return (
    <div
      role="group"
      aria-label={m.appModeLabel}
      className="inline-flex flex-none items-center gap-0.5 rounded-lg bg-white/10 p-1"
    >
      {APP_MODES.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          disabled={disabled}
          onClick={() => setMode(id)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === id
              ? "bg-primary text-white"
              : "text-white/70 hover:text-white"
          }`}
        >
          {LABELS[id]}
        </button>
      ))}
    </div>
  );
}
