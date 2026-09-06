import type { WinnerParticipant } from "@openruleta/core";

export type Participant = WinnerParticipant;

export type ParticipantsResponse = {
  participants: Participant[];
  count: number;
};

export async function fetchParticipants(
  signal?: AbortSignal,
): Promise<ParticipantsResponse> {
  const res = await fetch("/api/participants", { cache: "no-store", signal });
  if (!res.ok) throw new Error(`GET /api/participants -> ${res.status}`);
  return (await res.json()) as ParticipantsResponse;
}

export async function deleteParticipant(id: string): Promise<void> {
  const res = await fetch("/api/participants", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`DELETE /api/participants -> ${res.status}`);
}

export async function deleteAllParticipants(): Promise<void> {
  const res = await fetch("/api/participants", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ all: true }),
  });
  if (!res.ok)
    throw new Error(`DELETE /api/participants (all) -> ${res.status}`);
}

export async function confirmWinner(
  id: string,
  prize?: string | null,
): Promise<void> {
  const res = await fetch("/api/winners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, prize: prize ?? "" }),
  });
  if (!res.ok) throw new Error(`POST /api/winners -> ${res.status}`);
}

export async function setWinnerPrize(id: string, prize: string): Promise<void> {
  const res = await fetch("/api/winners", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, prize }),
  });
  if (!res.ok) throw new Error(`PATCH /api/winners -> ${res.status}`);
}

export async function undoWinner(id: string): Promise<void> {
  const res = await fetch("/api/winners", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`DELETE /api/winners -> ${res.status}`);
}

export async function resetWinners(): Promise<void> {
  const res = await fetch("/api/winners/reset", { method: "POST" });
  if (!res.ok) throw new Error(`POST /api/winners/reset -> ${res.status}`);
}
