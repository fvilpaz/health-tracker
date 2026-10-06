# Plan de Mejoras — Health Tracker

> Priorizado por impacto vs esfuerzo. Estado: 🔲 pendiente · ✅ completado
> Las reglas de salud que use cualquier mejora salen de `docs/FUENTES.md` (guía oficial con enlace).

---

## 🔲 P1 — Alto impacto / Bajo esfuerzo

### En curso — Modos de entreno «En casa» y «Gimnasio» (diseño acordado el 6-oct-2026)
> Lo han diseñado las dos sesiones de Claude (una implementa; la otra orquesta y audita) con las decisiones que Nando delegó. Orden: tarea 1 ✅ (datos y migración, subida) → tarea 2 (2a-1 ✅ perfil y migración; 2a-2 ✅ píldoras y acordeones de Entreno, en local; 2b puerta de seguridad pendiente) → tarea 3 (traer «En casa» de la etiqueta `calistenia-en-casa`). **2 y 3 se suben JUNTAS en un solo push**; el cardio va después, como tarea aparte.

- **Datos:** `profile.modes` = lista con `home` y/o `gym` (se lee con `modosActivos()`; se escribirá con `guardarModos(lista)`, único escritor). Perfil antiguo → `['gym']` solo; perfil nuevo → `[]` hasta que elija. El plan editado irá en `gymPlan` como DIFERENCIAS sobre `gym.json`, por id estable de ejercicio (series 1-10, reps 1-100, descanso global 10-600 s); el editor solo toca números, nunca nombres.
- **Elegir:** paso obligatorio «¿Dónde vas a entrenar?» (casillas Gimnasio / En casa, varias) dentro del paso «Ejercicio», con error persistente (`role="alert"`) y foco a la primera casilla. Las preguntas de nivel, molestias, zonas y minutos solo si marca «En casa» (hoy no las lee nadie); nunca se ocultan edad, sexo, embarazo, condiciones, PAR-Q ni días por semana.
- **Entreno:** fila «Mis modos» con píldoras (`button` con `aria-pressed` y ✓); la última activa no se desmarca (`aria-disabled` y «Tiene que quedar al menos un modo activo»). Con los dos modos, `<details>` apilados (abierto el primero activo, sin recordar el último); con uno, sin acordeón. `modes` vacío → «Elige dónde entrenas»; sin perfil → «Crea tu perfil para elegir dónde entrenas» con botón al cuestionario «Soy nuevo» (cancelar ese cuestionario no guarda perfil). Los avisos de salud (`avisosEntreno`) se ven SIEMPRE.
- **Puerta del plan de gimnasio (E14, «criterio de la app»; cita E4, E5 y E12):** con edad < 18, embarazo o algún «sí» del PAR-Q no se ofrece el plan de 5 días; se ofrece apuntar sesiones a mano y este texto (sin «matrona» para menores; con el aviso E5 si hay embarazo): «Por lo que has contestado, no te propongo un plan de gimnasio ya hecho. Antes de elegir ejercicios, coméntalo con tu médico, matrona o entrenador. Puedes apuntar aquí las sesiones que hagas tú.» 50+ sin otro factor: solo el aviso suave de hoy (E3). Descargo junto al plan: «Plan de partida de una entrenadora, no una prescripción. Ajústalo a tu caso; si tienes dudas o dolor, consúltalo con tu médico o entrenador.» En el editor: «Lo que cambies es cosa tuya.»
- **Cardio (después de 2+3):** un solo bloque opcional con «+ Añadir otro cardio» (hasta 4: minutos, km y nota); `sessions[].cardio` pasa a lista; el formato viejo `{start,end}` se acepta SIEMPRE al cargar e importar; se deja de mostrar la pista «plan: 10/20 min» sin borrar `cardio_start`/`cardio_end` de `gym.json`.
- **Cómo se comprueba cada tarea:** pruebas nuevas que fallen con el código viejo; el perfil de Nando (inventado equivalente: gym, 42 años, sin PAR-Q «sí») sigue viendo su plan igual; menor, embarazo y PAR-Q «sí» no ven el plan automático; estados vacíos; audit con el informe leído; navegador con datos inventados y comparación antes/después.
- **Estado (6-oct):** tarea 1 ✅ subida. Tarea 2 en local: **2a-1 hecha** (paso «¿Dónde vas a entrenar?» obligatorio y preguntas de «En casa» condicionadas); faltan 2a-2 (píldoras «Mis modos», acordeones y estados vacíos) y 2b (puerta de seguridad, descargo, E14, ids en `gym.json` y sesión libre sin plan). Nada de esto se sube hasta tener también la tarea 3.
- **Mientras tanto:** E3, E5 y E12 (nivel 1, sin saltos, sin tumbarse en embarazo) solo AVISAN en modo gimnasio; recuperan su efecto sobre los ejercicios con «En casa» (tarea 3).

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

