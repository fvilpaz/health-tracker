# Plan de Mejoras — Health Tracker

> Priorizado por impacto vs esfuerzo. Estado: 🔲 pendiente · ✅ completado
> Las reglas de salud que use cualquier mejora salen de `docs/FUENTES.md` (guía oficial con enlace).

---

## 🔲 P1 — Alto impacto / Bajo esfuerzo


---

## 🔲 P2 — Medio impacto / Medio esfuerzo

- [ ] **Fichas por medicamento** — hoy solo Ebymect tiene ficha propia; metformina sola, insulina y pastillas de la tensión se ven a través de la enfermedad. Con fuente oficial
- [ ] **Pruebas de la interfaz automáticas** — hoy lo visual se comprueba a mano en el navegador; unas pocas pruebas que abran la app y pulsen (cuestionario, entreno, importar)
- [ ] **Vídeos elegidos y revisados por ejercicio** — hoy el ▶ busca en YouTube; poner un enlace concreto y en castellano por ejercicio del catálogo
- [ ] **Fotos de progreso** — Opcional: guardar foto semanal (comprimida)
- [ ] **Notas por semana** — Campo de texto libre en el tracker para anotar cómo te sientes
- [ ] **Estadísticas** — Media semanal, mejor racha, tendencia (línea de regresión)
- [ ] **Copia fuera del móvil a un toque (capa 2)** (Nando, 29-sep: de momento no, le gusta como funciona) — si hace >7 días de la última, aviso al abrir: «Guarda tu copia semanal» → menú Compartir → Google Drive. ~30 líneas

---

## 🔲 P3 — Bajo impacto / Alto esfuerzo

- [ ] **Progresión del entreno** — cuando vayas suelto, la app sube la dificultad: más segundos o repeticiones, menos descanso, o pasa al ejercicio «harder» del catálogo (y baja al «easier» si cuesta). Por ejemplo, tras X semanas cumplidas o si marcas «me ha resultado fácil» al acabar el bloque
- [ ] **Dosis y recordatorios de tomas** — como la app Salud de Apple: por cada medicamento, dosis, forma (pastilla, inyección…) y cuándo; aviso a la hora de la toma
- [ ] **Menú semanal** — hoy hay «Sugerencias del día» según el perfil; generar la semana completa respetando las raciones de la AESAN (legumbres ≥4, pescado ≥3, carne ≤3…)
- [ ] **Copia automática a Google Drive** — sin tocar nada: permiso con la cuenta de Google, alta en Google Cloud y abrir la CSP a Google. NUNCA a GitHub (repo público; una llave de GitHub en el móvil es un riesgo)
- [ ] **Sincronizar con un Gist** (idea de Nando, 29-sep-2026) — la copia en un Gist secreto de GitHub, que lean el móvil y el PC. Pega: hace falta una llave (token) de GitHub guardada en el móvil; si alguien la saca, entra en su cuenta. Mitigar con un token que SOLO pueda tocar Gists y un Gist secreto (no es privado del todo: quien tenga el enlace lo ve)
- [ ] **Sincronizar móvil y PC** — hoy cada aparato tiene sus datos (localStorage) y se pasan con Exportar/Importar. Opciones: un archivo en Drive que lean los dos, o servidor propio (Django + PostgreSQL). Con servidor: datos de salud = categoría especial del RGPD
- [ ] **Idioma inglés** — selector de idioma en «Mi perfil»; todos los textos a diccionarios (es/en), catálogos (ejercicios, comidas, consejos, fichas de Meds, avisos) con su versión en inglés **revisada** (un aviso médico mal traducido es peligroso), fechas y decimales según el idioma. Grande: varios cientos de líneas, por pasos. Hacerlo cuando alguien lo vaya a usar en inglés
- [ ] **Datos del reloj** — ver pasos, pulso, sueño… de Google Fit / Amazfit (Zepp) en la app. Ojo: Google Fit está cerrando su API (Health Connect en Android la sustituye) y desde una web no se lee Health Connect directamente: revisar opciones (Zepp → Google Fit/Strava, o app Android)
- [ ] **Gráfica de composición** — Peso + cintura + IMC superpuestos
- [ ] **Timer mejorado** — modo pantalla completa, cuenta atrás hablada (el sonido y la vibración ya están)

---

## 💡 Aparcado

