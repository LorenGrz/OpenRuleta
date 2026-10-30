"use client";

import { useId, useRef, useState } from "react";

import { siteConfig } from "@openruleta/config";

import {
  MAX_NAME_LENGTH,
  MAX_PRIZES,
  MAX_WEIGHT,
  toDraft,
  validatePrizeDraft,
  type DraftPrize,
  type Prize,
  type PrizeDraftError,
} from "@/lib/prizes";

import { useDialog } from "./useDialog";

const m = siteConfig.ruleta.prizeWheel.messages;

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    s,
  );

function errorText(code: PrizeDraftError): string {
  switch (code) {
    case "nameRequired":
      return m.errorNameRequired;
    case "nameTooLong":
      return fill(m.errorNameTooLong, { max: MAX_NAME_LENGTH });
    case "weightInvalid":
      return fill(m.errorWeightInvalid, { max: MAX_WEIGHT });
    case "minPrizes":
      return m.errorMinPrizes;
    case "maxPrizes":
      return fill(m.errorMaxPrizes, { max: MAX_PRIZES });
    case "noWeight":
      return m.errorNoWeight;
  }
}

type Props = {
  prizes: Prize[];
  defaults: Prize[];
  onSave: (prizes: Prize[]) => void;
  /** Resets the stored list to the defaults. */
  onRestore: () => void;
  onClose: () => void;
};

/**
 * Prize editor. Works on a local draft and only writes on "Save"; the weights
 * live here (not on the projected wheel) on purpose. Esc closes and discards.
 */
export function PrizesEditorModal({
  prizes,
  defaults,
  onSave,
  onRestore,
  onClose,
}: Props) {
  const titleId = useId();
  const hintId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  useDialog(dialogRef, firstRef, onClose);

  const [draft, setDraft] = useState<DraftPrize[]>(() => toDraft(prizes));
  const validation = validatePrizeDraft(draft);

  function update(id: string, patch: Partial<Omit<DraftPrize, "id">>) {
    setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function add() {
    if (draft.length >= MAX_PRIZES) return;
    const id = crypto.randomUUID();
    setDraft((rows) => [...rows, { id, name: "", weight: "1" }]);
  }

  function remove(id: string) {
    setDraft((rows) => rows.filter((r) => r.id !== id));
  }

  function restore() {
    if (!window.confirm(m.confirmRestore)) return;
    onRestore();
    setDraft(toDraft(defaults));
  }

  function save() {
    if (!validation.prizes) return;
    onSave(validation.prizes);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-white/10 bg-[#1b1b1b] text-left shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <h3
            id={titleId}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-[#abc7ff]"
          >
            {m.editorHeading}
          </h3>
          <button
            onClick={onClose}
            className={`rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20 ${FOCUS_RING}`}
          >
            {m.cancel}
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <p id={hintId} className="text-xs text-white/50">
            {m.editorHint}
          </p>

          <ul className="space-y-3">
            {draft.map((row, i) => {
              const errors = validation.rows[row.id] ?? [];
              const nameId = `${row.id}-name`;
              const weightId = `${row.id}-weight`;
              const errId = `${row.id}-err`;
              return (
                <li key={row.id}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label
                        htmlFor={nameId}
                        className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-white/40"
                      >
                        {m.nameLabel} {i + 1}
                      </label>
                      <input
                        ref={i === 0 ? firstRef : undefined}
                        id={nameId}
                        type="text"
                        value={row.name}
                        placeholder={m.namePlaceholder}
                        aria-invalid={errors.length > 0}
                        aria-describedby={errors.length > 0 ? errId : undefined}
                        onChange={(e) =>
                          update(row.id, { name: e.target.value })
                        }
                        className={`w-full rounded-lg border border-white/15 bg-[#151515] px-3 py-2 text-sm text-white outline-none transition focus:border-primary ${FOCUS_RING}`}
                      />
                    </div>
                    <div className="w-24">
                      <label
                        htmlFor={weightId}
                        className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-white/40"
                      >
                        {m.weightLabel}
                      </label>
                      <input
                        id={weightId}
                        type="text"
                        inputMode="numeric"
                        value={row.weight}
                        aria-invalid={errors.includes("weightInvalid")}
                        aria-describedby={errors.length > 0 ? errId : undefined}
                        onChange={(e) =>
                          update(row.id, { weight: e.target.value })
                        }
                        className={`w-full rounded-lg border border-white/15 bg-[#151515] px-3 py-2 text-sm text-white outline-none transition focus:border-primary ${FOCUS_RING}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      aria-label={`${m.removePrize}: ${row.name || i + 1}`}
                      title={m.removePrize}
                      className={`grid h-9 w-9 flex-none place-items-center rounded-lg bg-white/10 text-white/70 transition hover:bg-error/20 hover:text-error ${FOCUS_RING}`}
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                      </svg>
                    </button>
                  </div>
                  {errors.length > 0 && (
                    <ul id={errId} role="alert" className="mt-1 space-y-0.5">
                      {errors.map((code) => (
                        <li key={code} className="text-xs text-error">
                          {errorText(code)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {validation.list.length > 0 && (
            <ul role="alert" className="space-y-0.5">
              {validation.list.map((code) => (
                <li key={code} className="text-sm text-error">
                  {errorText(code)}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={add}
              disabled={draft.length >= MAX_PRIZES}
              className={`rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            >
              {m.addPrize} ({draft.length}/{MAX_PRIZES})
            </button>
            <button
              type="button"
              onClick={restore}
              className={`text-sm text-white/60 underline transition hover:text-white ${FOCUS_RING}`}
            >
              {m.restoreDefaults}
            </button>
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={save}
            disabled={validation.prizes === null}
            className={`rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
          >
            {m.save}
          </button>
        </footer>
      </div>
    </div>
  );
}
