"use client";

import { useEffect, useState } from "react";

import type { SoundEngine } from "./types.ts";
import { createWebAudioEngine } from "./webAudioEngine.ts";

/** One engine per mounted client, kept in step with the sound toggle. */
export function useSoundEngine(enabled: boolean): SoundEngine {
  const [engine] = useState(createWebAudioEngine);
  useEffect(() => {
    engine.setEnabled(enabled);
  }, [engine, enabled]);
  return engine;
}
