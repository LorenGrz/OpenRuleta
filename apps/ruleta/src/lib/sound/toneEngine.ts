import type { SoundEngine } from "./types.ts";
import {
  PEG_THROTTLE_MS,
  pitchToPentatonicNote,
  shouldAllowPeg,
} from "./toneMapping.ts";
import { createWebAudioEngine } from "./webAudioEngine.ts";

/**
 * The real `tone` module, typed in full from its own declarations but never
 * imported eagerly: `import("tone")` only runs inside `unlock()`, so no
 * AudioContext exists until the user clicks Spin.
 */
type ToneModule = typeof import("tone");

const MASTER_VOLUME_DB = -8;
const LIMITER_THRESHOLD_DB = -3;

/** Everything the engine plays through, built once Tone has loaded. */
function buildGraph(tone: ToneModule) {
  const limiter = new tone.Limiter(LIMITER_THRESHOLD_DB).toDestination();
  const master = new tone.Volume(MASTER_VOLUME_DB).connect(limiter);

  // Wheel "clack": a bandpass-filtered noise burst (the flapper's wood/
  // plastic contact) layered with a very short membrane thump for body.
  // Brightness and velocity are shared across a spin, dialled down near
  // the end as the wheel slows.
  const wheelFilter = new tone.Filter(2200, "bandpass").connect(master);
  const wheelNoise = new tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.0005, decay: 0.025, sustain: 0, release: 0.01 },
  }).connect(wheelFilter);
  const wheelThump = new tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 1.5,
    envelope: { attack: 0.0005, decay: 0.035, sustain: 0, release: 0.02 },
  }).connect(master);

  // Mechanical tick (slot reel / grid step): short, bright, randomised a
  // little each hit so 80 repeats don't blur into a robotic loop.
  const tickSynth = new tone.MembraneSynth({
    pitchDecay: 0.004,
    octaves: 0.6,
    envelope: { attack: 0.0005, decay: 0.018, sustain: 0, release: 0.01 },
  }).connect(master);

  // Plinko pegs: a bell/marimba voice on the pentatonic scale. Polyphonic
  // so a burst of simultaneous hits doesn't cut itself off.
  const pegSynth = new tone.PolySynth(tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.05 },
  }).connect(master);
  pegSynth.maxPolyphony = 8;

  // Landing: a soft, grave thunk.
  const landSynth = new tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.2 },
  }).connect(master);

  // Winner fanfare: an ascending major arpeggio through a light chorus +
  // reverb shimmer, kept subtle so it never clips against the limiter.
  const winChorus = new tone.Chorus(3, 1.5, 0.2).start();
  const winReverb = new tone.Reverb(1.1);
  winReverb.wet.value = 0.18;
  const winSynth = new tone.PolySynth(tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.005, decay: 0.9, sustain: 0.1, release: 0.4 },
  });
  winSynth.maxPolyphony = 4;
  winSynth.chain(winChorus, winReverb, master);

  return {
    tone,
    master,
    limiter,
    wheelFilter,
    wheelNoise,
    wheelThump,
    tickSynth,
    pegSynth,
    landSynth,
    winSynth,
    winChorus,
    winReverb,
  };
}

type ToneGraph = ReturnType<typeof buildGraph>;

/** Cancels every wheel tick still scheduled ahead of now. */
function cancelWheel(g: ToneGraph): void {
  const now = g.tone.now();
  g.wheelNoise.envelope.cancel(now);
  g.wheelThump.envelope.cancel(now);
  g.wheelFilter.frequency.cancelScheduledValues(now);
}

function disposeGraph(g: ToneGraph): void {
  g.wheelNoise.dispose();
  g.wheelThump.dispose();
  g.wheelFilter.dispose();
  g.tickSynth.dispose();
  g.pegSynth.dispose();
  g.landSynth.dispose();
  g.winSynth.dispose();
  g.winChorus.dispose();
  g.winReverb.dispose();
  g.master.dispose();
  g.limiter.dispose();
}

/** A {@link SoundEngine} plus a way to release its Tone.js resources. */
export interface ToneSoundEngine extends SoundEngine {
  /** Disposes every Tone node. Safe to call more than once. */
  dispose(): void;
}

