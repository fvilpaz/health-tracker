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

  for (const clave of Object.keys(entrada)) {
    if (!['settings', 'startDate', 'weights', 'waists', 'sessions', 'labs', 'plan', 'logros', 'theme', 'trainings'].includes(clave)) descartados++;
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
