"use client";

import { useEffect, useState } from "react";

import type { SoundEngine } from "./types.ts";
import { createToneEngine } from "./toneEngine.ts";

/**
 * One engine per mounted client, kept in step with the sound toggle. Uses
 * Tone.js (falling back to the plain WebAudio engine if `tone` fails to
 * load) and releases its audio nodes on unmount.
 */
export function useSoundEngine(enabled: boolean): SoundEngine {
  const [engine] = useState(createToneEngine);
  useEffect(() => {
    engine.setEnabled(enabled);
  }, [engine, enabled]);
  useEffect(() => {
    return () => engine.dispose();
  }, [engine]);
  return engine;
}
