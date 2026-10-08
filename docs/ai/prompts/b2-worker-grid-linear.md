# B2 — worker — Grilla con barrido lineal súper rápido y estilo más interesante

- **Agente:** `worker` (Sonnet) · **Skills:** `frontend-design`, `react-scalable-frontend`, `unit-test-generator`
- **Worktree:** `/home/loren/projects/openruleta-wt/b2`, rama `feature/grid-linear-sweep` (base `master`)

## Prompt

Loren quiere que la grilla (`apps/ruleta/src/components/draw/GridMode.tsx` + `apps/ruleta/src/lib/draw/gridLayout.ts`, función de saltos tipo `gridHopSchedule`) tenga un estilo más interesante.

**Nuevo recorrido:** en lugar de saltar al azar, el resaltado **recorre linealmente** las tarjetas en orden de lectura (izq→der, arriba→abajo, volviendo al inicio), **súper rápido** al principio.

- Da varias vueltas completas y desacelera con ease-out hasta frenar exactamente en el ganador.
- La cantidad de vueltas y el largo se calculan para que la duración total sea ~`wheelDurationMs` (o reduced-motion corto).
- **Estela:** las últimas 4–6 tarjetas recorridas quedan con un brillo que se desvanece, tipo cometa o "chase lights", así el barrido rápido se lee como movimiento fluido y no como parpadeo.
- Al frenar, el ganador hace el pulso dorado existente (`drawModes.winColor`) y el resto de la grilla se atenúa levemente.
- **Sonido:** `sound.tick()` en cada paso, con throttling cuando va muy rápido (máximo ~1 tick cada 25–30 ms) para que no sature.

**Estilo de las tarjetas:**

- Más vistosas pero sobrias: bordes redondeados, fondo con leve gradiente de los tokens existentes y número de participante chico en una esquina (opcional).
- Sin hex sueltos: colores de config/tema; si necesitás alguno nuevo, agregalo a `drawModes` en config.
- Respetá `prefers-reduced-motion`.

**Lógica pura:**

- Reemplazá o agregá `gridSweepSchedule(n, winnerIndex, durationMs)` (tiempos de cada paso, monotónicos, último paso = winnerIndex) con tests `node:test`: n=1, 2, 100, 300, ganador en 0 y en n-1.
- Mantené el respaldo de `useSettleOnce` / timeout que ya existe.

**Otros agentes en paralelo:** uno toca `Wheel`/`WheelMode`/layout de `RuletaClient` y otro `SlotMode`; no los toques.

### Reglas

- **Skills:** leé los `SKILL.md` indicados en `/home/loren/.claude/skills/<nombre>/SKILL.md`. No tenés herramienta Skill; leerlos directo está autorizado.
- **Consistencia:** los dos repos deben quedar consistentes. Todo se implementa en OpenRuleta (genérico); el fork `/home/loren/projects/cloud-security-space-ruleta` solo difiere en config, tema y assets. **No edites el fork**: el orquestador lo mergea. Si tu cambio necesita una clave de config nueva, ponela en el tipo y en el valor de OpenRuleta (inglés) y mencionala en el reporte para traducirla.
- **Verificación visual:** `pnpm mock:seed --count 100` con `OPENRULETA_MOCK_DB_FILE` apuntando a un archivo propio, más `OPENRULETA_MOCK_DB=1`. Corré `next start` en un puerto libre (**NO uses 3100**: es la ruleta del evento en vivo). Probá en Chromium headless (`/usr/bin/chromium` por CDP) a 1920×1080. Guardá las capturas en `/home/loren/projects/openruleta-prompts/shots/<tarea>-*.png` y apagá tus servidores al terminar.
- **Prohibido:** push, merge, o tocar Supabase real.
- **Si un permiso te bloquea:** frená y reportalo.
- **Commits:** Conventional Commits con la línea `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Copiá tu prompt a `docs/ai/prompts/` y pasale prettier. **Commiteá vos** cuando pase la aceptación.
- **Aceptación** (desde la raíz del worktree): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
