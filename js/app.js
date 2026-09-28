/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadWorkoutData();
  currentBlock = nextBlock();   // el Entreno abre con el bloque que toca
  renderWorkoutPhase('warmup');

  if (!Storage.get('settings')) {
    showSetup();
  } else {
    initApp();
  }
});

function initApp() {
  initNav();
  updateDashboard();
  renderPlanTable();
  renderWeightLog();
  checkLogros();

  const newPlanBtn = document.getElementById('newPlanBtn');
  if (newPlanBtn) {
    newPlanBtn.addEventListener('click', () => {
      if (!confirm('¿Finalizar este plan y empezar uno nuevo?\n\nSe borrarán todos los datos (peso, cintura, entrenos, logros).\n\nSi quieres conservarlos, cancela y usa antes «Exportar» en Progreso.')) return;
      const keys = ['settings', 'weights', 'waists', 'startDate', 'trainings', 'sessions', 'streak', 'logros', 'plan'];
      keys.forEach(k => Storage.remove(k));
      location.reload();
    });
  }
}

function showSetup() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const overlay = document.createElement('div');
  overlay.id = 'setupOverlay';
  overlay.innerHTML = `
    <div class="setup-card">
      <button class="setup-close" id="setupCloseBtn" aria-label="Cerrar">${ICONO.cerrar}</button>
      <div class="setup-icon">${duo('correr', 'setup-duo')}</div>
      <h2 class="setup-title">Health Tracker</h2>
      <p class="setup-subtitle">Configura tu plan</p>

      <div class="setup-field">
        <label>¿Cuándo empiezas?</label>
        <input type="date" id="setupDate" value="${dateStr}">
      </div>

      <div class="setup-field">
        <label>Duración del plan (semanas)</label>
        <input type="number" id="setupWeeks" value="12" min="4" max="24" step="1">
      </div>

      <div class="setup-field">
        <label>Altura (cm)</label>
        <input type="number" id="setupHeight" placeholder="Ej: 175" step="1" min="120" max="230">
      </div>

      <div class="setup-field">
        <label>Peso actual (kg)</label>
        <input type="number" id="setupWeight" placeholder="Ej: 80" step="0.1" min="30" max="300">
      </div>

      <div class="setup-field">
        <label>Cintura actual (cm) — a la altura del ombligo</label>
        <input type="number" id="setupWaist" placeholder="Ej: 95" step="0.1" min="40" max="200">
      </div>

      <button class="btn btn-green btn-full" id="setupStartBtn">${ICONO.jugar}Empezar</button>
      <button class="btn btn-full setup-cancel" id="setupCancelBtn">Cancelar, ya lo configuro luego</button>
      <p class="setup-note">Todo se guarda en tu navegador. Nada se envía a ningún servidor.</p>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeSetup = () => { overlay.remove(); initApp(); };

  document.getElementById('setupStartBtn').addEventListener('click', () => {
    const date = document.getElementById('setupDate').value;
    const weeks = parseInt(document.getElementById('setupWeeks').value) || 12;
    const weight = parseFloat(document.getElementById('setupWeight').value);
    const waist = parseFloat(document.getElementById('setupWaist').value);
    const height = parseInt(document.getElementById('setupHeight').value);

    if (!date || isNaN(weight) || isNaN(waist) || isNaN(height)) return;

    const dateObj = new Date(date + 'T00:00:00');
    const dateLabel = dateObj.toLocaleDateString('es-ES');
    const goalWeight = Math.max(50, weight - 7);

    Storage.set('settings', { startDate: date, totalWeeks: weeks, goalWeight, height });
    Storage.set('weights', [{ date: dateLabel, weight }]);
    Storage.set('waists', [{ date: dateLabel, waist }]);
    Storage.set('startDate', dateObj.toISOString());

    overlay.remove();
    initApp();
  });

  document.getElementById('setupCancelBtn').addEventListener('click', closeSetup);
  document.getElementById('setupCloseBtn').addEventListener('click', closeSetup);
}

/* ===== THEME ===== */
function initTheme() {
  const saved = Storage.get('theme', 'dark');
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // El icono enseña el tema en el que estás: luna en oscuro, sol en claro (los dos en azul)
  const btn = document.getElementById('themeBtn');
  btn.innerHTML = theme === 'dark' ? TEMA_ICONO.luna : TEMA_ICONO.sol;
  btn.setAttribute('aria-label', theme === 'dark' ? 'Pasar a tema claro' : 'Pasar a tema oscuro');
  Storage.set('theme', theme);
  if (typeof weightChart !== 'undefined' && weightChart) {
    const entries = Storage.get('weights', []);
    if (entries.length) renderWeightChart(entries);
  }
}

document.getElementById('themeBtn').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ===== NAV ===== */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.section;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target).classList.add('active');

      if (target === 'progreso') {
        const entries = Storage.get('weights', []);
        renderWeightChart(entries);
        renderWeightLog();
      }
    });
  });
}

/* ===== DASHBOARD ===== */
function updateDashboard() {
  const settings = Storage.get('settings', {});
  const weights = Storage.get('weights', []);
  const streak = weekStreak();
  const startDate = Storage.get('startDate', null);

  const currentWeight = weights.length ? weights[weights.length - 1].weight : null;
  const startWeight = weights.length ? weights[0].weight : null;
  const totalWeeks = settings.totalWeeks || 12;

  // Peso actual
  const weightEl = document.getElementById('dashWeight');
  if (weightEl) weightEl.textContent = currentWeight ? currentWeight.toFixed(1) : '--';

  // Perdido
  const lostEl = document.getElementById('dashLost');
  if (lostEl && startWeight && currentWeight) {
    const diff = (startWeight - currentWeight).toFixed(1);
    lostEl.textContent = diff > 0 ? `-${diff}` : diff;
  }

  // Esta semana
  const weekEl = document.getElementById('dashWeek');
  if (weekEl) {
    weekEl.textContent = sessionsInWeek().length;   // bloques completos de esta semana
  }

  // Racha
  const streakEl = document.getElementById('dashStreak');
  if (streakEl) streakEl.innerHTML = duo('llama', 'estado racha') + ' ' + (streak ? `${plural(streak, 'semana cumplida', 'semanas cumplidas')} seguidas` : 'Cumple 3 bloques esta semana para empezar la racha');

  // Progreso del plan
  if (startDate && currentWeight && startWeight) {
    const weeksEl = document.getElementById('weeksProgress');
    const fillEl = document.getElementById('weeksFill');
    const start = new Date(startDate);
    const now = new Date();
    const weeks = Math.min(totalWeeks, Math.max(0, Math.floor((now - start) / (7 * 24 * 3600 * 1000))));
    if (weeksEl) weeksEl.textContent = `Semana ${weeks} / ${totalWeeks}`;
    if (fillEl) fillEl.style.width = `${(weeks / totalWeeks) * 100}%`;
    const pctEl = document.getElementById('weeksPct');
    if (pctEl) pctEl.textContent = `${Math.round((weeks / totalWeeks) * 100)}%`;
  }

  // IMC (con la altura que pone el usuario; sin altura, no se inventa ninguna)
  const heightCm = getHeightCm();
  const imc = currentWeight && heightCm ? (currentWeight / (heightCm / 100) ** 2).toFixed(1) : '--';
  const imcEl = document.getElementById('dashIMC');
  if (imcEl) imcEl.textContent = imc;
  const heightEl = document.getElementById('dashHeight');
  if (heightEl) heightEl.textContent = heightCm ? `altura: ${(heightCm / 100).toFixed(2)} m` : 'añade tu altura en Progreso';

  // Cintura
  const waists = Storage.get('waists', []);
  const currentWaist = waists.length ? waists[waists.length - 1].waist : null;
  const startWaist = waists.length ? waists[0].waist : null;

  const waistEl = document.getElementById('dashWaist');
  if (waistEl) waistEl.textContent = currentWaist ? currentWaist.toFixed(1) : '--';

  const waistLostEl = document.getElementById('dashWaistLost');
  if (waistLostEl && startWaist && currentWaist) {
    const diff = (startWaist - currentWaist).toFixed(1);
    waistLostEl.textContent = diff > 0 ? `-${diff}` : diff;
  }

  // Semáforo de peso (por IMC) y cintura (por cintura/altura); sin altura, sin color
  semaforo(weightEl, heightCm && currentWeight ? currentWeight / (heightCm / 100) ** 2 : null, 25, 30);
  // redondeado a 2 decimales, igual que el número que enseña la tarjeta Cintura / altura
  const whtrNum = heightCm && currentWaist ? +(currentWaist / heightCm).toFixed(2) : null;
  semaforo(waistEl, whtrNum, 0.5, 0.6);

  // Ratio cintura/altura (WHtR)
  const whtrEl = document.getElementById('dashWHtR');
  const whtrStatusEl = document.getElementById('dashWHtRStatus');
  if (whtrEl && currentWaist && !heightCm) {
    whtrEl.textContent = '--';
    whtrEl.style.color = '';
    if (whtrStatusEl) whtrStatusEl.textContent = 'Añade tu altura en Progreso';
  } else if (whtrEl && currentWaist) {
    const whtr = (currentWaist / heightCm).toFixed(2);
    whtrEl.textContent = whtr;
    if (whtr < 0.5) {
      whtrEl.style.color = 'var(--green)';
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('ok') + ' Riesgo bajo';
    } else if (whtr < 0.6) {
      whtrEl.style.color = 'var(--orange)';
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('alerta') + ' Riesgo moderado';
    } else {
      whtrEl.style.color = 'var(--red)';
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('mal') + ' Riesgo alto';
    }
  }
  semaforo(whtrEl, whtrNum, 0.5, 0.6);   // la raya de la tarjeta, del mismo color que el número

  renderMetas();
  renderAnalisis();
  renderSemana();
}

function semaforo(el, valor, naranjaDesde, rojoDesde) {
  if (!el) return;
  const color = valor == null ? '' : valor >= rojoDesde ? 'var(--red)' : valor >= naranjaDesde ? 'var(--orange)' : 'var(--green)';
  el.style.color = color;
  el.closest('.stat-card').style.borderLeftColor = color;
}

/* ===== METAS (corto, medio y largo plazo) ===== */
// Se calculan con el último peso, la altura y el objetivo que pone el usuario: ningún dato escrito en el código.
function renderMetas() {
  const box = document.getElementById('metasList');
  if (!box) return;
  const heightCm = getHeightCm();
  const weights = Storage.get('weights', []);
  const current = weights.length ? weights[weights.length - 1].weight : null;
  if (!heightCm || !current) {
    box.innerHTML = '<div class="meta-aviso">Añade tu <strong>altura</strong> y tu <strong>peso</strong> en Progreso para calcular tus metas.</div>';
    return;
  }
  const m2 = (heightCm / 100) ** 2;
  const goal = Storage.get('settings', {}).goalWeight;
  const metas = [
    { plazo: 'Corto', peso: 30 * m2, texto: 'Sales de la franja de obesidad (IMC por debajo de 30)' },
    goal ? { plazo: 'Medio', peso: goal, texto: 'Tu peso objetivo' } : null,
    { plazo: 'Largo', peso: 27 * m2, texto: 'IMC 27: mucha menos grasa en el hígado y menos riesgo' },
  ].filter(Boolean).sort((a, b) => b.peso - a.peso);

  box.innerHTML = metas.map(mt => {
    const falta = current - mt.peso;
    const hecho = falta < 0 || (mt.plazo === 'Medio' && falta <= 0);
    return `<div class="meta-row ${hecho ? 'hecha' : ''}">
      <span class="meta-plazo">${mt.plazo}</span>
      <div class="meta-info"><strong>${mt.peso.toFixed(1)} kg</strong><span>${mt.texto}</span></div>
      <span class="meta-falta">${hecho ? `${estado('ok')} Conseguido` : `te faltan <strong>${falta.toFixed(1)} kg</strong>`}</span>
    </div>`;
  }).join('') + `<div class="meta-aviso">Ahora: <strong>${current.toFixed(1)} kg</strong> · IMC ${(current / m2).toFixed(1)}</div>`;
}

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

// Lunes de la semana de «ref». getDay() da 0 en domingo: (getDay() + 6) % 7 son los días desde el lunes
// (antes el domingo saltaba al lunes SIGUIENTE y la semana salía a 0).
function getWeekStart(ref = new Date()) {
  const d = new Date(ref);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d;
}

/* ===== PESO ===== */
document.getElementById('saveWeightBtn').addEventListener('click', () => {
  const input = document.getElementById('weightInput');
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 30 || val > 300) return;

  const weights = Storage.get('weights', []);
  const today = new Date().toLocaleDateString('es-ES');
  const existing = weights.findIndex(e => e.date === today);
  if (existing >= 0) weights[existing].weight = val;
  else weights.push({ date: today, weight: val });

  if (!Storage.get('startDate')) Storage.set('startDate', new Date().toISOString());

  Storage.set('weights', weights);
  input.value = '';
  updateDashboard();
  checkLogros();
  showToast('Peso guardado ✓');
});

// Altura del usuario (cm), guardada en los ajustes. Sin altura: null (IMC y ratio muestran "--").
function getHeightCm() {
  return Storage.get('settings', {}).height || null;
}
if (getHeightCm()) document.getElementById('heightInput').placeholder = `Altura: ${getHeightCm()} cm`;

document.getElementById('saveHeightBtn').addEventListener('click', () => {
  const input = document.getElementById('heightInput');
  const val = parseInt(input.value);
  if (isNaN(val) || val < 120 || val > 230) return;
  Storage.set('settings', { ...Storage.get('settings', {}), height: val });
  input.value = '';
  input.placeholder = `Altura: ${val} cm`;
  updateDashboard();
  checkLogros();
  showToast('Altura guardada ✓');
});

document.getElementById('saveWaistBtn').addEventListener('click', () => {
  const input = document.getElementById('waistInput');
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 40 || val > 200) return;

  const waists = Storage.get('waists', []);
  const today = new Date().toLocaleDateString('es-ES');
  const existing = waists.findIndex(e => e.date === today);
  if (existing >= 0) waists[existing].waist = val;
  else waists.push({ date: today, waist: val });

  Storage.set('waists', waists);
  input.value = '';
  updateDashboard();
  checkLogros();
  showToast('Cintura guardada ✓');
});

function renderWeightLog() {
  const entries = Storage.get('weights', []);
  const container = document.getElementById('weightLog');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="empty-state">' + duo('balanza', 'vacio-ico') + '<div>Aún no hay registros de peso</div></div>';
    return;
  }

  container.innerHTML = '';
  [...entries].reverse().forEach((e, i, arr) => {
    const prev = arr[i + 1];
    const diff = prev ? (e.weight - prev.weight).toFixed(1) : null;
    const diffClass = diff ? (diff < 0 ? 'down' : 'up') : '';
    const diffText = diff ? (diff < 0 ? diff + ' kg' : '+' + diff + ' kg') : '';

    const div = document.createElement('div');
    div.className = 'weight-entry';
    div.innerHTML = `
      <span class="w-date">${esc(e.date)}</span>
      <span class="w-value">${esc(e.weight)} kg</span>
      ${diff ? `<span class="w-diff ${diffClass}">${diffText}</span>` : '<span></span>'}
      <button class="w-del" data-date="${esc(e.date)}" title="Eliminar" aria-label="Eliminar">${ICONO.cerrar}</button>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('.w-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      const updated = Storage.get('weights', []).filter(e => e.date !== date);
      Storage.set('weights', updated);
      renderWeightLog();
      renderWeightChart(updated);
      updateDashboard();
    });
  });
}

