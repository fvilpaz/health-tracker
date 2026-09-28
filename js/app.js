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
      if (!confirm('¿Finalizar este plan y empezar uno nuevo?\n\nSe borrarán todos los datos (peso, cintura, entrenos, logros).\n\nSi quieres conservarlos, cancela y usa antes «Exportar» en Progreso.')) return;
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
      if (whtrStatusEl) whtrStatusEl.textContent = '✅ Riesgo bajo';
    } else if (whtr < 0.6) {
      whtrEl.style.color = 'var(--orange)';
      if (whtrStatusEl) whtrStatusEl.textContent = '⚠️ Riesgo moderado';
    } else {
      whtrEl.style.color = 'var(--red)';
      if (whtrStatusEl) whtrStatusEl.textContent = '❌ Riesgo alto';
    }
  }
  semaforo(whtrEl, whtrNum, 0.5, 0.6);   // la raya de la tarjeta, del mismo color que el número

  renderMetas();
  renderAnalisis();
}

function semaforo(el, valor, naranjaDesde, rojoDesde) {
  if (!el) return;
  const color = valor == null ? '' : valor >= rojoDesde ? 'var(--red)' : valor >= naranjaDesde ? 'var(--orange)' : 'var(--green)';
  el.style.color = color;
  el.closest('.stat-card').style.borderLeftColor = color;
}

/* ===== ANÁLISIS ===== */
// Catálogo de pruebas (genérico, sin datos de nadie). mejor: 'bajo' | 'alto' | 'rango' | 'info' (no se juzga).
// Los valores de cada persona se guardan en Storage 'labs': [{ date: 'AAAA-MM-DD', values: { clave: número } }].
const LAB_TESTS = [
  { k: 'hba1c',          n: 'HbA1c (azúcar medio 3 meses)', u: '%',      max: 6.5,  mejor: 'bajo' },
  { k: 'glucosa',        n: 'Glucosa en ayunas',            u: 'mg/dL',  min: 70, max: 110, mejor: 'bajo' },
  { k: 'trigliceridos',  n: 'Triglicéridos',                u: 'mg/dL',  max: 150,  mejor: 'bajo' },
  { k: 'hdl',            n: 'Colesterol HDL («bueno»)',     u: 'mg/dL',  min: 40,   mejor: 'alto' },
  { k: 'ldl',            n: 'Colesterol LDL («malo»)',      u: 'mg/dL',  max: 100,  mejor: 'bajo' },
  { k: 'no_hdl',         n: 'Colesterol no HDL',            u: 'mg/dL',  max: 130,  mejor: 'bajo' },
  { k: 'colesterol',     n: 'Colesterol total',             u: 'mg/dL',  max: 200,  mejor: 'bajo' },
  { k: 'alt',            n: 'ALT / GPT (hígado)',           u: 'U/L',    max: 40,   mejor: 'bajo' },
  { k: 'ast',            n: 'AST / GOT (hígado)',           u: 'U/L',    max: 39,   mejor: 'bajo' },
  { k: 'ggt',            n: 'GGT (hígado)',                 u: 'U/L',    max: 50,   mejor: 'bajo' },
  { k: 'bilirrubina',    n: 'Bilirrubina',                  u: 'mg/dL',  max: 1.0,  mejor: 'info' },
  { k: 'ck',             n: 'CK (músculo)',                 u: 'U/L',    max: 195,  mejor: 'info' },
  { k: 'creatinina',     n: 'Creatinina (riñón)',           u: 'mg/dL',  min: 0.74, max: 1.30, mejor: 'rango' },
  { k: 'filtrado',       n: 'Filtrado glomerular (riñón)',  u: 'mL/min', min: 60,   mejor: 'alto' },
  { k: 'acido_urico',    n: 'Ácido úrico',                  u: 'mg/dL',  min: 3.4, max: 7.0, mejor: 'rango' },
  { k: 'b12',            n: 'Vitamina B12',                 u: 'pg/mL',  min: 211, max: 911, mejor: 'rango' },
  { k: 'tsh',            n: 'Tiroides (TSH)',               u: 'µUI/mL', min: 0.4, max: 4.5, mejor: 'rango' },
  { k: 'glucosa_orina',  n: 'Glucosa en orina',             u: 'mg/dL',  mejor: 'info' },   // la sube la dapagliflozina
  { k: 'densidad_orina', n: 'Densidad de orina',            u: '',       min: 1010, max: 1030, mejor: 'rango' },
];