- **Privacidad visible para otras personas** (6-oct-2026, sugerencia; no se hace) — nota visible «Todo se guarda solo en este navegador. No se envía nada. Si borras los datos del navegador, se pierde.» y, al EXPORTAR, el aviso «El archivo .json contiene tu salud sin cifrar: guárdalo donde solo lo veas tú».
- **Suavizar frases de `analisis.js`** antes de abrir la app a otras personas (6-oct-2026, sugerencia de un asesor automático, no es abogado; no se hace) — líneas ~36-54, 84, 114 y 141.
- **Fallos de accesibilidad que ya existían** (6-oct-2026, vistos por la revisión de UX; no se arreglan de paso) — botones de día sin `aria-pressed`, diálogo del perfil sin trampa de foco ni Escape, errores solo por aviso temporal y «N de 6» sin leer.
- **Pregunta para Nando, que no decide nadie más** (6-oct-2026) — el plan de 5 días de su entrenadora (`src/data/gym.json`) está en un repositorio PÚBLICO cuyo README declara **MIT** («úsalo, modifícalo, compártelo», línea 110), pero **no hay archivo `LICENSE` propio** (solo las de las librerías de `src/vendor/`). Consecuencia: el plan de la entrenadora está ofrecido a todo el mundo como MIT. ¿Tiene ella el visto bueno para publicarlo, se mueve a un archivo local de cada persona, o se añade el `LICENSE`? (No se ha tocado el README ni se ha creado el archivo: decide Nando.)
- **Modo gimnasio y modo casa** (6-oct-2026, Nando; **ahora en curso: ver P1**) — hoy solo lo usa Nando, así que la app solo tiene el modo gimnasio (apuntar sesiones de su plan de 5 días en `data/gym.json`). Quien empiece de cero necesita el entreno guiado según su perfil (calentamiento, bloques 1/2/3, calma y el catálogo de 59 ejercicios), que se quitó el 6-oct y está entero en la etiqueta de git `calistenia-en-casa`. Idea: en «Mi perfil» elegir entre **En casa** (guiado como antes, por defecto) y **Gimnasio** (apuntar sesiones; hoy el único plan es el de Nando, que cada persona meta el suyo sería otro paso). Mientras tanto, las preguntas del cuestionario (nivel, molestias, zonas, minutos) no se usan, pero **no se quitan**: las necesitaría el modo casa. Dietas, nutrición y Meds no se tocaron
- **Tus vídeos de cada ejercicio dentro de la app** (6-oct-2026, idea de Nando: la app del gimnasio deja descargarlos) — botón «añadir vídeo» por ejercicio que guarda el archivo en el aparato (IndexedDB), nunca en el repo (es público y los vídeos son del gimnasio). Son cortos (10–20 s, ~1–5 MB cada uno, ~100–200 MB en total para ~40 ejercicios): caben. Límites: el navegador puede borrarlos si falta espacio y no entran en Exportar/copias. Alternativa más ligera: guardar solo el enlace por ejercicio (ya está como «Vídeos elegidos y revisados por ejercicio» en P2)
- **Cardio con cronómetro y GPS dentro de la app** (6-oct-2026, idea de Nando; de momento a mano) — «Iniciar» y que cuente minutos y km con la geolocalización del navegador (~100 líneas + pruebas). Límites: solo con la página abierta y la pantalla encendida (en iPhone peor), gasta batería, y sin GPS en la cinta. Guardar solo minutos y km, nunca el recorrido. Conectar con Google Fit: descartado (su API se retira; Health Connect no se lee desde una web)
- **Varios perfiles en el mismo aparato** (29-sep-2026, decidido no hacerlo por ahora: YAGNI) — cada uno usa su móvil. Para un PC compartido ya sirven los **perfiles del navegador** (Brave/Chrome: cada uno su cajón, sin programar nada). Si algún día hace falta: prefijo por perfil en las claves + pasar los datos actuales al primero; inicial en un círculo de color, sin fotos.