/* ===== ENTRENAMIENTO ===== */
document.querySelectorAll('.phase-tab').forEach(tab => {
  tab.addEventListener('click', () => renderWorkoutPhase(tab.dataset.phase));
});

document.querySelectorAll('.block-btn').forEach(btn => {
  btn.addEventListener('click', () => { currentBlock = btn.dataset.block; renderWorkoutPhase('strength'); });
});

document.getElementById('startWorkoutBtn').addEventListener('click', startWorkout);

document.getElementById('pauseBtn').addEventListener('click', () => {
  if (Timer.isRunning()) { Timer.pause(); document.getElementById('pauseBtn').innerHTML = ICONO.jugar; }
  else { Timer.resume(); document.getElementById('pauseBtn').innerHTML = ICONO.pausa; }
});

document.getElementById('stopBtn').addEventListener('click', () => {
  Timer.stop();
  workoutActive = false;
  document.getElementById('workoutSetup').style.display = 'block';
  document.getElementById('timerView').style.display = 'none';
  document.getElementById('pauseBtn').innerHTML = ICONO.pausa;
  renderWorkoutPhase(currentPhase);
});

/* ===== LOGROS ===== */
const LOGROS_DEF = [
  { id: 'first_train', icon: duo('bandera'), name: 'Primer entreno', desc: 'Completa tu primer entrenamiento', check: () => getSessions().length >= 1 },
  { id: 'week', icon: duo('llama'), name: 'Semana cumplida', desc: '3 bloques en una semana', check: () => completedWeeks() >= 1 },
  { id: 'kg1', icon: duo('balanza'), name: '1 kg perdido', desc: 'Primer kilo perdido', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 1; } },
  { id: 'month', icon: duo('semana'), name: 'Primer mes', desc: '4 semanas cumplidas', check: () => completedWeeks() >= 4 },
  { id: 'kg5', icon: duo('trofeo'), name: '5 kg perdidos', desc: '5 kilos menos', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 5; } },
  { id: 'goal', icon: duo('diana'), name: 'Peso objetivo', desc: 'Llegas a tu peso objetivo', check: () => { const w = Storage.get('weights', []); const g = Storage.get('settings', {}).goalWeight; return w.length && g && w[w.length - 1].weight <= g; } },
  { id: 'waist1', icon: duo('regla'), name: '1 cm menos', desc: 'Primer cm de cintura perdido', check: () => { const w = Storage.get('waists', []); return w.length >= 2 && (w[0].waist - w[w.length - 1].waist) >= 1; } },
  { id: 'whtr', icon: duo('corazon'), name: 'Ratio saludable', desc: 'Cintura/altura < 0.5', check: () => { const w = Storage.get('waists', []); const h = getHeightCm(); return w.length && h && (w[w.length - 1].waist / h) < 0.5; } }
];

