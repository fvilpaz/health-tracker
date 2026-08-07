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
- [ ] **Exportar datos** — Botón para descargar JSON con todo el historial (peso, cintura, entrenos, plan, hábitos)
- [ ] **Importar datos** — Poder restaurar desde backup JSON
- [ ] **Objetivos escalonados** — Metas intermedias (95→90→85→80 kg) con logros por cada una
- [ ] **Sonido al cambiar ejercicio** — Beep suave cuando termina un ejercicio (Web Audio API, sin archivos externos)
- [ ] **Mejorar el tracker semanal** — Scroll horizontal en móvil, mejor legibilidad

---

## 🔲 P2 — Medio impacto / Medio esfuerzo

- [ ] **PWA (Progressive Web App)** — Manifest + service worker para instalar como app en el móvil
- [ ] **Historial de cintura en Progreso** — Tabla con entradas de cintura igual que peso
- [ ] **Fotos de progreso** — Opcional: guardar foto semanal (localStorage con base64, comprimida)
- [ ] **Notas por semana** — Campo de texto libre en el tracker para anotar cómo te sientes
- [ ] **Recordatorio medicación** — Notificación del navegador para tomar Ebymect
- [ ] **Mejorar logros** — Más logros intermedios (3kg, 7kg, 10cm cintura, etc.)
- [ ] **Estadísticas** — Media semanal, mejor racha, tendencia (línea de regresión)
- [ ] **Sección "Mi salud"** — Info personalizada: medicación, hidratación, señales de alerta, consejos pre-entreno

---

## 🔲 P3 — Bajo impacto / Alto esfuerzo

- [ ] **Backend con sync** — Firebase/Supabase para no perder datos si borras localStorage
- [ ] **Multi-usuario** — Perfiles para que más gente pueda usar la app
- [ ] **Gráfica de composición** — Peso + cintura + IMC superpuestos
- [ ] **Integración con wearables** — Leer pasos de Google Fit / Apple Health
- [ ] **Plan de nutrición dinámico** — Generar menú semanal basado en preferencias
- [ ] **Timer mejorado** — Vibración, modo pantalla completa, countdown audible

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

---

_Generado: 2026-08-08 · Actualizado: 2026-08-08_
