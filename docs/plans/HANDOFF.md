# Handoff - OpenRuleta

Last updated: 2026-10-30

## Current state

<!-- One or two sentences: what's built/working right now, and what isn't yet. -->

Branch `feature/prize-wheel` (stage 3 of 3, after the participants API and the CSV import): the wheel app has a **Prize wheel** mode next to the raffle (toggle in the header). It is local only (`localStorage`, no API), weighted, with an in-app prize editor. Typecheck, lint, tests and build pass, and the app was exercised in a browser against the mock store; the Supabase paths below have not been run against a real project (including the `PGRST103`/416 handling of a page past the end of `listParticipants`).

## Active plan

<!-- Link the plan this work is following, if any. -->

[2026-10-30 CSV import and prize wheel](../superpowers/plans/2026-10-30-csv-import-prize-wheel.md)

## Pending work

<!-- Concrete next steps, in the order they should happen. Delete items as
     they're done instead of checking them off, so this list only ever
     shows what's left. -->

1. Run `supabase/schema.sql` on a real Supabase project. If Vercel deploys from `master`, run the SQL **before** merging this branch (the form now writes `document`).
2. Try the participants `GET` against it, including a table with more than 1000 rows.
3. Import a 100-row CSV against it, then import it again: expect 0 inserted and 100 duplicates.
4. Check 16 long prize names at 1280x720; they were only viewed at a larger wheel size.
5. Known: the first spin after switching app mode may miss its tick sounds, because `useSoundEngine` rebuilds its audio graph asynchronously on mount. Fix idea: hoist the engine to `RuletaApp`; not done to leave the sound engine untouched.

## How to resume

1. Read `AGENTS.md`, then `.agents/CONTEXT.md`.
2. Check `docs/decisions/` for any ADR relevant to the area you're about to touch.
3. Pick up "Pending work" from the top.
