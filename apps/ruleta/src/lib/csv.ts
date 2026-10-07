/** Pure CSV generation + a small browser helper to trigger a download.
 *  Kept framework-free so `toCsv` can be unit tested in isolation. */

// Leading characters that spreadsheet apps (Excel, Sheets) treat as the start
// of a formula. A cell starting with one of these is prefixed with a single
// quote so it is imported as plain text instead of executed (CSV injection).
const FORMULA_PREFIXES = ["=", "+", "-", "@"];

function guardFormula(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? `'${value}`
    : value;
}

function csvCell(value: string): string {
  const safe = guardFormula(value);
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Builds a CSV document (with a UTF-8 BOM so Excel detects the encoding)
 *  from a header row and data rows. Every cell is escaped for commas,
 *  quotes, newlines, and formula-injection prefixes. */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => csvCell(String(cell ?? ""))).join(","),
  );
  return `﻿${lines.join("\n")}\n`;
}

/** Triggers a browser download of `content` as `filename`. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
