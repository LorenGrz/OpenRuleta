# Contributing

Thanks for your interest in OpenRuleta.

## Setup

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test
```

## Layout

- `packages/config` — branding, copy, event data. No logic.
- `packages/core` — framework-agnostic TypeScript: types, validation, the
  Supabase client factory, DB operations, retry helper. Has unit tests
  (`pnpm --filter @openruleta/core test`). `mock-store.ts` is a file-backed
  fallback used when no Supabase is configured; it is lazily imported so its
  `node:fs` use never reaches a deployed bundle.
- `packages/ui` — shared React components and the Tailwind theme file. No
  dependency on `config`.
- `apps/form`, `apps/ruleta` — the two Next.js apps. They depend on all three
  packages.

## Ground rules

- Keep `packages/core` and `packages/ui` free of any `@openruleta/config`
  import — apps wire config into them.
- User-facing strings belong in `packages/config`, not inline in components.
- Run `pnpm build` before opening a PR; both apps must build.
- No real third-party logos or event-specific data in the repo.
