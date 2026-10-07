# F1 — worker — Fixes de la revisión de seguridad (R2) antes del evento

- **Agente:** `worker` (Claude Sonnet 5)
- **Skills:** `typescript-code-quality` y `unit-test-generator`. Leé sus `SKILL.md` en `/home/loren/.claude/skills/<nombre>/SKILL.md`; no tenés herramienta Skill y leerlos directo está autorizado.
- **Worktree:** `/home/loren/projects/openruleta-wt/f1`, rama `fix/review-findings` (base `master`, ya activa).

## Prompt

La revisión de seguridad de `master` (menú/CSV, correo mock, modos de sorteo) encontró lo siguiente. Corregí cada punto con su test cuando aplique. Hay otros agentes en paralelo: uno en `lib/sound/*` (Tone.js) y otro en `packages/ui/Marquee`. **No toques esos archivos.**

1. **I1 — CSV injection por `\r`** (`apps/ruleta/src/lib/csv.ts`):
   - La celda se cita solo si matchea `/[",\n]/`, así que un `\r` suelto deja la celda sin comillas.
   - El guard de fórmulas mira solo el inicio de la celda.
   - Fix:
     - citar con `/[",\r\n]/`;
     - sumar `"\t"` y `"\r"` a los prefijos de fórmula;
     - neutralizar también fórmulas que arrancan después de un salto de línea dentro de la celda, por ejemplo con un prefijo `'` tras cada `\r`/`\n` seguido de `= + - @`, o la estrategia que justifiques.
   - Tests en `csv.test.ts`: `"a\r=1+1"`, `"a\n@SUM(1)"`, tab inicial.
2. **I2 — cambio de modo desde otra pestaña durante un sorteo** (`components/draw/useDrawMode.ts` escucha `storage`; `RuletaClient.tsx` monta la escena con `key={drawMode}`):
   - Guardá el modo en el estado `draw` al hacer `spin()` (`mode: drawMode`).
   - Mientras haya sorteo en curso o modal abierto, renderizá `draw.mode` con esa `key`, no el modo vivo.
   - En `handleSettled`, ignorá la llamada si no hay un spin en curso (ref `spinningRef`), así un remount no reabre el modal ni lo vuelve al paso "confirmar".
3. **I3 — un modo que no asienta deja la UI trabada en "girando"** (`SlotMode.tsx`, `GridMode.tsx`, `PlinkoMode.tsx` solo asientan desde rAF; Plinko hace early-return sin asentar si no hay `box` o contexto 2D):
   - Agregá un timeout de respaldo por modo, como el que ya tiene `WheelMode` (`durationMs` + margen).
   - Asegurá que `onSettled` se llame **una sola vez** (guard).
   - Llamá a `onSettled()` en los early-returns de Plinko.
   - Revisá el patrón `useDrawRun` y aplicalo de forma común si conviene.
4. **M1 — falso error al confirmar** (`RuletaClient.tsx`, `confirmWinner`): si `confirmWinnerApi` responde OK pero falla `reload()`, hoy se muestra `confirmFailed`. Separá los try, hacé `setModalWinner(confirmed)` antes del reload y mostrá un error de recarga distinto o ninguno.
5. **M2 — id no-UUID da 500** en `apps/ruleta/src/app/api/winners/notify/route.ts`: validá el formato UUID en la lectura del id y devolvé 400 `missing_id` (o un `invalid_id` nuevo, documentado en el comentario del contrato).
6. **M6 — UX:** el botón "Notify by email" se deshabilita, con un hint, cuando el ganador no tiene premio.

### Reglas

- No push, no merge.
- Si un permiso te bloquea, frená y reportalo.
- Conventional Commits (`fix(ruleta): …`), un commit por grupo lógico, con la línea `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Copiá este prompt a `docs/ai/prompts/f1-worker-review-fixes.md`, pasale prettier y **commiteá vos** cuando pase la aceptación.
- **Aceptación** (raíz del worktree): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
