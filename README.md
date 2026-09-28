# Health Tracker 🏃‍♂️

App web personal de salud y seguimiento de progreso. Sin servidor, sin backend, sin registro — todo funciona en tu navegador con `localStorage`.

**👉 [Abrir app](https://fvilpaz.github.io/health-tracker/)**

---

## Qué hace

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Peso actual, perdido, IMC, cintura, ratio cintura/altura, bloques de esta semana, racha de **semanas cumplidas**, logros. Peso, cintura y ratio cambian de color (🟢/🟠/🔴) según el IMC y la cintura/altura |
| **🎯 Metas** | Metas a corto, medio y largo plazo (IMC 30, peso objetivo, IMC 27) con lo que falta; historial de análisis: **subes el PDF del laboratorio y la app lee la fecha y los valores** (tú revisas y guardas), el PDF queda adjunto. Cada análisis es un desplegable con tu valor, cuánto debería estar y qué es cada prueba; debajo, comparativa entre dos análisis (a elegir) con sugerencias |
| **Entrenamiento** | Calentamiento → fuerza → calma, con temporizador SVG. La fuerza va en **bloques 1 / 2 / 3** (sin cardio) que rotan solos. Solo cuenta como entreno el bloque de fuerza **completo**; se apunta solo con fecha, minutos y ejercicios |
| **Nutrición** | Esquema del plato, ideas de comidas, alimentos OK y a evitar |
| **Meds** | Ebymect, hígado graso, Gilbert, señales de alerta y suplementos (seguros, con precaución y a evitar) |
| **Progreso** | Registro de peso, cintura y altura; gráfica de peso; historial editable; exportar e importar copia |
| **Semana** | Objetivo de **3 bloques por semana** (lunes a domingo, los días que quieras): aviso 🟢 vas bien · 🟠 vas justo · 🔴 no llegas o domingo con pendientes; los días con su bloque, qué bloque toca con botón para entrenar, y semanas anteriores en desplegables |

## Plan de 12 semanas

Tracker semanal integrado con:
- **Objetivos a partir de tus datos**: peso inicial − 7 kg y cintura inicial − 9 cm (nada escrito en el código)
- **Peso y cintura reales de cada semana**: salen solos de lo que registras en Progreso (la última medida de esa semana; en verde si llegas al objetivo)
- **Casillas de entrenos** que se rellenan solas con los bloques hechos cada semana
- **Sincronización automática** con el historial de peso y cintura

## Características técnicas

- **Stack**: HTML5 · CSS3 · JavaScript ES6 · Chart.js 4 · pdf.js 4 (las dos en `vendor/`, verificadas contra el registro npm)
- **Sin dependencias de build** — archivos estáticos puros
- **Dark mode** por defecto, responsive (mobile-first)
- **localStorage** — tus datos no salen de tu navegador
- **GitHub Pages** — deploy automático en cada push
- **Botón ▶ en ejercicios** — busca vídeos en YouTube al instante
- **Iconos** (sin emojis, se ven igual en cualquier móvil): pestañas, títulos, logros y estados con [Phosphor](https://phosphoricons.com) duotono (MIT); botones con trazos estilo [Lucide](https://lucide.dev) (ISC). Todo dentro de la app, en `js/iconos.js`
- **PWA instalable** — en Chrome del móvil: menú ⋮ → *Instalar aplicación*. Funciona sin conexión y las actualizaciones llegan solas

## Estructura

```
health-tracker/
├── index.html              ← App principal (7 pestañas)
├── manifest.webmanifest    ← Nombre, colores e iconos para instalarla como app
├── sw.js                   ← Service worker: red primero, sin conexión usa la última copia
├── icons/                  ← Iconos 192/512, maskable y de iOS
├── vendor/                 ← Chart.js y pdf.js servidos desde aquí (ver vendor/README.md)
├── css/styles.css          ← Estilos completos (dark mode, responsive)
├── js/                     ← Un archivo por tarea (se cargan en este orden desde index.html)
│   ├── iconos.js           ← Todos los iconos (línea y duotono) en un solo sitio
│   ├── storage.js          ← Wrapper de localStorage + esc() para pintar datos sin riesgo
│   ├── copia.js            ← Exportar/importar la copia, validando lo que entra (solo lo que tiene la forma correcta)
│   ├── timer.js            ← Temporizador con círculo SVG
│   ├── charts.js           ← Gráfica Chart.js para peso
│   ├── workout.js          ← Fases del entreno, temporizador y sus botones
│   ├── semana.js           ← Bloques hechos (sessions), lunes de cada semana, aviso de color y racha
│   ├── analisis.js         ← Análisis: catálogo de pruebas, tabla, comparativa, lector del PDF y PDF guardados
│   ├── dashboard.js        ← Panel principal (tarjetas y semáforo) y metas
│   ├── plan.js             ← Plan de 12 semanas (objetivos, lo real de cada semana y casillas)
│   ├── medidas.js          ← Guardar peso, cintura y altura; historial de peso
│   ├── logros.js           ← Logros
│   └── app.js              ← Arranque, configuración inicial, tema, navegación, avisos e instalación
├── data/workouts.json      ← Datos de ejercicios por fase
├── docs/
│   ├── PLAN.md             ← Plan de mejoras priorizado
│   └── SESION.md           ← Notas internas (no público)
├── tests/                  ← Pruebas (node --test): semana, copias/seguridad, análisis, plan, lector del PDF, temporizador, panel, metas y logros
└── .github/workflows/
    └── pages.yml           ← Deploy automático a GitHub Pages
```

## Privacidad

Todos los datos se guardan en `localStorage` de tu navegador; los PDF de los análisis, en IndexedDB. No se envía nada a ningún servidor y el repositorio no contiene datos de nadie. Si borras los datos del navegador, se pierden: exporta una copia de vez en cuando desde **Progreso → 💾 Tus datos** (los PDF no van en la copia).

**Varios aparatos:** cada navegador tiene sus propios datos. Exporta en uno e importa en el otro. Un archivo que solo trae análisis se **añade** sin borrar lo demás.

## Tests

```bash
node --test tests/*.test.js
```

Sin dependencias: `tests/entorno.js` carga los scripts **reales** de la app en una página falsa (localStorage en memoria,
`document` que no hace nada) y los tests llaman a sus funciones. Se lanzan solos en cada push **antes** de publicar:
si uno falla, la web no se actualiza. Los datos de los tests son inventados (el repo es público).

## Seguridad

- **Nada de terceros en tiempo real**: Chart.js, pdf.js y la fuente Inter van en `vendor/`; una **CSP** solo deja cargar código y fuentes de este sitio. La app no contacta con ningún otro servidor.
- **Importar es seguro**: una copia manipulada no puede colar código (se valida al entrar y todo se escapa al pintarse).
- **Ver PDF** abre siempre como PDF, aunque el archivo diga otra cosa.
- Auditado con [nando-toolkit](https://github.com/fvilpaz) (gitleaks, ESLint de seguridad, semgrep); los informes no se suben al repo.

## Licencia

MIT — úsalo, modifícalo, compártelo.

---

_Hecho con ❤️ para mi salud · 2026_
