// Deletes the local mock database file so the next run starts from the seed
// data. Honours OPENRULETA_MOCK_DB_FILE, matching packages/core/src/mock-db.ts.
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const file =
  process.env.OPENRULETA_MOCK_DB_FILE?.trim() ||
  join(tmpdir(), "openruleta-mock-db.json");

rmSync(file, { force: true });
console.log(`mock db reset — removed ${file}`);
