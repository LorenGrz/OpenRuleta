# A3 — reasoner — Modos de sorteo: ruleta adaptativa, tragamonedas, grilla y plinko

- **Agente:** `reasoner` (Claude Opus 5.5)
- **Skills:** `frontend-design`, `react-scalable-frontend`, `typescript-code-quality`, `unit-test-generator`
- **Worktree:** `/home/loren/projects/openruleta-wt/a3`, rama `feature/draw-modes` (ya activa)

## Prompt

Problema: con 80+ participantes la ruleta (`apps/ruleta/src/components/Wheel.tsx`) no muestra nombres, porque oculta las etiquetas con n > 32. Se proyecta en pantalla grande (1920×1080) durante eventos y el operador necesita modos legibles y llamativos.

Hoy:

- `spin()` en `RuletaClient.tsx` (~L174) elige el ganador al azar **antes** de animar.
- Congela el pool en `poolRef`.
- `handleSettled` abre `WinnerModal`.

Eso no cambia: la aleatoriedad es la misma para todos los modos y cada modo solo **anima hacia un ganador ya elegido**.

1. **Arquitectura** `apps/ruleta/src/components/draw/`:
   - `types.ts`: `DrawModeId = "wheel" | "slot" | "grid" | "plinko"` y `DrawModeProps = { pool: Participant[]; winnerIndex: number | null; runId: number; onSettled(): void; sound: SoundEngine; reducedMotion: boolean }`.
   - `registry.ts` con label (desde config), componente e ícono.
   - `useDrawMode()` persiste en `localStorage` `${siteConfig.slug}-ruleta-mode` con `useSyncExternalStore`, mismo patrón que `EditableTitle.tsx`.
   - Refactor mínimo de `RuletaClient`: renderiza el modo activo donde hoy está `<Wheel>`. Mantiene `spin()` como fuente del ganador y el mismo flujo de confirmar, saltar, premio y polling pausado.
   - El cálculo de rotación de la ruleta se mueve a `WheelMode`.
2. **`SoundEngine`** (`apps/ruleta/src/lib/sound/types.ts`):
   - `unlock()`, `wheel(segmentCrossTimesMs: number[])`, `tick()`, `peg(pitch: number)`, `land()`, `win()`, `setEnabled(b)`.
   - Primera implementación en WebAudio basada en `lib/spinSound.ts`. Otro agente la va a reemplazar por Tone.js: dejala detrás de la interfaz.
   - El toggle de sonido existente controla `setEnabled`.
3. **Modos:**
   - **WheelMode:** usa `Wheel.tsx`.
     - Si n > 32, cartel grande sobre o debajo de la ruleta con el nombre bajo el puntero en tiempo real, calculado con la rotación interpolada.
     - Calcular `segmentCrossTimesMs` con la curva de easing de la transición CSS para que el sonido coincida con cada segmento: función pura testeada en `lib/draw/wheelTiming.ts`.
   - **SlotMode:** nombre gigante tipo rodillo de tragamonedas, con el anterior y el siguiente difuminados. Rota rápido y desacelera con ease-out (rAF) hasta el ganador. `tick()` en cada cambio y `land()` al final.
   - **GridMode:**
     - Todos los nombres en grilla responsive; a 1920×1080 tiene que entrar 80–120, con autoajuste de columnas y font-size y truncado con `title`.
     - Un resaltado salta entre tarjetas al azar, cada vez más lento, y frena en el ganador, que queda iluminado con un pulso. `tick()` en cada salto.
   - **PlinkoMode:** el modo "llamativo", en canvas 2D con rAF y **sin motor de física**.
     - Tablero triangular de clavijas. Abajo, cajones: uno central dorado "PREMIO" y el resto "fuera".
     - Todos los participantes caen como pelotitas de colores con iniciales; el nombre completo aparece en hover, en una etiqueta o en un ticker lateral de los que van cayendo.
     - Con N grande caen por tandas escalonadas, para que la animación dure como mucho unos 8–10 s.
     - Las trayectorias se **precalculan**: generador determinístico con semilla (`lib/draw/plinkoPaths.ts`, función pura) que da para cada pelotita su secuencia L/R por fila y su cajón final. **Solo** la del ganador termina en el cajón dorado, y las demás nunca.
     - Interpolación suave con rebote en cada clavija; `peg(pitch)` con tono según la columna.
     - Al final: zoom o resaltado de la pelotita ganadora con su nombre grande, después `win()` y `onSettled`.
     - Tests del generador: varias semillas y tamaños (1, 2, 50, 80, 300). Siempre exactamente un ganador en el cajón dorado y todos los caminos válidos (dentro del tablero).
   - **Todos los modos:**
     - respetan `prefers-reduced-motion` (animación corta);
     - funcionan con N=1 y N=2;
     - no bloquean el hilo principal;
     - limpian rAF/timers al desmontar.
4. **Selector de modo:** botones segmentados o `<select>` accesible en el header.
   - Otro agente está creando un `HeaderMenu` hamburguesa con un slot para esto. Exportá un componente `DrawModeSelector` reutilizable y montalo provisoriamente en el header, junto a los controles existentes.
   - Se deshabilita mientras hay un sorteo en curso.
5. **Diseño** (`frontend-design`):
   - Usá los tokens de tema de `packages/ui` (`theme.css`) y los colores de `siteConfig.ruleta` (`wheelSegmentFills`, `confettiColors`, `wheelRimColor`).
   - No pongas colores hex sueltos nuevos en componentes: si hacen falta, agregalos a config, que el fork tiene su propio branding.
   - El confetti existente se dispara igual al terminar.
6. **Config:** labels de los modos, mensajes y textos de plinko ("PRIZE"/"out"), todo en `siteConfig.ruleta`.

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