const labFuera = (t, v) => (t.min != null && v < t.min) || (t.max != null && v > t.max);
const labFecha = d => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
const labNum = v => Number.isInteger(v) ? String(v) : String(v).replace('.', ',');

// Qué es cada prueba y qué hacer si está fuera de rango o empeora (textos generales, sin datos de nadie)
const LAB_INFO = {
  hba1c:          ['Tu azúcar medio de los últimos 3 meses. En diabetes el objetivo habitual es bajar de 7 %.', 'Menos azúcar, refrescos y harina blanca; fuerza 3 veces por semana y bajar peso.'],
  glucosa:        ['Azúcar en sangre en ayunas: la foto de esa mañana.', 'Lo mismo que la HbA1c: comida, fuerza y peso.'],
  trigliceridos:  ['Grasa en sangre. Sube con azúcar, alcohol y harinas.', 'Fuera refrescos y bollería; pescado azul dos o tres veces por semana.'],
  hdl:            ['Colesterol «bueno»: recoge la grasa de las arterias. Cuanto más, mejor.', 'Sube con fuerza, bajando peso y con menos azúcar. No se trata con pastillas.'],
  ldl:            ['Colesterol «malo». En diabetes se pide por debajo de 100.', 'Menos embutido y grasa saturada; más legumbre y fibra. Coméntalo con tu médico.'],
  no_hdl:         ['Todo el colesterol que no es el bueno. Buen resumen del riesgo.', 'Baja con lo mismo que los triglicéridos y el LDL.'],
  colesterol:     ['Colesterol total. Dice menos que el HDL y el LDL por separado.', 'Fíjate en el HDL y el LDL.'],
  alt:            ['Enzima del hígado. Alta = hígado que sufre, casi siempre por grasa.', 'Baja al perder peso (con un 7–10 % menos suele normalizarse). Nada de alcohol.'],
  ast:            ['Otra enzima del hígado.', 'Igual que la ALT: bajar peso y nada de alcohol.'],
  ggt:            ['Enzima del hígado muy sensible al alcohol.', 'Evitar el alcohol.'],
  bilirrubina:    ['Pigmento de la bilis. En el síndrome de Gilbert sale en el límite y no tiene importancia.', ''],
  ck:             ['Enzima del músculo. Sube tras caminar mucho o hacer esfuerzo los días antes.', 'Normal si has hecho ejercicio; si sigue alta en reposo, coméntalo.'],
  creatinina:     ['Riñón: cómo elimina desechos.', 'Ojo con la creatina en polvo: la sube sin que el riñón esté mal. Avisa al médico.'],
  filtrado:       ['Cuánto filtra el riñón. Por encima de 60 está bien.', 'Es lo primero que daña la diabetes: que te lo miren cada año.'],
  acido_urico:    ['Sube con carne roja, marisco y alcohol.', 'Menos carne roja y marisco, más agua.'],
  b12:            ['Vitamina. La metformina puede bajarla con los años.', 'Si baja, díselo a tu médico.'],
  tsh:            ['Tiroides.', 'Fuera de rango: consulta a tu médico.'],
  glucosa_orina:  ['Azúcar en la orina. La dapagliflozina la sube a propósito: así funciona.', ''],
  densidad_orina: ['Lo concentrada que está la orina. Alta = bebes poca agua.', 'Bebe más agua, sobre todo si tomas dapagliflozina.'],
};

