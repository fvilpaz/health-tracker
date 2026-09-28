# Health Tracker 🏃‍♂️

App web personal de salud y seguimiento de progreso. Sin servidor, sin backend, sin registro — todo funciona en tu navegador con `localStorage`.

**👉 [Abrir app](https://fvilpaz.github.io/health-tracker/)**

---

## Qué hace

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Peso actual, perdido, IMC, cintura, ratio cintura/altura, racha, logros. Peso, cintura y ratio cambian de color (🟢/🟠/🔴) según el IMC y la cintura/altura |
| **🎯 Metas** | Metas a corto, medio y largo plazo (IMC 30, peso objetivo, IMC 27) con lo que falta; historial de análisis con PDF oficial adjunto y resumen del último frente al anterior |
| **Entrenamiento** | Calentamiento → fuerza → calma, con temporizador SVG. La fuerza va en **bloques 1 / 2 / 3** (sin cardio) |
| **Nutrición** | Esquema del plato, ideas de comidas, alimentos OK y a evitar |
| **Meds** | Ebymect, hígado graso, Gilbert, señales de alerta y suplementos (seguros, con precaución y a evitar) |
| **Progreso** | Registro de peso, cintura y altura; gráfica de peso; historial editable; exportar e importar copia |
| **Calendario** | Plan semanal con checkboxes de actividad |

## Plan de 12 semanas

Tracker semanal integrado con:
- **Objetivos a partir de tus datos**: peso inicial − 7 kg y cintura inicial − 9 cm (nada escrito en el código)
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
- **PWA instalable** — en Chrome del móvil: menú ⋮ → *Instalar aplicación*. Funciona sin conexión y las actualizaciones llegan solas

## Estructura

```
health-tracker/
├── index.html              ← App principal (7 pestañas)
├── manifest.webmanifest    ← Nombre, colores e iconos para instalarla como app
├── sw.js                   ← Service worker: red primero, sin conexión usa la última copia
├── icons/                  ← Iconos 192/512, maskable y de iOS
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

Todos los datos se guardan en `localStorage` de tu navegador; los PDF de los análisis, en IndexedDB. No se envía nada a ningún servidor y el repositorio no contiene datos de nadie. Si borras los datos del navegador, se pierden: exporta una copia de vez en cuando desde **Progreso → 💾 Tus datos** (los PDF no van en la copia).

**Varios aparatos:** cada navegador tiene sus propios datos. Exporta en uno e importa en el otro. Un archivo que solo trae análisis se **añade** sin borrar lo demás.

## Licencia

MIT — úsalo, modifícalo, compártelo.

---

_Hecho con ❤️ para mi salud · 2026_
