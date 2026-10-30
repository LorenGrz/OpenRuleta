import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, test } from "node:test";

import { BATCH_SIZE, insertParticipantsBatch, type BatchDb } from "./batch.ts";
import { fetchAllPages } from "./pagination.ts";
import type { ParticipantInput } from "./types.ts";

// Must be set before mock-store.ts is first loaded: it reads the path once.
const dir = mkdtempSync(join(tmpdir(), "openruleta-batch-test-"));
const FILE = join(dir, "db.json");
process.env.OPENRULETA_MOCK_DB = "1";
process.env.OPENRULETA_MOCK_DB_FILE = FILE;

const { addParticipantsBatch, listParticipants, markWinner } =
  await import("./participants.ts");

beforeEach(() => rmSync(FILE, { force: true }));
after(() => rmSync(dir, { recursive: true, force: true }));

const person = (n: number, email = `p${n}@example.com`): ParticipantInput => ({
  name: `Person ${n}`,
  email,
  document: `DOC${100000 + n}`,
});

// ── addParticipantsBatch against the mock store ───────────────────────────

test("addParticipantsBatch (mock): inserts new rows with won_at null", async () => {
  const before = (await listParticipants()).length;
  const out = await addParticipantsBatch([person(1), person(2)]);
  assert.deepEqual(out, { inserted: 2, duplicates: 0 });
  const all = await listParticipants();
  assert.equal(all.length, before + 2);
  const added = all.find((p) => p.email === "p1@example.com");
  assert.equal(added?.wonAt, null);
  assert.equal(added?.document, "DOC100001");
});

test("addParticipantsBatch (mock): skips existing emails and never resets a winner", async () => {
  const winner = (await listParticipants()).find((p) => p.wonAt);
  assert.ok(winner);
  const out = await addParticipantsBatch([
    {
      name: "Other Name",
      email: winner.email.toUpperCase(),
      document: "ZZZ999",
    },
    person(1),
  ]);
  assert.deepEqual(out, { inserted: 1, duplicates: 1 });
  const after = (await listParticipants()).find((p) => p.id === winner.id);
  assert.equal(after?.name, winner.name);
  assert.equal(after?.wonAt, winner.wonAt);
});

test("addParticipantsBatch (mock): repeated emails inside the input count as duplicates", async () => {
  const out = await addParticipantsBatch([
    person(1),
    person(2, "P1@example.com"),
  ]);
  assert.deepEqual(out, { inserted: 1, duplicates: 1 });
});

test("addParticipantsBatch (mock): keeps insertion order for a same-timestamp batch", async () => {
  await addParticipantsBatch([person(1), person(2), person(3)]);
  const names = (await listParticipants()).map((p) => p.name).slice(-3);
  assert.deepEqual(names, ["Person 1", "Person 2", "Person 3"]);
});

test("markWinner still works on imported rows", async () => {
  await addParticipantsBatch([person(1)]);
  const added = (await listParticipants()).find(
    (p) => p.email === "p1@example.com",
  );
  assert.ok(added);
  assert.ok((await markWinner(added.id, "Prize")).wonAt);
});

// ── insertParticipantsBatch with a fake DB ────────────────────────────────

function fakeDb(opts: {
  existing?: string[];
  insert?: (rows: ParticipantInput[], call: number) => void;
}): BatchDb & { inserts: ParticipantInput[][]; lookups: string[][] } {
  const inserts: ParticipantInput[][] = [];
  const lookups: string[][] = [];
  let calls = 0;
  return {
    inserts,
    lookups,
    async existingEmails(emails) {
      lookups.push(emails);
      return (opts.existing ?? []).filter((e) =>
        emails.includes(e.toLowerCase()),
      );
    },
    async insert(rows) {
      opts.insert?.(rows, ++calls);
      inserts.push(rows);
    },
  };
}

const noSleep = { sleep: async () => {} };

