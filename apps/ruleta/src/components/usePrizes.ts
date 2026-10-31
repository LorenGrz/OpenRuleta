"use client";

import { useSyncExternalStore } from "react";

import { siteConfig } from "@openruleta/config";

import { parsePrizes, type Prize } from "@/lib/prizes";

const STORAGE_KEY = `${siteConfig.slug}-ruleta-prizes`;
const DEFAULT_PRIZES: Prize[] = siteConfig.ruleta.prizeWheel.defaultPrizes.map(
  (p) => ({ ...p }),
);

let listeners: Array<() => void> = [];

function subscribe(cb: () => void): () => void {
  listeners.push(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", cb);
  };
}

function emit(): void {
  listeners.forEach((l) => l());
}

// useSyncExternalStore needs a referentially stable snapshot: parse again
// only when the raw stored string changed, otherwise every render would see
// a new array and loop.
let cache: { raw: string | null; prizes: Prize[] } | null = null;

function readPrizes(): Prize[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // storage unavailable: defaults
  }
  if (cache && cache.raw === raw) return cache.prizes;
  cache = { raw, prizes: parsePrizes(raw, DEFAULT_PRIZES) };
  return cache.prizes;
}

function writePrizes(prizes: Prize[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prizes));
  } catch {
    // ignored
  }
  emit();
}

function resetPrizes(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignored
  }
  emit();
}

export function usePrizes(): {
  prizes: Prize[];
  defaults: Prize[];
  save: (prizes: Prize[]) => void;
  restoreDefaults: () => void;
} {
  const prizes = useSyncExternalStore(
    subscribe,
    readPrizes,
    () => DEFAULT_PRIZES,
  );
  return {
    prizes,
    defaults: DEFAULT_PRIZES,
    save: writePrizes,
    restoreDefaults: resetPrizes,
  };
}
