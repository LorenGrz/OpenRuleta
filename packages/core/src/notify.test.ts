/**
 * markNotified / unmarkWinner / resetWinners against the file-backed mock
 * store. Each test file runs in its own process under `node --test`, so the
 * env set here never leaks into other test files.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, test } from "node:test";

// Must be set before mock-store.ts is first loaded: it reads the path once.
const dir = mkdtempSync(join(tmpdir(), "openruleta-notify-test-"));
const FILE = join(dir, "db.json");
process.env.OPENRULETA_MOCK_DB = "1";
process.env.OPENRULETA_MOCK_DB_FILE = FILE;

const {
  getParticipant,
  listParticipants,
  markNotified,
  markWinner,
  NotAWinnerError,
  ParticipantNotFoundError,
  resetWinners,
  unmarkWinner,
} = await import("./participants.ts");

// A missing file re-seeds on next read: every test starts from the same seed
// (14 participants, exactly one pre-marked winner, nobody notified).
beforeEach(() => rmSync(FILE, { force: true }));
after(() => rmSync(dir, { recursive: true, force: true }));

async function seededWinner() {
  const winner = (await listParticipants()).find((p) => p.wonAt);
  assert.ok(winner, "seed has a winner");
  return winner;
}

async function seededNonWinner() {
  const p = (await listParticipants()).find((x) => !x.wonAt);
  assert.ok(p, "seed has a non-winner");
  return p;
}

// Baseline: nobody starts notified, so later assertions are meaningful.
test("seed: should start with notifiedAt null for everyone", async () => {
  for (const p of await listParticipants()) assert.equal(p.notifiedAt, null);
});

// Happy path: a winner gets a fresh ISO timestamp that is persisted.
test("markNotified: should stamp notifiedAt on a winner and persist it", async () => {
  const winner = await seededWinner();
  const before = Date.now();
  const updated = await markNotified(winner.id);

  assert.equal(updated.id, winner.id);
  assert.ok(updated.notifiedAt);
  assert.ok(Date.parse(updated.notifiedAt) >= before - 1);
  assert.equal(updated.wonAt, winner.wonAt);
  assert.equal(updated.prize, winner.prize);
  assert.equal(
    (await getParticipant(winner.id))?.notifiedAt,
    updated.notifiedAt,
  );
});

// Resend: calling again is allowed and moves the timestamp forward.
test("markNotified: should overwrite notifiedAt when resent", async () => {
  const winner = await seededWinner();
  const first = await markNotified(winner.id);
  await new Promise((r) => setTimeout(r, 5));
  const second = await markNotified(winner.id);
  assert.ok(first.notifiedAt && second.notifiedAt);
  assert.ok(Date.parse(second.notifiedAt) > Date.parse(first.notifiedAt));
});

// Guard: a non-winner is rejected with the typed error and NOT stamped.
test("markNotified: should throw NotAWinnerError for a non-winner and not write", async () => {
  const p = await seededNonWinner();
  await assert.rejects(markNotified(p.id), NotAWinnerError);
  assert.equal((await getParticipant(p.id))?.notifiedAt, null);
});

// Error: unknown id surfaces as ParticipantNotFoundError (route -> 404).
test("markNotified: should throw ParticipantNotFoundError for an unknown id", async () => {
  await assert.rejects(
    markNotified("does-not-exist"),
    ParticipantNotFoundError,
  );
});

// Freshly confirmed winners can be notified too (not only seeded ones).
test("markNotified: should work right after markWinner", async () => {
  const p = await seededNonWinner();
  await markWinner(p.id, "Mug");
  const updated = await markNotified(p.id);
  assert.ok(updated.notifiedAt);
  assert.equal(updated.prize, "Mug");
});

// Reset clears notifications along with winner marks.
test("resetWinners: should clear notifiedAt for everyone", async () => {
  const winner = await seededWinner();
  await markNotified(winner.id);
  await resetWinners();
  for (const p of await listParticipants()) {
    assert.equal(p.wonAt, null);
    assert.equal(p.notifiedAt, null);
  }
});

// Undo clears notifiedAt so a later re-win starts un-notified.
test("unmarkWinner: should clear notifiedAt", async () => {
  const winner = await seededWinner();
  await markNotified(winner.id);
  await unmarkWinner(winner.id);
  const row = await getParticipant(winner.id);
  assert.equal(row?.wonAt, null);
  assert.equal(row?.notifiedAt, null);
  await assert.rejects(markNotified(winner.id), NotAWinnerError);
});

test("getParticipant: should return null for an unknown id", async () => {
  assert.equal(await getParticipant("does-not-exist"), null);
});
