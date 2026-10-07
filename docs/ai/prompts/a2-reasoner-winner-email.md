# A2 — reasoner — Aviso por correo al ganador (mock) + notified_at

- **Agente:** `reasoner` (Claude Opus 5.5)
- **Skills:** `database-persistence-patterns`, `api-contract-design`, `nextjs-ssr-frontend`, `unit-test-generator`
- **Worktree:** `/home/loren/projects/openruleta-wt/a2`, rama `feature/winner-email-mock` (ya activa)

## Prompt

Contexto:

- La tabla `public.participants` ya tiene `email` (obligatorio), `won_at` y `prize`.
- El premio se guarda al confirmar el ganador (`markWinner` en `packages/core/src/participants.ts`).
- La ruleta usa la service role en route handlers `apps/ruleta/src/app/api/*`.
- El mock store está en `packages/core/src/mock-store.ts`.
- No hay envío real de correos: es un **mock**.

1. **DB:** en `supabase/schema.sql`, `alter table public.participants add column if not exists notified_at timestamptz;`. Mismo patrón que las líneas ~29-30. Aditivo, sin tocar grants: la service role ya bypassea RLS y anon no puede leer.
2. **Core:**
   - `notified_at`/`notifiedAt` en `types.ts` (`ParticipantRow`, `WinnerParticipant`, `PARTICIPANT_COLUMNS`, `toWinnerParticipant`).
   - `markNotified(id): Promise<WinnerParticipant>` en Supabase y en el mock store. Solo aplica a ganadores (`won_at is not null`); si no, error tipado `NotAWinnerError`.
   - `unmarkWinner` y `resetWinners` también limpian `notified_at`.
   - `packages/core/src/email.ts`:
     - tipos `EmailMessage {to, from, subject, text, html?}` y `interface EmailSender { send(msg): Promise<{ id: string; simulated: boolean }> }`;
     - `MockEmailSender`: no envía nada, devuelve un id `mock-…` y `simulated: true`;
     - `buildWinnerEmail({name, email, prize}, template: {from, subject, body})` reemplaza `{name}` y `{prize}` y escapa el HTML si genera html.
     - Exportar desde `index.ts`. Sin importar config.
3. **API** `apps/ruleta/src/app/api/winners/notify/route.ts` (POST `{id}`, runtime nodejs, `force-dynamic`, mismo estilo de errores que las rutas vecinas):
   1. Validar el body.
   2. Obtener el participante.
   3. 404 si no existe; 409 si no es ganador o no tiene premio.
   4. Armar el mail con `siteConfig.ruleta.email`.
   5. `MockEmailSender.send`, después `markNotified`.
   6. Responder `{ preview: EmailMessage, messageId, simulated: true, notifiedAt }`.
   - Diseñá el contrato con `api-contract-design` y documentalo en un comentario.
   - Si ya fue notificado, permitir reenviar y actualizar `notified_at`.
   - Cliente en `apps/ruleta/src/lib/api.ts`: `notifyWinner(id)`.
4. **UI:**
   - En `WinnerModal`, después de confirmar el ganador, botón **"Notify by email"**.
   - En cada ganador de `WinnersModal`, botón con el mismo fin y un badge **"Notified"** con la hora si `notifiedAt`.
   - Componente `EmailPreviewModal`: muestra Para / De / Asunto / Cuerpo, estado "Sending…" → "Sent (simulated) ✓", y la aclaración de que es una simulación.
   - Errores visibles y accesibles.
   - Coordinación con otros agentes: tocá `RuletaClient.tsx` lo mínimo (pasar handlers/estado).
5. **Config:** `ruleta.email: { from, subject, body }`, con un body que diga que ganó el premio `{prize}`, más los mensajes de UI nuevos.
6. **Tests** (`unit-test-generator`): `buildWinnerEmail`, `MockEmailSender`, `markNotified` en el mock store (ganador / no ganador / reset limpia).

### Reglas comunes

- **Primero invocá tus skills con la herramienta `Skill`** (están listadas arriba) y seguí sus guías.
- **Leé antes de tocar código:** `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, `packages/config/src/index.ts` (tipo `SiteConfig` y valores), `apps/ruleta/src/components/RuletaClient.tsx` y los componentes que vayas a modificar.
- **Stack:** pnpm workspace, Next.js 16, React 19, Tailwind v4, TypeScript estricto.
- **Textos:** todo lo que ve el usuario va en `packages/config` (`siteConfig.ruleta...`), en inglés, porque OpenRuleta es la plantilla genérica. Agregá cada clave al tipo **y** al valor.
- **Dependencias de paquetes:** `packages/core` y `packages/ui` NO pueden importar `@openruleta/config`. Los textos se pasan desde la app.
- **Otros agentes en paralelo:** trabajan en otros worktrees sobre `RuletaClient.tsx`. Limitá tus cambios en ese archivo a lo tuyo, sin reformatear ni reordenar lo demás.
- **Tests** con `node:test` + `node:assert/strict`, como `packages/core/src/retry.test.ts`.
  - Si agregás tests en `apps/ruleta`, sumá un script `test` (`node --test` con type stripping, mismo patrón que core) para que `pnpm test` los corra.
- **Accesibilidad:** foco visible, `aria-*` correctos, navegable con teclado.
- **Restricciones:**
  - NO push, NO merge.
  - NO tocar la DB real: usá el mock store (`OPENRULETA_MOCK_DB=1`).
  - NO tocar otros repos.
  - **Si una herramienta o el sistema de permisos te bloquea una acción, NO intentes rodearla: frená y reportalo.**
- **Commits:** Conventional Commits con scope (`feat(ruleta): …`, `feat(core): …`, `feat(config): …`), terminando con la línea `Co-Authored-By: <tu modelo> <noreply@anthropic.com>`. Copiá tu prompt a `docs/ai/prompts/<archivo>` dentro del commit (creá la carpeta si no existe).
- **Aceptación** (desde la raíz del worktree): `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- **Reporte final:** archivos tocados, claves de config nuevas, decisiones y salida resumida de la aceptación.
