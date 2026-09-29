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
  aplicarPerfilFichas();   // Meds y Nutrición según el perfil (perfil.js)
  updateDashboard();   // ya pinta también el plan (antes se pintaba dos veces al abrir)
  renderWeightLog();
  checkLogros();
  copiaAutomatica();   // una por semana, al abrir (ver copia.js)
  renderCopiasAutomaticas();

  const newPlanBtn = document.getElementById('newPlanBtn');
  if (newPlanBtn) {
    newPlanBtn.addEventListener('click', () => {
      if (!confirm('¿Finalizar este plan y empezar uno nuevo?\n\nSe borrarán todos los datos (peso, cintura, barriga, entrenos, logros).\n\nSi quieres conservarlos, cancela y usa antes «Exportar» en Progreso.')) return;
      const keys = ['settings', 'weights', 'waists', 'bellies', 'startDate', 'trainings', 'sessions', 'streak', 'logros', 'plan'];
      keys.forEach(k => Storage.remove(k));
      location.reload();
    });
  }
}

// Guarda la configuración inicial. El peso y la cintura se AÑADEN a los que hubiera: antes se sustituían y,
// si habías apuntado pesos sin configurar el plan, al configurarlo se perdían todos menos uno.
// Objetivo de peso: 7 kg menos, pero nunca por debajo de IMC 25; y solo con sobrepeso (IMC ≥ 25), si no se ha
// elegido «mantenerme» y si no es menor de 18 (eso lo lleva el pediatra). La barriga, solo si se da.
function objetivoInicial(weight, height, { menor = false, objetivo } = {}) {
  const m2 = (height / 100) ** 2;
  if (menor || objetivo === 'maintain' || weight / m2 < 25) return null;
  return Math.max(50, weight - 7, +(25 * m2).toFixed(1));
}

function guardarConfiguracion({ date, weeks, weight, waist, height, belly, menor = false, objetivo }) {
  const dia = new Date(date + 'T00:00:00'), fecha = fechaEs(dia);
  const settings = { ...Storage.get('settings', {}), startDate: date, totalWeeks: weeks, goalWeight: objetivoInicial(weight, height, { menor, objetivo }), height };
  if (settings.goalWeight == null) delete settings.goalWeight;
  Storage.set('settings', settings);
  Storage.set('weights', anotarMedida(Storage.get('weights', []), 'weight', weight, fecha));
  Storage.set('waists', anotarMedida(Storage.get('waists', []), 'waist', waist, fecha));
  if (belly !== undefined) Storage.set('bellies', anotarMedida(Storage.get('bellies', []), 'belly', belly, fecha));
  Storage.set('startDate', dia.toISOString());
}

// Bienvenida: «Soy nuevo» abre el cuestionario (perfil.js); «Ya tengo mis datos» carga la copia.
function showSetup() {
  const overlay = document.createElement('div');
  overlay.id = 'setupOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'setupTitulo');
  // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
  overlay.innerHTML = `
    <div class="setup-card">
      <button class="setup-close" id="setupCloseBtn" aria-label="Cerrar">${ICONO.cerrar}</button>
      <div class="setup-icon">${duo('correr', 'setup-duo')}</div>
      <h2 class="setup-title" id="setupTitulo">Health Tracker</h2>
      <p class="setup-subtitle">Bienvenido</p>
      <button class="btn btn-green btn-full" id="setupNuevoBtn">Soy nuevo: crear mi perfil</button>
      <button class="btn btn-primary btn-full" id="setupCargarBtn" style="margin-top:10px;">Ya tengo mis datos: cargar mi copia</button>
      <p class="setup-note">La copia es el archivo <strong>.json</strong> que sacaste con «Exportar» en Progreso.</p>
      <p class="setup-note">Todo se guarda en tu navegador. Nada se envía a ningún servidor.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('setupNuevoBtn').focus({ preventScroll: true });

  document.getElementById('setupNuevoBtn').addEventListener('click', () => { overlay.remove(); abrirCuestionario({ nuevo: true }); });
  // Cargar la copia = lo mismo que «Importar» de Progreso (valida el archivo, pregunta y recarga la app)
  document.getElementById('setupCargarBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('setupCloseBtn').addEventListener('click', () => { overlay.remove(); initApp(); });
}

/* ===== THEME ===== */
function initTheme() {
  const saved = Storage.get('theme', 'dark');
  applyTheme(saved);
}

function applyTheme(theme) {
  // La barra de arriba del móvil, del color de la cabecera del tema
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1e293b' : '#ffffff');
  document.documentElement.setAttribute('data-theme', theme);
  // El icono enseña el tema en el que estás: luna en oscuro, sol en claro (los dos en azul)
  const btn = document.getElementById('themeBtn');
  // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
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
      document.querySelectorAll('.nav-item').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
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
// eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código (data-ico del propio HTML)
document.querySelectorAll('[data-ico]').forEach(el => { el.outerHTML = ICONO[el.dataset.ico]; });
// eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código (data-duo del propio HTML)
document.querySelectorAll('[data-duo]').forEach(el => { el.outerHTML = duo(el.dataset.duo, el.className); });