/**
 * Tone.js implementation of {@link SoundEngine}. Loads `tone` lazily from
 * `unlock()` and falls back to the WebAudio engine if that import (or
 * `Tone.start()`) ever fails, e.g. a browser without WebAudio support.
 */
export function createToneEngine(): ToneSoundEngine {
  let graph: ToneGraph | null = null;
  let fallback: SoundEngine | null = null;
  let loadStarted = false;
  let enabled = true;
  let lastPegMs = Number.NEGATIVE_INFINITY;

  async function load(): Promise<void> {
    if (loadStarted) return;
    loadStarted = true;
    try {
      const tone = await import("tone");
      await tone.start();
      graph = buildGraph(tone);
      graph.master.mute = !enabled;
    } catch {
      // No WebAudio, blocked import, whatever the cause: keep the wheel
      // working with the original oscillator-based engine instead.
      const engine = createWebAudioEngine();
      engine.setEnabled(enabled);
      engine.unlock();
      fallback = engine;
    }
  }

  return {
    unlock() {
      if (fallback) {
        fallback.unlock();
        return;
      }
      if (graph) {
        void graph.tone.start(); // resumes a context the browser auto-suspended
        return;
      }
      void load();
    },
    wheel(segmentCrossTimesMs) {
      if (fallback) {
        fallback.wheel(segmentCrossTimesMs);
        return;
      }
      if (!graph || !enabled) return;
      const g = graph;
      cancelWheel(g); // a new spin replaces any ticks still queued from the last one
      const start = g.tone.now() + 0.02;
      const last = segmentCrossTimesMs[segmentCrossTimesMs.length - 1] ?? 1;
      for (const ms of segmentCrossTimesMs) {
        const progress = last > 0 ? ms / last : 1;
        const time = start + ms / 1000;
        const velocity = Math.max(0.08, 0.5 * (1 - progress * 0.6));
        g.wheelFilter.frequency.setValueAtTime(2200 - progress * 1000, time);
        g.wheelNoise.triggerAttackRelease(0.03, time, velocity);
        g.wheelThump.triggerAttackRelease(
          90 - progress * 20,
          0.04,
          time,
          velocity * 0.8,
        );
      }
    },
    tick() {
      if (fallback) {
        fallback.tick();
        return;
      }
      if (!graph || !enabled) return;
      const jitterHz = (Math.random() - 0.5) * 160;
      const velocity = 0.55 + Math.random() * 0.15;
      graph.tickSynth.triggerAttackRelease(
        1650 + jitterHz,
        0.03,
        graph.tone.now() + 0.003,
        velocity,
      );
    },
    peg(pitch) {
      if (fallback) {
        fallback.peg(pitch);
        return;
      }
      if (!graph || !enabled) return;
      const nowMs = graph.tone.now() * 1000;
      if (!shouldAllowPeg(lastPegMs, nowMs, PEG_THROTTLE_MS)) return;
      lastPegMs = nowMs;
      const note = pitchToPentatonicNote(pitch);
      graph.pegSynth.triggerAttackRelease(
        note,
        0.22,
        graph.tone.now() + 0.003,
        0.5,
      );
    },
    land() {
      if (fallback) {
        fallback.land();
        return;
      }
      if (!graph || !enabled) return;
      graph.landSynth.triggerAttackRelease(
        85,
        0.35,
        graph.tone.now() + 0.01,
        0.7,
      );
    },
    win() {
      if (fallback) {
        fallback.win();
        return;
      }
      if (!graph || !enabled) return;
      const g = graph;
      const time = g.tone.now() + 0.02;
      const arpeggio = ["C5", "E5", "G5", "C6"];
      arpeggio.forEach((note, i) => {
        g.winSynth.triggerAttackRelease(note, 0.9, time + i * 0.09, 0.45);
      });
    },
    setEnabled(next) {
      enabled = next;
      if (fallback) {
        fallback.setEnabled(next);
        return;
      }
      if (!graph) return;
      graph.master.mute = !next;
      if (!next) cancelWheel(graph);
    },
    dispose() {
      fallback = null;
      if (!graph) return;
      const g = graph;
      graph = null;
      disposeGraph(g);
    },
  };
}
