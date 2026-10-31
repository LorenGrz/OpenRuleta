"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { siteConfig } from "@openruleta/config";
import type { ParticipantInput } from "@openruleta/core";
import { Wordmark } from "@openruleta/ui";

import { AppModeToggle } from "@/components/AppModeToggle";
import { CollaboratorCarousel } from "@/components/CollaboratorCarousel";
import { DrawModeSelector } from "@/components/draw/DrawModeSelector";
import { getDrawMode } from "@/components/draw/registry";
import type { DrawModeId } from "@/components/draw/types";
import { useDrawMode } from "@/components/draw/useDrawMode";
import { useReducedMotion } from "@/components/draw/useReducedMotion";
import { EditableTitle, useRaffleTitle } from "@/components/EditableTitle";
import { HeaderMenu } from "@/components/HeaderMenu";
import { ImportCsvModal } from "@/components/ImportCsvModal";
import { EmailPreviewModal } from "@/components/EmailPreviewModal";
import { ParticipantsPanel } from "@/components/ParticipantsPanel";
import { QrOverlay } from "@/components/QrOverlay";
import { SponsorCarousel } from "@/components/SponsorCarousel";
import { WinnerModal } from "@/components/WinnerModal";
import { WinnersModal } from "@/components/WinnersModal";
import { useSoundPreference } from "@/components/useSoundPreference";
import { downloadCsv, toCsv } from "@/lib/csv";
import { useWinnerNotification } from "@/lib/useWinnerNotification";
import { useSoundEngine } from "@/lib/sound/useSoundEngine";
import {
  confirmWinner as confirmWinnerApi,
  deleteAllParticipants as deleteAllApi,
  deleteParticipant as deleteParticipantApi,
  fetchParticipants,
  importParticipants as importParticipantsApi,
  resetWinners as resetWinnersApi,
  setWinnerPrize as setWinnerPrizeApi,
  undoWinner as undoWinnerApi,
  type Participant,
} from "@/lib/api";

const POLL_MS = 5000;
const m = siteConfig.ruleta.messages;
const fill = (s: string, vars: Record<string, string>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), s);

function csvFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}

function downloadWinnersCsv(winners: Participant[]): void {
  const csv = toCsv(
    siteConfig.ruleta.csv.headers,
    winners.map((w) => [
      w.name,
      w.email,
      w.document,
      w.prize ?? "",
      w.wonAt ?? "",
    ]),
  );
  downloadCsv(csvFilename(siteConfig.ruleta.csv.filenamePrefix), csv);
}

// All participants, winners included — the full document is exported raw (not
// masked). The full value does reach the operator's browser through the local
// API (/api/participants), but it is only rendered in the CSVs: on-screen it
// stays masked because the screen is projected.
function downloadParticipantsCsv(participants: Participant[]): void {
  const csv = toCsv(
    siteConfig.ruleta.csv.participantsHeaders,
    participants.map((p) => [
      p.name,
      p.email,
      p.document,
      p.createdAt,
      p.wonAt ?? "",
      p.prize ?? "",
    ]),
  );
  downloadCsv(
    csvFilename(siteConfig.ruleta.csv.participantsFilenamePrefix),
    csv,
  );
}

type Props = {
  /** Session-only skips, owned by RuletaApp so they survive a mode switch. */
  skipIds: Set<string>;
  setSkipIds: Dispatch<SetStateAction<Set<string>>>;
};

