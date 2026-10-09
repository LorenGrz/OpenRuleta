import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MIN_START_STEP_S,
  nextStartTime,
  PENTATONIC_SCALE,
  pitchToPentatonicNote,
  shouldAllowPeg,
} from "./toneMapping.ts";

// The plinko board is only ever "in tune" if every pitch maps onto the scale.
test("pitchToPentatonicNote maps the full [0, 1] range onto the scale", () => {
  assert.equal(pitchToPentatonicNote(0), PENTATONIC_SCALE[0]);
  assert.equal(
    pitchToPentatonicNote(1),
    PENTATONIC_SCALE[PENTATONIC_SCALE.length - 1],
  );
  for (let i = 0; i < PENTATONIC_SCALE.length; i++) {
    const pitch = i / (PENTATONIC_SCALE.length - 1);
    assert.equal(pitchToPentatonicNote(pitch), PENTATONIC_SCALE[i]);
  }
});

// Left-to-right pegs should climb the scale, never jump backwards.
test("pitchToPentatonicNote is monotonic in pitch", () => {
  const notes = Array.from({ length: 101 }, (_, i) =>
    PENTATONIC_SCALE.indexOf(
      pitchToPentatonicNote(i / 100) as (typeof PENTATONIC_SCALE)[number],
    ),
  );
  for (let i = 1; i < notes.length; i++) assert.ok(notes[i] >= notes[i - 1]);
});

// Out-of-range pitches (a bug upstream) must clamp, not throw or go silent.
test("pitchToPentatonicNote clamps out-of-range pitches", () => {
  assert.equal(pitchToPentatonicNote(-5), PENTATONIC_SCALE[0]);
  assert.equal(
    pitchToPentatonicNote(5),
    PENTATONIC_SCALE[PENTATONIC_SCALE.length - 1],
  );
});

// A custom scale is just a lookup table: same clamping rules apply.
test("pitchToPentatonicNote honours a custom scale", () => {
  const scale = ["A", "B", "C"];
  assert.equal(pitchToPentatonicNote(0, scale), "A");
  assert.equal(pitchToPentatonicNote(0.5, scale), "B");
  assert.equal(pitchToPentatonicNote(1, scale), "C");
});

// Many balls land in the same animation frame: only one hit per gap sounds.
test("shouldAllowPeg enforces the minimum gap between hits", () => {
  assert.equal(shouldAllowPeg(-Infinity, 0, 25), true);
  assert.equal(shouldAllowPeg(0, 10, 25), false);
  assert.equal(shouldAllowPeg(0, 24.999, 25), false);
  assert.equal(shouldAllowPeg(0, 25, 25), true);
  assert.equal(shouldAllowPeg(0, 100, 25), true);
});

test("shouldAllowPeg defaults to PEG_THROTTLE_MS", () => {
  assert.equal(shouldAllowPeg(0, 24), false);
  assert.equal(shouldAllowPeg(0, 25), true);
});

// Two ticks inside the same audio render quantum share tone.now(); the second
// must still start strictly later or Tone throws.
test("nextStartTime is strictly increasing even when the clock stalls", () => {
  let last = Number.NEGATIVE_INFINITY;
  const starts: number[] = [];
  for (const now of [1, 1, 1, 1.0005, 2]) {
    last = nextStartTime(last, now);
    starts.push(last);
  }
  for (let i = 1; i < starts.length; i++) {
    assert.ok(starts[i] > starts[i - 1], `${starts[i - 1]} -> ${starts[i]}`);
  }
  assert.equal(starts[0], 1);
  assert.equal(starts[1], 1 + MIN_START_STEP_S);
  assert.equal(starts[4], 2);
});
