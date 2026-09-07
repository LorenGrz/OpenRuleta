/**
 * Mock-database mode switch. Kept separate from the store itself (`mock-store.ts`)
 * so this — the part every API route pulls in through `participants.ts` — stays
 * free of `node:fs`. The store is loaded lazily, only when the mock is active.
 *
 *   - `OPENRULETA_MOCK_DB=1` / `true`   -> always use the mock
 *   - `OPENRULETA_MOCK_DB=0` / `false`  -> never use the mock (require Supabase)
 *   - unset                            -> auto: mock when no Supabase URL is set
 *
 * A fresh clone with no `.env.local` therefore runs end to end against the mock
 * with zero configuration. See the repo README → "Try it with no database".
 */
export function isMockDb(): boolean {
  const flag = process.env.OPENRULETA_MOCK_DB?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes" || flag === "on") {
    return true;
  }
  if (flag === "0" || flag === "false" || flag === "no" || flag === "off") {
    return false;
  }
  // Auto: no Supabase configured -> use the mock so the repo runs on clone.
  return !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
}
