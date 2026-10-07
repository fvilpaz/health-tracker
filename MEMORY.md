# MEMORY — trampas, decisiones y operación de health-tracker

> Lo que **no se deduce del código**. Una línea por cosa; actualizar cuando algo cambie.
> **Repo público: aquí nunca datos de salud reales, contraseñas, tokens ni rutas personales.**

## Producción
- GitHub Pages: cada push a `main` pasa las pruebas y publica **solo `src/`** (`.github/workflows/pages.yml`, que además sella
  la versión de `src/sw.js`). `LICENSE`, `docs/` y `tests/` no salen en la web (el `LICENSE` da 404 allí: es normal).
- No hacer dos pushes seguidos: esperar a que Pages termine. Ver el estado sin `gh`:
  `https://api.github.com/repos/fvilpaz/health-tracker/actions/runs` (repo público).
- Antes de CADA push: `node --test tests/*.test.js` y `audit` (nando-toolkit) con el informe LEÍDO; un test nuevo debe
  **fallar con el código viejo** (control). Los informes `docs/audit-*` no se suben.

## Trampas
- Las sesiones y el borrador guardan el **NOMBRE** del ejercicio (`sessions[].exercises`, `gymDraft.done`), no el id (`d1e1`).
  Los nombres vienen del gimnasio: **no renombrar** sin migrar el historial.
- **Cardio, dos formatos que se leen SIEMPRE:** el viejo `{start, end}` y la lista nueva `[{minutes?, km?, note?}]` (hasta 4).
  `cardio_start`/`cardio_end` de `gym.json` ya no se muestran, pero se conservan. «Quitar» decide al **tocar**, no al pintar.
- `localStorage` usa el prefijo `ht_` (`ht_profile`, `ht_sessions`, `ht_gymDraft`). Para probar a mano, datos **inventados**.
- El Timer es **uno solo**, compartido por el reloj del gimnasio y el entreno en casa (`decisionReloj` evita que se pisen).
  El reloj del gimnasio lee `planGym.rest` (90 s en `gym.json`); no hay descanso por ejercicio (aparcado a propósito).
- Un `fetch` nuevo a `data/*.json` hay que añadirlo a `ESENCIAL` de `src/sw.js` o no funciona sin conexión (hay un test).
- Las fotos van con `loading="lazy"`: miden 0 hasta hacer scroll, no es un fallo. El botón «+ Añadir otro cardio» usa `hidden`:
  un script puede pulsarlo aunque no se vea, el tope de 4 se vigila también dentro del handler.
- `docs/INFORME-2026-09-28.md` está sin seguimiento a propósito: no se añade.

## Fotos de los ejercicios (decisión de Nando, riesgo aceptado)
- 56 WebP en `src/img/gym/` (Inicio/Final de 28 ejercicios) con **cara, logos y marcas difuminados**, sin EXIF. Origen:
  free-exercise-db, de procedencia comercial no documentada: difuminar NO elimina el copyright (anotado en `docs/PLAN.md`).
- Las originales **sin tapar** viven fuera del repo y **no entran nunca en git** (no se pueden quitar del historial). Hay una rama
  local de respaldo con ellas: **no se sube jamás** (ni `push --all`, `--mirror` ni `--tags`).
- Si se añade una foto: tapar caras, camisetas, guantes y rótulos de máquinas, revisar con zoom, y que ninguna coincida con
  las originales. Los dibujos Everkinetic se descartaron (Nando quiere personas, no muñecos).

## Fichas «Cómo se hace» (`src/data/ejercicios-gym.json`)
- 27 fichas con «Revisado por Nando el 7-oct-2026» (redactadas con IA, criterio de entrenador, sin guía oficial; el manual NSCA
  de pago no se pudo contrastar). **d4e1** (press superior vertical) sigue «sin revisar»: se desconoce el recorrido real de las
  asas; el texto neutro propuesto («empuja las asas siguiendo el recorrido de la máquina») está pendiente de aplicar.
- Una prueba exige `ref` en los 38 ids de `gym.json` y las etiquetas correctas.

## Decisiones de Nando (no se deshacen sin hablarlo)
- Mínimo 3 sesiones por semana, ideal 5. Los 90 s de descanso del gimnasio «están bien pensados».
- Cardio: **un bloque único** al final, hasta 4 filas (no «arriba y abajo» como el planning de su gimnasio).
- Editor del plan: sí (series 1-10, repeticiones 1-100, descanso general 10-600 s, solo números, por diferencias sobre `gym.json`,
  incluido en Exportar/Importar). Orden: «cambia de pie» (`sides: 2`) → `esc()`/`https` en `workout.js` → editor.
- Dos sesiones de Claude trabajan a la vez: una implementa y hace los commits; la otra revisa cada commit (pruebas, control,
  audit, navegador a 390 px). El **push solo con el «sí» de Nando**, desde el árbol de quien implementa.
