# A5 — worker — Carrusel de sponsors fluido (sin hueco ni salto)

- **Agente:** `worker` (Claude Sonnet 5)
- **Skills:** `react-scalable-frontend`. No tenés herramienta Skill: leé `/home/loren/.claude/skills/react-scalable-frontend/SKILL.md` y aplicalo.
- **Worktree:** `/home/loren/projects/openruleta-wt/a5`, rama `feature/marquee-seamless` (base `master`, ya activa, `pnpm install` hecho).

## Prompt

**Bug reportado por Loren** (captura en `/home/loren/projects/openruleta-prompts/a5-marquee-bug.png`, miralo con Read): en el carrusel de sponsors de arriba de la ruleta, la tira de logos termina a mitad de pantalla y deja un hueco vacío a la derecha. Cuando pasan todos, la siguiente tanda aparece de golpe en vez de ser un loop continuo.

**Causa:** `packages/ui/src/Marquee.tsx` renderiza los children dos veces (dos tracks) y la animación (`packages/ui/src/theme.css`, keyframes `marquee`) mueve `translateX(-50%)`. Si un track (la lista de sponsors) es más angosto que el contenedor, se ve el hueco y el salto. En la ruleta la columna mide ~1480 px a 1920 de ancho y la lista ~870 px.

**Arreglo** (en `packages/ui`, sirve para los dos apps: `apps/ruleta/src/components/SponsorCarousel.tsx` y los carruseles de `apps/form`):

1. `Marquee` pasa a client component (`"use client"`). Mide el contenedor y el ancho de **una** copia de los children con `ResizeObserver`.
2. Calcula `copies = max(1, ceil(containerWidth / itemsWidth))`. Cada track repite los children `copies` veces, con keys únicas y `aria-hidden` en todas las copias menos la primera. Así cada track mide ≥ contenedor y el `-50%` queda perfecto.
3. **Velocidad constante en px/s:** la duración sale del ancho real del track (por ejemplo `trackWidth / pxPerSecond`). Nueva prop opcional `speedPxPerSecond` (default ~40). `durationSeconds` sigue funcionando si viene explícita.
4. **Primer render SSR o antes de medir:** usá un default seguro, por ejemplo 2 copias por track, para que no haya hueco ni flash. Al medir, recalculá sin reiniciar bruscamente la animación (si cambia `copies`, aceptable).
5. Mantener:
   - pausa en hover;
   - `prefers-reduced-motion`;
   - `overflow-hidden`;
   - `w-max`;
   - la API actual de props (`ariaLabel`, `className`, `children`, `durationSeconds`).
6. Sin `setState` sincrónico en efectos: la regla `react-hooks/set-state-in-effect` está activa. El `setState` va dentro del callback del `ResizeObserver`, o usá `useSyncExternalStore`.
7. Lógica pura en `packages/ui/src/marqueeMath.ts` (`copiesNeeded`, `durationFor`), con tests `node:test`. Si `packages/ui` no tiene script `test`, agregalo con el mismo patrón que `packages/core`.
8. Recordá: `packages/ui` NO puede importar `@openruleta/config`.

**Verificación visual:**

- `OPENRULETA_MOCK_DB=1 pnpm dev:ruleta` y abrí http://localhost:3100 en headless Chromium a 1920×1080, si tenés Playwright/Chromium disponible en el sistema. Si no, describí cómo lo verificaste.
- Confirmá que la tira cubre todo el ancho siempre y que el loop no salta (por ejemplo, capturas en t=0, mitad y fin del ciclo).

### Reglas

- No push, no merge.
- Si un permiso te bloquea, frená y reportalo.
- Conventional Commits (`fix(ui): …`) con la línea `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Copiá este prompt a `docs/ai/prompts/a5-worker-marquee.md`, pasale prettier y **commiteá vos** cuando pase la aceptación.
- **Aceptación** (raíz del worktree): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
