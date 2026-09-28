/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (catálogos, campos) o ya validadas; nunca texto de fuera sin comprobar (revisado 28-sep-2026) */
/* ===== COPIA: validar lo que llega al importar =====
   Un archivo de copia puede venir de cualquier sitio (o estar manipulado). Solo entran las claves
   conocidas y los datos con la forma correcta; lo demás se descarta y se cuenta. Así un archivo
   no puede colar HTML/JS en la app (se probó: un peso «<img onerror=…>» se ejecutaba al pintarlo). */
const esNum = v => typeof v === 'number' && Number.isFinite(v);
const esTexto = (v, max = 80) => typeof v === 'string' && v.length <= max;
const enRango = (campo, v) => esNum(v) && v >= RANGO[campo][0] && v <= RANGO[campo][1];   // los mismos que a mano
const MAX_LISTA = 5000;   // una copia real no llega ni de lejos; evita que un archivo enorme congele la app

// Una fecha vale si EXISTE (no 31 de febrero) y es de esta época: desde 2000 hasta mañana.
// (Antes solo se miraba la forma: «0001-01-01» hacía que Mi semana recorriera 105.000 semanas y la app se congelaba.)
function fechaReal(y, m, d) {
  const f = new Date(Date.UTC(y, m - 1, d));
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d && y >= 2000 && f <= manana;
}
const esFechaIso = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && fechaReal(+v.slice(0, 4), +v.slice(5, 7), +v.slice(8, 10));
// eslint-disable-next-line security/detect-unsafe-regex -- medida: 1 ms con 100.000 caracteres maliciosos (grupos anclados y acotados)
const esInstante = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?)?$/.test(v) && esFechaIso(v.slice(0, 10));
const esFechaEs = v => typeof v === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v) && esFechaIso(esAIso(v));

// Devuelve { datos, descartados }: «datos» solo con lo válido, y cada entrada rehecha solo con sus campos
// (así no se cuela ni texto extra ni HTML en campos que hoy no se pintan pero mañana quizá sí).
function limpiarCopia(entrada) {
  let descartados = 0;
  const datos = {};
  // «rehacer» devuelve la entrada limpia, o null si no vale
  const lista = (clave, rehacer) => {
    const v = entrada[clave];
    if (v === undefined) return;
    if (!Array.isArray(v)) { descartados++; return; }
    const buenas = v.map(rehacer).filter(x => x !== null);
    descartados += v.length - buenas.length;
    datos[clave] = buenas.slice(-MAX_LISTA);
  };

  // Claves que la app ya no usa (racha por días y calendario viejo): se ignoran sin contarlas como error,
  // porque vienen en cualquier copia hecha antes del 28-sep-2026.
  const obsoleta = clave => clave === 'streak' || clave.startsWith('calendar_');
  for (const clave of Object.keys(entrada)) {
    if (!['settings', 'startDate', 'weights', 'waists', 'sessions', 'labs', 'plan', 'logros', 'theme', 'trainings'].includes(clave) && !obsoleta(clave)) descartados++;
  }

  const s = entrada.settings;
  if (s !== undefined) {
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      datos.settings = {};
      const campo = (nombre, valido) => { if (s[nombre] === undefined) return; if (valido(s[nombre])) datos.settings[nombre] = s[nombre]; else descartados++; };
      campo('startDate', esInstante);
      campo('totalWeeks', v => Number.isInteger(v) && v >= 1 && v <= 104);
      campo('goalWeight', v => enRango('weight', v));
      campo('height', v => enRango('height', v));
    } else descartados++;
  }
  if (entrada.startDate !== undefined) { if (esInstante(entrada.startDate)) datos.startDate = entrada.startDate; else descartados++; }
  if (entrada.theme !== undefined) { if (['dark', 'light'].includes(entrada.theme)) datos.theme = entrada.theme; else descartados++; }

  lista('weights', e => e && esFechaEs(e.date) && enRango('weight', e.weight) ? { date: e.date, weight: e.weight } : null);
  lista('waists', e => e && esFechaEs(e.date) && enRango('waist', e.waist) ? { date: e.date, waist: e.waist } : null);
  lista('trainings', t => esFechaEs(t) ? t : null);
  lista('logros', id => typeof id === 'string' && /^[a-z0-9_]{1,30}$/.test(id) ? id : null);
  lista('sessions', e => {
    if (!e || !esFechaIso(e.date) || ![null, '1', '2', '3'].includes(e.block ?? null)) return null;
    if (e.minutes !== undefined && !(esNum(e.minutes) && e.minutes > 0 && e.minutes <= 180)) return null;
    if (e.exercises !== undefined && !(Array.isArray(e.exercises) && e.exercises.length <= 20 && e.exercises.every(x => esTexto(x)))) return null;
    const limpia = { date: e.date, block: e.block ?? null };
    if (e.minutes !== undefined) limpia.minutes = e.minutes;
    if (e.exercises !== undefined) limpia.exercises = [...e.exercises];
    return limpia;
  });
  const pruebas = new Set(LAB_TESTS.map(t => t.k));
  lista('labs', e => e && esFechaIso(e.date) && e.values && typeof e.values === 'object' && !Array.isArray(e.values) &&
    Object.entries(e.values).every(([k, v]) => pruebas.has(k) && esNum(v) && v >= 0 && v < 100000)
    ? { date: e.date, values: Object.fromEntries(Object.entries(e.values)) } : null);
  // Un análisis por fecha (la tabla, la comparativa y el PDF van por fecha): si viene repetida, se queda el último
  if (datos.labs) {
    const porFecha = new Map(datos.labs.map(l => [l.date, l]));
    descartados += datos.labs.length - porFecha.size;
    datos.labs = [...porFecha.values()];
  }

  const p = entrada.plan;
  if (p !== undefined) {
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      datos.plan = {};
      for (const [semana, v] of Object.entries(p)) {
        const ok = /^\d{1,3}$/.test(semana) && v && typeof v === 'object' &&
          (v.weight == null || enRango('weight', v.weight)) && (v.waist == null || enRango('waist', v.waist));
        if (ok) datos.plan[semana] = { weight: v.weight ?? null, waist: v.waist ?? null };
        else descartados++;
      }
    } else descartados++;
  }
  return { datos, descartados };
}

