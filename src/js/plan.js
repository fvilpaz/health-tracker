/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (catálogos, campos) o ya validadas; nunca texto de fuera sin comprobar (revisado 28-sep-2026) */
/* Plan de 12 semanas: objetivo de peso y cintura de cada semana, lo real (sale de Progreso) y las casillas
   de bloques hechos (salen de Mi semana). Se movió tal cual desde app.js (28-sep-2026). */

/* ===== PLAN TABLE ===== */
// Número de la semana del plan (1, 2, …) en la que cae «ref». La 1 es la semana (lunes a domingo) del día de inicio.
// Se cuentan días de calendario, no milisegundos: con el cambio de hora de primavera la semana tiene una hora menos
// y el lunes de madrugada salía todavía la semana anterior. La usan la tabla y la barra del panel (antes cada una
// contaba a su manera y decían semanas distintas).
function semanaDelPlan(inicio, ref = new Date()) {
  const dia = f => Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()) / 86400000;
  return Math.floor((dia(getWeekStart(ref)) - dia(getWeekStart(inicio))) / 7) + 1;
}

// Medidas de este plan: desde la última tomada el día de inicio o antes (el punto de partida) en adelante.
// Al empezar otro plan, el de partida es el peso de entonces, no el primero que se apuntó en la app.
function medidasDelPlan(lista) {
  const inicio = Storage.get('settings', {}).startDate;
  if (!inicio) return lista;
  let desde = -1;
  lista.forEach((m, i) => { if (esAIso(m.date) <= inicio) desde = i; });
  return desde >= 0 ? lista.slice(desde) : lista;
}

// ¿Ya pasaron todas las semanas del plan?
function planTerminado(hoy = new Date()) {
  const inicio = Storage.get('settings', {}).startDate;
  if (!inicio) return false;
  return semanaDelPlan(new Date(inicio + 'T00:00:00'), hoy) > (Storage.get('settings', {}).totalWeeks || 12);
}

// Empezar otro plan sin borrar nada: empieza hoy, mismas semanas, objetivo desde el peso de ahora (misma regla)
function nuevoCiclo(hoy = new Date()) {
  const s = { ...Storage.get('settings', {}) }, pesos = Storage.get('weights', []);
  s.startDate = isoDate(hoy);
  const actual = pesos.length ? pesos[pesos.length - 1].weight : null;
  const perfil = Storage.get('profile');
  const objetivo = actual && s.height ? objetivoInicial(actual, s.height, { menor: esMenor(hoy), objetivo: perfil?.goal }) : null;
  if (objetivo == null) delete s.goalWeight; else s.goalWeight = objetivo;
  Storage.set('settings', s);
  Storage.set('startDate', new Date(s.startDate + 'T00:00:00').toISOString());
}

document.getElementById('nuevoPlanBtn')?.addEventListener('click', () => {
  nuevoCiclo();
  updateDashboard();
  showToast('Plan nuevo empezado ✓');
});

