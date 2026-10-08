# B1 — worker — Ruleta original + separar el título de los sponsors

- **Agente:** `worker` (Sonnet) · **Skills:** `react-scalable-frontend`, `frontend-design`
- **Worktree:** `/home/loren/projects/openruleta-wt/b1`, rama `fix/wheel-original-title-spacing` (base `master`)

## Prompt

Loren pidió:

**1) Volver la ruleta a la versión ORIGINAL completa.**

- El `Wheel` debe verse **exactamente** como en el commit `1c74e08`: `git show 1c74e08:apps/ruleta/src/components/Wheel.tsx`.
  - tope de 460 px;
  - etiquetas internas originales (≤10 nombre, 11–32 iniciales, >32 nada);
  - sin corona de nombres afuera;
  - sin cartel "Under the pointer" / "Bajo el puntero".
- **Mantené la arquitectura de modos de sorteo:**
  - `WheelMode` sigue existiendo como wrapper con `useDrawRun` / `useSettleOnce` y el timeout de respaldo;
  - el cálculo de rotación (`lib/draw/wheelTiming`) y los ticks de sonido sincronizados con los segmentos se quedan;
  - solo se revierte lo **visual** del Wheel y se elimina el banner.
- **Limpieza:**
  - borrá `lib/draw/wheelLabels.ts` y su test;
  - borrá las claves de config que solo usaba eso (`wheelLabelInk`, `wheelLabelInks`, `drawModes.pointerLabel` si ya nadie la usa);
  - quitá cualquier `highlightIndex` o `sizePx` que quede sin uso.
- Revisá `git log -p -- apps/ruleta/src/components/Wheel.tsx apps/ruleta/src/components/draw/WheelMode.tsx` para entender qué cambió.
- Los otros modos (slot, grid, plinko) **no se tocan**.

**2) El título del sorteo quedó pegado al carrusel de sponsors de arriba, y el botón Spin/Girar (y "Ver ganadores" / "Reiniciar sorteo") quedó pegado al carrusel de colaboradores de abajo.** En `1c74e08` no era así.

- Compará el layout de `RuletaClient.tsx` en `1c74e08` vs `HEAD` (contenedor de `SponsorCarousel` + `EditableTitle` + escenario).
- Restaurá la separación y el centrado vertical originales del título, la ruleta y el bloque de botones (aire arriba respecto del carrusel superior y abajo respecto del inferior), con el escenario de los otros modos funcionando: grilla y plinko siguen ocupando el espacio disponible.
- Verificá los 4 modos.

**Otros agentes en paralelo:** uno toca `GridMode` y otro `SlotMode`; no los toques. En `RuletaClient.tsx` limitate al layout del título y el escenario.

### Reglas

- **Skills:** leé los `SKILL.md` indicados en `/home/loren/.claude/skills/<nombre>/SKILL.md`. No tenés herramienta Skill; leerlos directo está autorizado.
- **Consistencia:** los dos repos deben quedar consistentes. Todo se implementa en OpenRuleta (genérico); el fork `/home/loren/projects/cloud-security-space-ruleta` solo difiere en config, tema y assets. **No edites el fork**: el orquestador lo mergea. Si tu cambio necesita una clave de config nueva, ponela en el tipo y en el valor de OpenRuleta (inglés) y mencionala en el reporte para traducirla.
- **Verificación visual:** `pnpm mock:seed --count 100` con `OPENRULETA_MOCK_DB_FILE` apuntando a un archivo propio, más `OPENRULETA_MOCK_DB=1`. Corré `next start` en un puerto libre (**NO uses 3100**: es la ruleta del evento en vivo). Probá en Chromium headless (`/usr/bin/chromium` por CDP) a 1920×1080. Guardá las capturas en `/home/loren/projects/openruleta-prompts/shots/<tarea>-*.png` y apagá tus servidores al terminar.
- **Prohibido:** push, merge, o tocar Supabase real.
- **Si un permiso te bloquea:** frená y reportalo.
- **Commits:** Conventional Commits con la línea `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Copiá tu prompt a `docs/ai/prompts/` y pasale prettier. **Commiteá vos** cuando pase la aceptación.
- **Aceptación** (desde la raíz del worktree): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
