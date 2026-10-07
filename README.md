# Health Tracker 🏃‍♂️

App web personal de salud y seguimiento de progreso. Sin servidor, sin backend, sin registro — todo funciona en tu navegador con `localStorage`.

**👉 [Abrir app](https://fvilpaz.github.io/health-tracker/)**

---

## Qué hace

| Sección | Descripción |
|---------|-------------|
| **Bienvenida y perfil** | Al empezar: «Soy nuevo» (cuestionario de 6 pasos: tú, medidas, objetivo, salud al estilo PAR-Q+ —enfermedades, medicación recetada y suplementos con sí/no, y tres preguntas de seguridad—, ejercicio y comida) o «Ya tengo mis datos» (carga tu copia). Botón «Mi perfil» arriba para cambiarlo. Todo lo que la app hace con tu perfil sale de `docs/FUENTES.md` (guías oficiales). Menores de 18: sin metas de peso |
| **Dashboard** | Peso actual, perdido, IMC, cintura (donde va el cinturón), barriga (por el ombligo) y lo perdido de cada una, ratio cintura/altura, sesiones de esta semana (con su objetivo), logros (primer entreno, semanas, 1-3-5-7-10 kg, 1-5-10 cm de cintura, peso objetivo, cintura/altura sana). El color dice cómo estás: el peso por el IMC de la OMS (🟢 normal · 🟡 sobrepeso o bajo peso · 🟠 obesidad I · 🔴 obesidad II+) y la cintura por cintura/altura (🟢/🟠/🔴); igual en el tracker semanal |
| **🎯 Metas** | Metas a corto, medio y largo plazo **solo si hay sobrepeso**: salir de la obesidad (IMC 30), tu objetivo y la larga (IMC 27 con hígado graso o sin perfil; IMC 25 si no), solo las que estaban por encima de tu peso inicial; con peso sano, «mantenerlo». Historial de análisis: **subes el PDF del laboratorio y la app lee la fecha y los valores** (tú revisas y guardas), el PDF queda adjunto; desplegable por análisis con su PDF y la papelera, que borra el análisis entero (valores y PDF) y comparativa entre dos con sugerencias |
| **Entrenamiento** | **Sesión del gimnasio** (arriba): la app solo **apunta** lo que haces, los vídeos y el plan están en la app del gimnasio. Plan de 5 días (`data/gym.json`: 3×15, 4 series en abdominales) que rotan: «Hoy toca el día N» es el siguiente al último que hiciste. Marcas los ejercicios hechos y, si quieres, el **cardio** (una lista de hasta 4 filas con minutos, km y nota, todo opcional, en el orden en que lo hiciste: «+ Añadir otro cardio» y «Quitar»; las sesiones antiguas con «al empezar / al acabar» se siguen leyendo siempre). Lo marcado se guarda como borrador (no va en la copia) y sobrevive a cerrar la app. **Descanso entre series**: un reloj circular de 90 s (tócalo al acabar una serie) con 2 pitidos graves al empezar y 1 agudo al acabar, con vibración en el móvil (en iPhone no vibra), y la pantalla encendida mientras cuenta. Los minutos del cardio se pueden escribir como los da la máquina (`10:38`) o en decimales (`10,6`). Avisos según tu perfil (embarazo, insulina, tensión, asma, seguridad). **Modos de entreno** (en «Mi perfil» y en las píldoras «Mis modos» de Entreno): **Gimnasio** y/o **En casa** (el entreno guiado de calistenia —calentamiento, fuerza por bloques y calma, con su catálogo de ejercicios— que se había quitado el 6-oct-2026 y se recuperó de la etiqueta `calistenia-en-casa`; sin nivel y minutos en el perfil no arma nada). **Puerta del plan de gimnasio**: menores de 18, embarazo o algún «sí» del cuestionario de seguridad no ven el plan de 5 días; pueden apuntar sesiones a mano (fecha y nota). El reloj del gimnasio y el entreno en casa no se pisan. Cada ejercicio del gimnasio lleva una flecha ▾ junto a la casilla que despliega «Cómo se hace» (28 fichas en `data/ejercicios-gym.json`: Trabaja, pasos y enlace para buscarlo en YouTube, con 2 fotos por ejercicio —de free-exercise-db, con caras, logos y marcas difuminados— y la etiqueta «Revisado por Nando» o, si no, «texto redactado con ayuda de IA, sin revisar») |
| **Nutrición** | Método del plato (ADA). **Sugerencias del día** (3 por comida, cambian cada día) y «Ver todas las opciones», según tu dieta (vegana, vegetariana, sin carne), tus alergias y «lo que no comes»; «Recomendaciones» de las guías (AESAN para todos; ADA, EASL, DASH, ESC/EAS, AND según tu perfil); «Alimentos OK» y «Limitar». Sin perfil, todo |
| **Meds** | Solo las fichas de lo que marcas en tu perfil: Ebymect, diabetes tipo 2 (tus controles, ADA), hígado graso, Gilbert (NHS y StatPearls), tensión alta, colesterol, tiroides, asma, corazón y embarazo (NHS), señales de alerta y suplementos (omega 3 con la dosis de la AHA, creatina «antes, habla con tu médico» y los que hay que evitar). Ebymect incluye el aviso de **cetoacidosis** del prospecto. Sin nada marcado, te dice cómo añadirlo; sin perfil, todo |
| **Progreso** | Registro de peso, cintura, barriga y altura: rellenas las que quieras y un solo «Guardar medidas» las guarda todas (si una está mal no se guarda ninguna); con su día (hoy o uno anterior, para apuntar una que se te pasó); la unidad va en una pastilla con el color de esa medida en las gráficas. Los historiales de peso y de cintura y barriga llevan la fecha arriba y debajo cada medida con su rótulo (y el cambio del peso); gráfica e historial de peso, y de cintura y barriga (con borrar); exportar e importar copia; **borrar todos mis datos** (solo los de esta app); **copias automáticas** (una por semana al abrir, las 5 últimas, con «Recuperar») |
| **Semana** | **Mínimo** de sesiones por semana = los días de tu perfil (sin perfil, 3) e **ideal** = los días del plan del gimnasio (5), de lunes a domingo: aviso 🟢 vas bien o cumplida con el mínimo · 🟠 vas justo · 🔴 no llegas al mínimo o domingo con pendientes; los días con su «Día N» (o su bloque antiguo), qué día toca con botón para apuntarlo, y semanas anteriores en desplegables con los ejercicios y el cardio de cada sesión |

## Plan de N semanas (las de tu plan; 12 si no pones otra, de 4 a 24)

Tracker semanal integrado con:
- **Al terminar, aviso «¿empiezas otro?»**: el plan nuevo empieza hoy, conserva todo tu historial y su objetivo sale de tu peso de ese día
- **Semana 1 = los mismos números con los que empiezas** (objetivo y real, tal cual); los objetivos bajan por igual desde la semana 2 y llegan a tu meta justo en la última. La fecha de inicio y la duración se cambian en «Mi perfil» → «Tu plan»
- **Objetivos a partir de tus datos**: con sobrepeso, peso inicial − 7 kg (nunca por debajo de IMC 25) y cintura inicial − 9 cm; con peso sano, «Mantenerme» o menores de 18, sin objetivos (nada escrito en el código)
- **Peso, cintura y barriga reales de cada semana**: salen solos de lo que registras en Progreso (la última medida de esa semana; en verde si llegas al objetivo; la barriga, sin objetivo). Cada semana en dos partes: la cabecera, con «Semana N» y su fecha a la izquierda y PESO, CINTURA y BARRIGA a la derecha; y debajo «ENTRENOS» con una casilla por sesión del plan (medido a 320, 360 y 390 px y en PC; en 320 las medidas bajan a la línea de debajo)
- **Casillas de entrenos** (5, las del plan): se rellenan solas con las sesiones hechas cada semana; las que pasan del mínimo (3), con borde discontinuo
- **Sincronización automática** con el historial de peso y cintura

## Características técnicas

- **Stack**: HTML5 · CSS3 · JavaScript ES6 · Chart.js 4 · pdf.js 4 (las dos en `src/vendor/`, verificadas contra el registro npm)
- **Sin dependencias de build** — archivos estáticos puros
- **Tema oscuro** por defecto (y claro), responsive (mobile-first); colores con contraste suficiente (WCAG ≥ 4,5) en los dos
- **En el PC** (900 px o más) usa el 50 % del ancho (25 % de margen a cada lado; como mínimo 680 px) con cada tarjeta a todo el ancho, una debajo de otra (nada salta de sitio al abrir o cerrar algo), y el contenido de cada tarjeta en columnas automáticas (comidas del día, recomendaciones, alimentos, ejercicios, logros, metas, días de la semana): sin tamaños fijos por pantalla
- **localStorage** — tus datos no salen de tu navegador
- **GitHub Pages** — en cada subida pasan las pruebas y, si van bien, se publica `src/` sola
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
│   ├── img/gym/                ← 56 fotos de los ejercicios (inicio y final), con caras, logos y marcas difuminados
│   ├── vendor/                 ← Chart.js y pdf.js servidos desde aquí (ver vendor/README.md)
│   ├── css/styles.css          ← Estilos completos (dark mode, responsive)
│   ├── js/                     ← Un archivo por tarea (se cargan en este orden desde index.html)
│   │   ├── tema.js             ← Pone el tema (claro/oscuro) antes de pintar: sin destello al abrir
│   │   ├── iconos.js           ← Todos los iconos (línea y duotono) en un solo sitio
│   │   ├── storage.js          ← Wrapper de localStorage + esc() para pintar datos sin riesgo
│   │   ├── copia.js            ← Exportar/importar la copia (validando lo que entra) y copias automáticas semanales
│   │   ├── timer.js            ← Temporizador de cuenta atrás contra la hora real (el descanso entre series)
│   │   ├── charts.js           ← Gráfica Chart.js para peso
│   │   ├── semana.js           ← Sesiones hechas (sessions: bloques antiguos y días del gimnasio), lunes de cada semana, aviso de color y semanas cumplidas (las usan los logros)
│   │   ├── analisis.js         ← Análisis: catálogo de pruebas, tabla, comparativa, lector del PDF y PDF guardados
│   │   ├── dashboard.js        ← Panel principal (tarjetas y semáforo) y metas
│   │   ├── plan.js             ← Plan de N semanas (objetivos, lo real de cada semana y casillas de entrenos)
│   │   ├── medidas.js          ← Guardar peso, cintura, barriga y altura; historial de peso
│   │   ├── logros.js           ← Logros
│   │   ├── perfil.js           ← Cuestionario del perfil (6 pasos) y «Mi perfil»; menores sin metas de peso; modos de entreno activos (`profile.modes`: `home` y/o `gym`; un perfil de antes pasa solo a gimnasio); el paso «Ejercicio» obliga a marcar dónde entrenas y las preguntas de nivel, molestias, zonas y minutos solo salen con «En casa»
│   │   ├── rutina.js           ← Mínimo de sesiones por semana (los días del perfil) y avisos de Entreno según el perfil
│   │   ├── nutricion.js        ← Comidas, «OK», «Limitar» y consejos según el perfil (data/nutrition.json)
│   │   ├── workout.js          ← Entreno guiado «En casa»: fases, temporizador con pausa, avisos y bloques del perfil
│   │   ├── gym.js              ← Sesión del gimnasio: día que toca, ejercicios hechos, descanso entre series (reloj y sonidos), cardio en lista (hasta 4), fichas «Cómo se hace», puerta del plan y borrador
│   │   └── app.js              ← Arranque, bienvenida (nuevo o cargar tu copia), configuración inicial, tema, navegación, avisos e instalación
│   └── data/
│       ├── gym.json            ← Plan del gimnasio: 5 días con sus ejercicios, series, repeticiones y descanso (cada ejercicio con su `id` y su `ref`)
│       ├── ejercicios-gym.json ← Fichas «Cómo se hace» de los 28 ejercicios del gimnasio (Trabaja, pasos, «Ojo» y sus fotos en `img/gym/`)
│       ├── exercises.json      ← Catálogo de ejercicios de «En casa» (nivel, zona, molestias, material)
│       ├── workouts.json       ← Calentamiento, bloques de fuerza y vuelta a la calma de «En casa»
│       ├── health.json         ← Catálogo del cuestionario: objetivos, enfermedades, medicación, suplementos, molestias, zonas, dieta, alergias
│       └── nutrition.json      ← Catálogo de comidas con sus ingredientes, dietas, alergias y consejos (reglas A1-A7)
├── tests/                  ← 171 pruebas (node --test): semana, gimnasio, modos de entreno, medidas, copias y seguridad, copias automáticas, análisis y lector del PDF, temporizador, panel, metas y logros, perfil, rutina, nutrición y estructura del HTML
├── LICENSE                 ← Licencia MIT del código
├── CREDITS.md              ← De dónde salen las fotos de los ejercicios y el riesgo asumido (las imágenes tienen su propia licencia; el código es MIT)
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
