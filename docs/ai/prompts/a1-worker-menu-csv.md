# A1 — worker — Menú hamburguesa + CSV de todos los participantes

- **Agente:** `worker` (Claude Sonnet 5)
- **Skills:** `react-scalable-frontend`, `unit-test-generator`
- **Worktree:** `/home/loren/projects/openruleta-wt/a1`, rama `feature/ruleta-menu-csv` (ya activa, `pnpm install` hecho)

## Prompt

1. Crear `apps/ruleta/src/components/HeaderMenu.tsx`: botón hamburguesa arriba a la derecha del header.
   - Montarlo en el JSX inline del header de `RuletaClient.tsx` (~L310-336), a la derecha, después de los controles existentes.
   - Menú desplegable accesible: `aria-haspopup`, `aria-expanded`, `role="menu"`/`menuitem`, navegación con flechas, cierre con Esc y clic afuera, foco que vuelve al botón.
   - Ítems:
     - **Actualizar**: usa el `manualRefresh` existente y el estado `refreshing`.
     - **Exportar CSV de participantes**: nuevo.
     - **Eliminar todos los participantes**: reutilizar el handler existente `deleteAllParticipants` (~L272) con su `window.confirm`.
     - **Sonido on/off**: mover el toggle existente al menú.
     - Prop opcional `children`/slot `extra` para que otro agente inserte un selector de "modo de sorteo".
   - Sacar los botones Actualizar y Eliminar todos de `ParticipantsPanel.tsx` (~L81-109) y limpiar sus props sin uso.
2. Generalizar el CSV:
   - Mover `csvCell`/`downloadWinnersCsv` (`RuletaClient.tsx` ~L36-59) a `apps/ruleta/src/lib/csv.ts`.
     - Función pura `toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string` con BOM y escapado correcto (comillas, comas, saltos de línea, fórmulas que empiezan con `= + - @` para evitar CSV injection).
     - Helper `downloadCsv(filename, content)` aparte.
   - Mantener el CSV de ganadores igual, ahora usando `toCsv`.
   - CSV de participantes: **todas** las filas (incluye ganadores) con nombre, email, doc (enmascarado como hoy con `maskDoc` si corresponde, o crudo: decidí y justificalo), creado, ganó el, premio.
   - Nombre de archivo: `${participantsFilenamePrefix}-YYYY-MM-DD.csv`.
3. Config:
   - `ruleta.csv.participantsFilenamePrefix` ("participants")
   - `ruleta.csv.participantsHeaders` (tupla tipada)
   - mensajes `menu`, `menuOpen`, `menuClose`, `exportParticipantsCsv`, `soundOn`/`soundOff` si hacen falta
4. Tests de `toCsv` con `unit-test-generator`: escapado, BOM, filas vacías y protección contra fórmulas.

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
