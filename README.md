# OpenRuleta

A self-hostable raffle toolkit, backed by Supabase:

- **`apps/form`** — a public, single-screen sign-up form. Share it by QR code;
  people enter their details and they're in the draw. Deploy it anywhere
  (Vercel, etc.).
- **`apps/ruleta`** — a local winner-picker wheel. Spin it, mark winners, export
  a CSV. Reads the same Supabase table. **Runs on your machine only.**

> Not affiliated with any real event. The default sponsor/collaborator entries
> and logos are placeholders — replace them with your own.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · pnpm
workspaces · Supabase (`@supabase/supabase-js`).

```
apps/
  form/      public sign-up form            (anon key, deployable)
  ruleta/    winner-picker wheel            (service_role key, local only)
packages/
  config/    @openruleta/config  — ALL branding, copy and event data
  core/      @openruleta/core    — types, validation, Supabase client, DB ops
  ui/        @openruleta/ui      — shared React bits + Tailwind theme tokens
supabase/
  schema.sql one authoritative schema for both apps
```

## Setup

1. **Install**

   ```bash
   pnpm install
   ```

2. **Create a Supabase project** (the free tier is enough) and apply the schema:
   paste `supabase/schema.sql` into the SQL editor and run it, or use the
   Supabase CLI (`supabase db push` against a project linked to this schema).

3. **Environment variables** — Next.js loads `.env.local` from each app's own
   directory. Copy the examples and fill them in:

   ```bash
   cp apps/form/.env.example   apps/form/.env.local
   cp apps/ruleta/.env.example apps/ruleta/.env.local
   ```

   | Var                         | form | ruleta | Where                                      |
   | --------------------------- | :--: | :----: | ------------------------------------------ |
   | `NEXT_PUBLIC_SUPABASE_URL`  |  ✅  |   ✅   | Supabase → Settings → API → Project URL    |
   | `SUPABASE_ANON_KEY`         |  ✅  |        | Supabase → Settings → API → `anon`         |
   | `SUPABASE_SERVICE_ROLE_KEY` |      |   ✅   | Supabase → Settings → API → `service_role` |

4. **Run**

   ```bash
   pnpm dev:form     # http://localhost:3000
   pnpm dev:ruleta   # http://localhost:3100  (local only — see below)
   ```

## Make it yours

Everything user-facing is in **one file**: `packages/config/src/index.ts`.
Event name, all copy (English by default — translate it here), the document
field rules, the sponsor and collaborator lists, wheel timing, confetti and CSV
settings.

Two things live outside it on purpose:

- **Colours** — `packages/ui/src/theme.css` (Tailwind v4 `@theme` variables).
- **Font** — the `next/font/google` import in each app's `src/app/layout.tsx`
  (it's a compile-time API), plus `--font-sans` in `theme.css`.

Replace the placeholder art in `apps/*/public/` (`logo.svg`, `icon.svg`,
`logos/*.svg`, and `apps/ruleta/public/poster.svg`) with your own.

## The wheel is local-only

`apps/ruleta` uses the **service_role key**, which bypasses Row Level Security,
and none of its API routes are authenticated. That's fine for a tool running on
your laptop during a draw — and unsafe on a public URL. Don't deploy it. Deploy
`apps/form`; run `apps/ruleta` with `pnpm dev:ruleta` when you need it.

## How the data works

One table, `public.participants`. The form inserts `name` / `email` /
`doc_last3`; a unique index on `lower(email)` rejects duplicates with a `409`.
The wheel sets `won_at` and `prize` on winners so they stay excluded across
draws. `apps/form` also exposes `/api/ping` (a no-op DB round-trip) with a daily
Vercel cron so Supabase's free tier doesn't pause the project.

## Commands

```bash
pnpm dev:form   ·  pnpm dev:ruleta
pnpm build      ·  pnpm lint  ·  pnpm typecheck  ·  pnpm test
pnpm format
```

## License

MIT — see `LICENSE`.
