import assert from "node:assert/strict";
import { test } from "node:test";

import { maskDoc, validateParticipant } from "./validation.ts";

const BASE = { name: "Ada Lovelace", email: "Ada@Example.com" };
const DOC = { enabled: true, pattern: "^[0-9A-Z]{6,20}$" };

// Happy path: separators are stripped and the normalized value is returned.
test("validateParticipant: should normalize dots, spaces and dashes", () => {
  const res = validateParticipant(
    { ...BASE, document: " 30.123.456 " },
    { docField: DOC },
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.document, "30123456");
    assert.equal(res.data.email, "ada@example.com");
  }
});

// Happy path: lowercase letters (passports) are uppercased before the pattern.
test("validateParticipant: should uppercase alphanumeric documents", () => {
  const res = validateParticipant(
    { ...BASE, document: "ab-123 456" },
    { docField: DOC },
  );
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.data.document, "AB123456");
});

// Edge: the default pattern accepts the same range as the config.
test("validateParticipant: should apply the default pattern", () => {
  assert.equal(validateParticipant({ ...BASE, document: "12345" }).ok, false);
  assert.equal(validateParticipant({ ...BASE, document: "123456" }).ok, true);
  assert.equal(
    validateParticipant({ ...BASE, document: "1".repeat(21) }).ok,
    false,
  );
});

// Error: invalid characters and non-string input fail with a document error.
test("validateParticipant: should reject invalid or non-string documents", () => {
  const bad = validateParticipant(
    { ...BASE, document: "123_456!" },
    { docField: DOC, messages: { docError: "bad doc" } },
  );
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.errors.document, "bad doc");

  const missing = validateParticipant({ ...BASE, document: 123456 });
  assert.equal(missing.ok, false);
});

// Edge: a disabled field is not validated and stays empty.
test("validateParticipant: should leave document empty when disabled", () => {
  const res = validateParticipant(
    { ...BASE, document: "ignored" },
    { docField: { enabled: false, pattern: DOC.pattern } },
  );
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.data.document, "");
});

// Happy path + edge: only the last 3 characters are shown.
test("maskDoc: should show only the last 3 characters", () => {
  assert.equal(maskDoc("30123456"), "••• 456");
  assert.equal(maskDoc("AB123XY", "***"), "*** 3XY");
  assert.equal(maskDoc("12"), "••• 12");
  assert.equal(maskDoc(""), "••• ");
});
