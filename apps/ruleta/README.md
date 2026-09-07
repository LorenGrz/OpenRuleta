# @openruleta/ruleta

Winner-picker wheel. Reads the participants that `@openruleta/form` collected
from the **same Supabase project** and draws winners.

> ⚠️ **Built to run locally.** It uses `SUPABASE_SERVICE_ROLE_KEY`, which
> bypasses Row Level Security, and its route handlers (including
> `DELETE /api/participants { all: true }`) are otherwise unauthenticated —
> fine on your own machine, unsafe on an open URL. If you must host it, set
> `RULETA_BASIC_AUTH` so `src/proxy.ts` gates every request; never deploy it
> without that. See the repo root `README.md` → **Running the wheel: local or
> hosted**.

## What it does

- SVG wheel with one segment per active participant.
- **Editable title** above the wheel (click to edit, saved in `localStorage`).
- Side panel: search, live count, manual refresh (also auto-refreshes every 5s),
  delete one / delete all.
- **Spin** → winner modal with confetti → enter an optional **prize** and
  **Confirm winner** (removes them from the pool), or **Skip and spin again**.
- **Persistent winners**: confirming sets `won_at` in Supabase, so a winner
  stays out across reloads and machines. **Reset draw** clears every `won_at`
  and `prize`.
- **View winners** modal: full list, CSV export, edit prize, undo.

## Endpoints

| Method   | Route                             | Purpose                           |
| -------- | --------------------------------- | --------------------------------- |
| `GET`    | `/api/participants`               | List from Supabase (with `wonAt`) |
| `DELETE` | `/api/participants { id }`        | Delete that participant           |
| `DELETE` | `/api/participants { all: true }` | Delete every participant          |
| `POST`   | `/api/winners { id, prize? }`     | Mark winner (`won_at = now()`)    |
| `PATCH`  | `/api/winners { id, prize }`      | Set / edit the prize              |
| `DELETE` | `/api/winners { id }`             | Undo a winner                     |
| `POST`   | `/api/winners/reset`              | Clear every `won_at` and `prize`  |

## Env (`.env.local` in this directory)

| Var                         | Value                                      |
| --------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`  | Supabase → Settings → API → Project URL    |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |

With no Supabase vars set, the wheel reads from a local file-backed mock store
(pre-seeded, shared with `apps/form`). See the repo root `README.md` →
**Try it with no database**.

## Run

```bash
pnpm --filter @openruleta/ruleta dev -p 3100
```

See the repo root `README.md` for full setup and the database schema.
