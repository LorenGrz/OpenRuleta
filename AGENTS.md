# AGENTS.md — customize & deploy OpenRuleta

Guide for an AI agent (or a person) adapting this repo to a specific event and
shipping it. The [`README.md`](README.md) has the narrative version; this file is
the checklist. Read both.

## What you're working with

pnpm workspace, Next.js 16 + React 19 + TypeScript + Tailwind v4. Two apps, one
shared database:

| Path              | Package              | Role                                                                              |
| ----------------- | -------------------- | --------------------------------------------------------------------------------- |
| `apps/form`       | `@openruleta/form`   | Public sign-up form. Anon key, **deploy this one**.                               |
| `apps/ruleta`     | `@openruleta/ruleta` | Winner wheel for the operator. Service-role key, **local** (or Basic-Auth gated). |
| `packages/config` | `@openruleta/config` | **All** branding, copy, event data. One file. No logic.                           |
| `packages/core`   | `@openruleta/core`   | Types, validation, Supabase client, DB ops, mock store.                           |
| `packages/ui`     | `@openruleta/ui`     | Shared React bits + the Tailwind theme tokens.                                    |

A fresh clone runs with **no database** against a file-backed mock store, so you
can verify visual changes before touching Supabase:

```bash
pnpm install
pnpm dev          # form on http://localhost:3000 + ruleta on http://localhost:3100
                  # (or one at a time: pnpm dev:form / pnpm dev:ruleta)
```

## Customizing for an event

Everything user-facing is in **three places**, in this order of frequency:

### 1. Copy, event data, field rules — `packages/config/src/index.ts`

The single `siteConfig` object. Edit values only; `defineSiteConfig()` keeps it
type-checked. What lives here:

- `name`, `slug` (namespaces `localStorage` — change it per deployment), `lang`,
  `locale`.
