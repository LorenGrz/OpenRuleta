import assert from "node:assert/strict";
import { test } from "node:test";

import { siteConfig } from "@openruleta/config";
import { validateParticipant } from "@openruleta/core";

import { toCsv } from "./csv.ts";
import {
  buildImportTemplate,
  mapImportRows,
  type ImportRules,
} from "./importParticipants.ts";

const form = siteConfig.form;
const csvConfig = siteConfig.ruleta.csv;

const rules: ImportRules = {
  aliases: csvConfig.importAliases,
  documentRequired: form.docField.enabled,
  validate: (raw) =>
    validateParticipant(raw, {
      nameMinLength: form.nameMinLength,
      docField: {
        enabled: form.docField.enabled,
        pattern: form.docField.pattern,
      },
      messages: {
        nameError: form.messages.nameError,
        emailError: form.messages.emailError,
        docError: form.messages.docError,
      },
    }),
};

test("mapImportRows: maps aliased, mixed-case headers and normalizes values", () => {
  const out = mapImportRows(
    "Nombre;CORREO;DNI\nAna Pérez;ANA@Example.com;30.123.456\n",
    rules,
  );
  assert.deepEqual(out.valid, [
    { name: "Ana Pérez", email: "ana@example.com", document: "30123456" },
  ]);
  assert.deepEqual(out.invalid, []);
  assert.equal(out.duplicatesInFile, 0);
  assert.deepEqual(out.missingColumns, []);
});

test("mapImportRows: reports missing columns and maps no rows", () => {
  const out = mapImportRows("name,email\nAna,ana@example.com\n", rules);
  assert.deepEqual(out.missingColumns, ["document"]);
  assert.equal(out.valid.length, 0);
});

test("mapImportRows: an unrecognizable header reports every column", () => {
  assert.deepEqual(mapImportRows("", rules).missingColumns, [
    "name",
    "email",
    "document",
  ]);
  assert.deepEqual(mapImportRows("x,y\n1,2", rules).missingColumns, [
    "name",
    "email",
    "document",
  ]);
});

test("mapImportRows: document column is optional when documentRequired is false", () => {
  const optional: ImportRules = {
    ...rules,
    documentRequired: false,
    validate: (raw) =>
      validateParticipant(raw, { docField: { enabled: false, pattern: "" } }),
  };
  const out = mapImportRows("name,email\nAna,ana@example.com\n", optional);
  assert.deepEqual(out.missingColumns, []);
  assert.deepEqual(out.valid, [
    { name: "Ana", email: "ana@example.com", document: "" },
  ]);
});

test("mapImportRows: reports invalid rows by file line, with config messages", () => {
  const out = mapImportRows(
    [
      "name,email,document",
      "Ana,ana@example.com,30123456",
      "A,a@example.com,30123456",
      "Bea,not-an-email,123",
    ].join("\n"),
    rules,
  );
  assert.equal(out.valid.length, 1);
  assert.equal(out.invalid.length, 2);
  assert.equal(out.invalid[0].line, 3);
  assert.ok(out.invalid[0].reason.includes(form.messages.nameError));
  assert.equal(out.invalid[1].line, 4);
  assert.ok(out.invalid[1].reason.includes(form.messages.emailError));
});

test("mapImportRows: line numbers account for line breaks inside quoted cells", () => {
  const out = mapImportRows(
    'name,email,document\n"Ana\nPérez",ana@example.com,30123456\nB,b@example.com,30123457\n',
    rules,
  );
  assert.equal(out.valid.length, 1);
  assert.equal(out.invalid[0].line, 4);
});

test("mapImportRows: rejects legacy 3-digit documents by pattern", () => {
  const out = mapImportRows(
    "name,email,document\nAna,ana@example.com,456\n",
    rules,
  );
  assert.equal(out.valid.length, 0);
  assert.equal(out.invalid[0].line, 2);
  assert.ok(out.invalid[0].reason.includes(form.messages.docError));
});

test("mapImportRows: ignores blank rows without counting them as errors", () => {
  const out = mapImportRows(
    "name,email,document\n\n , , \nAna,ana@example.com,30123456\n\n",
    rules,
  );
  assert.equal(out.valid.length, 1);
  assert.deepEqual(out.invalid, []);
});

test("mapImportRows: keeps the first of repeated emails (normalized) and counts the rest", () => {
  const out = mapImportRows(
    [
      "name,email,document",
      "Ana,ana@example.com,30123456",
      "Ana Dos,ANA@example.com ,30123457",
      "Bea,bea@example.com,30123458",
    ].join("\n"),
    rules,
  );
  assert.deepEqual(
    out.valid.map((p) => p.name),
    ["Ana", "Bea"],
  );
  assert.equal(out.duplicatesInFile, 1);
});

test("mapImportRows: round-trips a toCsv export, undoing the formula guard", () => {
  const exported = toCsv(siteConfig.ruleta.csv.participantsHeaders, [
    [
      "=Ana Cruz",
      "ana@example.com",
      "30123456",
      "2026-01-01T00:00:00Z",
      "",
      "",
    ],
    [
      "Bea\n@Line",
      "bea@example.com",
      "30123457",
      "2026-01-01T00:00:00Z",
      "",
      "",
    ],
  ]);
  const out = mapImportRows(exported, rules);
  assert.deepEqual(out.invalid, []);
  assert.deepEqual(
    out.valid.map((p) => p.name),
    ["=Ana Cruz", "Bea\n@Line"],
  );
});

test("buildImportTemplate: the downloaded template imports without errors", () => {
  const template = buildImportTemplate(
    csvConfig.importHeaders,
    csvConfig.importTemplateRows,
  );
  const out = mapImportRows(template, rules);
  assert.deepEqual(out.missingColumns, []);
  assert.deepEqual(out.invalid, []);
  assert.equal(out.duplicatesInFile, 0);
  assert.equal(out.valid.length, csvConfig.importTemplateRows.length);
  assert.ok(out.valid.every((p) => p.email.endsWith("@example.com")));
});
