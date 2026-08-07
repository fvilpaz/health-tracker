# Health Tracker 🏃‍♂️

App web personal de salud y seguimiento de progreso. Sin servidor, sin backend, sin registro — todo funciona en tu navegador con `localStorage`.

**👉 [Abrir app](https://fvilpaz.github.io/health-tracker/)**

---

## Qué hace

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Peso actual, perdido, IMC, cintura, ratio WHtR, racha, logros |
| **Entrenamiento** | 4 fases (calentamiento → fuerza → cardio → calma) con temporizador SVG |
| **Nutrición** | Esquema del plato, ideas de comidas, alimentos OK y a evitar |
| **Medicación** | Info de Ebymect, hígado graso, Gilbert, señales de alerta |
| **Progreso** | Gráfica de peso con línea objetivo + historial editable |
| **Calendario** | Plan semanal con checkboxes de actividad |
| **Suplementos** | Seguros, con precaución y a evitar (contexto: diabetes + NAFLD) |

## Plan de 12 semanas

Tracker semanal integrado con:
- **Objetivos realistas**: peso (97→90 kg) y cintura (105→96 cm)
- **Campos para valores reales** por semana
- **Checkboxes de entrenos** (Lun/Mié/Vie)
- **Sincronización automática** con el historial de peso y cintura

## Características técnicas

- **Stack**: HTML5 · CSS3 · JavaScript ES6 · Chart.js 4
- **Sin dependencias de build** — archivos estáticos puros
- **Dark mode** por defecto, responsive (mobile-first)
- **localStorage** — tus datos no salen de tu navegador
- **GitHub Pages** — deploy automático en cada push
- **Botón ▶ en ejercicios** — busca vídeos en YouTube al instante

## Estructura

```
health-tracker/
├── index.html              ← App principal (7 secciones)
├── css/styles.css          ← Estilos completos (dark mode, responsive)
├── js/
│   ├── app.js              ← Lógica principal, dashboard, navegación
│   ├── storage.js          ← Wrapper de localStorage
│   ├── timer.js            ← Temporizador con círculo SVG
│   ├── charts.js           ← Gráfica Chart.js para peso
│   └── workout.js          ← Fases de entrenamiento y timer
├── data/workouts.json      ← Datos de ejercicios por fase
├── docs/
│   ├── PLAN.md             ← Plan de mejoras priorizado
│   └── SESION.md           ← Notas internas (no público)
└── .github/workflows/
    └── pages.yml           ← Deploy automático a GitHub Pages
```

## Privacidad

Todos los datos se guardan en `localStorage` de tu navegador. No se envía nada a ningún servidor. Si borras los datos del navegador, se pierden — exporta tu historial regularmente desde la sección Progreso (próximamente).

## Licencia

MIT — úsalo, modifícalo, compártelo.

---

_Hecho con ❤️ para mi salud · 2026_