// Iconos de línea en el color del texto del botón (blanco sobre azul); los emojis traen su propio color
const ICONO = (() => {
  const svg = trazos => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazos}</svg>`;
  const hoja = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>';
  return {
    pdf: svg(hoja),
    adjuntar: svg(hoja + '<line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>'),
    papelera: svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'),
  };
})();

const labFechaLarga = d => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const labDebe = t => t.min != null && t.max != null ? `${labNum(t.min)} – ${labNum(t.max)}`
  : t.max != null ? `≤ ${labNum(t.max)}` : t.min != null ? `≥ ${labNum(t.min)}` : 'sin rango';

// a → b de una prueba: mejora, empeora, igual o informativo
function labComparar(t, a, b) {
  if (t.mejor === 'info') return { icono: 'ℹ️', clase: 'info', txt: 'informativo' };
  if (a === b) return { icono: '＝', clase: 'igual', txt: 'igual' };
  // 'rango': solo cuenta entrar o salir del rango; si no cambia de lado, se queda en "igual"
  const mejora = t.mejor === 'bajo' ? b < a
               : t.mejor === 'alto' ? b > a
               : labFuera(t, a) === labFuera(t, b) ? null : labFuera(t, a);
  return mejora === true ? { icono: '✅', clase: 'mejora', txt: 'mejora' }
       : mejora === false ? { icono: '❌', clase: 'peora', txt: 'empeora' }
       : { icono: '＝', clase: 'igual', txt: 'igual' };
}

let labCmp = {};   // qué dos análisis se comparan (por defecto, el anterior y el último)

function renderAnalisis() {
  const tabla = document.getElementById('labsTabla'), resumen = document.getElementById('labsResumen');
  if (!tabla || !resumen) return;
  const labs = Storage.get('labs', []).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (!labs.length) {
    tabla.innerHTML = '<div class="meta-aviso">Aún no hay análisis. Pulsa «Añadir análisis» y elige el PDF del laboratorio.</div>';
    resumen.innerHTML = '<div class="meta-aviso">Aparecerá cuando tengas dos análisis.</div>';
    return;
  }
  // Un desplegable por análisis, el más reciente arriba: tu valor, cuánto debería estar y qué es
  tabla.innerHTML = labs.slice().reverse().map(l => {
    const pruebas = LAB_TESTS.filter(t => l.values[t.k] != null);
    const fuera = pruebas.filter(t => t.mejor !== 'info' && labFuera(t, l.values[t.k])).length;
    return `<details class="lab-sec"><summary><div class="lab-tit">📅 ${labFechaLarga(l.date)}` +
      `<small>${pruebas.length} pruebas · ${fuera ? `⚠️ ${fuera} fuera de rango` : '✅ todo en rango'}</small></div><span class="lab-flecha"></span></summary>` +
      `<div class="lab-cuerpo"><button class="btn btn-primary lab-pdf" data-fecha="${l.date}" title="Adjuntar PDF" aria-label="Adjuntar PDF">${ICONO.adjuntar}</button>` +
      `<button class="btn btn-red lab-pdf-quitar" data-fecha="${l.date}" title="Borrar PDF" aria-label="Borrar PDF" hidden>${ICONO.papelera}</button>` +
      pruebas.map(t => {
        const v = l.values[t.k], mal = t.mejor !== 'info' && labFuera(t, v);
        return `<div class="lab-fila ${mal ? 'fuera' : ''}"><div class="lab-fila-top"><span>${t.mejor === 'info' ? 'ℹ️' : mal ? '⚠️' : '✅'} ${t.n}</span>` +
          `<strong>${labNum(v)} <small>${t.u}</small></strong></div>` +
          `<div class="lab-fila-ref">Debería: ${labDebe(t)} ${t.u}</div><div class="lab-fila-que">${LAB_INFO[t.k][0]}</div></div>`;
      }).join('') + '</div></details>';
  }).join('');
  pdfFechas().then(fechas => tabla.querySelectorAll('.lab-pdf').forEach(b => {
    if (!fechas.includes(b.dataset.fecha)) return;
    b.innerHTML = ICONO.pdf; b.title = b.ariaLabel = 'Ver PDF';
    b.nextElementSibling.hidden = false;   // el botón de quitar solo aparece si hay PDF
  })).catch(() => {});

  // Comparativa entre dos análisis (se eligen con los desplegables) y sugerencias
  if (labs.length < 2) { resumen.innerHTML = '<div class="meta-aviso">Aparecerá cuando tengas dos análisis.</div>'; return; }
  const fechas = labs.map(l => l.date);
  if (!fechas.includes(labCmp.a) || !fechas.includes(labCmp.b)) labCmp = { a: fechas[fechas.length - 2], b: fechas[fechas.length - 1] };
  const prev = labs.find(l => l.date === labCmp.a), last = labs.find(l => l.date === labCmp.b);
  const opciones = sel => fechas.map(f => `<option value="${f}" ${f === sel ? 'selected' : ''}>${labFecha(f)}</option>`).join('');
  const comunes = LAB_TESTS.filter(t => prev.values[t.k] != null && last.values[t.k] != null);
  const filas = comunes.map(t => {
    const a = prev.values[t.k], b = last.values[t.k], c = labComparar(t, a, b);
    return `<div class="lab-cmp ${c.clase}"><span>${c.icono}</span><div>${t.n}<small>${labNum(a)} → <strong>${labNum(b)}</strong> ${t.u}</small></div><em>${c.txt}</em></div>`;
  });
  // Sugerencias: lo que empeora o sigue fuera de rango en el segundo análisis
  const sugerir = LAB_TESTS.filter(t => LAB_INFO[t.k][1] && last.values[t.k] != null && t.mejor !== 'info' &&
    (labFuera(t, last.values[t.k]) || (prev.values[t.k] != null && labComparar(t, prev.values[t.k], last.values[t.k]).clase === 'peora')));
  resumen.innerHTML =
    `<div class="lab-elegir"><select id="labCmpA">${opciones(labCmp.a)}</select><span>→</span><select id="labCmpB">${opciones(labCmp.b)}</select></div>` +
    (filas.length ? filas.join('') : '<div class="meta-aviso">Estos dos análisis no tienen pruebas en común.</div>') +
    (sugerir.length ? '<div class="lab-sug"><div class="lab-sug-tit">💡 Sugerencias</div>' +
      sugerir.map(t => `<div><strong>${t.n}:</strong> ${LAB_INFO[t.k][1]}</div>`).join('') + '</div>' : '');
}

document.getElementById('labsResumen').addEventListener('change', e => {
  if (e.target.id === 'labCmpA') labCmp.a = e.target.value;
  if (e.target.id === 'labCmpB') labCmp.b = e.target.value;
  renderAnalisis();
});

/* Leer el PDF del laboratorio: cada prueba es una línea «Nombre [*] valor unidad referencias».
   El patrón es cómo la llama el informe (Hospital Costa del Sol / SAS); otro laboratorio necesitaría los suyos. */
const LAB_PDF = {
  hba1c:          /^Hemoglobina glicosilada \(A1c\)/,
  glucosa:        /^Glucosa(?! \()/,
  trigliceridos:  /^Triglicéridos/,
  hdl:            /^Colesterol de HDL/,
  ldl:            /^Colesterol de LDL(?! \()/,
  no_hdl:         /^Colesterol no HDL \(calculado\)/,
  colesterol:     /^Colesterol(?= [*\d])/,
  alt:            /^Alanina transaminasa/,
  ast:            /^Aspartato transaminasa/,
  ggt:            /^Gamma glutamiltransferasa/,
  bilirrubina:    /^Bilirrubina total/,
  ck:             /^Creatina quinasa/,
  creatinina:     /^Creatinina(?= [*\d])/,
  filtrado:       /^Filtrado glomerular.*?\(estimado\)/,
  acido_urico:    /^Ácido úrico/,
  b12:            /^Vitamina B12/,
  tsh:            /^Tirotropina/,
  glucosa_orina:  /^Glucosa \(orina; tira color\)/,
  densidad_orina: /^Densidad \(orina; tira color\)/,
};
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';

async function labLeerPdf(archivo) {
  const pdfjs = await import(PDFJS + 'pdf.min.mjs');          // solo se descarga cuando eliges un PDF
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
  const lineas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    // pdf.js da trozos de texto con su posición: se juntan en líneas por altura (y), de izquierda a derecha
    const filas = {};
    (await (await doc.getPage(p)).getTextContent()).items.forEach(it => {
      const y = Math.round(it.transform[5]);
      (filas[y] ??= []).push(it);
    });
    Object.keys(filas).sort((a, b) => b - a).forEach(y =>
      lineas.push(filas[y].sort((a, b) => a.transform[4] - b.transform[4]).map(it => it.str).join(' ').replace(/\s+/g, ' ').trim()));
  }
  const valores = {};
  for (const [k, patron] of Object.entries(LAB_PDF)) {
    for (const linea of lineas) {
      const m = linea.match(patron);
      if (!m) continue;
      const num = linea.slice(m[0].length).match(/^\s*\*?\s*(\d+(?:,\d+)?)/);
      if (num) { valores[k] = parseFloat(num[1].replace(',', '.')); break; }
    }
  }
  // la fecha va en una tabla: «… Fecha de toma de muestra …» y en la línea de abajo, la primera fecha
  const f = lineas.join('\n').match(/Fecha de toma de muestra[^\n]*\n[^\n]*?(\d{2})\/(\d{2})\/(\d{4})/);
  return { fecha: f ? `${f[3]}-${f[2]}-${f[1]}` : null, valores };
}

document.getElementById('labAddBtn').addEventListener('click', () => {
  const form = document.getElementById('labForm');
  if (form.style.display !== 'none') { form.style.display = 'none'; return; }
  form.innerHTML =
    '<label class="btn btn-primary btn-full lab-pdf-elegir">📄 Elegir el PDF del análisis<input type="file" id="labPdfInput" accept="application/pdf" hidden></label>' +
    '<div class="meta-aviso" id="labPdfEstado">Lo leo y relleno la fecha y los valores; tú solo revisas y guardas. El PDF se queda guardado con el análisis.</div>' +
    `<div class="setup-field" style="margin-top:12px;"><label>Fecha del análisis</label><input type="date" id="labDate" value="${new Date().toISOString().slice(0, 10)}"></div>` +
    '<div id="labLeidos"></div>' +
    '<details class="lab-mano"><summary>Rellenar o corregir a mano</summary>' +
    LAB_TESTS.map(t => `<div class="lab-input"><label for="lab_${t.k}">${t.n}</label><input type="number" step="any" id="lab_${t.k}" placeholder="${t.u || '—'}"></div>`).join('') +
    '</details><button class="btn btn-green btn-full" id="labSaveBtn" style="margin-top:12px;">Guardar análisis</button>';
  form.style.display = 'block';
  document.getElementById('labPdfInput').addEventListener('change', async e => {
    const estado = document.getElementById('labPdfEstado'), archivo = e.target.files[0];
    if (!archivo) return;
    estado.textContent = `Leyendo ${archivo.name}…`;
    try {
      const { fecha, valores } = await labLeerPdf(archivo);
      if (fecha) document.getElementById('labDate').value = fecha;
      LAB_TESTS.forEach(t => { document.getElementById('lab_' + t.k).value = valores[t.k] ?? ''; });
      const leidas = LAB_TESTS.filter(t => valores[t.k] != null);
      estado.textContent = `📄 ${archivo.name} · ${leidas.length} valores leídos${fecha ? ' · fecha ' + labFecha(fecha) : ' · no encontré la fecha: ponla tú'}`;
      document.getElementById('labLeidos').innerHTML = leidas.length
        ? '<table class="labs">' + leidas.map(t => `<tr><td>${t.n}</td><td class="n ${labFuera(t, valores[t.k]) ? 'fuera' : ''}">${labNum(valores[t.k])} <small>${t.u}</small></td></tr>`).join('') + '</table>'
        : '<div class="meta-aviso">No he encontrado ningún valor conocido en este PDF. Rellénalos a mano abajo.</div>';
    } catch {
      estado.textContent = 'No he podido leer ese PDF. Se guardará igual; rellena los valores a mano abajo.';
    }
  });
  document.getElementById('labSaveBtn').addEventListener('click', async () => {
    const date = document.getElementById('labDate').value, values = {};
    LAB_TESTS.forEach(t => { const v = parseFloat(document.getElementById('lab_' + t.k).value); if (!isNaN(v)) values[t.k] = v; });
    if (!date || !Object.keys(values).length) return showToast('Pon la fecha y al menos un valor');
    const todos = Storage.get('labs', []);
    if (todos.some(l => l.date === date) && !confirm(`Ya tienes un análisis del ${labFecha(date)}. ¿Sustituirlo por este?`)) return;
    const labs = todos.filter(l => l.date !== date);   // misma fecha: se sustituye (tras preguntar)
    labs.push({ date, values });
    Storage.set('labs', labs);
    const pdf = document.getElementById('labPdfInput').files[0];
    if (pdf) await pdfGuardar(date, pdf);
    form.style.display = 'none';
    renderAnalisis();
    showToast('Análisis guardado ✓');
  });
});

/* PDF oficiales de los análisis: en IndexedDB (localStorage no aguanta archivos). Solo en este aparato
   y fuera de la copia JSON. Clave = fecha del análisis. */
function pdfOp(modo, pedir) {
  return new Promise((ok, ko) => {
    const abrir = indexedDB.open('health-tracker', 1);
    abrir.onupgradeneeded = () => abrir.result.createObjectStore('labPdfs');
    abrir.onerror = () => ko(abrir.error);
    abrir.onsuccess = () => {
      const tx = abrir.result.transaction('labPdfs', modo);
      tx.oncomplete = () => abrir.result.close();
      const req = pedir(tx.objectStore('labPdfs'));
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ko(req.error);
    };
  });
}
const pdfGuardar = (fecha, archivo) => pdfOp('readwrite', s => s.put(archivo, fecha));
const pdfLeer = fecha => pdfOp('readonly', s => s.get(fecha));
const pdfFechas = () => pdfOp('readonly', s => s.getAllKeys());
const pdfBorrar = fecha => pdfOp('readwrite', s => s.delete(fecha));

// Un clic en el botón de una fecha: si tiene PDF lo abre; si no, pide uno para adjuntarlo
document.getElementById('labsTabla').addEventListener('click', async e => {
  const quitar = e.target.closest('.lab-pdf-quitar');
  if (quitar) {
    if (!confirm(`¿Borrar el PDF del análisis del ${labFecha(quitar.dataset.fecha)}?\n\nLos valores se quedan; solo se borra el archivo.`)) return;
    await pdfBorrar(quitar.dataset.fecha);
    renderAnalisis();
    return showToast('PDF borrado');
  }
  const btn = e.target.closest('.lab-pdf');
  if (!btn) return;
  const fecha = btn.dataset.fecha, pdf = await pdfLeer(fecha);
  if (pdf) return window.open(URL.createObjectURL(pdf));
  const input = document.getElementById('labPdfFile');
  input.dataset.fecha = fecha;
  input.click();
});
document.getElementById('labPdfFile').addEventListener('change', async e => {
  const pdf = e.target.files[0];
  e.target.value = '';
  if (!pdf) return;
  await pdfGuardar(e.target.dataset.fecha, pdf);
  renderAnalisis();
  showToast('PDF guardado ✓');
});

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
      <span class="meta-falta">${hecho ? '✅ Conseguido' : `te faltan <strong>${falta.toFixed(1)} kg</strong>`}</span>
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

  let html = '<div class="plan-cards">';

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
      html += `<button class="plan-check ${checks[i] ? 'checked' : ''}" data-w="${w}" data-idx="${i}">${checks[i] ? '✓' : num}</button>`;
    });
    html += `</div>`;
    html += `<div class="plan-inputs">`;
    html += `<div class="plan-input-group">`;
    html += `<span class="plan-target"><span>${targetWeight}</span> kg</span>`;
    html += `<input type="number" step="0.1" min="30" max="300" value="${actualWeight}" placeholder="" data-w="${w}" data-field="weight">`;
    html += `</div>`;
    html += `<div class="plan-input-group">`;
    html += `<span class="plan-target"><span>${targetWaist}</span> cm</span>`;
    html += `<input type="number" step="0.1" min="40" max="200" value="${actualWaist}" placeholder="" data-w="${w}" data-field="waist">`;
    html += `</div>`;
    html += `</div>`;
    html += `</div>`;

    html += `</div>`;
  }

  html += '</div>';
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
      const row = container.querySelector(`div[data-week="${wk}"]`);
      const checks = [];
      row.querySelectorAll('.plan-check').forEach(c => {
        if (parseInt(c.dataset.idx) === idx) {
          c.classList.toggle('checked');
          c.textContent = c.classList.contains('checked') ? '✓' : parseInt(c.dataset.idx) + 1;
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

document.querySelectorAll('.block-btn').forEach(btn => {
  btn.addEventListener('click', () => { currentBlock = btn.dataset.block; renderWorkoutPhase('strength'); });
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
  { id: 'goal', icon: '🎯', name: 'Peso objetivo', desc: 'Llegas a tu peso objetivo', check: () => { const w = Storage.get('weights', []); const g = Storage.get('settings', {}).goalWeight; return w.length && g && w[w.length - 1].weight <= g; } },
  { id: 'waist1', icon: '📏', name: '1 cm menos', desc: 'Primer cm de cintura perdido', check: () => { const w = Storage.get('waists', []); return w.length >= 2 && (w[0].waist - w[w.length - 1].waist) >= 1; } },
  { id: 'whtr', icon: '💚', name: 'Ratio saludable', desc: 'Cintura/altura < 0.5', check: () => { const w = Storage.get('waists', []); const h = getHeightCm(); return w.length && h && (w[w.length - 1].waist / h) < 0.5; } }
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

/* ===== COPIA DE SEGURIDAD (exportar / importar) ===== */
// Los datos viven en localStorage de ESTE navegador: la copia permite llevarlos a otro aparato.
// Formato: cabecera (app, versión, fecha) + todas las claves 'ht_' tal cual (patrón de Crypto_Portafolio).
const BACKUP_APP = 'health-tracker', BACKUP_VERSION = 1;

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('ht_')) data[k.slice(3)] = Storage.get(k.slice(3));
  }
  const fecha = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }, null, 2)],
                        { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `health-tracker-${fecha}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Copia descargada ✓');
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());

