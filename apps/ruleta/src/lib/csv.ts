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

export type CsvRecord = {
  /** 1-based line of the file where this record starts (header = line 1). */
  line: number;
  cells: string[];
};

export type ParsedCsv = {
  delimiter: string;
  records: CsvRecord[];
};

const DELIMITERS = [",", ";", "\t"] as const;

/** Picks the delimiter that appears most (outside quotes) in the first record. */
function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(DELIMITERS.map((d) => [d, 0]));
  let inQuotes = false;
  // Skip leading blank lines: the header is the first non-empty line.
  for (const ch of text.replace(/^(?:[ \t]*[\r\n])+/, "")) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    else if (!inQuotes && counts.has(ch)) counts.set(ch, counts.get(ch)! + 1);
  }
  let best: string = ",";
  let bestCount = 0;
  for (const d of DELIMITERS) {
    const n = counts.get(d) ?? 0;
    if (n > bestCount) {
      best = d;
      bestCount = n;
    }
  }
  return best;
}

/**
 * Parses CSV text (RFC 4180 quoting, `""` escapes, line breaks inside quoted
 * cells, CRLF / LF / CR, optional BOM). The delimiter (`,` `;` or tab) is
 * detected from the first record. Every record keeps the line of the file
 * where it starts, so callers can report errors by line. Blank lines come back
 * as a record with a single empty cell; a trailing line break adds nothing.
 */
export function parseCsv(input: string): ParsedCsv {
  const text = input.startsWith("\uFEFF") ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const records: CsvRecord[] = [];

  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let atCellStart = true;
  let line = 1;
  let recordLine = 1;
  let pending = false; // something was read for the current record

  const endCell = () => {
    cells.push(cell);
    cell = "";
    atCellStart = true;
  };
  const endRecord = () => {
    endCell();
    records.push({ line: recordLine, cells });
    cells = [];
    pending = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!pending) {
      recordLine = line;
      pending = true;
    }
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n" || (ch === "\r" && text[i + 1] !== "\n")) line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && atCellStart) {
      inQuotes = true;
      atCellStart = false;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      line++;
      endRecord();
    } else {
      cell += ch;
      atCellStart = false;
    }
  }
  if (pending) endRecord();

  return { delimiter, records };
}

/** Decodes file bytes as strict UTF-8, falling back to windows-1252 (Excel). */
export function decodeCsvBytes(bytes: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
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
