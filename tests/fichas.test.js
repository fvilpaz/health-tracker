/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 6-oct-2026) */
// Las fichas «Cómo se hace» (src/data/ejercicios-gym.json) y su unión con el plan (src/data/gym.json, campo «ref»).
// Por ahora SIN imágenes: solo descripción (Trabaja y pasos). Cuando haya imágenes, se prueban aquí.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = f => JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', f), 'utf8'));
const fichas = leer('ejercicios-gym.json').ejercicios;
const plan = leer('gym.json');
const ejerciciosDelPlan = plan.days.flatMap(d => d.exercises);

test('cada ejercicio del plan tiene su «ref» y cada ref tiene su ficha (y nada sobra)', () => {
  assert.ok(ejerciciosDelPlan.every(e => e.ref && fichas[e.ref]), 'ejercicio sin ref o sin ficha');
  assert.deepEqual([...new Set(ejerciciosDelPlan.map(e => e.ref))].sort(), Object.keys(fichas).sort());
  // el ejercicio repetido en otro día comparte ficha; el nombre exacto del plan no cambia
  const porNombre = new Map();
  for (const e of ejerciciosDelPlan) {
    assert.equal(porNombre.get(e.name) ?? e.ref, e.ref, `${e.name} con dos fichas`);
    porNombre.set(e.name, e.ref);
  }
});

test('las 28 fichas tienen Trabaja y pasos con texto, sin notas pendientes ni «Ojo» sin aprobar', () => {
  assert.equal(Object.keys(fichas).length, 28);
  for (const [ref, f] of Object.entries(fichas)) {
    assert.ok(f.trabaja.length > 0 && f.trabaja.every(t => typeof t === 'string' && t.trim()), ref);
    assert.ok(f.pasos.length >= 3 && f.pasos.every(p => typeof p === 'string' && p.trim().length > 5 && !/\[V\]/.test(p)), ref);
    assert.equal(f.ojo, undefined, `${ref}: «Ojo» solo cuando Nando lo apruebe`);
  }
});

test('por ahora ninguna ficha lleva imágenes y el repositorio no trae ninguna', () => {
  assert.ok(Object.values(fichas).every(f => f.fotos === undefined));
  assert.equal(fs.existsSync(path.join(RAIZ, 'src', 'img')), false);
});

test('el repositorio declara la licencia del código (MIT)', () => {
  assert.match(fs.readFileSync(path.join(RAIZ, 'LICENSE'), 'utf8'), /^MIT License/);
});
