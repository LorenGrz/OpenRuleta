import type { SoundEngine } from "./types.ts";

// Synthesised with oscillators only: no audio files to ship or brand.

type AudioCtor = typeof AudioContext;

function audioCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor })
      .webkitAudioContext ??
    null
  );
}

/** Ratchet click, same voice as the original wheel sound. */
function click(
  ac: AudioContext,
  out: AudioNode,
  at: number,
  volume: number,
  freq = 1500,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.4, at + 0.03);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.02, volume), at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.06);
}

function tone(
  ac: AudioContext,
  out: AudioNode,
  at: number,
  freq: number,
  length: number,
  volume: number,
  type: OscillatorType = "sine",
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

export function createWebAudioEngine(): SoundEngine {
  let ctx: AudioContext | null = null;
  // Every voice goes through a bus that is rebuilt on mute, which silences
  // already-scheduled ticks without tracking them one by one.
  let bus: GainNode | null = null;
  let enabled = true;
  let lastPegAt = 0;

  function ready(): { ac: AudioContext; out: GainNode } | null {
    if (!enabled || !ctx) return null;
    if (ctx.state === "suspended") void ctx.resume();
    if (!bus) {
      bus = ctx.createGain();
      bus.connect(ctx.destination);
    }
    return { ac: ctx, out: bus };
  }

  function cut(): void {
    bus?.disconnect();
    bus = null;
  }

  return {
    unlock() {
      if (ctx) {
        if (ctx.state === "suspended") void ctx.resume();
        return;
      }
      const Ctor = audioCtor();
      if (!Ctor) return;
      try {
        ctx = new Ctor();
      } catch {
        ctx = null;
      }
    },
    wheel(segmentCrossTimesMs) {
      if (!enabled || !ctx) return;
      cut(); // a new spin replaces any ticks still queued from the last one
      const fresh = ready();
      if (!fresh) return;
      const start = fresh.ac.currentTime + 0.02;
      const last = segmentCrossTimesMs[segmentCrossTimesMs.length - 1] ?? 1;
      for (const ms of segmentCrossTimesMs) {
        const p = last > 0 ? ms / last : 1;
        click(fresh.ac, fresh.out, start + ms / 1000, 0.3 * (1 - p * 0.55));
      }
    },
    tick() {
      const r = ready();
      if (!r) return;
      click(r.ac, r.out, r.ac.currentTime + 0.005, 0.22, 1700);
    },
    peg(pitch) {
      const r = ready();
      if (!r) return;
      // Many balls hit pegs in the same frame; one voice per 35 ms is plenty.
      const now = r.ac.currentTime;
      if (now - lastPegAt < 0.035) return;
      lastPegAt = now;
      const p = Math.min(1, Math.max(0, pitch));
      tone(r.ac, r.out, now + 0.005, 520 + p * 900, 0.09, 0.09, "triangle");
    },
    land() {
      const r = ready();
      if (!r) return;
      const t = r.ac.currentTime + 0.01;
      tone(r.ac, r.out, t, 196, 0.35, 0.25, "triangle");
      tone(r.ac, r.out, t, 392, 0.25, 0.12);
    },
    win() {
      const r = ready();
      if (!r) return;
      const t = r.ac.currentTime + 0.02;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(r.ac, r.out, t + i * 0.09, f, 0.5, 0.16, "triangle"),
      );
    },
    setEnabled(next) {
      enabled = next;
      if (!next) cut();
    },
  };
}
