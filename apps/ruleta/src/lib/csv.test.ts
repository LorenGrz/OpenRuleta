import assert from "node:assert/strict";
import { test } from "node:test";

import { decodeCsvBytes, parseCsv, toCsv } from "./csv.ts";

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

test("toCsv: quotes and neutralizes a formula trigger that follows a bare \\r", () => {
  // Security case (I1): a lone `\r` used to leave the cell unquoted (the
  // quote guard only matched `,`/`\n`) and the formula guard only checked
  // index 0, so "a\r=1+1" slipped through both checks unescaped.
  const csv = toCsv(["name"], [["a\r=1+1"]]);
  assert.equal(csv, `﻿name\n"a\r'=1+1"\n`);
});

test("toCsv: quotes and neutralizes a formula trigger that follows an embedded \\n", () => {
  // Security case (I1): a naive line-based reader that ignores CSV quoting
  // would see "@SUM(1)" as the start of its own field once split on `\n`.
  const csv = toCsv(["name"], [["a\n@SUM(1)"]]);
  assert.equal(csv, `﻿name\n"a\n'@SUM(1)"\n`);
});

test("toCsv: neutralizes a cell that starts with a tab", () => {
  // Edge case (I1): spreadsheet apps skip a leading tab before deciding a
  // cell is a formula, so "\t=1+1" must be guarded even though a tab is not
  // one of the original = + - @ prefixes.
  const csv = toCsv(["name"], [["\t=1+1"]]);
  assert.equal(csv, "﻿name\n'\t=1+1\n");
});

test("parseCsv: parses plain rows with line numbers and CRLF", () => {
  const { records, delimiter } = parseCsv("a,b\r\n1,2\r\n3,4\r\n");
  assert.equal(delimiter, ",");
  assert.deepEqual(records, [
    { line: 1, cells: ["a", "b"] },
    { line: 2, cells: ["1", "2"] },
    { line: 3, cells: ["3", "4"] },
  ]);
});

test("parseCsv: strips a BOM and handles quotes, escaped quotes and embedded breaks", () => {
  const { records } = parseCsv(
    '\uFEFFname,note\n"Doe, ""A""","x\ny"\nlast,z\n',
  );
  assert.deepEqual(records, [
    { line: 1, cells: ["name", "note"] },
    { line: 2, cells: ['Doe, "A"', "x\ny"] },
    { line: 4, cells: ["last", "z"] },
  ]);
});

test("parseCsv: detects semicolon and tab delimiters from the header", () => {
  assert.equal(parseCsv("a;b;c\n1;2;3").delimiter, ";");
  assert.deepEqual(parseCsv("a;b;c\n1;2;3").records[1].cells, ["1", "2", "3"]);
  assert.equal(parseCsv("a\tb\n1\t2").delimiter, "\t");
  assert.equal(parseCsv('"a;b",c\n1,2').delimiter, ",");
});

test("parseCsv: keeps blank lines as records and counts lone CR as a line break", () => {
  const { records } = parseCsv("a,b\r\r1,2");
  assert.deepEqual(records, [
    { line: 1, cells: ["a", "b"] },
    { line: 2, cells: [""] },
    { line: 3, cells: ["1", "2"] },
  ]);
});

test("parseCsv: returns no records for empty input and keeps a last row without newline", () => {
  assert.deepEqual(parseCsv("").records, []);
  assert.deepEqual(parseCsv("a,b\n1,").records[1].cells, ["1", ""]);
});

test("decodeCsvBytes: decodes valid UTF-8", () => {
  assert.equal(decodeCsvBytes(new TextEncoder().encode("María")), "María");
});

test("decodeCsvBytes: falls back to windows-1252 for invalid UTF-8", () => {
  // "María" in windows-1252: the i-acute is the single byte 0xED.
  const bytes = new Uint8Array([0x4d, 0x61, 0x72, 0xed, 0x61]);
  assert.equal(decodeCsvBytes(bytes), "María");
});

test("parseCsv: skips leading blank lines when detecting the delimiter", () => {
  const { delimiter, records } = parseCsv("\n\na;b\n1;2");
  assert.equal(delimiter, ";");
  assert.deepEqual(records.at(-1), { line: 4, cells: ["1", "2"] });
});