- **Tus vídeos de cada ejercicio dentro de la app** (6-oct-2026, idea de Nando: la app del gimnasio deja descargarlos) — botón «añadir vídeo» por ejercicio que guarda el archivo en el aparato (IndexedDB), nunca en el repo (es público y los vídeos son del gimnasio). Son cortos (10–20 s, ~1–5 MB cada uno, ~100–200 MB en total para ~40 ejercicios): caben. Límites: el navegador puede borrarlos si falta espacio y no entran en Exportar/copias. Alternativa más ligera: guardar solo el enlace por ejercicio (ya está como «Vídeos elegidos y revisados por ejercicio» en P2)
- **Cardio con cronómetro y GPS dentro de la app** (6-oct-2026, idea de Nando; de momento a mano) — «Iniciar» y que cuente minutos y km con la geolocalización del navegador (~100 líneas + pruebas). Límites: solo con la página abierta y la pantalla encendida (en iPhone peor), gasta batería, y sin GPS en la cinta. Guardar solo minutos y km, nunca el recorrido. Conectar con Google Fit: descartado (su API se retira; Health Connect no se lee desde una web)
- **Varios perfiles en el mismo aparato** (29-sep-2026, decidido no hacerlo por ahora: YAGNI) — cada uno usa su móvil. Para un PC compartido ya sirven los **perfiles del navegador** (Brave/Chrome: cada uno su cajón, sin programar nada). Si algún día hace falta: prefijo por perfil en las claves + pasar los datos actuales al primero; inicial en un círculo de color, sin fotos.

---

## ✅ Completado

**6-oct-2026**
- [x] Sesión del gimnasio (`gym.js`, `data/gym.json`): plan de 5 días en rotación, ejercicios hechos y cardio opcional al empezar y al acabar; «Mi semana» con mínimo 3 e ideal 5. Las sesiones guardan `day` y `cardio`, y `copia.js` ya no los pierde al importar
- [x] Fuera «Hábitos de hoy» (`habitos.js`, su tarjeta, estilos y pruebas): no aportaba. `habits` pasa a ser una clave vieja que la copia ignora sin contarla; los hábitos que tuvieras guardados siguen en tu navegador, sin usarse (las reglas H1–H4 de `docs/FUENTES.md` quedan sin uso)

