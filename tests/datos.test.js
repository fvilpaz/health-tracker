// Pruebas de lo que puede PERDER o CORROMPER datos (hallazgos de la revisión del 28-sep-2026).
// Datos inventados (el repo es público).
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));
const hoyIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

test('configurar el plan NO borra los pesos y cinturas que ya tenías', () => {
  const app = crearApp(), S = app.get('Storage');
  S.set('weights', [{ date: '1/9/2026', weight: 92 }, { date: '8/9/2026', weight: 91.4 }]);
  S.set('waists', [{ date: '1/9/2026', waist: 103 }]);
  app.get('guardarConfiguracion')({ date: '2026-09-14', weeks: 12, weight: 90.8, waist: 102, height: 175 });
  assert.deepEqual(plano(S.get('weights')).map(w => w.weight), [92, 91.4, 90.8]);
  assert.deepEqual(plano(S.get('waists')).map(w => w.waist), [103, 102]);
});

test('anotarMedida deja la lista ordenada por fecha aunque se apunte un día anterior', () => {
  const lista = crearApp().get('anotarMedida')([{ date: '10/9/2026', weight: 90 }], 'weight', 91, '3/9/2026');
  assert.deepEqual(plano(lista).map(e => e.date), ['3/9/2026', '10/9/2026']);
});

test('fechaEs escribe d/m/aaaa sin depender del idioma del navegador', () => {
  assert.equal(crearApp().get('fechaEs')(new Date('2026-03-05T12:00')), '5/3/2026');
});

test('limpiarCopia: fechas que no existen o fuera de época, fuera', () => {
  const r = crearApp().get('limpiarCopia')({
    weights: [{ date: '31/2/2026', weight: 90 }, { date: '1/1/0001', weight: 90 }, { date: '1/1/2026', weight: 90 }],
    sessions: [{ date: '0001-01-01', block: '1' }, { date: '2026-02-30', block: '1' }, { date: '1999-06-01', block: '1' },
               { date: '2099-01-01', block: '1' }, { date: '2026-01-05', block: '1' }],   // 1999 y 2099 existen, pero fuera de época
    labs: [{ date: '2026-13-45', values: { hba1c: 6 } }, { date: '2026-01-10', values: { hba1c: 6 } }],
  });
  assert.deepEqual(plano(r.datos.weights).map(w => w.date), ['1/1/2026']);
  assert.deepEqual(plano(r.datos.sessions).map(s => s.date), ['2026-01-05']);
  assert.deepEqual(plano(r.datos.labs).map(l => l.date), ['2026-01-10']);
  assert.equal(r.descartados, 7);   // 2 pesos, 4 sesiones, 1 análisis
});

test('limpiarCopia: valores absurdos fuera (mismos rangos que al apuntarlos a mano)', () => {
  const r = crearApp().get('limpiarCopia')({
    settings: { height: 1, goalWeight: -3, totalWeeks: 12 },
    weights: [{ date: '1/1/2026', weight: -5 }, { date: '2/1/2026', weight: 88 }],
    waists: [{ date: '1/1/2026', waist: 999 }],
    sessions: [{ date: '2026-01-05', block: '1', minutes: -4 }, { date: '2026-01-06', block: '1', minutes: 15 }],
  });
  assert.deepEqual(plano(r.datos.settings), { totalWeeks: 12 });
  assert.deepEqual(plano(r.datos.weights).map(w => w.weight), [88]);
  assert.deepEqual(plano(r.datos.waists), []);
  assert.deepEqual(plano(r.datos.sessions).map(s => s.date), ['2026-01-06']);
  assert.equal(r.descartados, 2 + 1 + 1 + 1);   // altura y objetivo, un peso, la cintura, una sesión
});

test('limpiarCopia: guarda solo los campos conocidos (nada de colar texto extra) y sin análisis repetidos', () => {
  const r = crearApp().get('limpiarCopia')({
    weights: [{ date: '1/1/2026', weight: 90, basura: 'x'.repeat(1000) }],
    labs: [{ date: '2026-01-10', values: { hba1c: 6 }, nota: '<img onerror=x>' }, { date: '2026-01-10', values: { hba1c: 5.9 } }],
  });
  assert.deepEqual(plano(r.datos.weights), [{ date: '1/1/2026', weight: 90 }]);
  assert.deepEqual(plano(r.datos.labs), [{ date: '2026-01-10', values: { hba1c: 5.9 } }]);   // se queda el último
});

test('limpiarCopia: listas enormes se recortan (un archivo no puede congelar la app)', () => {
  const muchas = Array.from({ length: 6000 }, () => ({ date: '2026-01-05', block: '1' }));
  const r = crearApp().get('limpiarCopia')({ sessions: muchas });
  assert.ok(r.datos.sessions.length <= 5000);
});

test('importar una copia completa que no trae análisis conserva los que ya tenías', () => {
  const app = crearApp(), S = app.get('Storage');
  S.set('labs', [{ date: '2026-01-10', values: { hba1c: 6 } }]);
  S.set('weights', [{ date: '1/1/2026', weight: 95 }]);
  const r = app.get('aplicarCopiaCompleta')({ weights: [{ date: '2/1/2026', weight: 90 }] });
  assert.equal(r.ok, true);
  assert.deepEqual(plano(S.get('weights')), [{ date: '2/1/2026', weight: 90 }]);
  assert.deepEqual(plano(S.get('labs')).map(l => l.date), ['2026-01-10']);
});

test('si el almacén se llena a mitad de importar, se deja todo como estaba y se avisa', () => {
  const app = crearApp({ limite: 400 }), S = app.get('Storage');
  S.set('weights', [{ date: '1/1/2026', weight: 95 }]);
  const antes = [...app.almacen.entries()];
  const grande = Array.from({ length: 40 }, (_, i) => ({ date: `${i % 28 + 1}/1/2026`, weight: 80 + i / 10 }));
  const r = app.get('aplicarCopiaCompleta')({ weights: grande, waists: grande.map(g => ({ date: g.date, waist: 100 })) });
  assert.equal(r.ok, false);
  assert.deepEqual([...app.almacen.entries()], antes);
});

test('fecha por defecto de hoy en hora local (no la de Londres/UTC)', () => {
  assert.equal(crearApp().get('isoDate')(new Date()), hoyIso());
});
