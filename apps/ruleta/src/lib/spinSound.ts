// Web Audio wheel sound: a series of ratchet-style ticks that space out as the
// wheel slows down (same ease-out profile as the animation). No audio files.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tick(ac: AudioContext, at: number, volume: number): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1500, at);
  osc.frequency.exponentialRampToValueAtTime(600, at + 0.03);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.02, volume), at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + 0.06);
}

/** Schedules the ticks for a spin of `durationMs`. Call it from a click. */
export function playSpinTicks(durationMs: number): void {
  const ac = getCtx();
  if (!ac) return;
  const start = ac.currentTime + 0.02;
  const seconds = durationMs / 1000;
  const count = 44;
  for (let i = 0; i < count; i++) {
    const p = i / count;
    // Dense at the start, spaced out at the end.
    const t = seconds * (1 - Math.pow(1 - p, 2.3));
    tick(ac, start + t, 0.3 * (1 - p * 0.55));
  }
}
