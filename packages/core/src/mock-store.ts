/**
 * File-backed mock store. Lets the whole repo run end to end with **no
 * Supabase**: when `isMockDb()` is true (see `mock-db.ts`), `participants.ts`
 * lazily imports this module so `pnpm dev:form` and `pnpm dev:ruleta` work
 * immediately and share the same data (sign someone up on the form, watch them
 * show up on the wheel).
 *
 * The store is a single JSON file, by default under the OS temp dir
 * (`openruleta-mock-db.json`); override with `OPENRULETA_MOCK_DB_FILE`. Delete
 * it (or run `pnpm mock:reset`) to start over from the seed data.
 *
 * NOT for production: one JSON file, naive read-modify-write, no locking. It is
 * loaded lazily precisely so it never ends up in a deployed serverless bundle.
 */

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { ParticipantRow } from "./types.ts";

const FILE =
  process.env.OPENRULETA_MOCK_DB_FILE?.trim() ||
  join(tmpdir(), "openruleta-mock-db.json");

type Store = { participants: ParticipantRow[] };

const SEED_NAMES = [
  "María González",
  "Juan Pérez",
  "Sofía Rodríguez",
  "Mateo Fernández",
  "Valentina López",
  "Benjamín Martínez",
  "Camila Sánchez",
  "Thiago Gómez",
  "Isabella Díaz",
  "Lucas Romero",
  "Martina Torres",
  "Joaquín Ruiz",
  "Emma Álvarez",
  "Bautista Molina",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function seed(): Store {
  const now = Date.now();
  const participants: ParticipantRow[] = SEED_NAMES.map((name, i) => {
    // One pre-marked winner so "View winners" and CSV export have something.
    const isWinner = i === 3;
    return {
      id: randomUUID(),
      name,
      email: `${slugify(name)}@example.com`,
      doc_last3: String(100 + ((i * 137) % 900)),
      created_at: new Date(
        now - (SEED_NAMES.length - i) * 90_000,
      ).toISOString(),
      won_at: isWinner ? new Date(now - 60_000).toISOString() : null,
      prize: isWinner ? "Mechanical keyboard" : null,
    };
  });
  return { participants };
}

// The `/*turbopackIgnore: true*/` markers tell the bundler this dynamic-path
// filesystem access is deliberate, so it does not trace the whole project into
// the build output. This module is only ever loaded when the mock is active.
function read(): Store {
  try {
    if (!existsSync(/*turbopackIgnore: true*/ FILE)) {
      const fresh = seed();
      write(fresh);
      return fresh;
    }
    const raw = readFileSync(/*turbopackIgnore: true*/ FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      participants: Array.isArray(parsed.participants)
        ? (parsed.participants as ParticipantRow[])
        : [],
    };
  } catch {
    return { participants: [] };
  }
}

function write(store: Store): void {
  const dir = dirname(FILE);
  if (!existsSync(/*turbopackIgnore: true*/ dir)) {
    mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  }
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(
    /*turbopackIgnore: true*/ tmp,
    JSON.stringify(store, null, 2),
    "utf8",
  );
  // Atomic swap so a concurrent reader never sees a torn file.
  renameSync(/*turbopackIgnore: true*/ tmp, FILE);
}

function byCreatedAtAsc(rows: ParticipantRow[]): ParticipantRow[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function cleanPrize(prize: string | null | undefined): string | null {
  const trimmed = (prize ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ── Operations (mirror the real ones in participants.ts) ───────────────────

export function mockListParticipants(): ParticipantRow[] {
  return byCreatedAtAsc(read().participants);
}

/** Throws `{ code: "23505" }` on a duplicate email, like Postgres would. */
export function mockAddParticipant(input: {
  name: string;
  email: string;
  docLast3: string;
}): void {
  const store = read();
  const email = input.email.toLowerCase();
  if (store.participants.some((p) => p.email.toLowerCase() === email)) {
    throw Object.assign(new Error("Email already registered."), {
      code: "23505",
    });
  }
  store.participants.push({
    id: randomUUID(),
    name: input.name,
    email: input.email,
    doc_last3: input.docLast3 ? input.docLast3 : null,
    created_at: new Date().toISOString(),
    won_at: null,
    prize: null,
  });
  write(store);
}

/** Returns the row, or `null` when the id matches nobody. */
export function mockMarkWinner(
  id: string,
  prize: string | null,
): ParticipantRow | null {
  const store = read();
  const row = store.participants.find((p) => p.id === id);
  if (!row) return null;
  if (!row.won_at) {
    row.won_at = new Date().toISOString();
    row.prize = cleanPrize(prize);
    write(store);
  }
  return row;
}

export function mockUnmarkWinner(id: string): void {
  const store = read();
  const row = store.participants.find((p) => p.id === id);
  if (!row) return;
  row.won_at = null;
  row.prize = null;
  write(store);
}

export function mockSetPrize(id: string, prize: string | null): void {
  const store = read();
  const row = store.participants.find((p) => p.id === id);
  if (!row) return;
  row.prize = cleanPrize(prize);
  write(store);
}

export function mockDeleteParticipant(id: string): void {
  const store = read();
  store.participants = store.participants.filter((p) => p.id !== id);
  write(store);
}

export function mockDeleteAllParticipants(): number {
  const store = read();
  const removed = store.participants.length;
  store.participants = [];
  write(store);
  return removed;
}

export function mockResetWinners(): void {
  const store = read();
  for (const p of store.participants) {
    p.won_at = null;
    p.prize = null;
  }
  write(store);
}
