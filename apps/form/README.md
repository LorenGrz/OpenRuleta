# @openruleta/form

Public raffle sign-up form. One screen, no navigation — built to be shared by
QR code. Entries are written to Supabase with the **anon key**, which RLS
restricts to `INSERT` only. Safe to deploy publicly (Vercel, etc.).

## Anti-abuse

- **Unique email** — a unique index on `lower(email)` in the database. A second
  entry with the same address returns `409`.
- **Honeypot** — a hidden `website` field. If it comes back filled, the server
  returns a fake success and saves nothing.
- **One entry per device** — a soft `localStorage` guard that only hides the
  form. The real control is the unique index above.
- Only the configured document digits are stored, never a full ID number (and
  the field can be turned off entirely in `packages/config`).

## Env (`.env.local` in this directory)

| Var                        | Value                                            |
| -------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL          |
| `SUPABASE_ANON_KEY`        | Supabase → Settings → API → `anon` / publishable |

With no Supabase vars set, the form writes to a local file-backed mock store
instead (shared with `apps/ruleta`). See the repo root `README.md` →
**Try it with no database**.

## Scripts

```bash
pnpm --filter @openruleta/form dev
pnpm --filter @openruleta/form qr <form-url>       # -> qr.svg / qr.png
pnpm --filter @openruleta/form poster <form-url>   # -> poster.png (needs Chrome)
```

See the repo root `README.md` for full setup and the database schema.
