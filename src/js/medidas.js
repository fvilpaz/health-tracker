/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (catálogos, campos) o ya validadas; nunca texto de fuera sin comprobar (revisado 28-sep-2026) */
/* Medidas: guardar peso, altura, cintura y barriga, y el historial de peso (con borrar). Se movió tal cual desde
   app.js (28-sep-2026). */

// Rangos admitidos; fuera de ellos se avisa (antes el botón no hacía nada y parecía roto)
const RANGO = { weight: [30, 300, 'un peso', 'kg'], waist: [40, 200, 'una cintura', 'cm'], belly: [40, 200, 'una barriga', 'cm'], height: [120, 230, 'una altura', 'cm'] };
const avisoRango = campo => { const [min, max, nombre, unidad] = RANGO[campo]; return `Pon ${nombre} entre ${min} y ${max} ${unidad}`; };
function medidaValida(campo, valor) {
  const [min, max] = RANGO[campo];
  if (!isNaN(valor) && valor >= min && valor <= max) return true;
  showToast(avisoRango(campo));
  return false;
}

// Las casillas de «Registrar medidas»: campo del dato → id de la casilla. Un solo botón «Guardar» las manda todas.
const CASILLAS_MEDIDAS = [['weight', 'weightInput'], ['waist', 'waistInput'], ['belly', 'bellyInput'], ['height', 'heightInput']];

// Lo escrito en las casillas ({ campo: texto }) → { campo: número } solo con las que tienen algo; o { error }.
// Se comprueba TODO antes de guardar nada: con una casilla mal, no se guarda ninguna (nada queda a medias).
function medidasEscritas(textos) {
  const r = {};
  for (const [campo] of CASILLAS_MEDIDAS) {
    const t = String(textos[campo] ?? '').trim().replace(',', '.');
    if (t === '') continue;
    const v = campo === 'height' ? parseInt(t, 10) : Number(t);
    if (!(v >= RANGO[campo][0] && v <= RANGO[campo][1])) return { error: avisoRango(campo) };
    r[campo] = v;
  }
  return Object.keys(r).length ? r : { error: 'Escribe al menos una medida' };
}

// La tecla «Intro»/«Ir» del teclado del móvil guarda (antes no hacía nada)
CASILLAS_MEDIDAS.forEach(([, id]) => {
  document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('guardarMedidasBtn').click(); });
});

// Añade la medida de «fecha» a la lista; si ya había una ese día, la sustituye (una por día).
// La deja ordenada por fecha: «la primera» y «la última» (inicial y actual) son por fecha, no por orden de apunte.
function anotarMedida(lista, campo, valor, fecha) {
  const i = lista.findIndex(e => e.date === fecha);
  if (i >= 0) lista[i][campo] = valor;
  else lista.push({ date: fecha, [campo]: valor });
  return lista.sort((a, b) => esAIso(a.date).localeCompare(esAIso(b.date)));
}

// Día de la medida: el del campo de fecha (hoy por defecto; uno anterior sirve para apuntar una medida que se te pasó).
// Devuelve «d/m/aaaa» o null si la fecha no vale (vacía, que no existe o futura).
const campoFechaMedida = document.getElementById('medidaFecha');
if (campoFechaMedida) campoFechaMedida.max = campoFechaMedida.value = isoDate(new Date());
function fechaMedida() {
  const iso = campoFechaMedida?.value || isoDate(new Date());
  if (!esFechaIso(iso) || iso > isoDate(new Date())) { showToast('Pon el día de la medida (hoy o uno anterior)'); return null; }
  return fechaEs(new Date(iso + 'T12:00'));
}

/* ===== GUARDAR: peso, cintura, barriga y altura de una vez ===== */
document.getElementById('guardarMedidasBtn')?.addEventListener('click', () => {
  const m = medidasEscritas(Object.fromEntries(CASILLAS_MEDIDAS.map(([campo, id]) => [campo, document.getElementById(id).value])));
  if (m.error) return showToast(m.error);
  const fecha = fechaMedida();
  if (!fecha) return;

  const guardadas = [];
  if (m.weight !== undefined) {
    Storage.set('weights', anotarMedida(Storage.get('weights', []), 'weight', m.weight, fecha));
    if (!Storage.get('startDate')) Storage.set('startDate', new Date().toISOString());
    guardadas.push('peso');
  }
  if (m.waist !== undefined) { Storage.set('waists', anotarMedida(Storage.get('waists', []), 'waist', m.waist, fecha)); guardadas.push('cintura'); }
  // Barriga: la cinta por el ombligo (la cintura es donde va el cinturón). Se guarda igual que la cintura.
  if (m.belly !== undefined) { Storage.set('bellies', anotarMedida(Storage.get('bellies', []), 'belly', m.belly, fecha)); guardadas.push('barriga'); }
  if (m.height !== undefined) {
    Storage.set('settings', { ...Storage.get('settings', {}), height: m.height });
    document.getElementById('heightInput').placeholder = `Altura: ${m.height}`;
    guardadas.push('altura');
  }
  CASILLAS_MEDIDAS.forEach(([, id]) => { document.getElementById(id).value = ''; });
  updateDashboard();
  renderWeightLog();            // los historiales y las gráficas de Progreso también
  renderWeightChart(Storage.get('weights', []));
  renderMedidasLog();
  renderMedidasChart();
  checkLogros();
  showToast(`Guardado ✓ ${guardadas.join(', ')}`);
});

