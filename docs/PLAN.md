# Plan de Mejoras — Health Tracker

> Priorizado por impacto vs esfuerzo. Estado: 🔲 pendiente · ✅ completado

---

## 🔲 P0 — Crítico / Inmediato

- [ ] **GitHub Pages funcionando** — El workflow está creado pero hay que verificar que despliegue correctamente
- [ ] **Verificar que todo funciona en local** — Probar todas las secciones, inputs, temporizador, navegación

---

## 🔲 P1 — Alto impacto / Bajo esfuerzo

- [ ] **Gráfica de cintura en Progreso** — Igual que la de peso, con Chart.js y línea objetivo
- [ ] **Exportar datos** — Botón para descargar JSON/CSV con todo el historial (peso, cintura, entrenos, plan)
- [ ] **Importar datos** — Poder restaurar desde backup JSON
- [ ] **Recordatorio semanal** — Notificación del navegador cada lunes para registrar medidas
- [ ] **Mejorar el tracker semanal** — Scroll horizontal en móvil, mejor legibilidad

---

## 🔲 P2 — Medio impacto / Medio esfuerzo

- [ ] **PWA (Progressive Web App)** — Manifest + service worker para instalar como app en el móvil
- [ ] **Historial de cintura en Progreso** — Tabla con entradas de cintura igual que peso
- [ ] **Fotos de progreso** — Opcional: guardar foto semanal (localStorage con base64, comprimida)
- [ ] **Notas por semana** — Campo de texto libre en el tracker para anotar cómo te sientes
- [ ] **Mejorar logros** — Más logros intermedios (3kg, 7kg, 10cm cintura, etc.)
- [ ] **Estadísticas** — Media semanal, mejor racha, tendencia (línea de regresión)

---

## 🔲 P3 — Bajo impacto / Alto esfuerzo

- [ ] **Backend con sync** — Firebase/Supabase para no perder datos si borras localStorage
- [ ] **Multi-usuario** — Perfiles para que más gente pueda usar la app
- [ ] **Gráfica de composición** — Peso + cintura + IMC superpuestos
- [ ] **Integración con wearables** — Leer pasos de Google Fit / Apple Health
- [ ] **Plan de nutrición dinámico** — Generar menú semanal basado en preferencias
- [ ] **Timer mejorado** — Sonido al final, vibración, modo pantalla completa

---

## ✅ Completado

- [x] index.html con 7 secciones
- [x] CSS completo con dark mode por defecto
- [x] JavaScript: storage, timer, charts, workout, app
- [x] Bottom nav con 7 iconos
- [x] Dashboard con stats (peso, perdido, entrenos, IMC, racha, logros)
- [x] Entrenamiento con 4 fases + temporizador SVG
- [x] Nutrición con esquema del plato e ideas
- [x] Medicación con señales de alerta
- [x] Progreso con gráfica Chart.js + historial
- [x] Calendario semanal con checkboxes
- [x] Suplementos (seguros, precaución, evitar)
- [x] Búsqueda de vídeos en YouTube por ejercicio
- [x] Registro de cintura + ratio WHtR
- [x] Tracker semanal de 12 semanas con objetivos
- [x] Git init + repo público en GitHub
- [x] Workflow de GitHub Pages

---

_Generado: 2026-08-08_
