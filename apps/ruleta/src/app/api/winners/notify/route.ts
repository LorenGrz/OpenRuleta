import { NextResponse } from "next/server";

import { siteConfig } from "@openruleta/config";
import {
  buildWinnerEmail,
  getParticipant,
  markNotified,
  MockEmailSender,
  NotAWinnerError,
  ParticipantNotFoundError,
} from "@openruleta/core";

import { isUuid } from "@/lib/uuid";

/**
 * POST /api/winners/notify — send the winner email (SIMULATED) and stamp
 * `notified_at`.
 *
 * Request  (JSON): { id: string }   non-empty participant id.
 *
 * 200 → NotifyWinnerResponse
 *   {
 *     preview:    EmailMessage,     // { to, from, subject, text, html? } exactly as "sent"
 *     messageId:  string,           // sender id, "mock-…" for the mock sender
 *     simulated:  true,             // nothing is ever delivered
 *     notifiedAt: string            // ISO 8601 UTC, the new participants.notified_at
 *   }
 *
 * Errors — same `{ error: string }` body as the neighbouring routes (copy from
 * siteConfig.ruleta.messages), plus an additive machine-readable `code`:
 *   400 { error, code: "missing_id" }      body missing / not JSON / id not a non-empty string
 *   400 { error, code: "invalid_id" }      id is not a syntactically valid UUID (M2: a
 *                                          malformed id reaching the DB layer throws a
 *                                          Postgres error, which used to surface as 500)
 *   404 { error, code: "not_found" }       no participant with that id
 *   409 { error, code: "not_a_winner" }    won_at is null (also if undone mid-request)
 *   409 { error, code: "no_prize" }        winner without a prize: nothing to announce
 *   500 { error, code: "send_failed" }     sender or DB write failed; notified_at untouched
 *                                          if the send itself failed
 *
 * Idempotency: re-sending to an already-notified winner is allowed; each call
 * re-sends and overwrites notified_at.
 * Order: send first, then markNotified, so notified_at never claims a send
 * that did not happen.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const m = siteConfig.ruleta.messages;

type NotifyErrorCode =
  | "missing_id"
  | "invalid_id"
  | "not_found"
  | "not_a_winner"
  | "no_prize"
  | "send_failed";

function fail(status: number, error: string, code: NotifyErrorCode) {
  return NextResponse.json({ error, code }, { status });
}

async function readId(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { id?: unknown } | null;
    const id = body?.id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const id = await readId(request);
  if (!id) return fail(400, m.missingId, "missing_id");
  // A malformed id reaches the DB as an invalid UUID literal and Postgres
  // throws instead of returning no rows, so reject it here as 400 (M2).
  if (!isUuid(id)) return fail(400, m.notifyInvalidId, "invalid_id");

  try {
    const participant = await getParticipant(id);
    if (!participant) return fail(404, m.notFound, "not_found");
    if (!participant.wonAt) return fail(409, m.notifyNotWinner, "not_a_winner");
    if (!participant.prize) return fail(409, m.notifyNoPrize, "no_prize");

    const preview = buildWinnerEmail(
      {
        name: participant.name,
        email: participant.email,
        prize: participant.prize,
      },
      siteConfig.ruleta.email,
    );

    const sent = await new MockEmailSender().send(preview);
    const updated = await markNotified(id);

    return NextResponse.json(
      {
        preview,
        messageId: sent.id,
        simulated: true,
        notifiedAt: updated.notifiedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof ParticipantNotFoundError) {
      return fail(404, m.notFound, "not_found");
    }
    if (err instanceof NotAWinnerError) {
      return fail(409, m.notifyNotWinner, "not_a_winner");
    }
    console.error("notify winner failed", err);
    return fail(500, m.notifyRouteFailed, "send_failed");
  }
}
