# Health Tracker 🏃‍♂️

App web personal de salud y seguimiento de progreso. Sin servidor, sin backend, sin registro — todo funciona en tu navegador con `localStorage`.

**👉 [Abrir app](https://fvilpaz.github.io/health-tracker/)**

---

## Qué hace

| Sección | Descripción |
|---------|-------------|
| **Bienvenida y perfil** | Al empezar: «Soy nuevo» (cuestionario de 6 pasos: tú, medidas, objetivo, salud al estilo PAR-Q+ —enfermedades, medicación recetada y suplementos con sí/no, y tres preguntas de seguridad—, ejercicio y comida) o «Ya tengo mis datos» (carga tu copia). Botón «Mi perfil» arriba para cambiarlo. Todo lo que la app hace con tu perfil sale de `docs/FUENTES.md` (guías oficiales). Menores de 18: sin metas de peso |
| **Dashboard** | Peso actual, perdido, IMC, cintura (donde va el cinturón), barriga (por el ombligo) y lo perdido de cada una, ratio cintura/altura, bloques de esta semana, racha de **semanas cumplidas**, logros. Peso, cintura y ratio cambian de color (🟢/🟠/🔴) según el IMC y la cintura/altura |
| **🎯 Metas** | Metas a corto, medio y largo plazo **solo si hay sobrepeso**: salir de la obesidad (IMC 30), tu objetivo y la larga (IMC 27 con hígado graso o sin perfil; IMC 25 si no), solo las que estaban por encima de tu peso inicial; con peso sano, «mantenerlo». Historial de análisis: **subes el PDF del laboratorio y la app lee la fecha y los valores** (tú revisas y guardas), el PDF queda adjunto; desplegable por análisis y comparativa entre dos con sugerencias |
| **Entrenamiento** | Calentamiento → fuerza → calma, con temporizador SVG. La fuerza va en **bloques 1 / 2 / 3** que rotan solos: con perfil los arma la app con el catálogo (piernas, empuje, espalda y abdomen + un extra por cada zona que quieras trabajar; tu nivel —+50, embarazo o un «sí» de seguridad: nivel 1 sin saltos—; fuera lo que choca con tus molestias; equilibrio a partir de 65; vueltas según tus minutos); sin perfil, los de siempre. La duración de cada fase se calcula de los ejercicios (con el descanso entre vueltas a la vista). Avisos según tu perfil (embarazo, insulina, tensión, asma, seguridad). Solo cuenta el bloque **completo** |
| **Nutrición** | Método del plato (ADA). **Sugerencias del día** (3 por comida, cambian cada día) y «Ver todas las opciones», según tu dieta (vegana, vegetariana, sin carne), tus alergias y «lo que no comes»; «Recomendaciones» de las guías (AESAN para todos; ADA, EASL, DASH, ESC/EAS, AND según tu perfil); «Alimentos OK» y «Limitar». Sin perfil, todo |
| **Meds** | Solo las fichas de lo que marcas en tu perfil: Ebymect, diabetes tipo 2 (tus controles, ADA), hígado graso, Gilbert (NHS y StatPearls), tensión alta, colesterol, tiroides, asma, corazón y embarazo (NHS), señales de alerta y suplementos (omega 3 con la dosis de la AHA, creatina «antes, habla con tu médico» y los que hay que evitar). Ebymect incluye el aviso de **cetoacidosis** del prospecto. Sin nada marcado, te dice cómo añadirlo; sin perfil, todo |
| **Progreso** | Registro de peso, cintura, barriga y altura; gráfica de peso; historial editable; exportar e importar copia; **borrar todos mis datos** (solo los de esta app); **copias automáticas** (una por semana al abrir, las 5 últimas, con «Recuperar») |
| **Semana** | Objetivo de **bloques por semana** = los días de tu perfil (sin perfil, 3), de lunes a domingo, los días que quieras: aviso 🟢 vas bien · 🟠 vas justo · 🔴 no llegas o domingo con pendientes; los días con su bloque, qué bloque toca con botón para entrenar, y semanas anteriores en desplegables |

## Plan de 12 semanas

Tracker semanal integrado con:
- **Objetivos a partir de tus datos**: con sobrepeso, peso inicial − 7 kg (nunca por debajo de IMC 25) y cintura inicial − 9 cm; con peso sano, «Mantenerme» o menores de 18, sin objetivos (nada escrito en el código)
- **Peso y cintura reales de cada semana**: salen solos de lo que registras en Progreso (la última medida de esa semana; en verde si llegas al objetivo)
- **Casillas de entrenos** que se rellenan solas con los bloques hechos cada semana
- **Sincronización automática** con el historial de peso y cintura

## Características técnicas

- **Stack**: HTML5 · CSS3 · JavaScript ES6 · Chart.js 4 · pdf.js 4 (las dos en `src/vendor/`, verificadas contra el registro npm)
- **Sin dependencias de build** — archivos estáticos puros
- **Tema oscuro** por defecto (y claro), responsive (mobile-first); colores con contraste suficiente (WCAG ≥ 4,5) en los dos
- **En el PC** (900 px o más) usa el ancho de la pantalla (94 %, con tope) y las tarjetas van en columnas de periódico (cada una debajo de la anterior, sin huecos; columnas de al menos 360 px, las que quepan): sin tamaños fijos por pantalla
- **localStorage** — tus datos no salen de tu navegador
- **GitHub Pages** — en cada subida pasan las pruebas y, si van bien, se publica `src/` sola
- **Botón ▶ en ejercicios** — busca vídeos en YouTube al instante
- **Iconos** (sin emojis de colores, se ven igual en cualquier móvil; quedan símbolos de texto como ✓ y ▶): pestañas, títulos, logros y estados con [Phosphor](https://phosphoricons.com) duotono (MIT); botones con trazos estilo [Lucide](https://lucide.dev) (ISC). Todo dentro de la app, en `src/js/iconos.js`
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
│   │   ├── perfil.js           ← Cuestionario del perfil (6 pasos) y «Mi perfil»; menores sin metas de peso
│   │   ├── rutina.js           ← Bloques según el perfil (catálogo, nivel, molestias, minutos, zonas) y objetivo semanal
│   │   ├── nutricion.js        ← Comidas, «OK», «Limitar» y consejos según el perfil (data/nutrition.json)
│   │   └── app.js              ← Arranque, bienvenida (nuevo o cargar tu copia), configuración inicial, tema, navegación, avisos e instalación
│   └── data/
│       ├── workouts.json       ← Calentamiento, vuelta a la calma y los bloques de siempre (sin perfil)
│       ├── health.json         ← Catálogo del cuestionario: objetivos, enfermedades, medicación, suplementos, molestias, zonas, dieta, alergias
│       ├── nutrition.json      ← Catálogo de comidas con sus ingredientes, dietas, alergias y consejos (reglas A1-A7)
│       └── exercises.json      ← Catálogo de calistenia (59, 24 de preparación militar): zona, nivel 1-3, impacto, molestias, material, si se hace tumbado, versión fácil/difícil. Lo usa rutina.js
├── tests/                  ← 100 pruebas (node --test): semana, copias y seguridad, copias automáticas, análisis y lector del PDF, temporizador, panel, metas y logros, perfil, rutina, nutrición, catálogos y estructura del HTML
├── perfiles/               ← Tus datos reales para importar en la app (en .gitignore: nunca se suben)
├── docs/PLAN.md            ← Plan de mejoras priorizado
├── docs/FUENTES.md         ← Fuente de verdad: reglas de ejercicio (E), comida (A) y fichas de Meds (M) con su guía oficial
├── CLAUDE.md               ← Contexto para la IA: reglas y decisiones que no se tocan
└── .github/workflows/
    └── pages.yml           ← Pruebas y, si pasan, publica src/ en GitHub Pages
```

## Privacidad

Todos los datos (también tu perfil de salud) se guardan en `localStorage` de tu navegador; los PDF de los análisis, en IndexedDB. No se envía nada a ningún servidor y el repositorio no contiene datos de nadie. Si borras los datos del navegador, se pierden: exporta una copia de vez en cuando desde **Progreso → 💾 Tus datos** (los PDF no van en la copia).

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
- Auditado con [nando-toolkit](https://github.com/fvilpaz) (gitleaks, ESLint de seguridad, semgrep) **antes de cada subida**: si no sale en verde, no se sube. Los informes no se suben al repo.

## Licencia

MIT — úsalo, modifícalo, compártelo.

---

_Hecho con ❤️ para mi salud · 2026_