---

## ✅ Completado

**6-oct-2026**
- [x] Modos de entreno (paso 1 de 4): `profile.modes` (`home` y/o `gym`) con `modosActivos()` como único sitio donde se leen; un perfil de antes pasa solo a `['gym']` (no cambia nada de lo que ve) y uno nuevo nace con `[]`; `limpiarCopia` descarta lo que no sea `home` o `gym`. Sin pantallas nuevas. Siguen: píldoras en Entreno y en «Mi perfil», editor del plan y traer la calistenia desde la etiqueta
- [x] Sesión del gimnasio (`gym.js`, `data/gym.json`): plan de 5 días en rotación, ejercicios hechos y cardio opcional al empezar y al acabar; «Mi semana» con mínimo 3 e ideal 5. Las sesiones guardan `day` y `cardio`, y `copia.js` ya no los pierde al importar
- [x] «Registrar medidas» con un solo botón «Guardar medidas» (antes, cuatro botones con el nombre de la medida, que no se entendían): se comprueba todo antes de guardar nada. Unidad en una pastilla con el color de esa medida en las gráficas (peso azul, cintura naranja, barriga púrpura)
- [x] Historial de peso con el mismo diseño que el de cintura y barriga (fecha arriba; debajo PESO y CAMBIO con su rótulo); antes se pegaba a la fecha y partía «95.8 kg» en dos líneas a 320 px. Las copias automáticas dicen «sesiones» en vez de «bloques»
- [x] Historial de cintura y barriga: ya no se pisan en el móvil (antes, con 2 medidas por fila, «cintura» y «barriga» se pegaban a la fecha y a 320 px se fundían entre sí). La fecha siempre arriba y debajo las dos medidas, con el rótulo encima de cada valor (decisión de Nando: se ve mejor que alineadas). Medido a 390, 360 y 320 px; el campo de fecha de las medidas y de la sesión ya no se corta en móviles estrechos
- [x] «Registrar medidas» con campo de fecha (hoy o anterior, nunca futura): se pueden apuntar pesos, cinturas y barrigas de otros días; antes solo guardaban con la fecha de hoy
- [x] Sesión del gimnasio con otro aspecto (tarjetas con su número, casilla redonda, reloj circular de descanso de 90 s con sonidos y vibración), fecha elegible para apuntar lo de ayer y minutos del cardio como los da la máquina (`10:38`)
- [x] Panel: título «Plan de N semanas» con las del plan, 5 casillas de entreno y las medidas junto a «Semana N». «Mi perfil» → «Tu plan» cambia la fecha de inicio y la duración (antes solo se podían poner al crear el perfil)
- [x] Fuera el entreno guiado de calistenia (bloques, calentamiento, calma, temporizador viejo y catálogo de 59 ejercicios) y el código que solo servía para eso; queda guardado con la etiqueta de git `calistenia-en-casa`
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
- [x] «Mi semana»: 3 bloques por semana con aviso de color, racha de semanas cumplidas (la tarjeta «Racha» se quitó el 6-oct-2026; los logros siguen contando semanas cumplidas), historial
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
