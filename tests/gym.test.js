/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 6-oct-2026) */
// Tests del plan del gimnasio (src/data/gym.json): que esté bien formado antes de que la app lo use.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
