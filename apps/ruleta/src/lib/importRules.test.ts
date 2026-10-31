import assert from "node:assert/strict";
import { test } from "node:test";

import { siteConfig } from "@openruleta/config";

import { importRules } from "./importRules.ts";

const form = siteConfig.form;
const ok = {
  name: "Ana Perez",
  email: "ana@example.com",
  document: "30123456",
};

test("importRules: accepts a normal row", () => {
  assert.equal(importRules.validate(ok).ok, true);
});

test("importRules: rejects a name over 200 characters", () => {
  const r = importRules.validate({ ...ok, name: "a".repeat(201) });
  assert.ok(!r.ok && r.errors.name === form.messages.nameError);
  assert.equal(importRules.validate({ ...ok, name: "a".repeat(200) }).ok, true);
});

test("importRules: rejects an email over 254 characters", () => {
  const long = `${"a".repeat(250)}@x.com`;
  const r = importRules.validate({ ...ok, email: long });
  assert.ok(!r.ok && r.errors.email === form.messages.emailError);
});

test("importRules: rejects control characters in name or email", () => {
  const n = importRules.validate({ ...ok, name: "Ana\u0000Perez" });
  assert.ok(!n.ok && n.errors.name === form.messages.nameError);
  const e = importRules.validate({ ...ok, email: "ana@exam\u007fple.com" });
  assert.ok(!e.ok && e.errors.email === form.messages.emailError);
  const nl = importRules.validate({ ...ok, name: "Ana\nPerez" });
  assert.equal(nl.ok, false);
});
