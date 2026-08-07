/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  seedInitialWeight();
  initNav();
  await loadWorkoutData();
  renderWorkoutPhase('warmup');
  updateDashboard();
  renderWeightLog();
  renderCalendar();
  checkLogros();
});

function seedInitialWeight() {
  if (Storage.get('weights', []).length === 0) {
    const today = new Date().toLocaleDateString('es-ES');
    Storage.set('weights', [{ date: today, weight: 97.0 }]);
    Storage.set('waists', [{ date: today, waist: 105.0 }]);
    Storage.set('startDate', new Date().toISOString());
  }
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
  const weights = Storage.get('weights', []);
  const trainings = Storage.get('trainings', []);
  const streak = Storage.get('streak', 0);
  const startDate = Storage.get('startDate', null);

  const currentWeight = weights.length ? weights[weights.length - 1].weight : null;
  const goal = 90;
  const startWeight = weights.length ? weights[0].weight : null;

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

  // Progreso 12 semanas
  if (startDate && currentWeight && startWeight) {
    const weeksEl = document.getElementById('weeksProgress');
    const fillEl = document.getElementById('weeksFill');
    const start = new Date(startDate);
    const now = new Date();
    const weeks = Math.min(12, Math.floor((now - start) / (7 * 24 * 3600 * 1000)));
    if (weeksEl) weeksEl.textContent = `Semana ${weeks} / 12`;
    if (fillEl) fillEl.style.width = `${(weeks / 12) * 100}%`;
    const pctEl = document.getElementById('weeksPct');
    if (pctEl) pctEl.textContent = `${Math.round((weeks / 12) * 100)}%`;
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
  if (whtrEl && currentWaist) {
    const whtr = (currentWaist / 176).toFixed(2);
    whtrEl.textContent = whtr;
    whtrEl.style.color = whtr < 0.5 ? 'var(--green)' : (whtr < 0.6 ? 'var(--orange)' : 'var(--red)');
  }
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
