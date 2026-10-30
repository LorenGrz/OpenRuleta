/** Shared participant types + DB row mapping for both apps. */

export type ParticipantInput = {
  name: string;
  email: string;
  /** Full document, normalized. Empty string when the field is disabled in config. */
  document: string;
};

export type FieldErrors = Partial<Record<keyof ParticipantInput, string>>;

/** What the public form gets back after a successful submit. */
export type Participant = {
  id: string;
  name: string;
  email: string;
  document: string;
  createdAt: string;
};

/** The wheel app also needs winner state. */
export type WinnerParticipant = Participant & {
  /** ISO timestamp if this person already won a draw, else null. */
  wonAt: string | null;
  /** Prize assigned when the winner was confirmed, else null. */
  prize: string | null;
  /** ISO timestamp of the last (simulated) winner email, else null. */
  notifiedAt: string | null;
};

/** Raw `public.participants` row shape as returned by PostgREST. */
export type ParticipantRow = {
  id: string;
  name: string;
  email: string;
  /** Legacy column: no longer written, kept for rows created before `document`. */
  doc_last3: string | null;
  /** Absent in mock-store files written before this column existed. */
  document?: string | null;
  created_at: string;
  won_at: string | null;
  prize: string | null;
  notified_at: string | null;
};

export const PARTICIPANT_COLUMNS =
  "id, name, email, document, doc_last3, created_at, won_at, prize, notified_at";

export function toWinnerParticipant(row: ParticipantRow): WinnerParticipant {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    document: row.document ?? row.doc_last3 ?? "",
    createdAt: row.created_at,
    wonAt: row.won_at,
    prize: row.prize,
    // `?? null`: mock-store files written before this column existed lack it.
    notifiedAt: row.notified_at ?? null,
  };
}

export type SubmitResult =
  | { ok: true; participant: Participant }
  | { ok: false; message: string; fields?: FieldErrors };
