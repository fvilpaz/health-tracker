/* ===== INIT ===== */
// Si esta página está metida dentro de otra web (iframe), no se enseña: nadie puede disfrazarla para que toques algo
if (window.top !== window.self) document.documentElement.style.display = 'none';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (!Storage.get('settings')) {
    showSetup();
  } else {
    initApp();
  }
  // Los ejercicios se cargan aparte: antes la app entera esperaba a este archivo, y sin red no arrancaba
  loadWorkoutData()
    .then(() => { currentBlock = nextBlock(); renderWorkoutPhase('warmup'); })   // el Entreno abre con el bloque que toca
    .catch(() => {
      const lista = document.getElementById('exerciseList');
      if (lista) lista.innerHTML = '<div class="meta-aviso">No se han podido cargar los ejercicios. Revisa la conexión y vuelve a abrir la app.</div>';
    });
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

// Guarda la configuración inicial. El peso y la cintura se AÑADEN a los que hubiera: antes se sustituían y,
// si habías apuntado pesos sin configurar el plan, al configurarlo se perdían todos menos uno.
function guardarConfiguracion({ date, weeks, weight, waist, height }) {
  const dia = new Date(date + 'T00:00:00'), fecha = fechaEs(dia);
  Storage.set('settings', { ...Storage.get('settings', {}), startDate: date, totalWeeks: weeks, goalWeight: Math.max(50, weight - 7), height });
  Storage.set('weights', anotarMedida(Storage.get('weights', []), 'weight', weight, fecha));
  Storage.set('waists', anotarMedida(Storage.get('waists', []), 'waist', waist, fecha));
  Storage.set('startDate', dia.toISOString());
}

function showSetup() {
  const dateStr = isoDate(new Date());   // hoy en hora local (toISOString daba ayer entre las 00:00 y las 02:00)
  const overlay = document.createElement('div');
  overlay.id = 'setupOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'setupTitulo');
  overlay.innerHTML = `
    <div class="setup-card">
      <button class="setup-close" id="setupCloseBtn" aria-label="Cerrar">${ICONO.cerrar}</button>
      <div class="setup-icon">${duo('correr', 'setup-duo')}</div>
      <h2 class="setup-title" id="setupTitulo">Health Tracker</h2>
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
  document.getElementById('setupHeight').focus({ preventScroll: true });

  const closeSetup = () => { overlay.remove(); initApp(); };

  document.getElementById('setupStartBtn').addEventListener('click', () => {
    const date = document.getElementById('setupDate').value;
    const weeks = parseInt(document.getElementById('setupWeeks').value) || 12;
    const weight = parseFloat(document.getElementById('setupWeight').value);
    const waist = parseFloat(document.getElementById('setupWaist').value);
    const height = parseInt(document.getElementById('setupHeight').value);

    // Mismos rangos que en Progreso, y avisando de qué falta (antes: con un campo vacío no hacía nada,
    // y aceptaba 5 kg o 999 cm, que rompían el panel, las metas y el plan)
    if (!date) return showToast('Pon la fecha de inicio');
    if (weeks < 4 || weeks > 24) return showToast('El plan tiene que durar entre 4 y 24 semanas');
    if (!medidaValida('height', height) || !medidaValida('weight', weight) || !medidaValida('waist', waist)) return;

    guardarConfiguracion({ date, weeks, weight, waist, height });

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

/* ===== TOAST ===== */
// Aviso corto abajo. Va por encima de todo (también de la pantalla de configuración, que antes lo tapaba),
// centrado, y se anuncia al lector de pantalla (role=status). Un aviso nuevo reinicia el tiempo del anterior.
let temporizadorAviso = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => t.classList.remove('visible'), 2600);
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
