# A4 — worker — Audio con Tone.js para los 4 modos

- **Agente:** `worker` (Claude Sonnet 5)
- **Skills:** `typescript-code-quality` y `react-scalable-frontend`. No tenés la herramienta Skill: leé `/home/loren/.claude/skills/<nombre>/SKILL.md` y aplicá sus guías. No hay skill de audio; usá la documentación de Tone.js (tipos en `node_modules/tone`).
- **Worktree:** `/home/loren/projects/openruleta-wt/a4`, rama `feature/tone-audio` (ya activa, base `master` con menú, correo mock y modos de sorteo).

## Prompt

Loren dice que el sonido actual de la ruleta "es muy malo" y quiere buen audio también en los otros modos.

- Hoy hay una interfaz `SoundEngine` en `apps/ruleta/src/lib/sound/types.ts` (`unlock`, `wheel(segmentCrossTimesMs)`, `tick`, `peg(pitch 0..1)`, `land`, `win`, `setEnabled`), implementada en WebAudio crudo en `webAudioEngine.ts`.
- `useSoundEngine.ts` elige la implementación.
- Los modos (`components/draw/*Mode.tsx`) solo hablan con la interfaz. **No cambies la interfaz ni los modos**, salvo un bug evidente que justifiques.

1. `pnpm add tone -F @openruleta/ruleta` (versión estable actual, fijada exacta como las otras deps de la app).
2. `apps/ruleta/src/lib/sound/toneEngine.ts`, una clase o fábrica que implementa `SoundEngine`:
   - **Carga diferida:** `await import("tone")` en `unlock()`, que se llama desde el clic de Spin. Antes de eso no se crea ningún AudioContext. Las llamadas previas a la carga se ignoran sin romper, y `Tone.start()` en `unlock`.
   - **Ruleta `wheel(times)`:** un "clack" corto de flapper de madera o plástico por cada tiempo, programado con `Tone.now() + t/1000`. Por ejemplo `MetalSynth` o `MembraneSynth` muy corto más ruido filtrado. Volumen y brillo bajan levemente hacia el final.
   - **`tick()`** (tragamonedas y grilla): click mecánico seco y agradable, que no canse en 80 repeticiones. Variación sutil de tono y velocidad para que no suene robótico.
   - **`peg(pitch)`** (plinko): ping tipo campana o marimba en escala pentatónica, mapeando `pitch` 0..1 a las notas. Con polifonía y limitador para cuando caen muchas a la vez: throttle de 25 ms o un máximo de voces.
   - **`land()`:** golpe grave suave tipo "thunk".
   - **`win()`:** fanfarria corta de 1–1,5 s. Acorde mayor con arpegio ascendente y un shimmer (reverb/chorus livianos), sin saturar.
   - **`setEnabled(false)`:** silencia ya (master `Volume` mute) y cancela lo programado (`Transport` o dispose de los eventos pendientes).
   - **Master:** `Limiter` o `Compressor` antes de la salida y volumen general moderado.
   - Liberar los recursos (`dispose`) si se desmonta.
3. `useSoundEngine.ts` usa el engine de Tone. Si el import falla (navegador sin WebAudio), cae al `webAudioEngine` existente, que se conserva como fallback.
4. **Calidad:** TypeScript estricto, sin `any`, y sin `setState` en efectos (la regla de lint está activa).
5. **Tests** `node:test`: lo que sea puro, por ejemplo el mapeo `pitch → nota pentatónica` y el throttle, en funciones aparte (`lib/sound/toneMapping.ts`). No testees audio real.
6. Agregá a `AGENTS.md`/README de la app una línea sobre el motor de sonido y cómo cambiarlo.

### Reglas

- No push, no merge.
- Si un permiso te bloquea, frená y reportalo.
- Conventional Commits (`feat(ruleta): …`) con la línea `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Copiá este prompt a `docs/ai/prompts/a4-worker-tone-audio.md` y pasale prettier.
- **Hacé el commit vos** cuando la aceptación pase.
- **Aceptación** (raíz del worktree): `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- **Reporte final:** versión de Tone, bundle (tamaño del chunk de tone si `next build` lo muestra), decisiones de diseño sonoro y salida de la aceptación.
