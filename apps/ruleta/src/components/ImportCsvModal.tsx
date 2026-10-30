"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";

import { siteConfig } from "@openruleta/config";
import { MAX_IMPORT_ROWS } from "@openruleta/core";

import type { ImportResult } from "@/lib/api";
import { decodeCsvBytes, downloadCsv } from "@/lib/csv";
import {
  buildImportTemplate,
  mapImportRows,
  type ImportMapping,
} from "@/lib/importParticipants";
import { importRules } from "@/lib/importRules";

const m = siteConfig.ruleta.messages;
const csv = siteConfig.ruleta.csv;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PREVIEW_ERRORS = 20;

// Position of each field in `csv.importHeaders`.
const FIELD_HEADER_INDEX = { name: 0, email: 1, document: 2 } as const;

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    s,
  );

type Props = {
  onClose: () => void;
  /** Sends the valid rows; rejects when the import fails. Marks the page busy. */
  onImport: (rows: ImportMapping["valid"]) => Promise<ImportResult>;
};

/**
 * CSV import dialog: pick a file, review the preview (valid / repeated /
 * errors by line) and import. Esc closes it except while the import runs; Tab
 * is trapped inside and focus returns to the trigger on close.
 */
export function ImportCsvModal({ onClose, onImport }: Props) {
  const titleId = useId();
  const fileId = useId();
  const hintId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportMapping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  // Id of the latest file read: results of an older, slower read are dropped.
  const readIdRef = useRef(0);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    fileRef.current?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!importing) onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, importing]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    // Clear the value so picking the same file again fires onChange.
    input.value = "";
    const readId = ++readIdRef.current;
    setReading(false);
    setPreview(null);
    setResult(null);
    setError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(m.importFileTooLarge);
      return;
    }
    setReading(true);
    try {
      const text = decodeCsvBytes(await file.arrayBuffer());
      if (readId !== readIdRef.current) return;
      const mapping = mapImportRows(text, importRules);
      if (mapping.valid.length > MAX_IMPORT_ROWS) {
        setError(fill(m.importTooManyRows, { n: MAX_IMPORT_ROWS }));
      } else {
        setPreview(mapping);
      }
    } catch {
      if (readId === readIdRef.current) setError(m.importReadFailed);
    } finally {
      if (readId === readIdRef.current) setReading(false);
    }
  }

  function downloadTemplate() {
    downloadCsv(
      csv.importTemplateFilename,
      buildImportTemplate(csv.importHeaders, csv.importTemplateRows),
    );
  }

  async function runImport() {
    if (!preview || preview.valid.length === 0 || importing) return;
    setImporting(true);
    setError(null);
    try {
      setResult(await onImport(preview.valid));
    } catch {
      // Keep the preview so the operator can retry without re-picking the file.
      setError(m.importFailed);
    } finally {
      setImporting(false);
    }
  }

  const shownErrors = preview?.invalid.slice(0, PREVIEW_ERRORS) ?? [];
  const hiddenErrors = (preview?.invalid.length ?? 0) - shownErrors.length;
  const canImport =
    preview !== null &&
    preview.valid.length > 0 &&
    result === null &&
    !importing;

  return (
    <div
      onClick={() => {
        if (!importing) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={importing}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#1b1b1b] text-left shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <h3
            id={titleId}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-[#abc7ff]"
          >
            {m.importHeading}
          </h3>
          <button
            onClick={onClose}
            disabled={importing}
            className={`rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20 disabled:opacity-40 ${FOCUS_RING}`}
          >
            {m.close}
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div>
            <label
              htmlFor={fileId}
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/40"
            >
              {m.importFileLabel}
            </label>
            <input
              ref={fileRef}
              id={fileId}
              type="file"
              accept=".csv,text/csv"
              aria-describedby={hintId}
              disabled={importing}
              onChange={handleFile}
              className={`block w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-white/20 ${FOCUS_RING}`}
            />
            <p id={hintId} className="mt-2 text-xs text-white/50">
              {m.importFileHint}
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className={`mt-2 text-xs text-white/70 underline transition hover:text-white ${FOCUS_RING}`}
            >
              {m.importDownloadTemplate}
            </button>
          </div>

          {reading && (
            <p role="status" className="text-sm text-white/70">
              {m.importReading}
            </p>
          )}

          {preview && preview.missingColumns.length > 0 && (
            <p role="alert" className="text-sm text-error">
              {fill(m.importMissingColumns, {
                columns: preview.missingColumns
                  .map((f) => csv.importHeaders[FIELD_HEADER_INDEX[f]])
                  .join(", "),
              })}
            </p>
          )}

          {preview && preview.missingColumns.length === 0 && (
            <div className="space-y-3">
              <ul className="flex flex-wrap gap-2 text-xs">
                <li className="rounded-md bg-green-500/10 px-2 py-1 text-green-400">
                  {fill(m.importValidCount, { n: preview.valid.length })}
                </li>
                <li className="rounded-md bg-amber-400/10 px-2 py-1 text-amber-200">
                  {fill(m.importDuplicatesCount, {
                    n: preview.duplicatesInFile,
                  })}
                </li>
                <li className="rounded-md bg-error/10 px-2 py-1 text-error">
                  {fill(m.importInvalidCount, { n: preview.invalid.length })}
                </li>
              </ul>
              {preview.valid.length === 0 && (
                <p className="text-sm text-white/60">
                  {m.importNothingToImport}
                </p>
              )}
              {shownErrors.length > 0 && (
                <ul className="space-y-1 rounded-lg border border-white/10 bg-[#151515] p-3 text-xs text-white/80">
                  {shownErrors.map((row) => (
                    <li key={row.line}>
                      {fill(m.importErrorLine, {
                        line: row.line,
                        reason: row.reason,
                      })}
                    </li>
                  ))}
                  {hiddenErrors > 0 && (
                    <li className="text-white/50">
                      {fill(m.importMoreErrors, { n: hiddenErrors })}
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          {result && (
            <p role="status" className="text-sm font-semibold text-green-400">
              {fill(m.importDone, {
                inserted: result.inserted,
                duplicates: result.duplicates,
                invalid: result.invalid,
              })}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={runImport}
            disabled={!canImport}
            className={`rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
          >
            {importing
              ? m.importing
              : fill(m.importButton, { n: preview?.valid.length ?? 0 })}
          </button>
        </footer>
      </div>
    </div>
  );
}
