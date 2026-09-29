/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 29-sep-2026) */
/* eslint-disable security/detect-object-injection -- claves del propio catálogo (revisado 29-sep-2026) */
// Tests del perfil (cuestionario): edad, menores, validación y guardado. Datos inventados (el repo es público).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));
const leer = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', f), 'utf8'));
const hoy = new Date(2026, 8, 29);

const PERFIL = {
  name: 'Ana', birthDate: '1985-03-10', sex: 'female', goal: 'health',
  conditions: ['asthma'], conditionsOther: '', medications: [], medicationsOther: '',
  level: 1, avoid: ['knees'], days: 3, minutes: 20, diet: 'all', allergies: ['lactose'], dislikes: 'brócoli',
};

test('edad: cumple años el día exacto, no antes', () => {
  const edad = crearApp().get('edad');
  assert.equal(edad('2008-09-29', hoy), 18);
  assert.equal(edad('2008-09-30', hoy), 17);
  assert.equal(edad('1980-01-01', hoy), 46);
});

test('esMenor: según el perfil guardado; sin perfil o sin fecha, no', () => {
  const app = crearApp(), S = app.get('Storage'), esMenor = app.get('esMenor');
  assert.equal(esMenor(hoy), false);
  S.set('profile', { ...PERFIL, birthDate: '2012-05-01' });
  assert.equal(esMenor(hoy), true);
  S.set('profile', PERFIL);
  assert.equal(esMenor(hoy), false);
});

test('limpiarPerfil: un perfil correcto entra entero', () => {
  const r = crearApp().get('limpiarPerfil')(PERFIL);
  assert.equal(r.descartados, 0);
  assert.deepEqual(plano(r.perfil), PERFIL);
});

test('limpiarPerfil: fuera lo que no tiene la forma correcta, y se cuenta', () => {
  const ataque = '<img src=x onerror="alert(1)">';
  const r = crearApp().get('limpiarPerfil')({
    ...PERFIL, sex: 'otro', goal: ataque, level: 9, days: 0, birthDate: '1800-01-01',
    conditions: ['asthma', ataque, 'asthma'], name: 'x'.repeat(41), campoRaro: 1,
  });
  assert.deepEqual(plano(r.perfil.conditions), ['asthma']);   // la rara fuera y sin repetir
  for (const k of ['sex', 'goal', 'level', 'days', 'birthDate', 'name', 'campoRaro']) assert.equal(r.perfil[k], undefined, k);
  assert.equal(r.descartados, 8);   // sexo, objetivo, nivel, días, fecha, nombre, una enfermedad rara, el campo raro
});

test('el perfil viaja en la copia y pasa por la misma limpieza', () => {
  const app = crearApp();
  const r = app.get('limpiarCopia')({ profile: { ...PERFIL, level: 9 } });
  assert.equal(r.datos.profile.level, undefined);
  assert.equal(r.datos.profile.name, 'Ana');
  assert.equal(r.descartados, 1);
});

test('configurar: un adulto tiene objetivo de peso; un menor NO, y la barriga se guarda si se da', () => {
  const adulto = crearApp();
  adulto.get('guardarConfiguracion')({ date: '2026-09-29', weeks: 12, weight: 90, waist: 100, belly: 108, height: 175 });
  assert.equal(adulto.get('Storage').get('settings').goalWeight, 83);
  assert.deepEqual(plano(adulto.get('Storage').get('bellies')), [{ date: '29/9/2026', belly: 108 }]);
  const menor = crearApp();
  menor.get('guardarConfiguracion')({ date: '2026-09-29', weeks: 12, weight: 60, waist: 70, height: 160, menor: true });
  assert.equal('goalWeight' in menor.get('Storage').get('settings'), false);
  assert.deepEqual(plano(menor.get('Storage').get('bellies', [])), []);
});

test('números escritos a la española: 95,6 vale lo mismo que 95.6', () => {
  const num = crearApp().get('numero');
  assert.equal(num('95,6'), 95.6);
  assert.equal(num(' 177 '), 177);
  assert.ok(Number.isNaN(num('')));
});

test('catálogo de salud: ids únicos y las molestias son las mismas que usa el catálogo de ejercicios', () => {
  const h = leer('health.json'), ex = leer('exercises.json');
  for (const lista of ['goals', 'conditions', 'medications', 'levels', 'pains', 'diets', 'allergies']) {
    const ids = h[lista].map(x => x.id);
    assert.equal(new Set(ids).size, ids.length, lista);
  }
  assert.deepEqual(h.pains.map(p => p.id).sort(), Object.keys(ex.avoid).sort());
});

test('fichas de Meds y Nutrición: sin perfil se ve todo (como antes); con perfil, solo lo que casa', () => {
  const seVe = crearApp().get('seVe');
  assert.equal(seVe('m:ebymect', null), true);
  assert.equal(seVe('m:ebymect', { conditions: [], medications: [] }), false);
  assert.equal(seVe('m:ebymect', { medications: ['ebymect'] }), true);
  assert.equal(seVe('c:diabetes2 m:insulin', { conditions: ['diabetes2'] }), true);
  assert.equal(seVe('c:fatty-liver', { conditions: ['asthma'], medications: ['ebymect'] }), false);
});

test('cada ficha de index.html apunta a enfermedades y medicamentos que existen en el catálogo', () => {
  const h = leer('health.json');
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  const claves = [...html.matchAll(/data-si="([^"]+)"/g)].flatMap(m => m[1].split(' '));
  assert.ok(claves.length >= 10, 'hay fichas marcadas');
  const existe = { c: new Set(h.conditions.map(x => x.id)), m: new Set(h.medications.map(x => x.id)) };
  assert.deepEqual(claves.filter(k => { const [t, id] = k.split(':'); return !existe[t]?.has(id); }), []);
});
