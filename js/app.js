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
