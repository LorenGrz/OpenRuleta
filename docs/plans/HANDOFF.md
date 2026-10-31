# Handoff - OpenRuleta

Last updated: 2026-10-31

## Current state

<!-- One or two sentences: what's built/working right now, and what isn't yet. -->

`master` now has the full document, the CSV import and the **Prize wheel** mode (PRs #2, #3, #4), plus `pnpm dev` falling back to the mock store when Supabase is unreachable at startup. Typecheck, lint and tests pass, and the app was exercised in a browser against the mock store; the Supabase paths below have not been run against a real project (including the `PGRST103`/416 handling of a page past the end of `listParticipants` and the connected branch of `scripts/dev.mjs`).

## Active plan

<!-- Link the plan this work is following, if any. -->

[2026-10-30 CSV import and prize wheel](../superpowers/plans/2026-10-30-csv-import-prize-wheel.md)

## Pending work

<!-- Concrete next steps, in the order they should happen. Delete items as
     they're done instead of checking them off, so this list only ever
     shows what's left. -->

1. The Supabase host in `apps/ruleta/.env.local` does not resolve in DNS: check that project or create a new one, then run `supabase/schema.sql` on it. Any deployment built from `master` needs that SQL first: the form now writes `document`.
2. Try the participants `GET` against it, including a table with more than 1000 rows.
3. Import a 100-row CSV against it, then import it again: expect 0 inserted and 100 duplicates.
4. Check 16 long prize names at 1280x720; they were only viewed at a larger wheel size.
5. Known: the first spin after switching app mode may miss its tick sounds, because `useSoundEngine` rebuilds its audio graph asynchronously on mount. Fix idea: hoist the engine to `RuletaApp`; not done to leave the sound engine untouched.
6. Intermittent Turbopack 500 in dev: `next/font/google queries have exactly one entry`. Seen on both apps, cause unknown. Workaround: stop the server, delete that app's `.next`, restart.
7. Review the form's privacy notice for the full document, and whether hidden prize weights need legal terms in the event's jurisdiction.

## How to resume

1. Read `AGENTS.md`, then `.agents/CONTEXT.md`.
2. Check `docs/decisions/` for any ADR relevant to the area you're about to touch.
3. Pick up "Pending work" from the top.