- `assets.{logo,wheelLogo,poster}` — **paths** into each app's `public/` (see §3).
- `poster.*` — the generated QR poster (see [QR poster](#qr-poster)): `title`
  (`\n` = line break), `subtitle`, `hint`, `supportLabel`, `background` (any CSS
  `background` value), `ink` (dark text on white), `accent` (URL pill + QR card
  glow), optional `font` (Google Fonts family) and `logoCard`.
- `form.meta.*` — `<title>`, description, Open Graph.
- `form.messages.*` — every string the form renders, including validation and
  server errors. Default language is English; translate in place.
- `form.docField` — the "last 3 digits of ID" field. Set `enabled: false` to drop
  it entirely (the DB column then stays null — no schema change needed). Otherwise
  tune `label`, `hint`, `pattern` (regex source, no slashes), `maxLength`,
  `displayLabel`, `maskGlyph`.
- `form.nameMinLength`.
- `ruleta.meta.*`, `ruleta.defaultTitle` (first-run wheel title).
- `ruleta.wheelSpins`, `ruleta.wheelDurationMs` (keep in sync with the CSS
  transition), `ruleta.confettiColors`, `ruleta.wheelSegmentFills` `[even, odd]`,
  `ruleta.wheelRimColor`.
- `ruleta.csv.{filenamePrefix,headers}`.
- `ruleta.messages.*` — every string the wheel renders, incl. `confirm()` dialogs
  with `{name}` / `{n}` placeholders.
- `sponsors[]` / `collaborators[]` — `{ name, src?, tier? }`. `src` is a path into
  `public/` (see §3); omit `src` for a name-only card.

### 2. Colours & font — `packages/ui/src/theme.css`

Tailwind v4 `@theme` block. Change the `--color-*` variables (`--color-primary`,
`--color-primary-deep`, `--color-ink`, `--color-surface`, `--color-tint`,
`--color-input-border`, `--color-error`) — they generate the `bg-primary`,
`text-ink`, … utilities used across both apps.

Font is a compile-time API, so it can't live in config:

1. Swap the `next/font/google` import in **both** `apps/form/src/app/layout.tsx`
   and `apps/ruleta/src/app/layout.tsx` (currently `Montserrat`). Keep
   `variable: "--font-brand"`.
2. `theme.css` reads it via `--font-sans: var(--font-brand), …` — no change needed
   there unless you want a different fallback stack.

Note: `ruleta.confettiColors`, `wheelSegmentFills` and `wheelRimColor` are set in
config (§1), not here — update both so the wheel matches the palette.

### 3. Logos & artwork — files under `apps/*/public/`

Replace the placeholder SVGs. The `assets.*` and `sponsors[].src` /
`collaborators[].src` values in config are paths **relative to each app's own
`public/`**, so a shared asset must be copied into both apps.

| Config key                               | form                         | ruleta                                             |
| ---------------------------------------- | ---------------------------- | -------------------------------------------------- |
| `assets.logo`                            | `apps/form/public/logo.svg`  | `apps/ruleta/public/logo.svg`                      |
| `assets.wheelLogo`                       | —                            | `apps/ruleta/public/logos/wheel-logo.svg`          |
| `assets.poster`                          | —                            | `apps/ruleta/public/poster.png` (generated)        |
| `sponsors[].src` / `collaborators[].src` | `apps/form/public/logos/*`   | `apps/ruleta/public/logos/*` (only if shown there) |
| favicon                                  | `apps/form/src/app/icon.svg` | `apps/ruleta/src/app/icon.svg` (if present)        |

`public/` is in `.prettierignore` — don't worry about formatting SVGs.

### Recipe: adapt to "MyConf 2027"

1. `packages/config/src/index.ts`: set `name`, `slug: "myconf-2027"`, `lang`,
   `locale`; rewrite `form.messages` / `ruleta.messages` in the event language;
   replace `sponsors` / `collaborators` with the real lists (add their logo files
   in step 4); set `ruleta.defaultTitle`.
2. `packages/ui/src/theme.css`: set `--color-primary` etc. to the event palette.
3. `apps/*/src/app/layout.tsx`: swap the font import in both if needed. Update
   `ruleta.confettiColors` / `wheelSegmentFills` / `wheelRimColor` in config to
   match.
4. Drop real SVGs into `apps/form/public/` and `apps/ruleta/public/` per the table
   above. Remove unused `placeholder-*.svg`.
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all must pass.
6. `pnpm dev` (mock DB, no `.env` needed) and eyeball both apps.

## QR poster

The wheel's "Show QR" button projects `assets.poster` **full-screen**
(`apps/ruleta/src/components/QrOverlay.tsx`: `h-full w-full object-contain`, Esc
or click closes). The poster is **landscape 1920x1080** so it fills a 16:9
projector edge to edge: left column = logo, headline, subtitle, sponsor chips
(fits ~12); right column = high-error-correction QR on a white card + the form
host in a pill.

```bash
pnpm poster https://your-form.vercel.app
```

writes straight to `apps/ruleta/public/poster.png` (rendered with headless
Chrome/Chromium/Brave; without one it leaves `apps/form/scripts/.poster.html`
to export by hand). Then set `assets.poster: "/poster.png"` and commit the PNG
in the fork. All text, colours and the font come from `siteConfig.poster` — a
fork never edits the script. The template ships `apps/ruleta/public/poster.svg`
as a placeholder (and keeps `assets.poster: "/poster.svg"`).

## Database (Supabase)

Needed for a real event; skip for local/visual work (mock store covers it).

1. Create a Supabase project (free tier is enough).
2. SQL Editor → paste [`supabase/schema.sql`](supabase/schema.sql) → run. It is
   idempotent. Creates `public.participants`, a case-insensitive unique index on
   `email` (drives the `409` on duplicates), the RLS policies both apps rely on,
   and `app_ping()` for the keep-alive route.
3. Env files — Next.js reads `.env.local` from **each app's own directory**:

   ```bash
   cp apps/form/.env.example   apps/form/.env.local
   cp apps/ruleta/.env.example apps/ruleta/.env.local
   ```

| Var                         | form | ruleta | Value (Supabase → Settings → API)     |
| --------------------------- | :--: | :----: | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  |  ✅  |   ✅   | Project URL                           |
| `SUPABASE_ANON_KEY`         |  ✅  |        | `anon` / publishable key              |
| `SUPABASE_SERVICE_ROLE_KEY` |      |   ✅   | `service_role` key (server-side only) |
| `RULETA_BASIC_AUTH`         |      |  opt.  | `user:password`, only when hosting    |

The mock store activates whenever `NEXT_PUBLIC_SUPABASE_URL` is unset. Force it
with `OPENRULETA_MOCK_DB=1` (always mock) / `=0` (always require Supabase).

## Deploy

### `apps/form` — the public half (Vercel)

1. Import the repo; set **Root Directory** to `apps/form`.
2. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`.
3. Deploy. `apps/form/vercel.json` registers a daily cron to `/api/ping` so the
   free-tier Supabase project isn't paused for inactivity.
4. Generate the projector poster for the deployed URL: `pnpm poster <url>` (see
   [QR poster](#qr-poster)). A bare QR is also available via
   `pnpm --filter @openruleta/form qr <url>`.

The anon key is `INSERT`-only under RLS — safe to ship publicly.

### `apps/ruleta` — the operator half

Uses the **service_role key** and its API routes (incl.
`DELETE /api/participants { all: true }`) are unauthenticated by default.

- **Local (recommended).** `pnpm dev:ruleta` (or build + start via
  `pnpm --filter @openruleta/ruleta`). Leave `RULETA_BASIC_AUTH` unset. Run it on
  the operator's laptop against the same Supabase project — it polls for new
  sign-ups every few seconds.
- **Hosted.** Set `RULETA_BASIC_AUTH="user:password"` (plus the two Supabase
  vars). `apps/ruleta/src/proxy.ts` then challenges every request — pages and API.
  **Never host it without that.** Add host rate-limiting / IP allow-list on top.

## New event fork — checklist

1. Clone the template into a new dir: `git clone <OpenRuleta-url> myconf-ruleta`.
2. `gh repo create <owner>/myconf-ruleta --private`, then
   `git remote set-url origin <new-repo-url>` and push.
3. Customize — §1 config (incl. `poster.*`), §2 theme, §3 assets.
4. Supabase: new project → run `supabase/schema.sql` in the SQL Editor.
5. Vercel: `pnpm dlx vercel link` → **Root Directory** `apps/form`, function
   region `gru1` (or the one closest to the Supabase project), env
   `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_ANON_KEY` → deploy.
6. `pnpm poster <deployed-url>` → set `assets.poster: "/poster.png"` → commit.
7. Event day: run the ruleta locally with `apps/ruleta/.env.local` holding
   `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
8. After the event: export winners (CSV), then **pause** the Supabase project
   and the Vercel project.

## Guardrails

- Keep `packages/core` and `packages/ui` free of any `@openruleta/config` import —
  apps wire config into them.
- User-facing strings go in `packages/config`, never inline in components.
- No real third-party logos or event-specific data committed to this repo — it's
  the generic template. Event forks carry their own assets.
- Don't commit `apps/*/AGENTS.md` or `apps/*/CLAUDE.md` — `next dev` regenerates
  them and they're git-ignored.
- `next-env.d.ts` flips between `.next/dev/` and `.next/types/` paths depending on
  whether `dev` or `build` ran last; it's git-ignored — don't stage it.

## Verify before shipping

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

All four run across every workspace. `build` must succeed for both apps.
