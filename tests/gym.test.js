/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 6-oct-2026) */
// Tests del plan del gimnasio (src/data/gym.json): que esté bien formado antes de que la app lo use.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { crearApp } = require('./entorno.js');
const plano = x => JSON.parse(JSON.stringify(x));   // lo creado dentro de la «página» es de otro mundo JS

const gym = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'gym.json'), 'utf8'));

// Lista de fallos de un plan (vacía = bien formado)
function fallos(g) {
  const f = [];
  if (!Number.isInteger(g.sets) || !Number.isInteger(g.reps) || !Number.isInteger(g.rest)) f.push('sets, reps y rest tienen que ser enteros');
  g.days.forEach((d, i) => {
    if (d.id !== String(i + 1)) f.push(`día ${i + 1}: id «${d.id}»`);
    const nombres = d.exercises.map(e => e.name);
    if (new Set(nombres).size !== nombres.length) f.push(`día ${d.id}: ejercicio repetido`);
    d.exercises.forEach(e => { if (typeof e.name !== 'string' || !e.name.trim() || (e.sets !== undefined && !(Number.isInteger(e.sets) && e.sets >= 1 && e.sets <= 10))) f.push(`día ${d.id}: «${e.name}» mal`); });
  });
  return f;
}

test('el plan del gimnasio tiene 5 días bien formados', () => {
  assert.equal(gym.days.length, 5);
  assert.deepEqual(fallos(gym), []);
});

test('control: la comprobación sí caza un plan roto', () => {
  const roto = { sets: '3', reps: 15, rest: 90, days: [{ id: '2', exercises: [{ name: 'A' }, { name: 'A' }, { name: '', sets: 0 }] }] };
  assert.equal(fallos(roto).length, 4);   // sets, id, repetido y el ejercicio sin nombre ni series
});

test('día 5 = día 2 con el femoral y el hack cambiados de orden (capturas del plan, semanas 1 y 2)', () => {
  const [d2, d5] = [gym.days[1], gym.days[4]].map(d => d.exercises.map(e => e.name));
  assert.deepEqual([...d2].sort(), [...d5].sort());
  assert.notDeepEqual(d2, d5);
});

test('nextGymDay: el siguiente al último día hecho (5 → 1) y se salta las sesiones antiguas sin día', () => {
  const sig = ses => crearApp().get('nextGymDay')(ses);
  assert.equal(sig([]), '1');
  assert.equal(sig([{ date: '2026-10-05', day: '1' }]), '2');
  assert.equal(sig([{ date: '2026-10-05', day: '5' }]), '1');
  assert.equal(sig([{ date: '2026-10-05', day: '3' }, { date: '2026-10-06', block: '2' }]), '4');   // el bloque viejo no cuenta
});

test('cardioDeCasillas: opcional, acepta coma decimal y avisa de lo mal escrito', () => {
  const c = crearApp().get('cardioDeCasillas');
  assert.equal(c({}), null);
  assert.equal(c({ minutes: ' ', km: '', note: '  ' }), null);
  assert.deepEqual(plano(c({ minutes: '54', km: '5,06', note: ' caminata ' })), { minutes: 54, km: 5.06, note: 'caminata' });
  assert.deepEqual(plano(c({ km: '0.69' })), { km: 0.69 });
  for (const mal of [{ minutes: 'abc' }, { minutes: '0' }, { minutes: '601' }, { km: '-1' }, { km: '201' }, { note: 'x'.repeat(121) }]) assert.ok(c(mal).error, JSON.stringify(mal));
});

test('sesionGym: ejercicios en el orden del plan, cardio solo si hay algo, y sin ejercicios no se guarda', () => {
  const app = crearApp(), s = (b, f = '2026-10-06') => plano(app.get('sesionGym')(gym, b, f));
  const dia1 = gym.days[0].exercises.map(e => e.name);
  assert.deepEqual(s({ day: '1', done: [dia1[2], dia1[0]], cardio: {} }), { date: '2026-10-06', block: null, day: '1', exercises: [dia1[0], dia1[2]] });
  const con = s({ day: '1', done: [dia1[0]], cardio: { start: { minutes: '10,5' }, end: { minutes: '', km: '' } } });
  assert.deepEqual(con.cardio, { start: { minutes: 10.5 } });
  assert.equal(s({ day: '1', done: [] }).error, 'Marca al menos un ejercicio');
  assert.equal(s({ day: '1', done: ['Otro que no es del día 1'] }).error, 'Marca al menos un ejercicio');
  assert.ok(s({ day: '1', done: [dia1[0]], cardio: { end: { km: 'mucho' } } }).error.startsWith('Cardio al acabar'));
});

test('lo que sale de sesionGym entra entero en limpiarCopia (guardar e importar dicen lo mismo)', () => {
  const app = crearApp(), dia = gym.days[3].exercises.map(e => e.name);
  const ses = plano(app.get('sesionGym')(gym, { day: '4', done: dia, cardio: { start: { minutes: '10.6', km: '0,69', note: 'cinta' }, end: { minutes: '54', km: '5,06' } } }, '2026-01-06'));
  const r = app.get('limpiarCopia')({ sessions: [ses] });
  assert.equal(r.descartados, 0);
  assert.deepEqual(plano(r.datos.sessions), [ses]);
});

test('el borrador de la sesión (gymDraft) se ignora al importar, sin contarlo como error', () => {
  const r = crearApp().get('limpiarCopia')({ gymDraft: { date: '2026-10-06', day: '1', done: ['x'] }, sessions: [] });
  assert.equal(r.descartados, 0);
  assert.equal(r.datos.gymDraft, undefined);
});
