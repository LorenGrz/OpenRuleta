import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_LABEL_FONT_PX,
  MIN_READABLE_FONT_PX,
  chooseLabelPlacement,
  fontSizeFor,
  labelFor,
  maxCharsFor,
  outsideWheelRatio,
  sparseStep,
} from "./wheelLabels.ts";

// A handful of real-looking long names, as seen in the actual participant pool.
const LONG_NAMES = [
  "Pablo Andrés Espinoza Miranda",
  "María José Fernández Castro",
  "Juan Martín Rodríguez Paz",
];

test("fontSizeFor grows with radius and shrinks with segment count", () => {
  assert.ok(fontSizeFor(12, 300) > fontSizeFor(84, 300));
  // Radii chosen so neither hits the min/max clamp, isolating the radius effect.
  assert.ok(fontSizeFor(12, 30) < fontSizeFor(12, 45));
});

test("fontSizeFor clamps to the legible range", () => {
  assert.equal(fontSizeFor(2, 1000), MAX_LABEL_FONT_PX);
  assert.equal(fontSizeFor(500, 50), MIN_READABLE_FONT_PX);
});

test("fontSizeFor survives degenerate input", () => {
  assert.equal(fontSizeFor(0, 300), MAX_LABEL_FONT_PX);
  assert.equal(fontSizeFor(12, 0), MAX_LABEL_FONT_PX);
  assert.equal(fontSizeFor(-5, 300), MAX_LABEL_FONT_PX);
});

test("maxCharsFor fits more characters in a longer or lower-font run", () => {
  assert.ok(maxCharsFor(14, 200) > maxCharsFor(14, 100));
  assert.ok(maxCharsFor(12, 150) > maxCharsFor(20, 150));
});

test("maxCharsFor is zero for degenerate input", () => {
  assert.equal(maxCharsFor(0, 150), 0);
  assert.equal(maxCharsFor(14, 0), 0);
  assert.equal(maxCharsFor(14, -10), 0);
});

// The common case: short names that just fit as-is.
test("labelFor returns the full name when it fits", () => {
  assert.equal(labelFor("Juan Pérez", 20), "Juan Pérez");
});

// Falls back to "First L." when the full name is too long.
test("labelFor shortens to first name + last initial when the full name overflows", () => {
  assert.equal(labelFor("Pablo Andrés Espinoza Miranda", 10), "Pablo M.");
});

// Never a bare "…": first name, then a cut first name, then initials.
test("labelFor degrades to first name, cut name, then initials", () => {
  assert.equal(labelFor("Pablo Andrés Espinoza Miranda", 6), "Pablo");
  assert.equal(labelFor("Alejandro Gariglio", 6), "Aleja…");
  assert.equal(labelFor("Pablo Andrés Espinoza Miranda", 3), "PAE");
});

test("labelFor handles a single-word name with no short form to fall back to", () => {
  assert.equal(labelFor("Cher", 2), "C");
  assert.equal(labelFor("Cherilyn", 5), "Cher…");
  assert.equal(labelFor("Cher", 10), "Cher");
});

test("labelFor is blank for zero room or a blank name", () => {
  assert.equal(labelFor("Juan Pérez", 0), "");
  assert.equal(labelFor("   ", 20), "");
});

test("outsideWheelRatio shrinks the wheel for more segments and longer names", () => {
  const fewShort = outsideWheelRatio(12, ["Ana Paz"]);
  const manyLong = outsideWheelRatio(150, LONG_NAMES);
  assert.ok(manyLong < fewShort);
  assert.ok(manyLong >= 0.5);
});

// The headline scenarios from the brief: a dozen names fit inside; 84 and 150
// long names need an exterior corona.
test("chooseLabelPlacement puts a handful of short names inside the wheel", () => {
  const names = [
    "Ana",
    "Juan Pérez",
    "María González",
    "Luis Soto",
    "Carla Díaz",
    "Tomás Ruiz",
  ];
  assert.equal(chooseLabelPlacement(names.length, 300, names), "inside");
});

test("chooseLabelPlacement sends 84 long names outside the wheel", () => {
  const names = Array.from(
    { length: 84 },
    (_, i) => LONG_NAMES[i % LONG_NAMES.length],
  );
  assert.notEqual(chooseLabelPlacement(84, 300, names), "inside");
});

test("chooseLabelPlacement never fits an unreadably tight font inside", () => {
  const names = Array.from({ length: 150 }, (_, i) => `Participant ${i}`);
  assert.notEqual(chooseLabelPlacement(150, 300, names), "inside");
});

test("chooseLabelPlacement defaults to inside for an empty pool", () => {
  assert.equal(chooseLabelPlacement(0, 300, []), "inside");
  assert.equal(chooseLabelPlacement(12, 0, ["Ana"]), "inside");
});

test("sparseStep is 1 when every segment already fits", () => {
  assert.equal(sparseStep(12, 300), 1);
});

test("sparseStep grows to keep the kept labels legible on a crowded wheel", () => {
  const k = sparseStep(400, 300);
  assert.ok(k > 1);
  assert.ok(fontSizeFor(Math.ceil(400 / k), 300) >= MIN_READABLE_FONT_PX);
});

test("sparseStep never exceeds the segment count", () => {
  assert.ok(sparseStep(3, 1) <= 3);
});
