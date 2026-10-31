import assert from "node:assert/strict";
import { test } from "node:test";

import { toWinnerParticipant, type ParticipantRow } from "./types.ts";

const ROW: ParticipantRow = {
  id: "1",
  name: "Ada",
  email: "ada@example.com",
  doc_last3: null,
  document: null,
  created_at: "2026-10-30T00:00:00.000Z",
  won_at: null,
  prize: null,
  notified_at: null,
};

// Happy path: the new column wins over the legacy one.
test("toWinnerParticipant: should prefer document over doc_last3", () => {
  const p = toWinnerParticipant({
    ...ROW,
    document: "30123456",
    doc_last3: "456",
  });
  assert.equal(p.document, "30123456");
});

// Edge: legacy rows only have doc_last3.
test("toWinnerParticipant: should fall back to doc_last3", () => {
  assert.equal(
    toWinnerParticipant({ ...ROW, doc_last3: "456" }).document,
    "456",
  );
  const { document: _omit, ...old } = ROW;
  assert.equal(
    toWinnerParticipant({ ...old, doc_last3: "456" }).document,
    "456",
  );
});

// Edge: nothing stored at all.
test("toWinnerParticipant: should return an empty string when both are null", () => {
  assert.equal(toWinnerParticipant(ROW).document, "");
});
