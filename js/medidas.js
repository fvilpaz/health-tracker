/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (catálogos, campos) o ya validadas; nunca texto de fuera sin comprobar (revisado 28-sep-2026) */
/* Medidas: guardar peso, altura y cintura, y el historial de peso (con borrar). Se movió tal cual desde
   app.js (28-sep-2026). */

// Rangos admitidos; fuera de ellos se avisa (antes el botón no hacía nada y parecía roto)
const RANGO = { weight: [30, 300, 'un peso', 'kg'], waist: [40, 200, 'una cintura', 'cm'], height: [120, 230, 'una altura', 'cm'] };
function medidaValida(campo, valor) {
  const [min, max, nombre, unidad] = RANGO[campo];
  if (!isNaN(valor) && valor >= min && valor <= max) return true;
  showToast(`Pon ${nombre} entre ${min} y ${max} ${unidad}`);
  return false;
}

// La tecla «Intro»/«Ir» del teclado del móvil guarda (antes no hacía nada)
[['weightInput', 'saveWeightBtn'], ['waistInput', 'saveWaistBtn'], ['heightInput', 'saveHeightBtn']].forEach(([campo, boton]) => {
  document.getElementById(campo)?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById(boton).click(); });
});

// Añade la medida de «fecha» a la lista; si ya había una ese día, la sustituye (una por día).
// La deja ordenada por fecha: «la primera» y «la última» (inicial y actual) son por fecha, no por orden de apunte.
function anotarMedida(lista, campo, valor, fecha) {
  const i = lista.findIndex(e => e.date === fecha);
  if (i >= 0) lista[i][campo] = valor;
  else lista.push({ date: fecha, [campo]: valor });
  return lista.sort((a, b) => esAIso(a.date).localeCompare(esAIso(b.date)));
}

/* ===== PESO ===== */
document.getElementById('saveWeightBtn').addEventListener('click', () => {
  const input = document.getElementById('weightInput');
  const val = parseFloat(input.value);
  if (!medidaValida('weight', val)) return;

  const weights = anotarMedida(Storage.get('weights', []), 'weight', val, fechaEs(new Date()));

  if (!Storage.get('startDate')) Storage.set('startDate', new Date().toISOString());

  Storage.set('weights', weights);
  input.value = '';
  updateDashboard();
  renderWeightLog();            // el historial y la gráfica de Progreso también (antes seguían sin el peso nuevo)
  renderWeightChart(weights);
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
  if (!medidaValida('height', val)) return;
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
  if (!medidaValida('waist', val)) return;

  const waists = anotarMedida(Storage.get('waists', []), 'waist', val, fechaEs(new Date()));

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
    // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
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
    // eslint-disable-next-line no-unsanitized/property -- fecha y peso con esc(); diferencia calculada (número)
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
      // Se tocaba sin querer al desplazar la lista y no había vuelta atrás
      if (!confirm(`¿Borrar el peso del ${date}?`)) return;
      const updated = Storage.get('weights', []).filter(e => e.date !== date);
      Storage.set('weights', updated);
      renderWeightLog();
      renderWeightChart(updated);
      updateDashboard();
    });
  });
}
