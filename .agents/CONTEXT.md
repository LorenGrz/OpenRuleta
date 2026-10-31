# OpenRuleta - Repository Context

## Purpose

A self-hostable raffle toolkit, backed by Supabase. Two small Next.js apps that share one database:

## Stack

- package.json (pnpm) - scripts: build,dev,dev:form,dev:ruleta,format,format:check,lint,mock:reset,mock:seed,poster,test,typecheck

## Commands

See AGENTS.md for detected commands.

## Repo facts

- Owner: LorenGrz
- Base branch: `master`. Single branch flow on `master`. See "Workflow contract" in AGENTS.md for the full picture and what's actually enforced.

## Current state

- `pnpm dev` runs `scripts/dev.mjs`: one startup Supabase probe (`limit=0`); on failure both apps start with `OPENRULETA_MOCK_DB=1` and a console warning. `dev:form`/`dev:ruleta` skip the probe; no runtime/production fallback.
- `apps/ruleta` has two app modes, chosen by `useAppMode` (`localStorage`
  `<slug>-ruleta-app-mode`) in `RuletaApp`: the raffle (`RuletaClient`) and the
  stand prize wheel (`PrizeWheelClient`, no API, no polling).
- Prize wheel: pure rules in `src/lib/prizes.ts` (`parsePrizes`,
  `pickWeightedIndex`, editor validation), prizes in `localStorage`
  (`usePrizes`), edited in `PrizesEditorModal`. Config under
  `siteConfig.ruleta.prizeWheel`.
- Participants can be bulk-imported from CSV (`/api/participants` import,
  `ImportCsvModal`, batches of 100). The form stores the full document
  (ADR 0002); it reaches the operator's browser via the local API and is only
  rendered in the CSV exports. The wheel app binds `127.0.0.1`.
- Skipped participants (`skipIds`) live in `RuletaApp` so they survive a mode switch.
- Draw modes receive `DrawEntry[]` (`{ id, name }`); `Wheel` takes optional
  `fills`, `fullLabels` and `maxWidthClassName`.

Last validated: 2026-10-30
