"use client";

import { useState } from "react";

import { siteConfig } from "@openruleta/config";

const SOUND_KEY = `${siteConfig.slug}-ruleta-sound`;

/** Sound on/off, persisted in localStorage and shared by both app modes. */
export function useSoundPreference(): [boolean, () => void] {
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return window.localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  function toggleSound() {
    setSoundOn((on) => {
      const next = !on;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        // ignored
      }
      return next;
    });
  }

  return [soundOn, toggleSound];
}
