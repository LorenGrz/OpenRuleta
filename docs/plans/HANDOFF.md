# Handoff - OpenRuleta

Last updated: 2026-10-30

## Current state

<!-- One or two sentences: what's built/working right now, and what isn't yet. -->

Branch `feature/prize-wheel` (stage 3 of 3, after the participants API and the CSV import): the wheel app has a **Prize wheel** mode next to the raffle (toggle in the header). It is local only (`localStorage`, no API), weighted, with an in-app prize editor. Typecheck, lint, tests and build pass; the Supabase paths below have not been run against a real project.

## Active plan

<!-- Link the plan this work is following, if any. -->

None yet.

## Pending work

<!-- Concrete next steps, in the order they should happen. Delete items as
     they're done instead of checking them off, so this list only ever
     shows what's left. -->

1. Run `supabase/schema.sql` on a real Supabase project.
2. Try the participants `GET` against it.
3. Import a 100-row CSV against it.
4. Try the prize wheel in a browser (spin, editor, mode switch, 16 prizes with long names).

## How to resume

1. Read `AGENTS.md`, then `.agents/CONTEXT.md`.
2. Check `docs/decisions/` for any ADR relevant to the area you're about to touch.
3. Pick up "Pending work" from the top.