function checkLogros() {
  const unlocked = Storage.get('logros', []);
  const grid = document.getElementById('logrosGrid');
  if (!grid) return;

  grid.innerHTML = '';
  LOGROS_DEF.forEach(l => {
    const isUnlocked = unlocked.includes(l.id) || l.check();
    if (isUnlocked && !unlocked.includes(l.id)) {
      unlocked.push(l.id);
      Storage.set('logros', unlocked);
    }
    const div = document.createElement('div');
    div.className = `logro ${isUnlocked ? 'unlocked' : ''}`;
    div.innerHTML = `<div class="logro-icon">${l.icon}</div><div class="logro-name">${l.name}</div><div class="logro-desc">${l.desc}</div>`;
    grid.appendChild(div);
  });
}

/* ===== TOAST ===== */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; }, 2200);
}

/* ===== PWA: instalable en el móvil (y base para la TWA) ===== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => reg.update())   // mira si hay versión nueva cada vez que se abre, también en la app instalada
    .catch(() => {});
  // Versión nueva publicada: se recarga sola, salvo en mitad de un entreno (se cortaría el temporizador);
  // en ese caso la versión nueva sale la próxima vez que se abra.
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'SW_UPDATED' && !workoutActive) window.location.reload();
  });
}

/* ===== ICONOS de los botones del HTML: <span data-ico="jugar"> → su trazo de ICONO ===== */
document.querySelectorAll('[data-ico]').forEach(el => { el.outerHTML = ICONO[el.dataset.ico]; });
document.querySelectorAll('[data-duo]').forEach(el => { el.outerHTML = duo(el.dataset.duo, el.className); });
