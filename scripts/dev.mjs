// `pnpm dev`: starts both apps, checking Supabase once at startup. If the ruleta
// has credentials but the project cannot be reached (or lacks the current
// schema), both apps fall back to the mock store so they share the same data.
// Local only, on purpose: at runtime a dropped connection must surface as an
// error, never silently move sign-ups and winners to a temp file.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const RULETA_ENV_FILE = "apps/ruleta/.env.local";
const FORM_ENV_FILE = "apps/form/.env.local";
const PROBE_TIMEOUT_MS = 4000;

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) vars[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return vars;
}

// `limit=0` checks the table and the `document` column without reading any row.
async function probeSupabase(url, key) {
  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/participants?select=id,document&limit=0`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      },
    );
    if (res.ok) return null;
    return res.status === 400 || res.status === 404
      ? "schema out of date (run supabase/schema.sql)"
      : `HTTP ${res.status}`;
  } catch {
    return "unreachable";
  }
}

async function resolveMode(ruletaEnv) {
  const url = ruletaEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = ruletaEnv.SUPABASE_SERVICE_ROLE_KEY;
  // An explicit choice (shell or ruleta .env.local) always wins; no probe.
  if (process.env.OPENRULETA_MOCK_DB?.trim()) return "explicit";
  if (ruletaEnv.OPENRULETA_MOCK_DB?.trim()) return "explicit";
  if (!url || !key) return "auto";
  const problem = await probeSupabase(url, key);
  if (problem) {
    console.warn(`\n⚠ Supabase: ${problem}. Using the MOCK store.\n`);
    return "mock";
  }
  console.log("\n✓ Supabase reachable. Using the real database.\n");
  return "supabase";
}

const ruletaEnv = readEnvFile(RULETA_ENV_FILE);
const mode = await resolveMode(ruletaEnv);

const formEnv = { ...process.env };
const appEnv = { ...process.env };
// The form must never see the service_role key, even from the parent shell.
delete formEnv.SUPABASE_SERVICE_ROLE_KEY;
if (mode === "mock") {
  formEnv.OPENRULETA_MOCK_DB = "1";
  appEnv.OPENRULETA_MOCK_DB = "1";
} else if (
  mode === "supabase" &&
  !existsSync(FORM_ENV_FILE) &&
  ruletaEnv.SUPABASE_ANON_KEY
) {
  // The form never receives the service_role key.
  formEnv.NEXT_PUBLIC_SUPABASE_URL = ruletaEnv.NEXT_PUBLIC_SUPABASE_URL;
  formEnv.SUPABASE_ANON_KEY = ruletaEnv.SUPABASE_ANON_KEY;
}

const children = [
  spawn("pnpm", ["dev:form"], { stdio: "inherit", env: formEnv }),
  spawn("pnpm", ["dev:ruleta"], { stdio: "inherit", env: appEnv }),
];

function stopAll(signal = "SIGTERM") {
  for (const child of children) child.kill(signal);
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll());
for (const child of children) {
  child.on("error", (err) => {
    console.error(`Failed to start dev server: ${err.message}`);
    process.exitCode = 1;
    stopAll();
  });
  child.on("exit", (code) => {
    stopAll();
    process.exitCode ||= code ?? 0;
  });
}
