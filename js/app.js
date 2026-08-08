/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadWorkoutData();
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
  renderCalendar();
  checkLogros();

  const newPlanBtn = document.getElementById('newPlanBtn');
  if (newPlanBtn) {
    newPlanBtn.addEventListener('click', () => {
      if (!confirm('¿Finalizar este plan y empezar uno nuevo?\n\nSe borrarán todos los datos (peso, cintura, entrenos, logros).')) return;
      const keys = ['settings', 'weights', 'waists', 'startDate', 'trainings', 'streak', 'logros', 'plan'];
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
      <button class="setup-close" id="setupCloseBtn" aria-label="Cerrar">✕</button>
      <div class="setup-icon">🏃‍♂️</div>
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
        <label>Peso actual (kg)</label>
        <input type="number" id="setupWeight" value="97" step="0.1" min="30" max="300">
      </div>

      <div class="setup-field">
        <label>Cintura actual (cm) — a la altura del ombligo</label>
        <input type="number" id="setupWaist" value="105" step="0.1" min="40" max="200">
      </div>

      <button class="btn btn-green btn-full" id="setupStartBtn">🚀 Empezar</button>
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

    if (!date || isNaN(weight) || isNaN(waist)) return;

    const dateObj = new Date(date + 'T00:00:00');
    const dateLabel = dateObj.toLocaleDateString('es-ES');
    const goalWeight = Math.max(50, weight - 7);

    Storage.set('settings', { startDate: date, totalWeeks: weeks, goalWeight });
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
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
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
  const trainings = Storage.get('trainings', []);
  const streak = Storage.get('streak', 0);
  const startDate = Storage.get('startDate', null);

  const currentWeight = weights.length ? weights[weights.length - 1].weight : null;
  const goal = settings.goalWeight || 90;
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
    const weekStart = getWeekStart();
    const weekCount = trainings.filter(d => {
      const date = parseDate(d);
      return date >= weekStart;
    }).length;
    weekEl.textContent = weekCount;
  }

  // Racha
  const streakEl = document.getElementById('dashStreak');
  if (streakEl) streakEl.textContent = `🔥 ${streak} días de racha`;

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

  // IMC
  const imc = currentWeight ? (currentWeight / (1.76 * 1.76)).toFixed(1) : '--';
  const imcEl = document.getElementById('dashIMC');
  if (imcEl) imcEl.textContent = imc;

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

  // Ratio cintura/altura (WHtR)
  const whtrEl = document.getElementById('dashWHtR');
  const whtrStatusEl = document.getElementById('dashWHtRStatus');
  if (whtrEl && currentWaist) {
    const whtr = (currentWaist / 176).toFixed(2);
    whtrEl.textContent = whtr;
    if (whtr < 0.5) {
      whtrEl.style.color = 'var(--green)';
      if (whtrStatusEl) whtrStatusEl.textContent = '✅ Riesgo bajo';
    } else if (whtr < 0.6) {
      whtrEl.style.color = 'var(--orange)';
      if (whtrStatusEl) whtrStatusEl.textContent = '⚠️ Riesgo moderado';
    } else {
      whtrEl.style.color = 'var(--red)';
      if (whtrStatusEl) whtrStatusEl.textContent = '❌ Riesgo alto';
    }
  }
}

/* ===== PLAN TABLE ===== */
function renderPlanTable() {
  const container = document.getElementById('planTable');
  if (!container) return;

  const settings = Storage.get('settings', {});
  const weights = Storage.get('weights', []);
  const waists = Storage.get('waists', []);

  const startWeight = weights.length ? weights[0].weight : 97;
  const goalWeight = settings.goalWeight || 90;
  const startWaist = waists.length ? waists[0].waist : 105;
  const goalWaist = Math.max(60, startWaist - 9);
  const totalWeeks = settings.totalWeeks || 12;

  const startDate = Storage.get('startDate', null);
  if (!startDate) { container.innerHTML = '<div class="empty-state">Registra tu peso para activar el plan</div>'; return; }

  const start = new Date(startDate);
  start.setHours(0,0,0,0);
  // Adjust to Monday
  start.setDate(start.getDate() - start.getDay() + 1);

  const now = new Date();
  const currentWeekNum = Math.min(totalWeeks, Math.max(1, Math.floor((now - start) / (7 * 24 * 3600 * 1000)) + 1));

  const planData = Storage.get('plan', {});

  let html = '<table class="plan-table"><thead><tr>';
  html += '<th class="week-num">#</th><th>Fecha</th><th>Peso obj.</th><th>Cint. obj.</th>';
  html += '<th>Peso</th><th>Cint.</th><th>Entrenos</th><th></th>';
  html += '</tr></thead><tbody>';

  for (let w = 1; w <= totalWeeks; w++) {
    const weekDate = new Date(start);
    weekDate.setDate(start.getDate() + (w - 1) * 7);
    const dateLabel = weekDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

    const targetWeight = (startWeight - ((startWeight - goalWeight) / totalWeeks) * w).toFixed(1);
    const targetWaist = (startWaist - ((startWaist - goalWaist) / totalWeeks) * w).toFixed(1);

    const wd = planData[w] || {};
    const actualWeight = wd.weight || '';
    const actualWaist = wd.waist || '';
    const checks = wd.checks || [false, false, false];
    const isCurrent = w === currentWeekNum;
    const isPast = w < currentWeekNum;

    const rowClass = isCurrent ? 'current-week' : (isPast ? 'completed-week' : '');

    html += `<tr class="${rowClass}" data-week="${w}">`;
    html += `<td class="week-num">${w}</td>`;
    html += `<td class="week-date">${dateLabel}</td>`;
    html += `<td class="target">${targetWeight}</td>`;
    html += `<td class="target">${targetWaist}</td>`;
    html += `<td><input type="number" step="0.1" min="30" max="300" value="${actualWeight}" data-w="${w}" data-field="weight"></td>`;
    html += `<td><input type="number" step="0.1" min="40" max="200" value="${actualWaist}" data-w="${w}" data-field="waist"></td>`;
    html += `<td><div class="plan-checks">`;
    ['L', 'M', 'V'].forEach((label, i) => {
      html += `<button class="plan-check ${checks[i] ? 'checked' : ''}" data-w="${w}" data-idx="${i}" title="${label}">${checks[i] ? '✓' : label}</button>`;
    });
    html += `</div></td>`;
    html += `<td><button class="plan-save" data-w="${w}">💾</button></td>`;
    html += `</tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  // Event listeners
  container.querySelectorAll('.plan-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const wk = btn.dataset.w;
      const row = container.querySelector(`tr[data-week="${wk}"]`);
      const weightInput = row.querySelector('input[data-field="weight"]');
      const waistInput = row.querySelector('input[data-field="waist"]');
      const checks = [];
      row.querySelectorAll('.plan-check').forEach(c => checks.push(c.classList.contains('checked')));

      const plan = Storage.get('plan', {});
      plan[wk] = {
        weight: weightInput.value ? parseFloat(weightInput.value) : null,
        waist: waistInput.value ? parseFloat(waistInput.value) : null,
        checks
      };
      Storage.set('plan', plan);

      // Sync with weights/waists arrays
      if (weightInput.value) {
        const weights = Storage.get('weights', []);
        const today = new Date().toLocaleDateString('es-ES');
        const existing = weights.findIndex(e => e.date === today);
        if (existing >= 0) weights[existing].weight = parseFloat(weightInput.value);
        else weights.push({ date: today, weight: parseFloat(weightInput.value) });
        Storage.set('weights', weights);
      }
      if (waistInput.value) {
        const waists = Storage.get('waists', []);
        const today = new Date().toLocaleDateString('es-ES');
        const existing = waists.findIndex(e => e.date === today);
        if (existing >= 0) waists[existing].waist = parseFloat(waistInput.value);
        else waists.push({ date: today, waist: parseFloat(waistInput.value) });
        Storage.set('waists', waists);
      }

      updateDashboard();
      checkLogros();
      showToast(`Semana ${wk} guardada ✓`);
    });
  });

  container.querySelectorAll('.plan-check').forEach(btn => {
    btn.addEventListener('click', () => {
      const wk = btn.dataset.w;
      const idx = parseInt(btn.dataset.idx);
      const row = container.querySelector(`tr[data-week="${wk}"]`);
      const checks = [];
      row.querySelectorAll('.plan-check').forEach(c => {
        if (parseInt(c.dataset.idx) === idx) {
          c.classList.toggle('checked');
          c.textContent = c.classList.contains('checked') ? '✓' : ['L', 'M', 'V'][parseInt(c.dataset.idx)];
        }
        checks.push(c.classList.contains('checked'));
      });

      const plan = Storage.get('plan', {});
      if (!plan[wk]) plan[wk] = { weight: null, waist: null, checks: [false, false, false] };
      plan[wk].checks = checks;
      Storage.set('plan', plan);

      // Sync trainings
      const trainings = Storage.get('trainings', []);
      const weekStart = new Date(Storage.get('startDate'));
      weekStart.setDate(weekStart.getDate() + (parseInt(wk) - 1) * 7);
      const dayLabels = [0, 2, 4].map(d => {
        const dd = new Date(weekStart);
        dd.setDate(weekStart.getDate() + d);
        return dd.toLocaleDateString('es-ES');
      });
      if (checks[idx]) {
        const label = dayLabels[idx];
        if (!trainings.includes(label)) trainings.push(label);
      }
      Storage.set('trainings', trainings);
      updateDashboard();
    });
  });
}

function getWeekStart() {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay() + 1);
  return d;
}

function parseDate(str) {
  const [d, m, y] = str.split('/');
  return new Date(y, m - 1, d);
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
    container.innerHTML = '<div class="empty-state"><div class="icon">⚖️</div>Aún no hay registros de peso</div>';
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
      <span class="w-date">${e.date}</span>
      <span class="w-value">${e.weight} kg</span>
      ${diff ? `<span class="w-diff ${diffClass}">${diffText}</span>` : '<span></span>'}
      <button class="w-del" data-date="${e.date}" title="Eliminar">✕</button>
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

document.getElementById('startWorkoutBtn').addEventListener('click', startWorkout);

document.getElementById('pauseBtn').addEventListener('click', () => {
  if (Timer.isRunning()) { Timer.pause(); document.getElementById('pauseBtn').textContent = '▶'; }
  else { Timer.resume(); document.getElementById('pauseBtn').textContent = '⏸'; }
});

document.getElementById('stopBtn').addEventListener('click', () => {
  Timer.stop();
  workoutActive = false;
  document.getElementById('workoutSetup').style.display = 'block';
  document.getElementById('timerView').style.display = 'none';
  document.getElementById('pauseBtn').textContent = '⏸';
  renderWorkoutPhase(currentPhase);
});

/* ===== CALENDARIO ===== */
const DAYS = [
  { name: 'Lunes', activity: '💪 Entrenamiento', type: 'train' },
  { name: 'Martes', activity: '🚶 Caminar 30-45 min', type: 'walk' },
  { name: 'Miércoles', activity: '💪 Entrenamiento', type: 'train' },
  { name: 'Jueves', activity: '🚶 Caminar 30-45 min', type: 'walk' },
  { name: 'Viernes', activity: '💪 Entrenamiento', type: 'train' },
  { name: 'Sábado', activity: '🌳 Paseo libre', type: 'walk' },
  { name: 'Domingo', activity: '😴 Descanso', type: 'rest' }
];

function renderCalendar() {
  const grid = document.getElementById('weekGrid');
  if (!grid) return;
  const weekKey = getWeekKey();
  const checked = Storage.get('calendar_' + weekKey, {});

  grid.innerHTML = '';
  DAYS.forEach((day, i) => {
    const isChecked = checked[i] || false;
    const div = document.createElement('div');
    div.className = 'day-row';
    div.innerHTML = `
      <span class="day-name">${day.name}</span>
      <span class="day-activity">${day.activity}</span>
      <button class="day-check ${isChecked ? 'checked' : ''}" data-idx="${i}">${isChecked ? '✓' : ''}</button>
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll('.day-check').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const wk = getWeekKey();
      const ch = Storage.get('calendar_' + wk, {});
      ch[idx] = !ch[idx];
      Storage.set('calendar_' + wk, ch);
      btn.classList.toggle('checked', ch[idx]);
      btn.textContent = ch[idx] ? '✓' : '';

      if (DAYS[idx].type === 'train' && ch[idx]) {
        const trainings = Storage.get('trainings', []);
        const today = getDayLabel(idx);
        if (!trainings.includes(today)) trainings.push(today);
        Storage.set('trainings', trainings);
        updateDashboard();
      }
    });
  });
}