function renderPlanTable() {
  const container = document.getElementById('planTable');
  if (!container) return;

  const settings = Storage.get('settings', {});
  const weights = Storage.get('weights', []);
  const waists = Storage.get('waists', []);
  const bellies = Storage.get('bellies', []);

  // Objetivos a partir de TUS datos (antes había 97 kg, 105 cm y 90 kg escritos a fuego como respaldo)
  const delPlan = medidasDelPlan(weights), cinturasDelPlan = medidasDelPlan(waists);
  const startWeight = delPlan.length ? delPlan[0].weight : null;
  // Sin objetivo (peso sano al empezar, «mantenerme» o menor de 18) no hay objetivos que marcar, ni de cintura
  const goalWeight = objetivoPeso();
  const startWaist = cinturasDelPlan.length ? cinturasDelPlan[0].waist : null;
  const goalWaist = goalWeight && startWaist && Math.max(60, startWaist - 9);
  const barrigasDelPlan = medidasDelPlan(bellies);
  const startBelly = barrigasDelPlan.length ? barrigasDelPlan[0].belly : null;
  const totalWeeks = settings.totalWeeks || 12;

  const startDate = Storage.get('startDate', null);
  if (!startDate) { container.innerHTML = '<div class="empty-state">Registra tu peso para activar el plan</div>'; return; }

  const start = new Date(startDate);
  start.setHours(0,0,0,0);
  // Al lunes de esa semana (también si empezó en domingo)
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);

  const currentWeekNum = Math.min(totalWeeks, Math.max(1, semanaDelPlan(start)));

  // Cada semana lleva sus propias etiquetas: «ENTRENOS» justo encima del 1 2 3 y «PESO», «CINTURA», «BARRIGA» encima
  // de su recuadro. Así nunca se descuadran (una leyenda aparte se descolgaba en el móvil al partirse la fila).
  let html = '<div class="plan-cards">';

  for (let w = 1; w <= totalWeeks; w++) {
    const weekDate = new Date(start);
    weekDate.setDate(start.getDate() + (w - 1) * 7);
    const dateLabel = weekDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

    const targetWeight = objetivoDeLaSemana(startWeight, goalWeight, totalWeeks, w);
    const targetWaist = objetivoDeLaSemana(startWaist, goalWaist, totalWeeks, w);

    // Lo real de la semana sale de lo que registras en Progreso (una sola fuente): la última medida de esa semana
    const realWeight = ultimaDeSemana(weights, 'weight', weekDate);
    const realWaist = ultimaDeSemana(waists, 'waist', weekDate);
    const realBelly = ultimaDeSemana(bellies, 'belly', weekDate);
    const hechos = sessionsInWeek(weekDate).length;   // las casillas salen solas de los bloques hechos esa semana
    const checks = [0, 1, 2].map(i => i < hechos);
    const isCurrent = w === currentWeekNum;
    const isPast = w < currentWeekNum;

    const cardClass = isCurrent ? 'plan-card current' : (isPast ? 'plan-card past' : 'plan-card');

    html += `<div class="${cardClass}" data-week="${w}">`;

    // Arriba: Semana N · fecha, y las 3 casillas de entreno a la derecha
    html += `<div class="plan-week-header">`;
    html += `<span class="plan-week-label">Semana ${w}</span>`;
    html += `<span class="plan-date">${dateLabel}</span>`;
    html += `<div class="plan-checks-caja"><span class="plan-mini">ENTRENOS</span><div class="plan-checks">`;
    [1, 2, 3].forEach((num, i) => {
      html += `<span class="plan-check ${checks[i] ? 'checked' : ''}">${checks[i] ? '✓' : num}</span>`;
    });
    html += `</div></div>`;
    html += `</div>`;

    // Abajo: peso, cintura y barriga, cada una en un tercio
    html += `<div class="plan-row-bottom">`;
    html += `<div class="plan-inputs">`;
    html += planValor(targetWeight, realWeight, 'kg', 'PESO');
    html += planValor(targetWaist, realWaist, 'cm', 'CINTURA');
    // Barriga: sin meta (no hay regla con fuente); solo la semana 1 enseña su valor de partida
    html += planValor(objetivoDeLaSemana(startBelly, null, totalWeeks, w), realBelly, 'cm', 'BARRIGA');
    html += `</div>`;
    html += `</div>`;

    html += `</div>`;
  }

  html += '</div>';
  // eslint-disable-next-line no-unsanitized/property -- objetivos y fechas calculados; lo real con esc() en planValor
  container.innerHTML = html;
}

// Última medida (peso o cintura) registrada en la semana que empieza el lunes «lunes». Las fechas van «d/m/aaaa».
function ultimaDeSemana(lista, campo, lunes) {
  const desde = isoDate(lunes), fin = new Date(lunes);
  fin.setDate(lunes.getDate() + 6);
  const hasta = isoDate(fin);
  const enSemana = lista.filter(e => {
    const [d, m, y] = String(e.date).split('/');
    const f = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return f >= desde && f <= hasta;
  });
  return enSemana.length ? enSemana[enSemana.length - 1][campo] : null;
}

// Objetivo de la semana «w»: la 1 es el mismo valor con el que empiezas (tal cual, también sin meta) y se baja por
// igual hasta la meta, que se alcanza justo en la última semana. Antes la semana 1 ya pedía haber bajado.
function objetivoDeLaSemana(inicio, meta, semanas, w) {
  if (inicio == null) return null;
  if (w <= 1) return inicio;
  if (meta == null) return null;
  return inicio - ((inicio - meta) / Math.max(1, semanas - 1)) * (w - 1);
}

// Nombre (PESO…), objetivo y lo real debajo (verde si llegas al objetivo de esa semana)
function planValor(objetivo, real, unidad, nombre) {
  const cumple = real != null && objetivo != null && real <= objetivo;
  return `<div class="plan-input-group">${nombre ? `<span class="plan-mini">${nombre}</span>` : ''}<span class="plan-target"><span>${objetivo != null ? objetivo.toFixed(1) : '—'}</span> ${unidad}</span>` +
    `<span class="plan-real${real != null ? ' con-dato' : ''}${cumple ? ' cumple' : ''}">${real != null ? esc(real) : '—'}</span></div>`;
}

