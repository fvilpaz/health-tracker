/* Análisis de sangre: catálogo de pruebas, tabla y comparativa, lector del PDF del laboratorio,
   PDF guardados (IndexedDB) y formulario. Se movió tal cual desde app.js (28-sep-2026). */

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
const labNum = v => esc(Number.isInteger(v) ? String(v) : String(v).replace('.', ','));

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

const labFechaLarga = d => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const labDebe = t => t.min != null && t.max != null ? `${labNum(t.min)} – ${labNum(t.max)}`
  : t.max != null ? `≤ ${labNum(t.max)}` : t.min != null ? `≥ ${labNum(t.min)}` : 'sin rango';

// a → b de una prueba: mejora, empeora, igual o informativo
// Cuánto se sale del rango (0 si está dentro)
const labDistancia = (t, v) => t.min != null && v < t.min ? t.min - v : t.max != null && v > t.max ? v - t.max : 0;

function labComparar(t, a, b) {
  if (t.mejor === 'info') return { icono: estado('info'), clase: 'info', txt: 'informativo' };
  if (a === b) return { icono: '＝', clase: 'igual', txt: 'igual' };
  // Si alguno está fuera de rango, manda la distancia al rango: acercarse mejora, alejarse empeora (también por
  // abajo: glucosa 65 → 55 es peor, antes salía «mejora»). Dentro del rango, el lado bueno de cada prueba.
  const da = labDistancia(t, a), db = labDistancia(t, b);
  const mejora = da || db ? (db === da ? null : db < da)
               : t.mejor === 'bajo' ? b < a
               : t.mejor === 'alto' ? b > a
               : null;
  return mejora === true ? { icono: estado('ok'), clase: 'mejora', txt: 'mejora' }
       : mejora === false ? { icono: estado('mal'), clase: 'peora', txt: 'empeora' }
       : { icono: '＝', clase: 'igual', txt: 'igual' };
}

// Consejo para una prueba fuera de rango o que empeora. Los de LAB_INFO son para el lado malo habitual
// (glucosa ALTA, HDL BAJO…); si se sale por el otro lado, lo sensato es consultarlo.
function consejoPara(t, v) {
  const porElOtroLado = (t.mejor === 'bajo' && t.min != null && v < t.min) || (t.mejor === 'alto' && t.max != null && v > t.max);
  return porElOtroLado ? 'Está por debajo de lo normal: coméntalo con tu médico.'.replace('por debajo', t.mejor === 'alto' ? 'por encima' : 'por debajo')
                       : LAB_INFO[t.k][1];
}

let labCmp = {};   // qué dos análisis se comparan (por defecto, el anterior y el último)

