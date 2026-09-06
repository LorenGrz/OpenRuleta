/** Shared participant types + DB row mapping for both apps. */

export type ParticipantInput = {
  name: string;
  email: string;
  /** Empty string when the document field is disabled in config. */
  docLast3: string;
};

export type FieldErrors = Partial<Record<keyof ParticipantInput, string>>;

/** What the public form gets back after a successful submit. */
export type Participant = {
  id: string;
  name: string;
  email: string;
  docLast3: string;
  createdAt: string;
};

/** The wheel app also needs winner state. */
export type WinnerParticipant = Participant & {
  /** ISO timestamp if this person already won a draw, else null. */
  wonAt: string | null;
  /** Prize assigned when the winner was confirmed, else null. */
  prize: string | null;
};

/** Raw `public.participants` row shape as returned by PostgREST. */
export type ParticipantRow = {
  id: string;
  name: string;
  email: string;
  doc_last3: string | null;
  created_at: string;
  won_at: string | null;
  prize: string | null;
};

export const PARTICIPANT_COLUMNS =
  "id, name, email, doc_last3, created_at, won_at, prize";

export function toWinnerParticipant(row: ParticipantRow): WinnerParticipant {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    docLast3: row.doc_last3 ?? "",
    createdAt: row.created_at,
    wonAt: row.won_at,
    prize: row.prize,
  };
}

export type SubmitResult =
  | { ok: true; participant: Participant }
  | { ok: false; message: string; fields?: FieldErrors };