function getWeekKey() {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1);
  return start.toISOString().slice(0, 10);
}

function getDayLabel(idx) {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1 + idx);
  return start.toLocaleDateString('es-ES');
}

/* ===== LOGROS ===== */
const LOGROS_DEF = [
  { id: 'first_train', icon: '🏁', name: 'Primer entreno', desc: 'Completa tu primer entrenamiento', check: () => Storage.get('trainings', []).length >= 1 },
  { id: 'week', icon: '🔥', name: '7 días seguidos', desc: 'Racha de 7 días', check: () => Storage.get('streak', 0) >= 7 },
  { id: 'kg1', icon: '⚖️', name: '1 kg perdido', desc: 'Primer kilo perdido', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 1; } },
  { id: 'month', icon: '📅', name: 'Primer mes', desc: '30 entrenamientos completados', check: () => Storage.get('trainings', []).length >= 12 },
  { id: 'kg5', icon: '🏆', name: '5 kg perdidos', desc: '5 kilos menos', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 5; } },
  { id: 'goal', icon: '🎯', name: 'Objetivo 90 kg', desc: 'Llegas a tu peso objetivo', check: () => { const w = Storage.get('weights', []); return w.length && w[w.length - 1].weight <= 90; } },
  { id: 'waist1', icon: '📏', name: '1 cm menos', desc: 'Primer cm de cintura perdido', check: () => { const w = Storage.get('waists', []); return w.length >= 2 && (w[0].waist - w[w.length - 1].waist) >= 1; } },
  { id: 'whtr', icon: '💚', name: 'Ratio saludable', desc: 'Cintura/altura < 0.5', check: () => { const w = Storage.get('waists', []); return w.length && (w[w.length - 1].waist / 176) < 0.5; } }
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
