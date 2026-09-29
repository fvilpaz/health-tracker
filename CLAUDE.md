# Health Tracker — contexto para la IA

App web instalable (PWA) de salud de Nando: peso, cintura, barriga, bloques de fuerza, plan de 12 semanas y análisis.
Estática: HTML + CSS + JS sin compilar, datos en el `localStorage` del navegador. Web: https://fvilpaz.github.io/health-tracker/

## Decisiones que NO se tocan
- **El repositorio es PÚBLICO.** Los datos de salud (pesos, análisis, PDF) viven SOLO en el navegador del usuario.
  Nunca datos reales en el código ni en las pruebas (solo inventados). Los PDF de análisis de Nando llevan su DNI: jamás al repo.
- Entreno: Bloque 1/2/3 de fuerza, sin cardio. **Solo cuenta el bloque completo.** Objetivo: 3 bloques por semana (lunes-domingo).
- Perfil (`profile`): cuestionario de 6 pasos con opciones del catálogo `src/data/health.json`, nunca texto que decida nada.
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
- Cambio de funcionalidad → README al día en el mismo cambio. Una prueba nueva debe fallar con el código viejo (control).
- Auditoría de seguridad: `audit` (nando-toolkit, en WSL); sus informes `docs/audit-*` no se suben.
  **Se pasa antes de CADA subida y, si no sale todo ✅, no se sube** (el 29-sep se subió dos veces sin mirarla).
  Comprobar el informe real (`docs/audit-*.txt`): un filtro que no ve la auditoría también diría «verde».

## Pendiente
Ver `docs/PLAN.md` y el informe `Desktop\INFORME-health-tracker.md` (decisiones A, B y F; probar el Wake Lock en el móvil).
