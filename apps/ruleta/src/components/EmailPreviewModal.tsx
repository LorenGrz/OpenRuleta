"use client";

import { useEffect, useId, useRef } from "react";

import { siteConfig } from "@openruleta/config";

import type { WinnerNotificationState } from "@/lib/useWinnerNotification";

const m = siteConfig.ruleta.messages;

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  state: Exclude<WinnerNotificationState, { status: "idle" }>;
  onClose: () => void;
  onRetry: () => void;
};

/**
 * Preview + status of the winner email (real over SMTP, or simulated). Stacks above the winner /
 * winners modals: Esc is caught in the capture phase so it closes only this
 * dialog, Tab is trapped inside, and focus returns to the trigger on close.
 */
export function EmailPreviewModal({ state, onClose, onRetry }: Props) {
  const titleId = useId();
  const noteId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture phase on window runs first; stop it so an underlying modal's
        // own Esc handler (WinnersModal) does not close too.
        e.stopPropagation();
        onClose();
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
  }, [onClose]);

  const preview = state.status === "sent" ? state.result.preview : null;
  // Only warn once the server says nothing was delivered (no SMTP configured).
  const simulated = state.status === "sent" && state.result.simulated;
  const to = preview?.to ?? state.participant.email;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={simulated ? noteId : undefined}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#1b1b1b] text-left shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <h3
            id={titleId}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-[#abc7ff]"
          >
            {m.emailPreviewHeading}
          </h3>
          <button
            ref={closeRef}
            onClick={onClose}
            className={`rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20 ${FOCUS_RING}`}
          >
            {m.close}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {simulated && (
            <p
              id={noteId}
              className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200"
            >
              {m.emailSimulatedNote}
            </p>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-white/40">{m.emailTo}</dt>
            <dd className="break-all text-white">{to}</dd>
            {preview && (
              <>
                <dt className="text-white/40">{m.emailFrom}</dt>
                <dd className="break-all text-white">{preview.from}</dd>
                <dt className="text-white/40">{m.emailSubject}</dt>
                <dd className="font-semibold text-white">{preview.subject}</dd>
              </>
            )}
          </dl>

          {preview && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                {m.emailBody}
              </p>
              {/* Plain text on purpose: never inject the HTML part. */}
              <pre className="whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-[#151515] p-4 font-sans text-sm text-white/90">
                {preview.text}
              </pre>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          <p role="status" aria-live="polite" className="text-sm">
            {state.status === "sending" && (
              <span className="text-white/70">{m.emailSending}</span>
            )}
            {state.status === "sent" && (
              <span className="font-semibold text-green-400">
                {state.result.simulated ? m.emailSent : m.emailDelivered}
                <span className="ml-2 font-mono text-[11px] font-normal text-white/40">
                  {m.emailMessageId}: {state.result.messageId}
                </span>
              </span>
            )}
          </p>
          {state.status === "error" && (
            <div className="flex flex-1 items-center justify-between gap-3">
              <p role="alert" className="text-sm text-error">
                {state.message}
              </p>
              <button
                onClick={onRetry}
                className={`flex-none rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover ${FOCUS_RING}`}
              >
                {m.retry}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
