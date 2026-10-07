import assert from "node:assert/strict";
import { test } from "node:test";

import { toCsv } from "./csv.ts";

test("toCsv: joins headers and rows with a leading BOM", () => {
  // Happy path: Excel needs the BOM to detect UTF-8, and plain values must
  // round-trip unescaped.
  const csv = toCsv(["name", "email"], [["Alex Doe", "alex@example.com"]]);
  assert.equal(csv, "﻿name,email\nAlex Doe,alex@example.com\n");
});

test("toCsv: renders multiple rows in the given order", () => {
  // Happy path: row order is caller-controlled, not re-sorted.
  const csv = toCsv(["name"], [["Bea"], ["Ada"]]);
  assert.equal(csv, "﻿name\nBea\nAda\n");
});

test("toCsv: escapes commas, quotes and newlines in a cell", () => {
  // Edge case: a value combining all three special characters must survive
  // as a single quoted, escaped field.
  const csv = toCsv(["note"], [['Hi, "friend"\nbye']]);
  assert.equal(csv, '﻿note\n"Hi, ""friend""\nbye"\n');
});

test("toCsv: returns header-only output when there are no rows", () => {
  // Edge case: an empty raffle (no participants yet) must still produce a
  // valid, openable CSV instead of throwing or omitting the header.
  const csv = toCsv(["name", "email"], []);
  assert.equal(csv, "﻿name,email\n");
});

test("toCsv: neutralizes values that start with = + - @ to block formula injection", () => {
  // Error/security case: a participant-supplied name like "=cmd()" must not
  // be allowed to execute as a spreadsheet formula on open.
  const csv = toCsv(
    ["name"],
    [["=cmd()"], ["+1"], ["-1"], ["@mention"], ["safe"]],
  );
  assert.equal(csv, "﻿name\n'=cmd()\n'+1\n'-1\n'@mention\nsafe\n");
});
