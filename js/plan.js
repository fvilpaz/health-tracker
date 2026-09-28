/* Plan de 12 semanas: objetivo de peso y cintura de cada semana, lo real (sale de Progreso) y las casillas
   de bloques hechos (salen de Mi semana). Se movió tal cual desde app.js (28-sep-2026). */

/* ===== PLAN TABLE ===== */
function renderPlanTable() {
  const container = document.getElementById('planTable');
  if (!container) return;

  const settings = Storage.get('settings', {});
  const weights = Storage.get('weights', []);
  const waists = Storage.get('waists', []);

  // Objetivos a partir de TUS datos (antes había 97 kg, 105 cm y 90 kg escritos a fuego como respaldo)
  const startWeight = weights.length ? weights[0].weight : null;
  const goalWeight = settings.goalWeight || (startWeight && startWeight - 7);
  const startWaist = waists.length ? waists[0].waist : null;
  const goalWaist = startWaist && Math.max(60, startWaist - 9);
  const totalWeeks = settings.totalWeeks || 12;

  const startDate = Storage.get('startDate', null);
  if (!startDate) { container.innerHTML = '<div class="empty-state">Registra tu peso para activar el plan</div>'; return; }

  const start = new Date(startDate);
  start.setHours(0,0,0,0);
  // Al lunes de esa semana (también si empezó en domingo)
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);

  const now = new Date();
  const currentWeekNum = Math.min(totalWeeks, Math.max(1, Math.floor((now - start) / (7 * 24 * 3600 * 1000)) + 1));

  let html = '<div class="plan-cards">';

  for (let w = 1; w <= totalWeeks; w++) {
    const weekDate = new Date(start);
    weekDate.setDate(start.getDate() + (w - 1) * 7);
    const dateLabel = weekDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

    const targetWeight = startWeight ? startWeight - ((startWeight - goalWeight) / totalWeeks) * w : null;
    const targetWaist = startWaist ? startWaist - ((startWaist - goalWaist) / totalWeeks) * w : null;

    // Lo real de la semana sale de lo que registras en Progreso (una sola fuente): la última medida de esa semana
    const realWeight = ultimaDeSemana(weights, 'weight', weekDate);
    const realWaist = ultimaDeSemana(waists, 'waist', weekDate);
    const hechos = sessionsInWeek(weekDate).length;   // las casillas salen solas de los bloques hechos esa semana
    const checks = [0, 1, 2].map(i => i < hechos);
    const isCurrent = w === currentWeekNum;
    const isPast = w < currentWeekNum;

    const cardClass = isCurrent ? 'plan-card current' : (isPast ? 'plan-card past' : 'plan-card');

    html += `<div class="${cardClass}" data-week="${w}">`;

    // Título: Semana N · fecha
    html += `<div class="plan-week-header">`;
    html += `<span class="plan-week-label">Semana ${w}</span>`;
    html += `<span class="plan-date">${dateLabel}</span>`;
    html += `</div>`;

    // Fila: LMV izquierda | inputs derecha
    html += `<div class="plan-row-bottom">`;
    html += `<div class="plan-checks">`;
    [1, 2, 3].forEach((num, i) => {
      html += `<span class="plan-check ${checks[i] ? 'checked' : ''}">${checks[i] ? '✓' : num}</span>`;
    });
    html += `</div>`;
    html += `<div class="plan-inputs">`;
    html += planValor(targetWeight, realWeight, 'kg');
    html += planValor(targetWaist, realWaist, 'cm');
    html += `</div>`;
    html += `</div>`;

    html += `</div>`;
  }

  html += '</div>';
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

// Objetivo arriba y lo real debajo (verde si llegas al objetivo de esa semana)
function planValor(objetivo, real, unidad) {
  const cumple = real != null && objetivo != null && real <= objetivo;
  return `<div class="plan-input-group"><span class="plan-target"><span>${objetivo != null ? objetivo.toFixed(1) : '—'}</span> ${unidad}</span>` +
    `<span class="plan-real${real != null ? ' con-dato' : ''}${cumple ? ' cumple' : ''}">${real != null ? esc(real) : '—'}</span></div>`;
}

