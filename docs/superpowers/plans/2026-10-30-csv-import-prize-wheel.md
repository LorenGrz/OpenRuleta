# OpenRuleta: documento completo, importación CSV y modo Ruleta de premios

## Context

Tres cambios pedidos por Loren:

1. **Documento completo.** Pedir "los últimos 3 dígitos" generaba confusión. Tanto el form público como el CSV pasan a usar el documento completo.
2. **Importar CSV.** Cargar de una vez todos los participantes al sorteo, con plantilla de ejemplo descargable.
3. **Modo Ruleta.** Cambiar entre "Sorteo" y una ruleta de premios genérica de stand, con premios predefinidos y editables.

Decisiones de Loren:

- Al salir un premio se muestra y listo: sin stock ni registro.
- La rueda se ve con gajos iguales y cada premio tiene un peso oculto.
- El CSV trae nombre, email y documento completo.
- Se guarda el documento completo.

## Orden y flujo

Son tres etapas, cada una en su rama y PR contra `master` (merge commit, Conventional Commits, según el Workflow contract):

1. `feature/full-document`
2. `feature/csv-import`
3. `feature/prize-wheel`

Antes de empezar: `git pull` de `master`, porque `origin/master` tiene 2 commits de docs sin traer. Copiar este plan a `docs/superpowers/plans/2026-10-30-csv-import-prize-wheel.md`.

### Ruteo de agentes

| Trabajo | Agente |
|---|---|
| Búsquedas abiertas (inventario de usos de `docLast3`, etc.) | `scout` |
| Implementación de cada etapa, con esta spec y `pnpm typecheck && pnpm lint && pnpm test && pnpm build` como aceptación | `worker` |
| Revisión de etapas 2 y 3 | `worker` nuevo, distinto del implementador |
| Revisión de etapa 1 y de `POST /api/participants` (datos personales, RLS, entrada no confiable) | `reasoner` |

Los `worker` corren de a uno y en secuencia, porque las etapas comparten config y `RuletaClient`. La sesión principal escribe las specs, revisa los resultados y reporta; no implementa.

## Etapa 1: documento completo

**Datos (`supabase/schema.sql`)**
- Agregar `document text` con `check (document is null or char_length(document) <= 32)`, también vía `alter table ... add column if not exists`.
- Agregar `document` al `grant insert` de anon. Sigue sin permiso de lectura.
- `doc_last3` queda como columna legacy: no se escribe más ni se borra, para no romper datos existentes. Actualizar el comentario del encabezado.

**Core**
- Renombrar `docLast3` a `document` en `types.ts`, `validation.ts`, `participants.ts`, `mock-store.ts` y `scripts/seed-mock-db.mjs`. Agregar `document` a `PARTICIPANT_COLUMNS`.
- `toWinnerParticipant`: `document: row.document ?? row.doc_last3 ?? ""` para filas viejas. Lo mismo tolera mocks viejos.
- `validateParticipant` normaliza: quita puntos, espacios y guiones y pasa a mayúsculas, antes de aplicar el patrón. Así `30.123.456` queda `30123456`.
- `maskDoc(document, glyph)` muestra solo los últimos 3 caracteres. Actualizar su comentario, que dice que el documento nunca se recolecta.

**Config (`form.docField`)**
- `label`, `hint`, `placeholder` y `privacyNote` piden el documento completo, sin prometer lo contrario.
- `pattern: "^[0-9A-Z]{6,20}$"`. Se quita `maxLength`: el patrón ya limita el valor normalizado.
- `csv.headers` y `participantsHeaders`: `id_last_3` pasa a `document`.

**Apps**
- `RaffleForm.tsx`: `inputMode` acorde al nuevo patrón. El ticket sigue enmascarado. En `localStorage` guardar solo los últimos 3 caracteres, no el documento completo.
- `apps/form/.../route.ts` y `RuletaClient.tsx`: usar `document`. Reescribir el comentario de las líneas 60-63, que ya no es cierto.

**Dónde se ve el documento completo:** solo en los dos exports CSV. `WinnerModal` y `ParticipantsPanel` siguen enmascarados porque esa pantalla se proyecta al público.

**Docs:** ADR `0002-store-full-document.md` con el trade-off de datos personales, `AGENTS.md`, `README.md`. Agregar al checklist post-evento borrar los participantes. Documentar que el SQL se corre **antes** de desplegar: sin la columna, el listado de la ruleta y el form fallan.

## Etapa 2: importación CSV

**Parser (`apps/ruleta/src/lib/csv.ts`)**
- `parseCsv(text)`: BOM, comillas RFC 4180, `""`, saltos de línea en celdas, CRLF, y delimitador autodetectado (`,` `;` tab) desde la cabecera. Sin librerías.
- `decodeCsvBytes(buffer)`: UTF-8 estricto con fallback a `windows-1252`, porque Excel suele exportar así.

**Mapeo (`apps/ruleta/src/lib/importParticipants.ts`, puro)**
- `mapImportRows(text, rules)` devuelve `{ valid, invalid: [{ line, reason }], duplicatesInFile, missingColumns }`.
- Cabeceras sin distinguir mayúsculas, con alias en config (`ruleta.csv.importAliases`: nombre, correo, mail, dni, documento…). Quita el prefijo `'` de `toCsv`, así un export se puede reimportar.
- Usa `validateParticipant` con las mismas reglas del form: documento obligatorio si `docField.enabled`.

