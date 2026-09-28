/* Medidas: guardar peso, altura y cintura, y el historial de peso (con borrar). Se movió tal cual desde
   app.js (28-sep-2026). */

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
