# Health Tracker — contexto para la IA

@MEMORY.md

App web instalable (PWA) de salud de Nando: peso, cintura, barriga, sesiones del gimnasio, plan de N semanas y análisis.
Estática: HTML + CSS + JS sin compilar, datos en el `localStorage` del navegador. Web: https://fvilpaz.github.io/health-tracker/

## Decisiones que NO se tocan
- **El repositorio es PÚBLICO.** Los datos de salud (pesos, análisis, PDF) viven SOLO en el navegador del usuario.
  Nunca datos reales en el código ni en las pruebas (solo inventados). Los PDF de análisis de Nando llevan su DNI: jamás al repo.
- Entreno: la app **solo apunta** lo que haces en el gimnasio (vídeos y plan están en la app del gimnasio). Plan de 5 días en rotación (`data/gym.json`); cuenta cada sesión con lo que marcaste. **Mínimo 3 por semana, ideal 5** (lunes-domingo; criterio de la entrenadora, sin fuente en `FUENTES.md`). El cardio es opcional, va dentro de la sesión y es una LISTA de hasta 4 (`sessions[].cardio`); **el formato viejo `{start, end}` se lee SIEMPRE (sesiones guardadas, borradores y copias importadas): no se rompe ni se convierte sin pedirlo**. El entreno guiado «En casa» (calistenia: calentamiento, fuerza por bloques, calma) se recuperó el 6-oct-2026 como modo del perfil (`profile.modes`); `armarBloques` y su catálogo son los de la etiqueta de git `calistenia-en-casa`, sin tocar. **Los nombres de los ejercicios de `gym.json` son los del gimnasio y NO se cambian** (Nando, 7-oct-2026; además las sesiones y el borrador guardan el nombre). Las fichas «Cómo se hace» de cada ejercicio del gimnasio van en `data/ejercicios-gym.json` (por `ref`), con la etiqueta «Revisado por Nando…» (campo `revision`; sin él, «sin revisar»: hoy `d4e1`). Llevan 2 fotos cada una en `src/img/gym/` (de free-exercise-db, con caras, logos y marcas difuminados; riesgo aceptado por Nando; ver `CREDITS.md`). **Nunca** subir fotos sin tapar ni la rama local `backup-fotos-ejercicios`; no entran más fotos ni dibujos de internet sin su orden.
- Perfil (`profile`): cuestionario de 6 pasos con opciones del catálogo `src/data/health.json`, nunca texto que decida nada.
  Modos de entreno en `profile.modes` (`home` y/o `gym`, se leen con `modosActivos()`): un perfil de antes sin `modes` migra solo a `['gym']`; uno nuevo nace con `[]` y el cuestionario obliga a elegir al menos uno (las preguntas de nivel, molestias, zonas y minutos solo con «En casa»).
  **Menores de 18: sin metas de peso ni objetivo «perder peso»** (lo lleva el pediatra).
- **Fuente de verdad: `docs/FUENTES.md`** (guías oficiales con enlace; reglas E1… de ejercicio y A1… de comida). Toda regla
  de salud que use la app sale de ahí; si no hay guía, se escribe como «criterio de la app». Nada inventado.
- Cintura = donde va el cinturón · Barriga = por el ombligo (dos medidas distintas).
- Sin librerías desde internet: Chart.js, pdf.js y la fuente Inter van en `src/vendor/` (verificadas con el sha512 de npm) y la CSP
  solo deja cargar código de este sitio.
- Nombres de los datos en inglés (`weights`, `waists`, `bellies`, `sessions`, `labs`); los textos de pantalla, en castellano.

## Estructura
- `src/` es la app y **lo único que se publica**. `tests/`, `docs/` y este archivo no salen en la web.
- `src/js/`: scripts clásicos que comparten nombres globales y se cargan **en el orden de `index.html`**
  (el mismo orden está en `tests/entorno.js`). Un archivo nuevo va en los dos sitios y en `ESENCIAL` de `src/sw.js`.
- Todo lo que venga del almacén o de una copia importada se pinta con `esc()`; la copia pasa por `limpiarCopia()`.

## Cómo se trabaja
- Pruebas: `node --test tests/*.test.js` (sin dependencias). Probar en local: `python -m http.server` en la raíz y abrir `/src/`.
- Cada subida a `main` pasa las pruebas y **publica la web sola** (`.github/workflows/pages.yml`, sella la versión de `src/sw.js`).
  Nando da permiso para subir en este proyecto. No hacer dos subidas seguidas sin esperar a que acabe la publicación.
- Cambio de funcionalidad → README y MEMORY.md al día en el mismo cambio. Una prueba nueva debe fallar con el código viejo (control).
- Auditoría de seguridad: `audit` (nando-toolkit, en WSL); sus informes `docs/audit-*` no se suben.
  **Se pasa antes de CADA subida y, si no sale todo ✅, no se sube** (el 29-sep se subió dos veces sin mirarla).
  Comprobar el informe real (`docs/audit-*.txt`): un filtro que no ve la auditoría también diría «verde».

## Pendiente
Ver `docs/PLAN.md`. Del informe `Desktop\INFORME-health-tracker.md` quedaban las decisiones A y B (ambas sin tocar); ese archivo ya no está en el Escritorio (hay un `docs/INFORME-2026-09-28.md` sin seguimiento en el repo): comprobar si siguen vigentes.

✅ **Wake Lock probado en móvil:** pantalla se mantiene activa durante entreno (29-sep, primer entreno).
