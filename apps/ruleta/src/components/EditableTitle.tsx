"use client";

import { useState, useSyncExternalStore } from "react";

import { siteConfig } from "@openruleta/config";

const STORAGE_KEY = `${siteConfig.slug}-ruleta-title`;
const DEFAULT_TITLE = siteConfig.ruleta.defaultTitle;
const m = siteConfig.ruleta.messages;

/** Editable title above the wheel. Persisted in localStorage (the wheel app
 *  runs on a single machine, no need to store it in Supabase). */

let listeners: Array<() => void> = [];

function subscribe(cb: () => void): () => void {
  listeners.push(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", cb);
  };
}

function readTitle(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_TITLE;
  } catch {
    return DEFAULT_TITLE;
  }
}

function writeTitle(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignored
  }
  listeners.forEach((l) => l());
}

export function EditableTitle() {
  const title = useSyncExternalStore(subscribe, readTitle, () => DEFAULT_TITLE);
  const [editing, setEditing] = useState(false);

  function commit(next: string) {
    writeTitle(next.trim() || DEFAULT_TITLE);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        defaultValue={title}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
          if (e.key === "Escape") setEditing(false);
        }}
        aria-label={m.titleAriaLabel}
        className="w-full max-w-2xl rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-center text-3xl font-bold text-white outline-none transition focus:border-primary"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title={m.editTitle}
      className="group inline-flex items-center gap-3 text-3xl font-bold text-white transition hover:text-white/80"
    >
      <span>{title}</span>
      <span
        aria-hidden
        className="text-base text-white/30 opacity-0 transition group-hover:opacity-100"
      >
        ✎
      </span>
    </button>
  );
}