export function RuletaClient({ skipIds, setSkipIds }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  // Seeds the winner modal's prize field so the operator doesn't retype what
  // is being raffled.
  const raffleTitle = useRaffleTitle();

  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [soundOn, toggleSound] = useSoundPreference();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [modalWinner, setModalWinner] = useState<Participant | null>(null);

  // Frozen list the current spin resolves against.
  const poolRef = useRef<Participant[]>([]);
  const pendingIndexRef = useRef(0);
  // True only while a spin's animation is actually in flight (I2): guards
  // handleSettled against a stray call from a remounted draw mode (e.g. one
  // triggered by a mode switch from another tab) reopening/rewinding the
  // winner modal.
  const spinningRef = useRef(false);

  // Draw modes only animate towards the winner spin() already picked.
  const [drawMode, setDrawMode] = useDrawMode();
  const [draw, setDraw] = useState<{
    runId: number;
    pool: Participant[];
    winnerIndex: number;
    // Mode locked in at spin() time (I2): a mode switch from another tab
    // must not remount the running scene mid-draw.
    mode: DrawModeId;
  } | null>(null);
  const sound = useSoundEngine(soundOn);
  const reducedMotion = useReducedMotion();

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

  // Winner email (simulated): keep the open winner modal and the list fresh.
  const notification = useWinnerNotification({
    onNotified: useCallback(
      (id: string, notifiedAt: string) => {
        setModalWinner((w) => (w && w.id === id ? { ...w, notifiedAt } : w));
        reload().catch(() => setLoadError(m.loadFailed));
      },
      [reload],
    ),
  });

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
  // The frozen pool and winner stay on stage until the winner is confirmed or skipped.
  const drawInFlight = draw !== null && (spinning || modalWinner !== null);
  // While a draw is in flight, keep rendering the mode it was spun with
  // (I2): a mode switch from another tab must not remount the running
  // scene, which would replay its animation and call onSettled() again.
  const renderedDrawMode = drawInFlight ? draw.mode : drawMode;
  const ActiveDrawMode = getDrawMode(renderedDrawMode).Component;

  function spin() {
    if (!canSpin) return;
    const pool = activePool;
    const idx = Math.floor(Math.random() * pool.length);
    poolRef.current = pool;
    pendingIndexRef.current = idx;

    sound.unlock();
    spinningRef.current = true;
    setDraw((prev) => ({
      runId: (prev?.runId ?? 0) + 1,
      pool,
      winnerIndex: idx,
      mode: drawMode,
    }));
    setSpinning(true);
  }

  // Enter spins (projector-friendly), unless the operator is typing, a
  // focused button would already handle Enter itself, or a dialog is open.
  const spinRef = useRef(spin);
  useEffect(() => {
    spinRef.current = spin;
  });
  const overlayOpen =
    showQr || showWinners || showImport || notification.state.status !== "idle";
  useEffect(() => {
    if (overlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el?.closest(
          "input, textarea, select, button, a, [contenteditable], [role=dialog]",
        )
      ) {
        return;
      }
      e.preventDefault();
      spinRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  function handleSettled() {
    // Ignore a call with no spin in flight (I2): a remounted draw mode
    // replays its animation to completion, which would otherwise reopen
    // the winner modal or rewind it to the "confirm" step after it settled.
    if (!spinningRef.current) return;
    spinningRef.current = false;
    setSpinning(false);
    const w = poolRef.current[pendingIndexRef.current];
    if (w) setModalWinner(w);
  }

  async function confirmWinner(prize: string) {
    if (!modalWinner || busy) return;
    setBusy(true);
    setLoadError(null);
    try {
      const confirmed = await confirmWinnerApi(modalWinner.id, prize);
      // Keep the modal open on its post-confirm step (notify by email). This
      // must happen even if the refresh below fails (M1): the winner is
      // already confirmed server-side, so a failed refresh is a separate,
      // lesser problem and must not be reported as a failed confirmation.
      setModalWinner(confirmed);
    } catch {
      setLoadError(m.confirmFailed);
      setBusy(false);
      return;
    }
    try {
      await reload();
    } catch {
      setLoadError(m.reloadFailed);
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

  function openImport() {
    if (spinning || modalWinner || busy) return;
    setShowImport(true);
  }

  // Resolves with the server summary; rejects when the import fails so the
  // modal can show the error and keep its preview. `busy` pauses the polling.
  async function runImport(rows: ParticipantInput[]) {
    setBusy(true);
    try {
      const result = await importParticipantsApi(rows);
      try {
        await reload();
      } catch {
        setLoadError(m.loadFailed);
      }
      return result;
    } finally {
      setBusy(false);
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
      <header className="flex min-h-16 flex-none flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/10 px-4 py-2 lg:px-6">
        <Wordmark
          src={siteConfig.assets.logo}
          alt={siteConfig.name}
          className="h-11"
        />
        <div className="flex flex-wrap items-center justify-end gap-2 lg:gap-3">
          <AppModeToggle
            disabled={
              spinning ||
              modalWinner !== null ||
              busy ||
              overlayOpen ||
              deletingId !== null ||
              deletingAll
            }
          />
          <DrawModeSelector
            value={drawMode}
            onChange={setDrawMode}
            disabled={spinning || modalWinner !== null}
          />
          <button
            onClick={() => setShowQr(true)}
            className="whitespace-nowrap rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            {m.showQr}
          </button>
          <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-md bg-green-500/10 xl:inline-flex px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            {m.privateBadge}
          </span>
          <HeaderMenu
            onRefresh={manualRefresh}
            refreshing={refreshing}
            onExportParticipantsCsv={() =>
              downloadParticipantsCsv(participants)
            }
            onImportCsv={openImport}
            importDisabled={spinning || modalWinner !== null || busy}
            onDeleteAll={deleteAllParticipants}
            deletingAll={deletingAll}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <main className="relative flex h-[85dvh] min-h-[560px] flex-none flex-col overflow-hidden md:h-auto md:min-h-0 md:flex-1">
          <div className="flex-none pt-3">
            <SponsorCarousel />
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-4 lg:gap-6 lg:px-8 lg:py-6">
            <EditableTitle />

            {/* The wheel caps at its compact size so title + wheel + Spin sit
                centred as one block, and shrinks on short screens; the other
                modes fill the stage. */}
            <div
              className={`flex min-h-0 w-full flex-1 items-center justify-center ${
                renderedDrawMode === "wheel"
                  ? "max-h-[460px] [container-type:size]"
                  : ""
              }`}
            >
              <ActiveDrawMode
                key={renderedDrawMode}
                pool={drawInFlight ? draw.pool : activePool}
                winnerIndex={drawInFlight ? draw.winnerIndex : null}
                runId={draw?.runId ?? 0}
                onSettled={handleSettled}
                sound={sound}
                reducedMotion={reducedMotion}
              />
            </div>

            <div className="flex flex-none flex-col items-center gap-2 lg:gap-3">
              <button
                onClick={spin}
                disabled={!canSpin}
                className="rounded-pill bg-primary px-10 py-4 sm:px-14 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition hover:scale-105 hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {spinning ? m.spinning : m.spin}
              </button>

              {(winners.length > 0 || skipIds.size > 0) && (
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                  {winners.length > 0 && (
                    <button
                      onClick={() => setShowWinners(true)}
                      className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
                    >
                      {fill(m.viewWinners, { n: String(winners.length) })}
                    </button>
                  )}

                  <button
                    onClick={resetRound}
                    disabled={busy}
                    className="text-sm text-white/50 underline transition hover:text-white disabled:opacity-40"
                  >
                    {m.resetDraw}
                  </button>
                </div>
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

        <div className="h-[70dvh] w-full flex-none md:h-auto md:w-80 lg:w-96">
          <ParticipantsPanel
            participants={participants}
            removedIds={skipIds}
            newestId={newestId}
            lastUpdated={lastUpdated}
            onDelete={deleteParticipant}
            deletingId={deletingId}
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
          onCancel={() => setModalWinner(null)}
          onNotify={() => notification.notify(modalWinner)}
          onClose={() => setModalWinner(null)}
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
          onNotify={notification.notify}
        />
      )}

      {notification.state.status !== "idle" && (
        <EmailPreviewModal
          state={notification.state}
          onClose={notification.close}
          onRetry={() =>
            notification.state.status !== "idle" &&
            notification.notify(notification.state.participant)
          }
        />
      )}

      {showImport && (
        <ImportCsvModal
          onClose={() => setShowImport(false)}
          onImport={runImport}
        />
      )}

      {showQr && <QrOverlay onClose={() => setShowQr(false)} />}
    </div>
  );
}
