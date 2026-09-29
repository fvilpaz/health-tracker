# Plan de Mejoras — Health Tracker

> Priorizado por impacto vs esfuerzo. Estado: 🔲 pendiente · ✅ completado

---

## 🔲 P0 — Crítico / Inmediato

- [ ] **Verificar todo en local** — Probar todas las secciones, setup, reset, temporizador
- [ ] **Verificar GitHub Pages** — https://fvilpaz.github.io/health-tracker/ despliega correctamente

---

## 🔲 P1 — Alto impacto / Bajo esfuerzo

- [ ] **Mini hábitos diarios** — Checkboxes diarios: 💧 2L agua · 🚶 6k pasos · 🥗 verduras · 💪 entreno · 😴 7h sueño
- [ ] **Gráfica de cintura en Progreso** — Igual que la de peso, con Chart.js y línea objetivo
- [ ] **Sonido al cambiar ejercicio** — Beep suave cuando termina un ejercicio (Web Audio API, sin archivos externos)
- [ ] **Mejorar el tracker semanal** — Scroll horizontal en móvil, mejor legibilidad

---

## 🔲 P2 — Medio impacto / Medio esfuerzo

- [ ] **Historial de cintura en Progreso** — Tabla con entradas de cintura igual que peso
- [ ] **Fotos de progreso** — Opcional: guardar foto semanal (localStorage con base64, comprimida)
- [ ] **Notas por semana** — Campo de texto libre en el tracker para anotar cómo te sientes
- [ ] **Recordatorio medicación** — Notificación del navegador para tomar Ebymect
- [ ] **Mejorar logros** — Más logros intermedios (3kg, 7kg, 10cm cintura, etc.)
- [ ] **Estadísticas** — Media semanal, mejor racha, tendencia (línea de regresión)
- [ ] **Sección "Mi salud"** — Info personalizada: medicación, hidratación, señales de alerta, consejos pre-entreno

---

## 🔲 P3 — Bajo impacto / Alto esfuerzo

- [ ] **Copia fuera del móvil a un toque (capa 2)** — si hace >7 días de la última, aviso al abrir: «Guarda tu copia semanal» → menú Compartir → Google Drive. ~30 líneas. (Capa 1, copias automáticas dentro de la app, HECHA 29-sep-2026)
- [ ] **Copia automática a Google Drive** — sin tocar nada: permiso con la cuenta de Google, alta en Google Cloud y abrir la CSP a Google. NUNCA a GitHub (repo público; una llave de GitHub en el móvil es un riesgo)
- [ ] **Sincronizar móvil y PC** — hoy cada aparato tiene sus datos (localStorage) y se pasan con Exportar/Importar. Opciones: un archivo en Drive que lean los dos, o servidor propio (Django + PostgreSQL). Con servidor: datos de salud = categoría especial del RGPD
- [ ] **Perfiles + cuestionario al crearlo** (29-sep-2026) — catálogo público (enfermedades, medicación, ejercicios con variantes) + perfil en el navegador (datos, enfermedades, medicación, nivel, molestias, días, comida). Meds, nutrición y entreno según el perfil. Menores de 18: sin metas de peso. Inicio: entras con tu perfil directo a la app (hoy «Cancelar» en la configuración no guarda nada y vuelve a salir cada vez); el cuestionario solo al CREAR perfil y al acabar el ciclo, aviso «¿empiezas otro plan?». Pasos: 1a cuestionario + «Mi perfil», un perfil por aparato (HECHO 29-sep-2026) → 2 Meds y 3 nutrición: fichas según el perfil (HECHO 29-sep-2026; falta escribir fichas para tensión, colesterol, tiroides, asma, corazón, embarazo…) → 4 entreno según el perfil (HECHO 29-sep-2026: rutina.js: con perfil, bloques del formulario; sin perfil, los de siempre; catálogo: src/data/exercises.json; se elige de la lista, no texto libre; +50 o principiante: nivel 1 sin saltos; vídeos elegidos y revisados, como enlace; hoy, búsqueda de YouTube)
- [ ] **Progresión del entreno** (29-sep-2026) — cuando vayas suelto, la app sube la dificultad: más segundos o repeticiones, menos descanso, o pasa al ejercicio «harder» del catálogo (y baja al «easier» si cuesta). Por ejemplo, tras X semanas cumplidas o si marcas «me ha resultado fácil» al acabar el bloque
- [ ] **Dosis y recordatorios de tomas** (29-sep-2026) — como la app Salud de Apple: por cada medicamento, dosis, forma (pastilla, inyección…) y cuándo; aviso a la hora de la toma
- [ ] **Gráfica de composición** — Peso + cintura + IMC superpuestos
- [ ] **Datos del reloj** — ver pasos, pulso, sueño… de Google Fit / Amazfit (Zepp) en la app. Ojo: Google Fit está cerrando su API (Health Connect en Android la sustituye) y desde una web no se lee Health Connect directamente: revisar opciones (Zepp → Google Fit/Strava, o app Android)
- [ ] **Plan de nutrición dinámico** — Generar menú semanal basado en preferencias
- [ ] **Timer mejorado** — Vibración, modo pantalla completa, countdown audible

---

## 💡 Aparcado

- **Varios perfiles en el mismo aparato** (29-sep-2026, decidido no hacerlo por ahora: YAGNI) — cada uno usa su móvil. Para un PC compartido ya sirven los **perfiles del navegador** (Brave/Chrome: cada uno su cajón, sin programar nada). Si algún día hace falta: prefijo por perfil en las claves + pasar los datos actuales al primero; inicial en un círculo de color, sin fotos.

---

## ✅ Completado

- [x] index.html con 7 secciones
- [x] CSS completo con dark mode por defecto
- [x] JavaScript: storage, timer, charts, workout, app
- [x] Bottom nav con 7 iconos
- [x] Dashboard con stats (peso, perdido, entrenos, IMC, cintura, WHtR, racha, logros)
- [x] Entrenamiento con 4 fases + temporizador SVG
- [x] Nutrición con esquema del plato e ideas
- [x] Medicación con señales de alerta
- [x] Progreso con gráfica Chart.js + historial editable
- [x] Calendario semanal con checkboxes
- [x] Suplementos (seguros, precaución, evitar)
- [x] Búsqueda de vídeos en YouTube por ejercicio (botón ▶)
- [x] Registro de cintura + ratio WHtR
- [x] Tracker semanal de 12 semanas con objetivos dinámicos
- [x] Setup inicial configurable (fecha, duración, peso, cintura)
- [x] Botón de reiniciar plan (borra todo y vuelve al setup)
- [x] Git init + repo público en GitHub
- [x] Workflow de GitHub Pages (deploy automático)
- [x] Fuerza en bloques 1 / 2 / 3, sin cardio (28-sep-2026)
- [x] Altura la pone el usuario; fuera los datos personales del código (28-sep-2026)
- [x] Exportar e importar copia JSON; importar solo análisis los añade sin borrar (28-sep-2026)
- [x] Pestaña 🎯 Metas: corto / medio / largo plazo calculadas con peso y altura (28-sep-2026)
- [x] Historial de análisis, formulario, resumen último vs anterior y PDF oficial adjunto (28-sep-2026)
- [x] Semáforo 🟢/🟠/🔴 en peso, cintura y cintura/altura (28-sep-2026)
- [x] Suplementos dentro de Meds (una pestaña menos) (28-sep-2026)
- [x] PWA: manifest, iconos y service worker; instalable y funciona sin conexión (28-sep-2026)

---

_Generado: 2026-08-08 · Actualizado: 2026-09-29_
