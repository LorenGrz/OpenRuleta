"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";

import { siteConfig } from "@openruleta/config";

const m = siteConfig.ruleta.messages;

export function QrOverlay({ onClose }: { onClose: () => void }) {
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black p-6"
    >
      <img
        src={siteConfig.assets.poster}
        alt={m.posterAlt}
        className="max-h-full max-w-full object-contain"
      />
      <button
        onClick={onClose}
        className="absolute right-6 top-6 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
      >
        {m.close}
      </button>
    </div>
  );
}
