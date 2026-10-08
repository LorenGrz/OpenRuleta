import type { EmailMessage, WinnerParticipant } from "@openruleta/core";

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

/** Resolves with the confirmed winner as stored (wonAt / prize set). */
export async function confirmWinner(
  id: string,
  prize?: string | null,
): Promise<Participant> {
  const res = await fetch("/api/winners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, prize: prize ?? "" }),
  });
  if (!res.ok) throw new Error(`POST /api/winners -> ${res.status}`);
  return ((await res.json()) as { participant: Participant }).participant;
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

/** 200 body of POST /api/winners/notify (contract documented in the route). */
export type NotifyWinnerResponse = {
  preview: EmailMessage;
  messageId: string;
  /** true when nothing was delivered (no SMTP configured on the server). */
  simulated: boolean;
  notifiedAt: string;
};

export type NotifyErrorCode =
  | "missing_id"
  | "invalid_id"
  | "not_found"
  | "not_a_winner"
  | "no_prize"
  | "send_failed";

/**
 * Normalized failure of the notify call. `message` is the server's
 * user-facing copy when it sent one (`serverMessage`), so the UI can show it
 * as-is; `code` is absent for network errors / non-JSON bodies.
 */
export class NotifyWinnerError extends Error {
  readonly status: number | null;
  readonly code: NotifyErrorCode | null;
  readonly serverMessage: string | null;

  constructor(
    status: number | null,
    code: NotifyErrorCode | null,
    serverMessage: string | null,
  ) {
    super(
      serverMessage ?? `POST /api/winners/notify -> ${status ?? "network"}`,
    );
    this.name = "NotifyWinnerError";
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
  }
}

/** Sends the winner email (real over SMTP, else simulated) and stamps notifiedAt. Resend-safe. */
export async function notifyWinner(id: string): Promise<NotifyWinnerResponse> {
  let res: Response;
  try {
    res = await fetch("/api/winners/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch {
    throw new NotifyWinnerError(null, null, null);
  }
  if (!res.ok) {
    let body: { error?: unknown; code?: unknown } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      body = {};
    }
    throw new NotifyWinnerError(
      res.status,
      typeof body.code === "string" ? (body.code as NotifyErrorCode) : null,
      typeof body.error === "string" ? body.error : null,
    );
  }
  return (await res.json()) as NotifyWinnerResponse;
}