document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';                                   // para poder elegir el mismo archivo otra vez
  if (!file) return;
  let copia;
  try { copia = JSON.parse(await file.text()); } catch { return showToast('Ese archivo no es una copia válida'); }
  if (copia?.app !== BACKUP_APP || !copia.data) return showToast('Ese archivo no es una copia de Health Tracker');
  const d = copia.data, n = k => Array.isArray(d[k]) ? d[k].length : 0;
  // Archivo que solo trae análisis: se AÑADEN (misma fecha → se sustituye), sin borrar nada más
  if (Object.keys(d).length === 1 && Array.isArray(d.labs)) {
    if (!confirm(`Este archivo trae ${n('labs')} análisis. Se añaden a los que ya tienes (sin borrar nada más). ¿Continuar?`)) return;
    const fechas = new Set(d.labs.map(l => l.date));
    Storage.set('labs', Storage.get('labs', []).filter(l => !fechas.has(l.date)).concat(d.labs));
    renderAnalisis();
    return showToast(`${n('labs')} análisis añadidos ✓`);
  }
  const cuando = copia.exportedAt ? new Date(copia.exportedAt).toLocaleDateString('es-ES') : 'fecha desconocida';
  if (!confirm(`Copia del ${cuando}: ${n('weights')} pesos, ${n('waists')} cinturas, ${n('trainings')} entrenos.\n\n` +
               'Esto SUSTITUYE los datos de este aparato. ¿Continuar?')) return;
  Object.keys(localStorage).filter(k => k.startsWith('ht_')).forEach(k => localStorage.removeItem(k));
  Object.entries(d).forEach(([k, v]) => Storage.set(k, v));
  location.reload();
});

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
