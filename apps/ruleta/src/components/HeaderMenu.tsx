"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { siteConfig } from "@openruleta/config";

const m = siteConfig.ruleta.messages;

type Props = {
  onRefresh: () => void;
  refreshing: boolean;
  onExportParticipantsCsv: () => void;
  onDeleteAll: () => void;
  deletingAll: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  /** Slot for another feature (e.g. a draw-mode selector) to render as extra
   *  menu content, after the built-in items. */
  extra?: ReactNode;
};

/** Header hamburger menu: accessible dropdown (`aria-haspopup`,
 *  `aria-expanded`, `role="menu"`/`menuitem`) with arrow-key navigation,
 *  closing on Escape or an outside click, and focus returning to the
 *  trigger button on close. */
export function HeaderMenu({
  onRefresh,
  refreshing,
  onExportParticipantsCsv,
  onDeleteAll,
  deletingAll,
  soundOn,
  onToggleSound,
  extra,
}: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const focusItem = useCallback((index: number) => {
    const items = itemRefs.current.filter(
      (el): el is HTMLButtonElement => el !== null,
    );
    if (items.length === 0) return;
    const next = ((index % items.length) + items.length) % items.length;
    items[next]?.focus();
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    focusItem(0);

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      const items = itemRefs.current.filter(
        (el): el is HTMLButtonElement => el !== null,
      );
      const index = items.findIndex((el) => el === document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusItem(index + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusItem(index - 1);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close, focusItem]);

  function runAndClose(action: () => void) {
    close();
    action();
  }

  const itemClass =
    "flex w-full items-center px-4 py-2 text-left text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? m.menuClose : m.menuOpen}
        title={m.menu}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={m.menu}
          className="absolute right-0 top-full z-[150] mt-2 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#151515] py-1 shadow-xl"
        >
          <button
            ref={(el) => {
              itemRefs.current[0] = el;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={refreshing}
            onClick={() => runAndClose(onRefresh)}
            className={itemClass}
          >
            {refreshing ? m.refreshing : m.refresh}
          </button>

          <button
            ref={(el) => {
              itemRefs.current[1] = el;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => runAndClose(onExportParticipantsCsv)}
            className={itemClass}
          >
            {m.exportParticipantsCsv}
          </button>

          <button
            ref={(el) => {
              itemRefs.current[2] = el;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={deletingAll}
            onClick={() => runAndClose(onDeleteAll)}
            className={`${itemClass} text-error hover:bg-error/15`}
          >
            {deletingAll ? m.deletingAll : m.deleteAll}
          </button>

          <button
            ref={(el) => {
              itemRefs.current[3] = el;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => runAndClose(onToggleSound)}
            className={itemClass}
          >
            {soundOn ? m.muteSound : m.unmuteSound}
          </button>

          {extra}
        </div>
      )}
    </div>
  );
}
