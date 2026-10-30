import assert from "node:assert/strict";
import { test } from "node:test";

import { fitLabel } from "./wheelLabel.ts";

test("fitLabel: a short name stays on one line with a large font", () => {
  const { lines, fontSize } = fitLabel("Tote bag", 6);
  assert.deepEqual(lines, ["Tote bag"]);
  assert.ok(fontSize >= 3);
});

test("fitLabel: font shrinks as the segment count grows", () => {
  const few = fitLabel("Sticker pack deluxe set", 4).fontSize;
  const many = fitLabel("Sticker pack deluxe set", 16).fontSize;
  assert.ok(many < few);
});

test("fitLabel: a long name wraps to at most two lines and stays bounded at 16 prizes", () => {
  const { lines, fontSize } = fitLabel(
    "A".repeat(19) + " " + "B".repeat(20),
    16,
  );
  assert.equal(lines.length, 2);
  assert.ok(fontSize >= 1.6);
  for (const l of lines) assert.ok(l.length * 0.6 * fontSize <= 31 + 0.001);
});

test("fitLabel: text too long for the minimum font is cut with an ellipsis", () => {
  const { lines } = fitLabel("x".repeat(200), 16);
  assert.ok(lines.length <= 2);
  assert.ok(lines.every((l) => l.length <= 33));
  assert.ok(lines.some((l) => l.endsWith("…")));
});