**Core (`participants.ts`)**
- `addParticipantsBatch(inputs)` devuelve `{ inserted, duplicates }` y usa service_role, no `addParticipant`.
- Por tandas de 100: consulta emails existentes con `.in`, inserta los nuevos, y ante un 23505 por carrera con el form reintenta esa tanda fila por fila.
- `mockAddParticipants` escribe el archivo una sola vez. Exportar en `index.ts`.
- **`listParticipants` debe paginar con `.range()`.** Supabase corta en 1000 filas por defecto, así que un CSV grande dejaría gente fuera del sorteo sin aviso. Agregar `.order("id")` como desempate, porque el lote comparte `created_at`.

**API y UI**
- `POST /api/participants` con `{ rows }`, máximo 10.000 filas. Revalida cada fila en el servidor y responde `{ inserted, duplicates, invalid }`. Cliente nuevo en `lib/api.ts`.
- `ImportCsvModal.tsx`: elegir archivo, descargar plantilla, vista previa (válidas, duplicadas, errores por línea, los primeros 20) y botón "Importar N". Al terminar muestra el resumen y llama a `reload()`. Marca `busy` para pausar el polling.
- Si la fila ya existe se omite, no se pisa, y un ganador nunca se reinicia.
- La plantilla se genera con `toCsv` + `downloadCsv`, con datos claramente ficticios.
- `HeaderMenu`: nuevo ítem "Importar CSV". Textos en `ruleta.messages`.

## Etapa 3: modo Ruleta de premios

**Estructura**
- `page.tsx` renderiza `RuletaApp`, que elige entre `RuletaClient` y `PrizeWheelClient` según `useAppMode`.
- `useAppMode.ts` copia el patrón de `useDrawMode` con la clave `${slug}-ruleta-app-mode`. Es un eje aparte de los draw modes.
- `AppModeToggle.tsx` (Sorteo / Ruleta) en ambos headers, deshabilitado durante un giro o con modal abierto.
- Extraer la preferencia de sonido de `RuletaClient` a `useSoundPreference` para compartirla.
- `PrizeWheelClient` no llama a ninguna API y no hace polling: funciona sin Supabase.

**Premios**
- `lib/prizes.ts` (puro): tipo `Prize = { id, name, weight }`, `parsePrizes(raw, defaults)` y `pickWeightedIndex(prizes, random)`.
- `usePrizes.ts`: `localStorage` `${slug}-ruleta-prizes`, con snapshot cacheado por string crudo para evitar el bucle de renders de `useSyncExternalStore`.
- `siteConfig.ruleta.prizeWheel`: `defaultPrizes` y todos sus textos.
- `PrizesEditorModal.tsx`: agregar, renombrar, borrar, editar peso y restaurar valores por defecto. Máximo 16 premios.
- Es un modal porque los pesos no deben quedar a la vista del público. Peso 0 deja el premio visible pero nunca sale. Exige al menos 2 premios y un peso mayor a 0.

**Rueda**
- En `draw/types.ts`, `pool` pasa a `DrawEntry = { id, name }`.
- `WheelMode` y `Wheel` aceptan `fullLabels` para mostrar el nombre completo, porque hoy "Gift card" se cortaría en "Gift".
- Con cantidad impar, el último gajo queda igual al primero: usar un tercer color de `prizeWheel.segmentFills` solo en ese caso.
- Solo usa la rueda: Slot, Grilla y Plinko quedan para el sorteo, y `DrawModeSelector` se oculta.

**Giro:** Enter o botón, índice con `pickWeightedIndex`, y `PrizeResultModal` con confetti y un botón para cerrar. La rueda queda igual para el siguiente.

**Docs:** `AGENTS.md` §1, `README.md`, `.agents/CONTEXT.md`, `docs/plans/HANDOFF.md`.

## Tests (`node:test`, junto al código)

- Etapa 1: `validateParticipant` (normalización, patrón) y `maskDoc`.
- Etapa 2: `parseCsv` (comillas, `;`, CRLF, BOM, ida y vuelta con `toCsv`), `mapImportRows`, `addParticipantsBatch` con mock (patrón de `notify.test.ts`, incluyendo duplicados).
- Etapa 3: `pickWeightedIndex` con RNG inyectado (peso 0 nunca sale, distribución) y `parsePrizes` con datos corruptos.

## Verificación

Por etapa: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

End-to-end con mock DB (`pnpm dev`) en Playwright:

1. El form acepta `30.123.456`, la ruleta lo muestra enmascarado y el export lo trae completo.
2. Importar un CSV con comas, otro con `;`, filas inválidas y duplicados, y reimportar el mismo: no suma nadie.
3. Cambiar a Ruleta, editar premios, recargar y confirmar que persisten; girar varias veces con un premio en peso 0.
4. Volver a Sorteo y confirmar que nada cambió.

La paginación contra Supabase real no queda cubierta por el mock: requiere probarla en un proyecto con más de 1000 filas.

## Pendiente para Loren

- Correr `supabase/schema.sql` en cada proyecto antes de desplegar.
- Revisar el aviso de privacidad del form: un documento completo es un dato personal más sensible, y en concursos públicos los pesos ocultos pueden tener requisitos legales según la jurisdicción.