**29-sep-2026**
- [x] Hábitos de hoy en el Panel: agua, pasos (30 min andando), verdura (3 raciones) y sueño (7 h), con metas de fuentes (H1–H4). Entran en la copia validados (solo fechas reales y hábitos conocidos). Sin «2 L de agua» ni «6.000 pasos»: no hay cifra oficial. El entreno no va aquí porque ya se cuenta solo
- [x] Logros intermedios: 3, 7 y 10 kg perdidos; 5 y 10 cm menos de cintura (13 logros en total)
- [x] Sonidos del entreno (sin archivos, Web Audio): 1 pitido agudo al empezar ejercicio, 2 graves al empezar descanso, 3 notas subiendo en vuelta nueva y un acorde al terminar; cada uno con su vibración en el móvil (en iPhone no vibra: Safari no lo deja)
- [x] Limpieza de estilos de Meds: 74 estilos escritos en el HTML → 0 (ya estaban en `.med-tips`; nueva `.med-aire`). Medido: 146 elementos, 0 diferencias (con control)
- [x] Tracker: icono encima del nombre en las 4 etiquetas; todas caben sobre su recuadro (ENTRENOS sobresalía 5 px por lado)
- [x] Colores por salud (S1, S2): el peso por el IMC de la OMS en 4 colores y la cintura por cintura/altura, en el Panel y en el tracker (antes el tracker ponía verde «llegaste al objetivo» con un IMC de obesidad); ENTRENOS encima de la casilla 1, a la par de PESO
- [x] Tracker: «ENTRENOS» a la izquierda, casillas tan anchas como los recuadros y cada una encima del suyo, iconos en las etiquetas y más espacio
- [x] Gráfica e historial de cintura y barriga en Progreso (con borrar el día)
- [x] Tracker: semana 1 con los mismos números con los que empiezas (iba una semana adelantada); columna «— cm» en la barriga y leyenda como una fila más, alineada con cada columna también cuando las medidas bajan
- [x] Tracker semanal con la barriga; cada semana en tres líneas (semana / ENTRENOS 1 2 3 / PESO, CINTURA, BARRIGA) con sus etiquetas (nada se descuelga en el móvil; antes, a ~412 px, las medidas saltaban de línea)
- [x] Aviso al acabar el plan con «Empezar otro plan»: conserva el historial, empieza hoy y el objetivo sale del peso de ahora; la tabla y el objetivo usan las medidas de ESTE plan
- [x] Calentamiento de articulaciones (E13; 8 ejercicios, 5 min 40 s) sin fuerza ni balanceo; en los bloques, el principal de cada zona por orden del catálogo (antes salía «Elevación de talones» como piernas)
- [x] P0 del 28-sep: aviso de **cetoacidosis** en Ebymect (prospecto de la EMA), sin la dosis de nadie; fuera «omega 3 y vitamina E» del hígado; suplementos: fichas de omega 3 (AHA) y creatina (avisar al médico) y «Evitar»; fuera D3, magnesio, whey y B12 (reglas M7-M9)
- [x] Barriga (por el ombligo) aparte de la cintura (donde va el cinturón)
- [x] La app en `src/` y solo eso se publica; `CLAUDE.md` del proyecto
- [x] Copias automáticas semanales dentro del navegador (las 5 últimas) con «Recuperar»
- [x] Bienvenida: «Soy nuevo» o «Ya tengo mis datos: cargar mi copia»; botón «Borrar todos mis datos»
- [x] Perfil: cuestionario de 6 pasos y «Mi perfil»; salud al estilo PAR-Q+ (sí/no, suplementos aparte, tres preguntas de seguridad); menores de 18 sin metas de peso
- [x] Metas y objetivo de peso solo con sobrepeso (nunca por debajo de IMC 25); con peso sano, «mantenerlo»
- [x] **Fuente de verdad `docs/FUENTES.md`**: reglas de ejercicio (OMS, ACOG, ADA, ACSM, ATS, NICE, PAR-Q+) y comida (AESAN, ADA, EASL, DASH, ESC/EAS, AND, NHS, StatPearls) con enlaces
- [x] Entreno según el perfil (`rutina.js` + catálogo de 59 ejercicios): nivel, molestias, minutos, zonas; equilibrio a partir de 65; embarazo sin tumbarse; avisos por perfil; objetivo semanal = días del perfil
- [x] Duración de cada fase calculada de los ejercicios (antes, a mano y mal) y descanso entre vueltas a la vista
- [x] Meds según el perfil (fichas con `data-si`); Gilbert completado; ficha «Diabetes tipo 2: tus controles»
- [x] Fichas de Meds de tensión, colesterol, tiroides, asma, corazón y embarazo (NHS; reglas M1-M6); cada enfermedad del cuestionario tiene ficha (prueba)
- [x] Nutrición según el perfil (`nutricion.js` + `nutrition.json`): dieta, alergias, «lo que no comes», enfermedades; «Sugerencias del día» y «Ver todas las opciones»; «Recomendaciones» con su guía

**28-sep-2026**
- [x] Auditoría de seguridad, 3 revisores, pruebas automáticas y reorganización del código (informe en el Escritorio)
- [x] «Mi semana»: 3 bloques por semana con aviso de color, racha de semanas cumplidas, historial
- [x] Fuerza en bloques 1 / 2 / 3, sin cardio
- [x] Altura la pone el usuario; fuera los datos personales del código
- [x] Exportar e importar copia JSON; importar solo análisis los añade sin borrar
- [x] Pestaña 🎯 Metas: corto / medio / largo plazo calculadas con peso y altura
- [x] Historial de análisis, lector del PDF del laboratorio, comparativa y PDF adjunto
- [x] Semáforo 🟢/🟠/🔴 en peso, cintura y cintura/altura
- [x] Suplementos dentro de Meds (una pestaña menos)
- [x] PWA: manifest, iconos y service worker; instalable y funciona sin conexión

**8-ago-2026 (primera versión)**
- [x] index.html con 7 secciones, CSS con tema oscuro por defecto
- [x] Dashboard, entrenamiento con temporizador SVG, nutrición, medicación, progreso con gráfica e historial
- [x] Búsqueda de vídeos en YouTube por ejercicio (botón ▶)
- [x] Registro de cintura + ratio cintura/altura; tracker de 12 semanas; setup inicial; reiniciar plan
- [x] Repo en GitHub y publicación automática en GitHub Pages
- [x] Verificado en local y en GitHub Pages (se comprueba en cada subida)

---

_Generado: 2026-08-08 · Actualizado: 2026-09-29_
