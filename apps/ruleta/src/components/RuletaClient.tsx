"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { siteConfig } from "@openruleta/config";
import { Wordmark } from "@openruleta/ui";

import { CollaboratorCarousel } from "@/components/CollaboratorCarousel";
import { EditableTitle, useRaffleTitle } from "@/components/EditableTitle";
import { ParticipantsPanel } from "@/components/ParticipantsPanel";
import { QrOverlay } from "@/components/QrOverlay";
import { SponsorCarousel } from "@/components/SponsorCarousel";
import { Wheel } from "@/components/Wheel";
import { WinnerModal } from "@/components/WinnerModal";
import { WinnersModal } from "@/components/WinnersModal";
import { playSpinTicks } from "@/lib/spinSound";
import {
  confirmWinner as confirmWinnerApi,
  deleteAllParticipants as deleteAllApi,
  deleteParticipant as deleteParticipantApi,
  fetchParticipants,
  resetWinners as resetWinnersApi,
  setWinnerPrize as setWinnerPrizeApi,
  undoWinner as undoWinnerApi,
  type Participant,
} from "@/lib/api";

const POLL_MS = 5000;
const m = siteConfig.ruleta.messages;
const { wheelSpins: WHEEL_SPINS, wheelDurationMs: WHEEL_DURATION_MS } =
  siteConfig.ruleta;
