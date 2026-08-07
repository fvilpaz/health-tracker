# Sesión en curso — Health Tracker

## Estado: EN PROGRESO

---

## Qué es este proyecto

App web personal de salud para Fernando (Nando):
- Diabetes tipo 2 · hígado graso · síndrome de Gilbert
- Medicación: Ebymect (dapagliflozina 5mg + metformina 850mg)
- Objetivo: bajar de ~97 kg a 90 kg
- Rutina de ejercicio: 20 minutos, 3-4 días/semana
- Repo: público en GitHub como `health-tracker` bajo usuario `fvilpaz`

---

## Lo que ya está creado (archivos en disco)

```
health-tracker/
├── css/styles.css          ✅ COMPLETO — diseño completo, dark mode, responsive
├── js/storage.js           ✅ COMPLETO — wrapper localStorage
├── js/timer.js             ✅ COMPLETO — temporizador con callbacks
├── js/charts.js            ✅ COMPLETO — Chart.js para gráfica de peso
├── js/workout.js           ✅ COMPLETO — lógica fases de entrenamiento
├── js/app.js               ✅ COMPLETO — lógica principal, nav, dashboard, logros
└── data/workouts.json      ✅ COMPLETO — datos de ejercicios (warmup/strength/cardio/cooldown)
```

## Lo que FALTA crear

- `git init` + primer commit
- Crear repo público en GitHub (`gh repo create health-tracker --public`)
- Push

---

## Estructura del index.html (7 secciones / pestañas)

1. **Dashboard** — peso actual, perdido, entrenos semana, IMC, barra 12 semanas, racha, logros
2. **Entrenamiento** — fases (calent/fuerza/cardio/calma), lista de ejercicios, temporizador con círculo SVG
3. **Nutrición** — esquema de plato, ideas de comidas (desayuno/comida/cena/merienda), alimentos OK/limitar
4. **Medicación** — Ebymect, Gilbert, hígado graso, señales de alerta
5. **Progreso** — gráfica Chart.js peso + historial con eliminación
6. **Calendario** — checkboxes semana (Lun-Dom) con actividad por día
7. **Suplementos** — sección personalizada para su situación médica (ver abajo)

Bottom nav fija con 7 iconos.

---

## Sección de Suplementos — análisis médico ya hecho

**✅ Seguros:**
- Creatina monohidrato (3-5g/día) — beneficia hígado graso, OK con metformina si bebe agua
- Omega-3 EPA+DHA (1-2g/día) — antiinflamatorio, mejora NAFLD
- Vitamina D3 (1000-2000 UI/día) — déficit común en síndrome metabólico
- Magnesio glicinato/malato (200-400mg/noche) — mejora insulinorresistencia

**⚠️ Con precaución:**
- Whey protein — OK moderado, no sobrecargar riñón
- Vitamina B12 — metformina puede bajar absorción, pedir analítica primero

**❌ Evitar:**
- Pre-workouts con cafeína alta — deshidratación con dapagliflozina
- Termogénicos / quemadores — incompatibles con diabetes y Ebymect
- Suplementos con azúcar/maltodextrina

---

## Para cuando retomemos

1. Verificar que todo funciona en local → http://localhost:8765
2. `git init` + primer commit
3. Crear repo público en GitHub (`gh repo create health-tracker --public`)
4. Push

---

## Stack

- HTML5 · CSS3 · JavaScript ES6
- Chart.js 4.4 (CDN)
- Sin servidor, sin backend — todo localStorage
- Responsive + dark mode

---

_Guardado: 2026-08-08_
