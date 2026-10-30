"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour of a modal dialog: moves focus to `initialFocus` (or the
 * dialog) on open and back to the trigger on close, closes on Escape and traps
 * Tab inside `dialogRef`.
 */
export function useDialog(
  dialogRef: RefObject<HTMLElement | null>,
  initialFocus: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    (initialFocus.current ?? dialogRef.current)?.focus();
    return () => previous?.focus();
  }, [dialogRef, initialFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
  }, [dialogRef, onClose]);
}
