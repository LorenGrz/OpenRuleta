import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchAllPages, rowsFromPage } from "./pagination.ts";

test("rowsFromPage: returns the rows, or [] for null data", () => {
  assert.deepEqual(rowsFromPage({ data: [1, 2], error: null }), [1, 2]);
  assert.deepEqual(rowsFromPage({ data: null, error: null }), []);
});

test("rowsFromPage: PGRST103 and status 416 mean an empty page", () => {
  assert.deepEqual(
    rowsFromPage({ data: null, error: { code: "PGRST103" } }),
    [],
  );
  assert.deepEqual(rowsFromPage({ data: null, error: {}, status: 416 }), []);
});

test("rowsFromPage: any other error is thrown", () => {
  const error = { code: "42501" };
  assert.throws(() => rowsFromPage({ data: null, error, status: 403 }), error);
});

test("fetchAllPages: stops when the page past the end is reported as 416", async () => {
  const table = [1, 2, 3];
  const rows = await fetchAllPages(
    async (from, to) =>
      from >= table.length
        ? rowsFromPage<number>({ data: null, error: { code: "PGRST103" } })
        : table.slice(from, to + 1),
    2,
  );
  assert.deepEqual(rows, [1, 2, 3]);
});