test("insertParticipantsBatch: splits into chunks of BATCH_SIZE", async () => {
  const db = fakeDb({});
  const inputs = Array.from({ length: BATCH_SIZE * 2 + 1 }, (_, i) =>
    person(i),
  );
  const out = await insertParticipantsBatch(db, inputs, noSleep);
  assert.deepEqual(out, { inserted: inputs.length, duplicates: 0 });
  assert.deepEqual(
    db.inserts.map((r) => r.length),
    [BATCH_SIZE, BATCH_SIZE, 1],
  );
});

test("insertParticipantsBatch: dedupes across chunks and against existing emails", async () => {
  const db = fakeDb({ existing: ["p0@example.com"] });
  const inputs = [
    ...Array.from({ length: BATCH_SIZE }, (_, i) => person(i)),
    person(5000, "P3@example.com"), // repeats an earlier chunk
    person(5001),
  ];
  const out = await insertParticipantsBatch(db, inputs, noSleep);
  // 1 existing (p0) + 1 repeated across chunks (p3).
  assert.deepEqual(out, { inserted: BATCH_SIZE - 1 + 1, duplicates: 2 });
});

test("insertParticipantsBatch: a 23505 on the chunk falls back to row by row", async () => {
  const racing = "p2@example.com";
  const db = fakeDb({
    insert(rows) {
      if (rows.length > 1 || rows[0].email === racing) {
        throw Object.assign(new Error("dup"), { code: "23505" });
      }
    },
  });
  const out = await insertParticipantsBatch(
    db,
    [person(1), person(2), person(3)],
    noSleep,
  );
  assert.deepEqual(out, { inserted: 2, duplicates: 1 });
  assert.deepEqual(
    db.inserts.map((r) => r[0].email),
    ["p1@example.com", "p3@example.com"],
  );
});

test("insertParticipantsBatch: non-23505 errors propagate (also in the row fallback)", async () => {
  const boom = Object.assign(new Error("not null"), { code: "23502" });
  await assert.rejects(
    insertParticipantsBatch(
      fakeDb({
        insert() {
          throw boom;
        },
      }),
      [person(1)],
      noSleep,
    ),
    boom,
  );

  const fatal = Object.assign(new Error("check"), { code: "23514" });
  await assert.rejects(
    insertParticipantsBatch(
      fakeDb({
        insert(rows) {
          if (rows.length > 1) {
            throw Object.assign(new Error("dup"), { code: "23505" });
          }
          throw fatal;
        },
      }),
      [person(1), person(2)],
      noSleep,
    ),
    fatal,
  );
});

test("insertParticipantsBatch: retries a transient error then succeeds", async () => {
  const db = fakeDb({
    insert(_rows, call) {
      if (call === 1) throw Object.assign(new Error("x"), { status: 503 });
    },
  });
  const out = await insertParticipantsBatch(db, [person(1)], noSleep);
  assert.deepEqual(out, { inserted: 1, duplicates: 0 });
  assert.equal(db.inserts.length, 1);
});

// ── pagination ─────────────────────────────────────────────────────────────

test("fetchAllPages: reads pages until a short one, in order", async () => {
  const data = Array.from({ length: 25 }, (_, i) => i);
  const ranges: [number, number][] = [];
  const out = await fetchAllPages(async (from, to) => {
    ranges.push([from, to]);
    return data.slice(from, to + 1);
  }, 10);
  assert.deepEqual(out, data);
  assert.deepEqual(ranges, [
    [0, 9],
    [10, 19],
    [20, 29],
  ]);
});

test("fetchAllPages: an exact multiple needs one extra empty page", async () => {
  const data = Array.from({ length: 20 }, (_, i) => i);
  let calls = 0;
  const out = await fetchAllPages(async (from, to) => {
    calls++;
    return data.slice(from, to + 1);
  }, 10);
  assert.equal(out.length, 20);
  assert.equal(calls, 3);
});

test("fetchAllPages: returns [] for an empty table and propagates errors", async () => {
  assert.deepEqual(await fetchAllPages(async () => [], 10), []);
  await assert.rejects(
    fetchAllPages(async () => {
      throw new Error("boom");
    }),
    /boom/,
  );
});
