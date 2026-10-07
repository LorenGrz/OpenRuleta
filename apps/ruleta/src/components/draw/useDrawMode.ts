"use client";

import { useSyncExternalStore } from "react";

import { siteConfig } from "@openruleta/config";

import { isDrawModeId, type DrawModeId } from "./types";

const STORAGE_KEY = `${siteConfig.slug}-ruleta-mode`;
const DEFAULT_MODE: DrawModeId = "wheel";

// Same external-store pattern as EditableTitle: localStorage is the source of
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

function readMode(): DrawModeId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Stored values are untrusted (older builds, manual edits).
    return isDrawModeId(stored) ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function writeMode(mode: DrawModeId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignored
  }
  listeners.forEach((l) => l());
}

export function useDrawMode(): [DrawModeId, (mode: DrawModeId) => void] {
  const mode = useSyncExternalStore(subscribe, readMode, () => DEFAULT_MODE);
  return [mode, writeMode];
}
