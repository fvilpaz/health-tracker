/* ===== COPIA: validar lo que llega al importar =====
   Un archivo de copia puede venir de cualquier sitio (o estar manipulado). Solo entran las claves
   conocidas y los datos con la forma correcta; lo demás se descarta y se cuenta. Así un archivo
   no puede colar HTML/JS en la app (se probó: un peso «<img onerror=…>» se ejecutaba al pintarlo). */
const esNum = v => typeof v === 'number' && Number.isFinite(v);
const esTexto = (v, max = 80) => typeof v === 'string' && v.length <= max;
const esFechaIso = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);                  // 2026-09-28
const esInstante = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?)?$/.test(v);
const esFechaEs = v => typeof v === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v);            // 28/9/2026

// Devuelve { datos, descartados }: «datos» solo con lo válido
function limpiarCopia(entrada) {
  let descartados = 0;
  const datos = {};
  const lista = (clave, valido) => {
    const v = entrada[clave];
    if (v === undefined) return;
    if (!Array.isArray(v)) { descartados++; return; }
    datos[clave] = v.filter(valido);
    descartados += v.length - datos[clave].length;
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
      if (esInstante(s.startDate)) datos.settings.startDate = s.startDate;
      if (Number.isInteger(s.totalWeeks) && s.totalWeeks > 0 && s.totalWeeks <= 104) datos.settings.totalWeeks = s.totalWeeks;
      if (esNum(s.goalWeight)) datos.settings.goalWeight = s.goalWeight;
      if (esNum(s.height)) datos.settings.height = s.height;
    } else descartados++;
  }
  if (entrada.startDate !== undefined) { if (esInstante(entrada.startDate)) datos.startDate = entrada.startDate; else descartados++; }
  if (entrada.theme !== undefined) { if (['dark', 'light'].includes(entrada.theme)) datos.theme = entrada.theme; else descartados++; }

  lista('weights', e => e && esFechaEs(e.date) && esNum(e.weight));
  lista('waists', e => e && esFechaEs(e.date) && esNum(e.waist));
  lista('trainings', esFechaEs);
  lista('logros', id => typeof id === 'string' && /^[a-z0-9_]{1,30}$/.test(id));
  lista('sessions', e => e && esFechaIso(e.date) && [null, '1', '2', '3'].includes(e.block ?? null) &&
    (e.minutes === undefined || esNum(e.minutes)) &&
    (e.exercises === undefined || (Array.isArray(e.exercises) && e.exercises.every(x => esTexto(x)))));
  const pruebas = new Set(LAB_TESTS.map(t => t.k));
  lista('labs', e => e && esFechaIso(e.date) && e.values && typeof e.values === 'object' &&
    Object.entries(e.values).every(([k, v]) => pruebas.has(k) && esNum(v)));

  const p = entrada.plan;
  if (p !== undefined) {
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      datos.plan = {};
      for (const [semana, v] of Object.entries(p)) {
        const ok = /^\d{1,3}$/.test(semana) && v && typeof v === 'object' &&
          (v.weight == null || esNum(v.weight)) && (v.waist == null || esNum(v.waist));
        if (ok) datos.plan[semana] = { weight: v.weight ?? null, waist: v.waist ?? null };
        else descartados++;
      }
    } else descartados++;
  }
  return { datos, descartados };
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
  if (!confirm(`Copia del ${cuando}: ${n('weights')} pesos, ${n('waists')} cinturas, ${n('sessions')} bloques de fuerza.\n\n` +
               `Esto SUSTITUYE los datos de este aparato.${aviso}\n\n¿Continuar?`)) return;
  Object.keys(localStorage).filter(k => k.startsWith('ht_')).forEach(k => localStorage.removeItem(k));
  Object.entries(d).forEach(([k, v]) => Storage.set(k, v));
  location.reload();
});
