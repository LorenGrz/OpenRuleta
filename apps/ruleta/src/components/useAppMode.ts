"use client";

import { useSyncExternalStore } from "react";

import { siteConfig } from "@openruleta/config";

import { isAppMode, type AppMode } from "@/lib/appMode";

const STORAGE_KEY = `${siteConfig.slug}-ruleta-app-mode`;
const DEFAULT_MODE: AppMode = "raffle";

// Same external-store pattern as useDrawMode: localStorage is the source of
// truth, kept in sync across tabs through the `storage` event.
let listeners: Array<() => void> = [];

function subscribe(cb: () => void): () => void {
  listeners.push(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", cb);
  };
}

function readMode(): AppMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Stored values are untrusted (manual edits, older builds).
    return isAppMode(stored) ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function writeMode(mode: AppMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignored
  }
  listeners.forEach((l) => l());
}

/** `null` on the server and during hydration: the real mode is only known in
 *  the browser, so callers must not mount a mode-specific client until then. */
export function useAppMode(): [AppMode | null, (mode: AppMode) => void] {
  const mode = useSyncExternalStore(subscribe, readMode, () => null);
  return [mode, writeMode];
}
