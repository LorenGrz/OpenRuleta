"use client";

import { useMemo, useState } from "react";

import { siteConfig } from "@openruleta/config";
import { maskDoc } from "@openruleta/core";

import type { Participant } from "@/lib/api";

const m = siteConfig.ruleta.messages;
const doc = siteConfig.form.docField;

type Props = {
  participants: Participant[];
  removedIds: Set<string>;
  newestId: string | null;
  refreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onDelete: (id: string, name: string) => void;
  deletingId: string | null;
  onDeleteAll: () => void;
  deletingAll: boolean;
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(siteConfig.locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ParticipantsPanel({
  participants,
  removedIds,
  newestId,
  refreshing,
  lastUpdated,
  onRefresh,
  onDelete,
  deletingId,
  onDeleteAll,
  deletingAll,
}: Props) {
  const [query, setQuery] = useState("");

  const ordered = useMemo(
    () =>
      [...participants].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [participants],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (p) => p.name.toLowerCase().includes(q) || p.docLast3.includes(q),
    );
  }, [ordered, query]);

  const active = participants.filter(
    (p) => !p.wonAt && !removedIds.has(p.id),
  ).length;

  return (
    <aside className="flex h-full w-full flex-col border-l border-white/10 bg-[#0a0a0a]">
      <div className="border-b border-white/10 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            {m.participantsHeading.replace("{n}", String(participants.length))}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
          </h2>
          <span className="text-[11px] text-white/40">
            {m.inPlay.replace("{n}", String(active))}
          </span>
        </div>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" strokeLinecap="round" />
            <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {refreshing ? m.refreshing : m.refresh}
        </button>

        <button
          onClick={onDeleteAll}
          disabled={deletingAll || participants.length === 0}
          className="mb-3 w-full rounded-lg border border-error/50 px-3 py-2 text-sm font-semibold text-error transition hover:bg-error/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deletingAll
            ? m.deletingAll
            : `${m.deleteAll}${
                participants.length ? ` (${participants.length})` : ""
              }`}
        </button>

        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={m.searchPlaceholder}
            className="w-full rounded-lg border border-white/10 bg-[#151515] py-2 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {lastUpdated && (
          <p className="mt-2 text-[11px] text-white/30">
            {m.lastUpdated.replace(
              "{time}",
              timeLabel(lastUpdated.toISOString()),
            )}
          </p>
        )}
      </div>

      <div className="hide-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-white/40">
            {participants.length === 0 ? m.noParticipants : m.noResults}
          </p>
        ) : (
          filtered.map((p) => {
            const isNew = p.id === newestId;
            const isWinner = Boolean(p.wonAt);
            const isSkipped = removedIds.has(p.id) && !isWinner;
            const isOut = isWinner || isSkipped;
            return (
              <div
                key={p.id}
                className={[
                  "flex items-center justify-between rounded-lg p-3",
                  isNew
                    ? "border border-primary/50 bg-primary/20"
                    : "bg-[#151515]",
                  isOut ? "opacity-40" : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {p.name}
                    {isWinner && (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-amber-400">
                        {m.wonTag}
                      </span>
                    )}
                    {isSkipped && (
                      <span className="ml-2 text-[10px] uppercase text-white/40">
                        {m.skippedTag}
                      </span>
                    )}
                  </p>
                  {doc.enabled && p.docLast3 && (
                    <p className="font-mono text-xs text-white/40">
                      {doc.displayLabel} {maskDoc(p.docLast3, doc.maskGlyph)}
                    </p>
                  )}
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-2">
                  <span className="text-[10px] text-white/40">
                    {isNew ? m.newTag : timeLabel(p.createdAt)}
                  </span>
                  <button
                    onClick={() => onDelete(p.id, p.name)}
                    disabled={deletingId === p.id}
                    title={m.deleteEntry}
                    aria-label={`${m.deleteEntry}: ${p.name}`}
                    className="grid h-6 w-6 place-items-center rounded-md text-white/30 transition hover:bg-error/20 hover:text-error disabled:opacity-40"
                  >
                    {deletingId === p.id ? "…" : "✕"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
