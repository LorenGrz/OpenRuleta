// Writes a local mock database with N fake participants (default 100), to try
// the draw modes with a crowded pool. Never touches Supabase: it only writes
// the mock file, honouring OPENRULETA_MOCK_DB_FILE like packages/core/src/mock-db.ts.
//
//   pnpm mock:seed            # 100 participants
//   pnpm mock:seed --count 250
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIRST = [
  "María",
  "Juan",
  "Sofía",
  "Mateo",
  "Valentina",
  "Benjamín",
  "Camila",
  "Thiago",
  "Isabella",
  "Lucas",
  "Martina",
  "Joaquín",
  "Emma",
  "Bautista",
  "Pablo Andrés",
  "Lucía",
  "Federico",
  "Agustina",
  "Santiago",
  "Florencia",
  "Nicolás",
  "Renata",
  "Tomás",
  "Julieta",
  "Alejo Nahuel",
];
const LAST = [
  "González",
  "Pérez",
  "Rodríguez",
  "Fernández",
  "López",
  "Martínez",
  "Sánchez",
  "Gómez",
  "Díaz",
  "Romero",
  "Torres",
  "Ruiz",
  "Álvarez",
  "Molina",
  "Espinoza Miranda",
  "Cristofaro",
  "Inga Estrada",
  "Gariglio",
  "Huaman",
  "Velasquez",
];

function parseCount(argv) {
  const i = argv.indexOf("--count");
  const raw = i >= 0 ? argv[i + 1] : undefined;
  const n = raw === undefined ? 100 : Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1 || n > 5000) {
    console.error("--count must be an integer between 1 and 5000");
    process.exit(1);
  }
  return n;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

const count = parseCount(process.argv.slice(2));
const file =
  process.env.OPENRULETA_MOCK_DB_FILE?.trim() ||
  join(tmpdir(), "openruleta-mock-db.json");
const now = Date.now();

const participants = Array.from({ length: count }, (_, i) => {
  const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
  return {
    id: randomUUID(),
    name,
    // The index keeps every email unique (the real table enforces it).
    email: `${slugify(name)}.${i}@example.com`,
    doc_last3: String(100 + ((i * 137) % 900)),
    created_at: new Date(now - (count - i) * 60_000).toISOString(),
    won_at: null,
    prize: null,
    notified_at: null,
  };
});

writeFileSync(file, JSON.stringify({ participants }, null, 2));
console.log(`mock db seeded — ${count} participants in ${file}`);
