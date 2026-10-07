# A6 — worker — Nombres siempre visibles en la ruleta (corona exterior en blanco)

- **Agente:** `worker` (Claude Sonnet 5)
- **Skills:** `frontend-design`, `react-scalable-frontend` y `unit-test-generator`. Leé sus `SKILL.md` en `/home/loren/.claude/skills/<nombre>/SKILL.md`; no tenés herramienta Skill y leerlos directo está autorizado.
- **Worktree:** `/home/loren/projects/openruleta-wt/a6`, rama `feature/wheel-radial-labels` (base `master`, ya activa).

## Prompt

Loren quiere que en la ruleta **se vean los nombres sí o sí y que quede bien**, también con 80–150 participantes. Se proyecta a 1920×1080. Mirá la captura `/home/loren/projects/openruleta-prompts/a5-marquee-bug.png`: con 84 participantes la ruleta muestra solo rayas.

Hoy, en `apps/ruleta/src/components/Wheel.tsx`:

- SVG con viewBox 100, ancho máximo 460 px.
- Etiquetas horizontales: hasta 10 nombres, de 11 a 32 iniciales, y más de 32 nada.
- `WheelMode` (`components/draw/WheelMode.tsx`) suma un cartel "bajo el puntero" cuando n > 32. **Conservalo** como complemento.

Implementá:
**Pedido explícito de Loren:** los nombres van **por fuera del círculo**, desde el borde hacia afuera, **en blanco** sobre el fondo oscuro de la página. Es una corona de nombres alrededor de la ruleta, no dentro de los segmentos.

1. **Tamaño y layout:** el conjunto (ruleta + corona de nombres) ocupa el espacio disponible del escenario (el contenedor de `WheelMode`).
   - Medí con `ResizeObserver`; puede haber un `useElementSize` en `components/draw/`. Sacá el tope de 460 px.
   - Reservá un anillo exterior para las etiquetas: por ejemplo, radio de la ruleta ≈ 55–65 % del radio total y el resto para los nombres.
   - Ajustá esa proporción según el largo real de los nombres, con un tope. Puntero, aro (`wheelRimColor`) y logo central quedan proporcionales.
   - El SVG no tiene que recortar los nombres: viewBox con margen y `overflow: visible` si hace falta.
2. **Etiquetas radiales exteriores para todo n:** cada nombre arranca justo afuera del aro, sobre la bisectriz de su segmento, y se extiende hacia afuera. Rotan junto con la ruleta, dentro del mismo grupo que gira.
   - **Color:** blanco, o un token de config `wheelLabelInk` con default blanco. Sin hex sueltos en el componente. Una sombra sutil (`paint-order: stroke` con trazo oscuro fino) si mejora la lectura sobre el glow.
   - **Tamaño de fuente:** según el arco disponible en el radio del texto (`2πr/n`), con mínimo legible (~12 px reales a 1920×1080) y máximo razonable (~22 px).
   - **Largo:** limitado por el anillo exterior. Si no entra, primero nombre + inicial del apellido ("Pablo E."), y si aun así no entra, "…".
   - **Orientación:** el texto se lee del aro hacia afuera. Para que no quede de cabeza en la mitad izquierda, invertí el texto de los segmentos cuya bisectriz cae en la mitad izquierda de la ruleta (rotar 180° y `text-anchor="end"`), así siempre se lee de izquierda a derecha. Como la ruleta gira, calculalo respecto de la ruleta y aceptá que durante el giro pase por todas las orientaciones.
   - **Resaltado del ganador:** al detenerse, la etiqueta bajo el puntero (arriba) se agranda o resalta con `drawModes.winColor`.
   - Si n es tan grande que no entra la fuente mínima (por ejemplo n > ~200), mostrar etiquetas cada k segmentos más el cartel del puntero (que se conserva siempre).
   - Los segmentos de la ruleta quedan sin texto adentro, solo colores.
3. **Rendimiento:** con 150 segmentos tiene que seguir girando fluido.
   - Las etiquetas van dentro del mismo `<g>` que rota, con una sola transformación CSS, como hoy.
   - Memoizá la geometría (`useMemo`) por `pool` y tamaño.
   - Nada de filtros caros por segmento.
4. **Lógica pura** en `apps/ruleta/src/lib/draw/wheelLabels.ts`: `labelFor(name, maxChars)` y `fontSizeFor(n, radiusPx)`, con tests `node:test`.
5. **Revisá visualmente** con `OPENRULETA_MOCK_DB=1`. Si `scripts/reset-mock-db.mjs` no permite N, sembrá 84 y 150 participantes con nombres realistas largos, como "Pablo Andrés Espinoza Miranda", en un archivo mock propio vía `OPENRULETA_MOCK_DB_FILE`. Hacé capturas en headless Chromium a 1920×1080 con n = 12, 84 y 150, quieto y al detenerse.
6. **No toques:** `SlotMode`, `GridMode`, `PlinkoMode`, `lib/sound/*`, `packages/ui/Marquee`. Hay otros agentes en paralelo. En `RuletaClient.tsx`, cambios mínimos o ninguno.

### Reglas

- No push, no merge.
- Si un permiso te bloquea, frená y reportalo.
- Conventional Commits (`feat(ruleta): …`) con la línea `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Copiá este prompt a `docs/ai/prompts/a6-worker-wheel-names.md`, pasale prettier y **commiteá vos** cuando pase la aceptación.
- **Aceptación:** `pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- **Reporte final:** rutas de las capturas.