const SOUND_KEY = `${siteConfig.slug}-ruleta-sound`;
const fill = (s: string, vars: Record<string, string>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), s);

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadWinnersCsv(winners: Participant[]): void {
  const header = siteConfig.ruleta.csv.headers;
  const rows = winners.map((w) =>
    [w.name, w.email, w.docLast3, w.prize ?? "", w.wonAt ?? ""]
      .map(csvCell)
      .join(","),
  );
  const csv = `${header.join(",")}\n${rows.join("\n")}\n`;
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${siteConfig.ruleta.csv.filenamePrefix}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function RuletaClient() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  // Session-only skips ("skip and spin again"): NOT persisted, that person did
  // not win. Confirmed winners are excluded via won_at (Supabase).
  const [skipIds, setSkipIds] = useState<Set<string>>(new Set());

  // Seeds the winner modal's prize field so the operator doesn't retype what
  // is being raffled.
  const raffleTitle = useRaffleTitle();

  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return window.localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  function toggleSound() {
    setSoundOn((on) => {
      const next = !on;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        // ignored
      }
      return next;
    });
  }
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [modalWinner, setModalWinner] = useState<Participant | null>(null);

  // Frozen list the current spin resolves against.
  const poolRef = useRef<Participant[]>([]);
  const pendingIndexRef = useRef(0);

  const winners = useMemo(
    () =>
      participants
        .filter((p) => p.wonAt)
        .sort((a, b) => (b.wonAt ?? "").localeCompare(a.wonAt ?? "")),
    [participants],
  );

  const activePool = useMemo(
    () => participants.filter((p) => !p.wonAt && !skipIds.has(p.id)),
    [participants, skipIds],
  );

  const newestId = useMemo(() => {
    if (participants.length === 0) return null;
    return participants.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b))
      .id;
  }, [participants]);

  const applyList = useCallback((list: Participant[]) => {
    setParticipants(list);
    setLastUpdated(new Date());
    setLoadError(null);
  }, []);

  const reload = useCallback(async () => {
    const data = await fetchParticipants();
    applyList(data.participants);
  }, [applyList]);

  // Initial fetch + auto-poll. setState only inside promise callbacks; polling
  // pauses while spinning, a modal is open, or a write is in flight.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      fetchParticipants()
        .then((data) => {
          if (!cancelled) applyList(data.participants);
        })
        .catch(() => {
          if (!cancelled) setLoadError(m.loadFailed);
        });
    };

    run();
    const id = setInterval(() => {
      if (!spinning && !modalWinner && !busy) run();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [spinning, modalWinner, busy, applyList]);

  async function manualRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } catch {
      setLoadError(m.loadFailed);
    } finally {
      setRefreshing(false);
    }
  }

  const canSpin = activePool.length > 0 && !spinning && !modalWinner && !busy;

  function spin() {
    if (!canSpin) return;
    const pool = activePool;
    const idx = Math.floor(Math.random() * pool.length);
    poolRef.current = pool;
    pendingIndexRef.current = idx;

    if (soundOn) playSpinTicks(WHEEL_DURATION_MS);

    const seg = 360 / pool.length;
    const mid = idx * seg + seg / 2;
    setRotation((prev) => {
      const prevMod = ((prev % 360) + 360) % 360;
      const desiredMod = (360 - mid) % 360;
      const delta = (desiredMod - prevMod + 360) % 360;
      const jitter = (Math.random() - 0.5) * seg * 0.6;
      return prev + 360 * WHEEL_SPINS + delta + jitter;
    });
    setSpinning(true);
  }

  function handleSettled() {
    setSpinning(false);
    const w = poolRef.current[pendingIndexRef.current];
    if (w) setModalWinner(w);
  }

  async function confirmWinner(prize: string) {
    if (!modalWinner || busy) return;
    setBusy(true);
    setLoadError(null);
    try {
      await confirmWinnerApi(modalWinner.id, prize);
      await reload();
      setModalWinner(null);
    } catch {
      setLoadError(m.confirmFailed);
    } finally {
      setBusy(false);
    }
  }

  async function editPrize(id: string, name: string, current: string | null) {
    if (busy) return;
    const next = window.prompt(
      fill(m.editPrizePrompt, { name }),
      current ?? "",
    );
    if (next === null) return;
    setBusy(true);
    try {
      await setWinnerPrizeApi(id, next);
      await reload();
    } catch {
      setLoadError(m.prizeFailed);
    } finally {
      setBusy(false);
    }
  }

  function removeAndReopen() {
    if (!modalWinner) return;
    setSkipIds((s) => new Set(s).add(modalWinner.id));
    setModalWinner(null);
  }

  async function undoWinner(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await undoWinnerApi(id);
      await reload();
    } catch {
      setLoadError(m.undoFailed);
    } finally {
      setBusy(false);
    }
  }

  async function deleteParticipant(id: string, name: string) {
    if (deletingId || busy) return;
    if (!window.confirm(fill(m.confirmDelete, { name }))) return;
    setDeletingId(id);
    try {
      await deleteParticipantApi(id);
      setSkipIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
      await reload();
    } catch {
      setLoadError(m.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteAllParticipants() {
    if (deletingAll || busy) return;
    const n = participants.length;
    if (n === 0) return;
    if (!window.confirm(fill(m.confirmDeleteAll, { n: String(n) }))) return;
    setDeletingAll(true);
    try {
      await deleteAllApi();
      setSkipIds(new Set());
      await reload();
    } catch {
      setLoadError(m.deleteAllFailed);
    } finally {
      setDeletingAll(false);
    }
  }

  async function resetRound() {
    if (busy) return;
    const msg =
      winners.length > 0
        ? fill(m.confirmResetWithWinners, { n: String(winners.length) })
        : m.confirmReset;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await resetWinnersApi();
      setSkipIds(new Set());
      await reload();
    } catch {
      setLoadError(m.resetFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-[#050505] text-white">
      <header className="flex h-16 flex-none items-center justify-between border-b border-white/10 px-6">
        <Wordmark
          src={siteConfig.assets.logo}
          alt={siteConfig.name}
          className="h-11"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            title={soundOn ? m.muteSound : m.unmuteSound}
            aria-label={soundOn ? m.muteSound : m.unmuteSound}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button
            onClick={() => setShowQr(true)}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            {m.showQr}
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            {m.privateBadge}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex-none pt-3">
            <SponsorCarousel />
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-8">
            <EditableTitle />

            <Wheel
              entries={activePool.map((p) => ({ id: p.id, name: p.name }))}
              rotation={rotation}
              durationMs={WHEEL_DURATION_MS}
              spinning={spinning}
              onSettled={handleSettled}
            />

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={spin}
                disabled={!canSpin}
                className="rounded-pill bg-primary px-14 py-4 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition hover:scale-105 hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {spinning ? m.spinning : m.spin}
              </button>

              {winners.length > 0 && (
                <button
                  onClick={() => setShowWinners(true)}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
                >
                  {fill(m.viewWinners, { n: String(winners.length) })}
                </button>
              )}

              {(skipIds.size > 0 || winners.length > 0) && (
                <button
                  onClick={resetRound}
                  disabled={busy}
                  className="text-sm text-white/50 underline transition hover:text-white disabled:opacity-40"
                >
                  {m.resetDraw}
                </button>
              )}

              {activePool.length === 0 && participants.length > 0 && (
                <p className="text-sm text-white/50">{m.poolEmpty}</p>
              )}
              {participants.length === 0 && (
                <p className="text-sm text-white/50">{m.noParticipants}</p>
              )}
              {loadError && <p className="text-sm text-error">{loadError}</p>}
            </div>
          </div>

          <div className="flex-none pb-3">
            <CollaboratorCarousel />
          </div>
        </main>

        <div className="w-80 flex-none md:w-96">
          <ParticipantsPanel
            participants={participants}
            removedIds={skipIds}
            newestId={newestId}
            refreshing={refreshing}
            lastUpdated={lastUpdated}
            onRefresh={manualRefresh}
            onDelete={deleteParticipant}
            deletingId={deletingId}
            onDeleteAll={deleteAllParticipants}
            deletingAll={deletingAll}
          />
        </div>
      </div>

      {modalWinner && (
        <WinnerModal
          winner={modalWinner}
          busy={busy}
          defaultPrize={raffleTitle}
          onConfirm={confirmWinner}
          onSpinAgain={removeAndReopen}
        />
      )}

      {showWinners && (
        <WinnersModal
          winners={winners}
          busy={busy}
          onClose={() => setShowWinners(false)}
          onExportCsv={() => downloadWinnersCsv(winners)}
          onUndo={undoWinner}
          onEditPrize={editPrize}
        />
      )}

      {showQr && <QrOverlay onClose={() => setShowQr(false)} />}
    </div>
  );
}
