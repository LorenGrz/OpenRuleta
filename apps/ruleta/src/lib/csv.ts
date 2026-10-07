/** Pure CSV generation + a small browser helper to trigger a download.
 *  Kept framework-free so `toCsv` can be unit tested in isolation. */

// Leading characters that spreadsheet apps (Excel, Sheets) treat as the start
// of a formula, plus the two whitespace controls those apps skip over before
// making that check. A cell starting with one of these is prefixed with a
// single quote so it is imported as plain text instead of executed (CSV
// injection).
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function guardFormula(value: string): string {
  const guarded = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? `'${value}`
    : value;
  // A multi-line cell can contain a line that itself starts with a formula
  // trigger right after a `\r`/`\n`; a reader that splits on raw line breaks
  // instead of respecting CSV quoting would see that line as its own field,
  // so neutralize it there too.
  return guarded.replace(/[\r\n](?=[=+\-@\t\r])/g, (br) => `${br}'`);
}

function csvCell(value: string): string {
  const safe = guardFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Builds a CSV document (with a UTF-8 BOM so Excel detects the encoding)
 *  from a header row and data rows. Every cell is escaped for commas,
 *  quotes, carriage returns, newlines, and formula-injection prefixes. */
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
