# Health Tracker 🏃‍♂️

App web personal de salud y seguimiento de progreso. Sin servidor, sin backend, sin registro — todo funciona en tu navegador con `localStorage`.

**👉 [Abrir app](https://fvilpaz.github.io/health-tracker/)**

---

## Qué hace

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Peso actual, perdido, IMC, cintura (donde va el cinturón), barriga (por el ombligo) y lo perdido de cada una, ratio cintura/altura, bloques de esta semana, racha de **semanas cumplidas**, logros. Peso, cintura y ratio cambian de color (🟢/🟠/🔴) según el IMC y la cintura/altura |
| **🎯 Metas** | Metas a corto, medio y largo plazo (IMC 30, peso objetivo, IMC 27) con lo que falta; historial de análisis: **subes el PDF del laboratorio y la app lee la fecha y los valores** (tú revisas y guardas), el PDF queda adjunto. Cada análisis es un desplegable con tu valor, cuánto debería estar y qué es cada prueba; debajo, comparativa entre dos análisis (a elegir) con sugerencias |
| **Entrenamiento** | Calentamiento → fuerza → calma, con temporizador SVG. La fuerza va en **bloques 1 / 2 / 3** (sin cardio) que rotan solos. Solo cuenta como entreno el bloque de fuerza **completo**; se apunta solo con fecha, minutos y ejercicios |
| **Nutrición** | Esquema del plato, ideas de comidas, alimentos OK y a evitar |
| **Meds** | Ebymect, hígado graso, Gilbert, señales de alerta y suplementos (seguros, con precaución y a evitar) |
| **Progreso** | Registro de peso, cintura, barriga y altura; gráfica de peso; historial editable; exportar e importar copia; **copias automáticas** (una por semana al abrir, las 5 últimas, con «Recuperar») |
| **Semana** | Objetivo de **3 bloques por semana** (lunes a domingo, los días que quieras): aviso 🟢 vas bien · 🟠 vas justo · 🔴 no llegas o domingo con pendientes; los días con su bloque, qué bloque toca con botón para entrenar, y semanas anteriores en desplegables |

## Plan de 12 semanas

Tracker semanal integrado con:
- **Objetivos a partir de tus datos**: peso inicial − 7 kg y cintura inicial − 9 cm (nada escrito en el código)
- **Peso y cintura reales de cada semana**: salen solos de lo que registras en Progreso (la última medida de esa semana; en verde si llegas al objetivo)
- **Casillas de entrenos** que se rellenan solas con los bloques hechos cada semana
- **Sincronización automática** con el historial de peso y cintura

## Características técnicas

- **Stack**: HTML5 · CSS3 · JavaScript ES6 · Chart.js 4 · pdf.js 4 (las dos en `src/vendor/`, verificadas contra el registro npm)
- **Sin dependencias de build** — archivos estáticos puros
- **Tema oscuro** por defecto (y claro), responsive (mobile-first); colores con contraste suficiente (WCAG ≥ 4,5) en los dos
- **localStorage** — tus datos no salen de tu navegador
- **GitHub Pages** — deploy automático en cada push
- **Botón ▶ en ejercicios** — busca vídeos en YouTube al instante
- **Iconos** (sin emojis de colores, se ven igual en cualquier móvil; quedan símbolos de texto como ✓ y ▶): pestañas, títulos, logros y estados con [Phosphor](https://phosphoricons.com) duotono (MIT); botones con trazos estilo [Lucide](https://lucide.dev) (ISC). Todo dentro de la app, en `js/iconos.js`
- **PWA instalable** — en Chrome del móvil: menú ⋮ → *Instalar aplicación*. Funciona sin conexión y las actualizaciones llegan solas

## Estructura

```
health-tracker/
├── src/                    ← La app: SOLO esta carpeta se publica en la web
│   ├── index.html              ← App principal (7 pestañas)
│   ├── manifest.webmanifest    ← Nombre, colores e iconos para instalarla como app
│   ├── sw.js                   ← Service worker: red primero, sin conexión usa la última copia
│   ├── icons/                  ← Iconos 192/512, maskable y de iOS
│   ├── vendor/                 ← Chart.js y pdf.js servidos desde aquí (ver vendor/README.md)
│   ├── css/styles.css          ← Estilos completos (dark mode, responsive)
│   ├── js/                     ← Un archivo por tarea (se cargan en este orden desde index.html)
│   │   ├── tema.js             ← Pone el tema (claro/oscuro) antes de pintar: sin destello al abrir
│   │   ├── iconos.js           ← Todos los iconos (línea y duotono) en un solo sitio
│   │   ├── storage.js          ← Wrapper de localStorage + esc() para pintar datos sin riesgo
│   │   ├── copia.js            ← Exportar/importar la copia (validando lo que entra) y copias automáticas semanales
│   │   ├── timer.js            ← Temporizador con círculo SVG
│   │   ├── charts.js           ← Gráfica Chart.js para peso
│   │   ├── workout.js          ← Fases del entreno, temporizador y sus botones
│   │   ├── semana.js           ← Bloques hechos (sessions), lunes de cada semana, aviso de color y racha
│   │   ├── analisis.js         ← Análisis: catálogo de pruebas, tabla, comparativa, lector del PDF y PDF guardados
│   │   ├── dashboard.js        ← Panel principal (tarjetas y semáforo) y metas
│   │   ├── plan.js             ← Plan de 12 semanas (objetivos, lo real de cada semana y casillas)
│   │   ├── medidas.js          ← Guardar peso, cintura, barriga y altura; historial de peso
│   │   ├── logros.js           ← Logros
│   │   └── app.js              ← Arranque, bienvenida (nuevo o cargar tu copia), configuración inicial, tema, navegación, avisos e instalación
│   └── data/
│       ├── workouts.json       ← Los bloques de hoy (calentamiento, Bloque 1/2/3, vuelta a la calma)
│       └── exercises.json      ← Catálogo de calistenia (58, 24 de preparación militar): zona, nivel 1-3, impacto, molestias, material, versión fácil/difícil. Lo usarán los perfiles
├── tests/                  ← Pruebas (node --test): semana, copias/seguridad, análisis, plan, lector del PDF, temporizador, panel, metas y logros
├── perfiles/               ← Tus datos reales para importar en la app (en .gitignore: nunca se suben)
├── docs/PLAN.md            ← Plan de mejoras priorizado
├── CLAUDE.md               ← Contexto para la IA: reglas y decisiones que no se tocan
└── .github/workflows/
    └── pages.yml           ← Pruebas y, si pasan, publica src/ en GitHub Pages
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

- **Nada de terceros en tiempo real**: Chart.js, pdf.js y la fuente Inter van en `src/vendor/`; una **CSP** solo deja cargar código y fuentes de este sitio. La app no contacta con ningún otro servidor.
- **Importar es seguro**: una copia manipulada no puede colar código (se valida al entrar y todo se escapa al pintarse).
- **Ver PDF** abre siempre como PDF, aunque el archivo diga otra cosa.
- Auditado con [nando-toolkit](https://github.com/fvilpaz) (gitleaks, ESLint de seguridad, semgrep); los informes no se suben al repo.

## Licencia

MIT — úsalo, modifícalo, compártelo.

---

_Hecho con ❤️ para mi salud · 2026_