function renderAnalisis() {
  const tabla = document.getElementById('labsTabla'), resumen = document.getElementById('labsResumen');
  if (!tabla || !resumen) return;
  const labs = Storage.get('labs', []).slice().sort((a, b) => a.date.localeCompare(b.date));
  // Los desplegables que tenías abiertos siguen abiertos al repintar (antes se cerraban todos)
  const abiertos = new Set([...tabla.querySelectorAll('details[open]')].map(d => d.dataset.fecha));
  if (!labs.length) {
    tabla.innerHTML = '<div class="meta-aviso">Aún no hay análisis. Pulsa «Añadir análisis» y elige el PDF del laboratorio.</div>';
    resumen.innerHTML = '<div class="meta-aviso">Aparecerá cuando tengas dos análisis.</div>';
    return;
  }
  // Un desplegable por análisis, el más reciente arriba: tu valor, cuánto debería estar y qué es
  tabla.innerHTML = labs.slice().reverse().map(l => {
    const pruebas = LAB_TESTS.filter(t => l.values[t.k] != null);
    const fuera = pruebas.filter(t => t.mejor !== 'info' && labFuera(t, l.values[t.k])).length;
    return `<details class="lab-sec" data-fecha="${esc(l.date)}"${abiertos.has(l.date) ? ' open' : ''}><summary><div class="lab-tit">${duo('semana', 'tit-ico')} ${esc(labFechaLarga(l.date))}` +
      `<small>${pruebas.length} pruebas · ${fuera ? `${estado('alerta')} ${fuera} fuera de rango` : `${estado('ok')} todo en rango`}</small></div><span class="lab-flecha"></span></summary>` +
      `<div class="lab-cuerpo"><button class="btn btn-primary lab-pdf" data-fecha="${esc(l.date)}" title="Adjuntar PDF" aria-label="Adjuntar PDF">${ICONO.adjuntar}</button>` +
      `<button class="btn btn-red lab-pdf-quitar" data-fecha="${esc(l.date)}" title="Borrar PDF" aria-label="Borrar PDF" hidden>${ICONO.papelera}</button>` +
      pruebas.map(t => {
        const v = l.values[t.k], mal = t.mejor !== 'info' && labFuera(t, v);
        return `<div class="lab-fila ${mal ? 'fuera' : ''}"><div class="lab-fila-top"><span>${estado(t.mejor === 'info' ? 'info' : mal ? 'alerta' : 'ok')} ${t.n}</span>` +
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
  const opciones = sel => fechas.map(f => `<option value="${esc(f)}" ${f === sel ? 'selected' : ''}>${esc(labFecha(f))}</option>`).join('');
  const comunes = LAB_TESTS.filter(t => prev.values[t.k] != null && last.values[t.k] != null);
  const filas = comunes.map(t => {
    const a = prev.values[t.k], b = last.values[t.k], c = labComparar(t, a, b);
    return `<div class="lab-cmp ${c.clase}"><span>${c.icono}</span><div>${t.n}<small>${labNum(a)} → <strong>${labNum(b)}</strong> ${t.u}</small></div><em>${c.txt}</em></div>`;
  });
  // Sugerencias: lo que empeora o sigue fuera de rango en el segundo análisis
  const sugerir = LAB_TESTS.filter(t => consejoPara(t, last.values[t.k] ?? 0) && last.values[t.k] != null && t.mejor !== 'info' &&
    (labFuera(t, last.values[t.k]) || (prev.values[t.k] != null && labComparar(t, prev.values[t.k], last.values[t.k]).clase === 'peora')));
  resumen.innerHTML =
    `<div class="lab-elegir"><select id="labCmpA" aria-label="Análisis de antes">${opciones(labCmp.a)}</select><span aria-hidden="true">→</span><select id="labCmpB" aria-label="Análisis de después">${opciones(labCmp.b)}</select></div>` +
    (filas.length ? filas.join('') : '<div class="meta-aviso">Estos dos análisis no tienen pruebas en común.</div>') +
    (sugerir.length ? '<div class="lab-sug"><div class="lab-sug-tit">' + duo('bombilla', 'estado idea') + ' Sugerencias</div>' +
      sugerir.map(t => `<div><strong>${t.n}:</strong> ${consejoPara(t, last.values[t.k])}</div>`).join('') + '</div>' : '');
}

document.getElementById('labsResumen').addEventListener('change', e => {
  if (e.target.id === 'labCmpA') labCmp.a = e.target.value;
  if (e.target.id === 'labCmpB') labCmp.b = e.target.value;
  const id = e.target.id;
  renderAnalisis();
  document.getElementById(id)?.focus();   // sigues en el mismo desplegable después de repintar
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
// pdf.js 4.10.38 servido desde aquí (ver vendor/README.md). Dirección completa: import() no acepta «vendor/…» a secas
// y con «./» la resolvería desde js/app.js (→ js/vendor/…), no desde la página.
const PDFJS = new URL('vendor/pdfjs/', document.baseURI).href;

async function labLeerPdf(archivo) {
  const pdfjs = await import(PDFJS + 'pdf.min.mjs');          // solo se descarga cuando eliges un PDF
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer(), isEvalSupported: false }).promise;   // sin eval: lo prohíbe la CSP
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
  return leerInforme(lineas);
}

// Del texto del informe (una línea por fila, espacios ya normalizados) saca la fecha de toma y los valores.
// Separado del PDF para poder probarlo sin navegador (tests/analisis.test.js).
function leerInforme(lineas) {
  const valores = {};
  for (const [k, patron] of Object.entries(LAB_PDF)) {
    for (const linea of lineas) {
      const m = linea.match(patron);
      if (!m) continue;
      // Los espacios ya van normalizados a uno: « * 154 …» → 154. Sin «\s*» dobles (backtracking cuadrático)
      // Coma o punto decimal y un «<»/«>» delante (algunos laboratorios: «0.88», «>90»)
      const num = linea.slice(m[0].length).match(/^ ?\*? ?[<>]? ?(\d+(?:[.,]\d+)?)/);
      if (num) {
        let v = parseFloat(num[1].replace(',', '.'));
        if (k === 'densidad_orina' && v < 2) v = Math.round(v * 1000);   // 1.035 es lo mismo que 1035
        valores[k] = v;
        break;
      }
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
    '<label class="btn btn-primary btn-full lab-pdf-elegir">' + ICONO.pdf + 'Elegir el PDF del análisis<input type="file" id="labPdfInput" accept="application/pdf" hidden></label>' +
    '<div class="meta-aviso" id="labPdfEstado">Lo leo y relleno la fecha y los valores; tú solo revisas y guardas. El PDF se queda guardado con el análisis.</div>' +
    `<div class="setup-field" style="margin-top:12px;"><label for="labDate">Fecha del análisis</label><input type="date" id="labDate" value="${isoDate(new Date())}"></div>` +
    '<div id="labLeidos"></div>' +
    '<details class="lab-mano"><summary>Rellenar o corregir a mano</summary>' +
    LAB_TESTS.map(t => `<div class="lab-input"><label for="lab_${t.k}">${t.n}</label><input type="number" step="any" inputmode="decimal" id="lab_${t.k}" placeholder="${t.u || '—'}"></div>`).join('') +
    '</details><button class="btn btn-green btn-full" id="labSaveBtn" style="margin-top:12px;">Guardar análisis</button>';
  form.style.display = 'block';
  document.getElementById('labPdfInput').addEventListener('change', async e => {
    const estadoPdf = document.getElementById('labPdfEstado'), archivo = e.target.files[0];
    if (!archivo) return;
    estadoPdf.textContent = `Leyendo ${archivo.name}…`;
    try {
      const { fecha, valores } = await labLeerPdf(archivo);
      if (fecha) document.getElementById('labDate').value = fecha;
      LAB_TESTS.forEach(t => { document.getElementById('lab_' + t.k).value = valores[t.k] ?? ''; });
      const leidas = LAB_TESTS.filter(t => valores[t.k] != null);
      estadoPdf.innerHTML = `${ICONO.pdf} ${esc(archivo.name)} · ${leidas.length} valores leídos${fecha ? ' · fecha ' + labFecha(fecha) : ' · no encontré la fecha: ponla tú'}`;
      document.getElementById('labLeidos').innerHTML = leidas.length
        ? '<table class="labs">' + leidas.map(t => `<tr><td>${t.n}</td><td class="n ${labFuera(t, valores[t.k]) ? 'fuera' : ''}">${labNum(valores[t.k])} <small>${t.u}</small></td></tr>`).join('') + '</table>'
        : '<div class="meta-aviso">No he encontrado ningún valor conocido en este PDF. Rellénalos a mano abajo.</div>';
    } catch {
      estadoPdf.textContent = 'No he podido leer ese PDF. Se guardará igual; rellena los valores a mano abajo.';
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
    let aviso = 'Análisis guardado ✓';
    if (pdf) aviso = await guardarPdfSeguro(date, pdf) ? aviso : 'Análisis guardado, pero el PDF no se pudo guardar';
    form.style.display = 'none';
    renderAnalisis();
    showToast(aviso);
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

// Solo se guardan PDF de verdad (empiezan por «%PDF-») y de 20 MB como mucho. Devuelve true si se guardó.
async function guardarPdfSeguro(fecha, archivo) {
  try {
    const cabecera = new TextDecoder().decode(await archivo.slice(0, 5).arrayBuffer());
    if (cabecera !== '%PDF-') { showToast('Ese archivo no es un PDF'); return false; }
    if (archivo.size > 20 * 1024 * 1024) { showToast('El PDF pesa más de 20 MB'); return false; }
    await pdfGuardar(fecha, archivo);
    return true;
  } catch { return false; }
}

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
  if (pdf) {
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));   // siempre como PDF: un HTML renombrado no se ejecuta
    window.open(url);
    return setTimeout(() => URL.revokeObjectURL(url), 60000);   // se libera la memoria (antes nunca)
  }
  const input = document.getElementById('labPdfFile');
  input.dataset.fecha = fecha;
  input.click();
});
document.getElementById('labPdfFile').addEventListener('change', async e => {
  const pdf = e.target.files[0];
  e.target.value = '';
  if (!pdf) return;
  if (!await guardarPdfSeguro(e.target.dataset.fecha, pdf)) return;
  renderAnalisis();
  showToast('PDF guardado ✓');
});
