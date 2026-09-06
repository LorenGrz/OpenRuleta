import { getSupabaseClient } from "./supabase.ts";
import { isTransientDbError, withRetry } from "./retry.ts";
import {
  PARTICIPANT_COLUMNS,
  toWinnerParticipant,
  type Participant,
  type ParticipantInput,
  type ParticipantRow,
  type WinnerParticipant,
} from "./types.ts";

/** Thrown when a second entry uses an email that is already registered. */
export class DuplicateParticipantError extends Error {
  constructor() {
    super("Email already registered.");
    this.name = "DuplicateParticipantError";
  }
}

/** Thrown by the wheel app when an id does not match any participant. */
export class ParticipantNotFoundError extends Error {
  constructor() {
    super("Participant not found.");
    this.name = "ParticipantNotFoundError";
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

function cleanPrize(prize: string | null | undefined): string | null {
  const trimmed = (prize ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ── Public form ────────────────────────────────────────────────────────────

/** Inserts a participant. Uses the anon key (INSERT-only under RLS). */
export async function addParticipant(
  input: ParticipantInput,
): Promise<Participant> {
  const supabase = getSupabaseClient(false);

  try {
    await withRetry(
      async () => {
        const { error, status } = await supabase.from("participants").insert({
          name: input.name,
          email: input.email,
          doc_last3: input.docLast3 ? input.docLast3 : null,
        });
        // supabase-js returns Postgres/PostgREST errors instead of throwing;
        // rethrow (with the HTTP status attached) so withRetry can classify.
        if (error) throw Object.assign(error, { status });
      },
      { isRetryable: isTransientDbError },
    );
  } catch (err) {
    // 23505 = unique_violation. Deterministic: never retried, surfaces as 409.
    if (isUniqueViolation(err)) throw new DuplicateParticipantError();
    throw err;
  }

  // The anon key cannot read the row back (RLS). The form only needs the name
  // and the masked document for the ticket, so return that.
  return {
    id: "",
    name: input.name,
    email: input.email,
    docLast3: input.docLast3,
    createdAt: new Date().toISOString(),
  };
}

// ── Wheel app (service_role, local only) ───────────────────────────────────

export async function listParticipants(): Promise<WinnerParticipant[]> {
  const supabase = getSupabaseClient(true);
  const { data, error } = await supabase
    .from("participants")
    .select(PARTICIPANT_COLUMNS)
    .order("created_at", { ascending: true })
    .returns<ParticipantRow[]>();

  if (error) throw error;
  return (data ?? []).map(toWinnerParticipant);
}

/** Marks a participant as winner (persistent). No-op if they already won. */
export async function markWinner(
  id: string,
  prize?: string | null,
): Promise<WinnerParticipant> {
  const supabase = getSupabaseClient(true);
  const { data, error } = await supabase
    .from("participants")
    .update({ won_at: new Date().toISOString(), prize: cleanPrize(prize) })
    .eq("id", id)
    .is("won_at", null)
    .select(PARTICIPANT_COLUMNS)
    .returns<ParticipantRow[]>();

  if (error) throw error;
  if (data && data.length > 0) return toWinnerParticipant(data[0]);

  // Nothing updated: either it does not exist or it already had won_at.
  const { data: existing, error: readErr } = await supabase
    .from("participants")
    .select(PARTICIPANT_COLUMNS)
    .eq("id", id)
    .maybeSingle<ParticipantRow>();
  if (readErr) throw readErr;
  if (!existing) throw new ParticipantNotFoundError();
  return toWinnerParticipant(existing);
}

/** Undo a single winner — puts them back in the pool and clears the prize. */
export async function unmarkWinner(id: string): Promise<void> {
  const supabase = getSupabaseClient(true);
  const { error } = await supabase
    .from("participants")
    .update({ won_at: null, prize: null })
    .eq("id", id);
  if (error) throw error;
}

/** Assign / edit a participant's prize without touching won_at. */
export async function setPrize(
  id: string,
  prize: string | null,
): Promise<void> {
  const supabase = getSupabaseClient(true);
  const { error } = await supabase
    .from("participants")
    .update({ prize: cleanPrize(prize) })
    .eq("id", id);
  if (error) throw error;
}

/** Deletes one participant. Irreversible. */
export async function deleteParticipant(id: string): Promise<void> {
  const supabase = getSupabaseClient(true);
  const { error } = await supabase.from("participants").delete().eq("id", id);
  if (error) throw error;
}

/** Wipes every participant. Irreversible. Returns how many were removed. */
export async function deleteAllParticipants(): Promise<number> {
  const supabase = getSupabaseClient(true);
  const { error, count } = await supabase
    .from("participants")
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) throw error;
  return count ?? 0;
}

/** Clears every winner mark and prize — everyone back in the pool. */
export async function resetWinners(): Promise<void> {
  const supabase = getSupabaseClient(true);
  const { error } = await supabase
    .from("participants")
    .update({ won_at: null, prize: null })
    .not("won_at", "is", null);
  if (error) throw error;
}

/** Cheap DB round-trip for the keep-alive route. */
export async function ping(): Promise<void> {
  const supabase = getSupabaseClient(false);
  const { error } = await supabase.rpc("app_ping");
  if (error) throw error;
}