// Altura del usuario (cm), guardada en los ajustes. Sin altura: null (IMC y ratio muestran "--").
function getHeightCm() {
  return Storage.get('settings', {}).height || null;
}
if (getHeightCm()) document.getElementById('heightInput').placeholder = `Altura: ${getHeightCm()}`;   // la altura de ahora, en gris (la unidad va en la pastilla)

// Cintura y barriga juntas por fecha, de la más antigua a la más reciente; null si ese día falta una de las dos
function medidasPorFecha(waists, bellies) {
  const dias = new Map();
  waists.forEach(m => dias.set(m.date, { date: m.date, waist: m.waist, belly: null }));
  bellies.forEach(m => dias.set(m.date, { ...(dias.get(m.date) || { date: m.date, waist: null }), belly: m.belly }));
  return [...dias.values()].sort((a, b) => esAIso(a.date).localeCompare(esAIso(b.date)));
}

// Historial de cintura y barriga: una fila por día, la más reciente arriba; borrar quita las dos medidas de ese día
function renderMedidasLog() {
  const caja = document.getElementById('medidasLog');
  if (!caja) return;
  const filas = medidasPorFecha(Storage.get('waists', []), Storage.get('bellies', [])).reverse();
  if (!filas.length) {
    // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
    caja.innerHTML = '<div class="empty-state">' + duo('regla', 'vacio-ico') + '<div>Aún no hay registros de cintura ni barriga</div></div>';
    return;
  }
  caja.replaceChildren(...filas.map(f => {
    const fila = el('div', 'weight-entry medida-fila', '');
    const borrar = botonBorrar();
    borrar.addEventListener('click', () => {
      if (!confirm(`¿Borrar la cintura y la barriga del ${f.date}?`)) return;
      Storage.set('waists', Storage.get('waists', []).filter(m => m.date !== f.date));
      Storage.set('bellies', Storage.get('bellies', []).filter(m => m.date !== f.date));
      renderMedidasLog();
      renderMedidasChart();
      updateDashboard();
    });
    fila.append(el('span', 'w-date', f.date),
      celdaMedida('CINTURA', f.waist != null ? `${f.waist} cm` : '—'),
      celdaMedida('BARRIGA', f.belly != null ? `${f.belly} cm` : '—'), borrar);
    return fila;
  }));
}

// Piezas de las filas de los historiales (peso, cintura y barriga): la fecha arriba y debajo cada medida con su rótulo
// pequeño encima del valor, y la papelera. Así nada se pega ni se parte en el móvil.
const el = (tag, clase, texto) => { const e = document.createElement(tag); e.className = clase; e.textContent = texto; return e; };
function celdaMedida(rotulo, texto, clase = '') {
  const c = el('span', 'w-celda', '');
  c.append(el('span', 'w-rotulo', rotulo), el('span', 'w-value' + (clase ? ' ' + clase : ''), texto));
  return c;
}
function botonBorrar() {
  const b = el('button', 'w-del', '');
  // eslint-disable-next-line no-unsanitized/property -- solo el icono del propio código
  b.innerHTML = ICONO.cerrar;
  b.title = b.ariaLabel = 'Eliminar';
  return b;
}

function renderWeightLog() {
  const entries = Storage.get('weights', []);
  const container = document.getElementById('weightLog');
  if (!container) return;

  if (!entries.length) {
    // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
    container.innerHTML = '<div class="empty-state">' + duo('balanza', 'vacio-ico') + '<div>Aún no hay registros de peso</div></div>';
    return;
  }

  container.replaceChildren(...[...entries].reverse().map((e, i, arr) => {
    const prev = arr[i + 1];
    const diff = prev ? (e.weight - prev.weight).toFixed(1) : null;
    const diffClass = diff ? (diff < 0 ? 'down' : 'up') : '';
    const diffText = diff ? (diff < 0 ? diff + ' kg' : '+' + diff + ' kg') : '—';   // el primero no tiene con qué compararse

    const fila = el('div', 'weight-entry medida-fila', '');
    const borrar = botonBorrar();
    borrar.addEventListener('click', () => {
      // Se tocaba sin querer al desplazar la lista y no había vuelta atrás
      if (!confirm(`¿Borrar el peso del ${e.date}?`)) return;
      const updated = Storage.get('weights', []).filter(w => w.date !== e.date);
      Storage.set('weights', updated);
      renderWeightLog();
      renderWeightChart(updated);
      updateDashboard();
    });
    fila.append(el('span', 'w-date', e.date), celdaMedida('PESO', `${e.weight} kg`), celdaMedida('CAMBIO', diffText, diffClass), borrar);
    return fila;
  }));
}
