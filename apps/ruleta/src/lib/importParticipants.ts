/** Pure mapping of CSV text to participants for the import feature. Runtime
 *  dependencies are injected through `ImportRules` so it can run under
 *  `node --test` without the `@/` alias or workspace packages. */

import type { ParticipantInput } from "@openruleta/core";

import { parseCsv, toCsv } from "./csv.ts";

export type ImportField = "name" | "email" | "document";

type RawParticipant = { name?: unknown; email?: unknown; document?: unknown };

/** Structural subset of core's `validateParticipant` result. */
export type ImportValidation =
  | { ok: true; data: ParticipantInput }
  | { ok: false; errors: Partial<Record<ImportField, string>> };

export type ImportRules = {
  /** Accepted header names per field (matched case/accent-insensitively). */
  aliases: Record<ImportField, readonly string[]>;
  /** When false, the document column is optional (docField disabled). */
  documentRequired: boolean;
  /** Same rules as the public form (`validateParticipant` + siteConfig.form). */
  validate: (raw: RawParticipant) => ImportValidation;
};

export type InvalidImportRow = { line: number; reason: string };

export type ImportMapping = {
  valid: ParticipantInput[];
  invalid: InvalidImportRow[];
  /** Rows dropped because their email already appeared earlier in the file. */
  duplicatesInFile: number;
  /** Required columns not found in the header. Rows are not mapped then. */
  missingColumns: ImportField[];
};

const FIELDS: ImportField[] = ["name", "email", "document"];

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// `toCsv` prefixes a single quote to cells that start with a formula trigger
// (or a trigger after an embedded line break). Undo it so exports re-import.
function stripFormulaGuard(value: string): string {
  return value
    .replace(/^'(?=[=+\-@\t\r])/, "")
    .replace(/([\r\n])'(?=[=+\-@\t\r])/g, "$1");
}

export function mapImportRows(text: string, rules: ImportRules): ImportMapping {
  const result: ImportMapping = {
    valid: [],
    invalid: [],
    duplicatesInFile: 0,
    missingColumns: [],
  };
  const { records } = parseCsv(text);
  const isBlank = (cells: string[]) => cells.every((c) => c.trim() === "");

  const headerIndex = records.findIndex((r) => !isBlank(r.cells));
  if (headerIndex === -1) {
    result.missingColumns = rules.documentRequired
      ? [...FIELDS]
      : FIELDS.filter((f) => f !== "document");
    return result;
  }

  const headers = records[headerIndex].cells.map(normalizeHeader);
  const columns = {} as Record<ImportField, number>;
  for (const field of FIELDS) {
    const wanted = rules.aliases[field].map(normalizeHeader);
    columns[field] = headers.findIndex((h) => wanted.includes(h));
  }

  result.missingColumns = FIELDS.filter(
    (f) => columns[f] === -1 && (f !== "document" || rules.documentRequired),
  );
  if (result.missingColumns.length > 0) return result;

  const seen = new Set<string>();
  for (const { line, cells } of records.slice(headerIndex + 1)) {
    if (isBlank(cells)) continue;
    const cellAt = (field: ImportField) =>
      columns[field] === -1
        ? ""
        : stripFormulaGuard(cells[columns[field]] ?? "");

    const validation = rules.validate({
      name: cellAt("name"),
      email: cellAt("email"),
      document: cellAt("document"),
    });
    if (!validation.ok) {
      result.invalid.push({
        line,
        reason: Object.values(validation.errors).join(" "),
      });
      continue;
    }
    if (seen.has(validation.data.email)) {
      result.duplicatesInFile++;
      continue;
    }
    seen.add(validation.data.email);
    result.valid.push(validation.data);
  }
  return result;
}

/** CSV text of the downloadable import template. */
export function buildImportTemplate(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  return toCsv(headers, rows);
}