// Sustituye los datos del aparato por los de la copia sin riesgo de quedarse a medias: guarda lo que había,
// escribe, y si algo falla (el almacén se llena: el cupo se comparte con otras apps del mismo sitio) lo deja
// todo como estaba. Si la copia no trae análisis o tema, se conservan los que ya había (antes se borraban).
function aplicarCopiaCompleta(d) {
  const claves = () => Object.keys(localStorage).filter(k => k.startsWith('ht_'));
  const antes = claves().map(k => [k, localStorage.getItem(k)]);
  const datos = { ...d };
  for (const k of ['labs', 'theme']) if (datos[k] === undefined && Storage.get(k) !== null) datos[k] = Storage.get(k);
  try {
    claves().forEach(k => localStorage.removeItem(k));
    Object.entries(datos).forEach(([k, v]) => localStorage.setItem('ht_' + k, JSON.stringify(v)));
    return { ok: true, labs: datos.labs || [] };
  } catch {
    claves().forEach(k => localStorage.removeItem(k));
    antes.forEach(([k, v]) => localStorage.setItem(k, v));
    return { ok: false };
  }
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
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);   // en algunos móviles, liberarla al momento cortaba la descarga
  showToast('Copia descargada ✓');
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());

document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';                                   // para poder elegir el mismo archivo otra vez
  if (!file) return;
  let copia;
  try { copia = JSON.parse(await file.text()); } catch { return showToast('Ese archivo no es una copia válida'); }
  if (copia?.app !== BACKUP_APP || !copia.data || typeof copia.data !== 'object' || Array.isArray(copia.data)) return showToast('Ese archivo no es una copia de Health Tracker');
  // Solo entra lo que tiene la forma correcta (ver copia.js); lo descartado se avisa en la pregunta
  const { datos: d, descartados } = limpiarCopia(copia.data);
  const n = k => Array.isArray(d[k]) ? d[k].length : 0;
  const aviso = descartados ? `\n\n⚠ ${descartados} ${descartados === 1 ? 'dato no válido se ignora' : 'datos no válidos se ignoran'}.` : '';
  // Archivo que solo trae análisis: se AÑADEN (misma fecha → se sustituye), sin borrar nada más
  if (Object.keys(copia.data).length === 1 && Array.isArray(d.labs)) {
    if (!n('labs')) return showToast('El archivo no trae ningún análisis válido');
    if (!confirm(`Este archivo trae ${n('labs')} análisis. Se añaden a los que ya tienes (sin borrar nada más).${aviso}\n\n¿Continuar?`)) return;
    const fechas = new Set(d.labs.map(l => l.date));
    Storage.set('labs', Storage.get('labs', []).filter(l => !fechas.has(l.date)).concat(d.labs));
    renderAnalisis();
    return showToast(`${n('labs')} análisis añadidos ✓`);
  }
  const cuando = copia.exportedAt ? new Date(copia.exportedAt).toLocaleDateString('es-ES') : 'fecha desconocida';
  const analisis = d.labs ? `${n('labs')} análisis` : 'sin análisis (se conservan los tuyos)';
  if (!confirm(`Copia del ${cuando}: ${n('weights')} pesos, ${n('waists')} cinturas, ${n('sessions')} bloques de fuerza, ${analisis}.\n\n` +
               `Esto SUSTITUYE los datos de este aparato.${aviso}\n\n¿Continuar?`)) return;
  const r = aplicarCopiaCompleta(d);
  if (!r.ok) return showToast('No cabe en el almacenamiento del navegador: no se ha cambiado nada');
  // Los PDF van por fecha: los de análisis que ya no existen se quitan (si no, se pegarían a otro análisis de esa fecha)
  try {
    const quedan = new Set(r.labs.map(l => l.date));
    for (const fecha of await pdfFechas()) if (!quedan.has(fecha)) await pdfBorrar(fecha);
  } catch { /* sin IndexedDB no hay PDF que limpiar */ }
  location.reload();
});
