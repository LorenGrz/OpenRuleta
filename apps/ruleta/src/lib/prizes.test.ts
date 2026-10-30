import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_NAME_LENGTH,
  parsePrizes,
  pickWeightedIndex,
  toDraft,
  validatePrizeDraft,
  type Prize,
} from "./prizes.ts";

const defaults: Prize[] = [
  { id: "a", name: "A", weight: 1 },
  { id: "b", name: "B", weight: 1 },
];
const stored = (value: unknown) => JSON.stringify(value);

test("parsePrizes: returns defaults for null, bad JSON and non-arrays", () => {
  assert.equal(parsePrizes(null, defaults), defaults);
  assert.equal(parsePrizes("{nope", defaults), defaults);
  assert.equal(parsePrizes(stored({ id: "x" }), defaults), defaults);
});

test("parsePrizes: accepts a valid list and trims names", () => {
  const list = [
    { id: "x", name: "  Mug ", weight: 3 },
    { id: "y", name: "Pen", weight: 0 },
  ];
  assert.deepEqual(parsePrizes(stored(list), defaults), [
    { id: "x", name: "Mug", weight: 3 },
    { id: "y", name: "Pen", weight: 0 },
  ]);
});

test("parsePrizes: falls back on each invalid shape", () => {
  const ok = { id: "x", name: "Mug", weight: 1 };
  const cases: unknown[] = [
    [ok],
    [ok, { id: "y", name: "   ", weight: 1 }],
    [ok, { id: "y", name: "Pen", weight: -1 }],
    [ok, { id: "y", name: "Pen", weight: null }],
    [ok, { id: "y", name: "Pen", weight: "2" }],
    [ok, { id: "x", name: "Pen", weight: 1 }],
    [ok, { id: "", name: "Pen", weight: 1 }],
    [ok, null],
    [
      { id: "x", name: "Mug", weight: 0 },
      { id: "y", name: "Pen", weight: 0 },
    ],
    Array.from({ length: 17 }, (_, i) => ({
      id: `i${i}`,
      name: "N",
      weight: 1,
    })),
  ];
  for (const c of cases)
    assert.equal(parsePrizes(stored(c), defaults), defaults);
});

test("parsePrizes: accepts exactly 16 prizes", () => {
  const list = Array.from({ length: 16 }, (_, i) => ({
    id: `i${i}`,
    name: "N",
    weight: 1,
  }));
  assert.equal(parsePrizes(stored(list), defaults).length, 16);
});

test("pickWeightedIndex: follows the weights and skips weight 0", () => {
  const prizes: Prize[] = [
    { id: "a", name: "A", weight: 0 },
    { id: "b", name: "B", weight: 1 },
    { id: "c", name: "C", weight: 3 },
    { id: "d", name: "D", weight: 0 },
  ];
  assert.equal(
    pickWeightedIndex(prizes, () => 0),
    1,
  );
  assert.equal(
    pickWeightedIndex(prizes, () => 0.24),
    1,
  );
  assert.equal(
    pickWeightedIndex(prizes, () => 0.25),
    2,
  );
  assert.equal(
    pickWeightedIndex(prizes, () => 0.9999999),
    2,
  );
});

test("pickWeightedIndex: random() at or above 1 stays in range on a winnable prize", () => {
  const prizes: Prize[] = [
    { id: "a", name: "A", weight: 2 },
    { id: "b", name: "B", weight: 0 },
  ];
  assert.equal(
    pickWeightedIndex(prizes, () => 1),
    0,
  );
  assert.equal(
    pickWeightedIndex(prizes, () => Number.NaN),
    0,
  );
});

test("pickWeightedIndex: never picks weight 0 over many draws; -1 when none can win", () => {
  const prizes: Prize[] = [
    { id: "a", name: "A", weight: 0 },
    { id: "b", name: "B", weight: 5 },
    { id: "c", name: "C", weight: 0 },
  ];
  for (let i = 0; i < 500; i++) assert.equal(pickWeightedIndex(prizes), 1);
  assert.equal(pickWeightedIndex([{ id: "a", name: "A", weight: 0 }]), -1);
});

test("validatePrizeDraft: valid draft yields trimmed prizes", () => {
  const draft = [
    { id: "a", name: " Mug ", weight: "5" },
    { id: "b", name: "Pen", weight: "0" },
  ];
  assert.deepEqual(validatePrizeDraft(draft).prizes, [
    { id: "a", name: "Mug", weight: 5 },
    { id: "b", name: "Pen", weight: 0 },
  ]);
});

test("validatePrizeDraft: reports name and weight errors per row", () => {
  const v = validatePrizeDraft([
    { id: "a", name: "", weight: "5" },
    { id: "b", name: "x".repeat(MAX_NAME_LENGTH + 1), weight: "101" },
    { id: "c", name: "ok", weight: "1.5" },
    { id: "d", name: "ok", weight: "-1" },
    { id: "e", name: "ok", weight: "" },
    { id: "f", name: "x".repeat(MAX_NAME_LENGTH), weight: "100" },
  ]);
  assert.deepEqual(v.rows.a, ["nameRequired"]);
  assert.deepEqual(v.rows.b, ["nameTooLong", "weightInvalid"]);
  assert.deepEqual(v.rows.c, ["weightInvalid"]);
  assert.deepEqual(v.rows.d, ["weightInvalid"]);
  assert.deepEqual(v.rows.e, ["weightInvalid"]);
  assert.equal(v.rows.f, undefined);
  assert.equal(v.prizes, null);
});

test("validatePrizeDraft: list rules (min, max, all weights 0)", () => {
  assert.deepEqual(
    validatePrizeDraft([{ id: "a", name: "A", weight: "1" }]).list,
    ["minPrizes"],
  );
  const many = Array.from({ length: 17 }, (_, i) => ({
    id: `i${i}`,
    name: "N",
    weight: "1",
  }));
  assert.deepEqual(validatePrizeDraft(many).list, ["maxPrizes"]);
  const zero = validatePrizeDraft([
    { id: "a", name: "A", weight: "0" },
    { id: "b", name: "B", weight: "0" },
  ]);
  assert.deepEqual(zero.list, ["noWeight"]);
  assert.equal(zero.prizes, null);
});

test("toDraft: round-trips through validation", () => {
  assert.deepEqual(validatePrizeDraft(toDraft(defaults)).prizes, defaults);
});
