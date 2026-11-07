/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 6-oct-2026) */
// Las fichas «Cómo se hace» (src/data/ejercicios-gym.json) y su unión con el plan (src/data/gym.json, campo «ref»).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = f => JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'data', f), 'utf8'));
const fichas = leer('ejercicios-gym.json').ejercicios;
const porRef = new Map(Object.entries(fichas));   // para buscar por referencia sin indexar un objeto con texto variable
const plan = leer('gym.json');
const ejerciciosDelPlan = plan.days.flatMap(d => d.exercises);
const ejerciciosPlanNuevo = leer('plan.json').weeks.flatMap(s => s.days.flatMap(d => d.exercises));   // plan de 8 semanas (7-nov-2026: sus ejercicios nuevos llevan ficha n1…n11)

test('cada ejercicio del plan tiene su «ref» y cada ref tiene su ficha (y nada sobra)', () => {
  assert.ok(ejerciciosDelPlan.every(e => e.ref && fichas[e.ref]), 'ejercicio sin ref o sin ficha');
  assert.ok(ejerciciosPlanNuevo.every(e => e.ref && fichas[e.ref]), 'ejercicio de plan.json sin ref o sin ficha');
  // «nada sobra»: cada ficha la usa el plan de 5 días (gym.json) o el de 8 semanas (plan.json)
  const usadas = [...new Set([...ejerciciosDelPlan, ...ejerciciosPlanNuevo].map(e => e.ref))].sort();
  assert.deepEqual(usadas, Object.keys(fichas).sort());
  // el ejercicio repetido en otro día comparte ficha; el nombre exacto del plan no cambia
  const porNombre = new Map();
  for (const e of [...ejerciciosDelPlan, ...ejerciciosPlanNuevo]) {
    assert.equal(porNombre.get(e.name) ?? e.ref, e.ref, `${e.name} con dos fichas`);
    porNombre.set(e.name, e.ref);
  }
});

test('las 39 fichas tienen Trabaja y pasos con texto, sin notas pendientes', () => {
  assert.equal(Object.keys(fichas).length, 39);
  for (const [ref, f] of Object.entries(fichas)) {
    assert.ok(f.trabaja.length > 0 && f.trabaja.every(t => typeof t === 'string' && t.trim()), ref);
    assert.ok(f.pasos.length >= 3 && f.pasos.every(p => typeof p === 'string' && p.trim().length > 5 && !/\[V\]/.test(p)), ref);
    if (f.ojo !== undefined) assert.ok(typeof f.ojo === 'string' && f.ojo.length > 10 && f.ojo.length < 400, `${ref}: «Ojo» raro`);
  }
});

test('correcciones aprobadas por Nando el 7-oct-2026: polea en d3e4, «recostado» en d1e2, rodillas en línea en las prensas y el hack, y no se renombra nada', () => {
  assert.match(fichas.d3e4.pasos[0], /polea baja/);
  assert.match(fichas.d3e4.pasos[1], /barra Z/);
  assert.deepEqual(fichas.d3e4.trabaja, ['bíceps (antebrazo como apoyo)']);
  assert.match(fichas.d1e2.pasos[0], /^Recostado/);
  assert.doesNotMatch(JSON.stringify(fichas.d1e2), /tumbado|abrazaras/);
  for (const ref of ['d1e6', 'd2e5', 'd3e7']) assert.match(porRef.get(ref).pasos.join(' '), /rodillas en línea con los pies/, ref);
  assert.match(fichas.d2e7.pasos[0], /parte delantera del pie/);
  assert.match(fichas.d3e3.pasos[0], /^Sentado con la espalda apoyada \(o de pie\)/);
  assert.ok(fichas.d3e1.trabaja.includes('hombros (parte delantera)'));
  assert.equal(fichas.d1e6.pasos.length, 4);
  // los nombres del plan siguen siendo los del gimnasio
  assert.equal(ejerciciosDelPlan.find(e => e.id === 'd3e4').name, 'Bíceps máquina de pie barra Z');
  assert.equal(ejerciciosDelPlan.find(e => e.id === 'd1e2').name, 'Aperturas inclinadas con mancuernas');
});

test('«Ojo» y revisión: todas llevan Ojo salvo las sin cambios; todas están revisadas o aprobadas menos d4e1 (pendiente), que conserva «sin revisar»', () => {
  const sinOjo = Object.entries(fichas).filter(([, f]) => !f.ojo).map(([r]) => r).sort();
  assert.deepEqual(sinOjo, ['d2e7', 'd3e3', 'd3e5', 'd4e4']);
  const sinRevision = Object.entries(fichas).filter(([, f]) => !f.revision).map(([r]) => r);
  assert.deepEqual(sinRevision, ['d4e1']);
  for (const [ref, f] of Object.entries(fichas)) {
    if (!f.revision) continue;
    // las n1…n11 las redactó la IA el 7-nov-2026 y Nando las aprobó ese día (no las revisó una a una: por eso dice «Aprobado», no «Revisado»)
    assert.match(f.revision, /^(Revisado por Nando el 7-oct-2026|Aprobado por Nando el 7-nov-2026) \(/, ref);
  }
  // d4e1: texto neutro (no se sabe el recorrido real de las asas); es texto nuevo que Nando no ha visto, sigue «sin revisar»
  const d4e1 = JSON.stringify(fichas.d4e1);
  assert.doesNotMatch(d4e1, /arriba|altura de los hombros/);
  assert.match(fichas.d4e1.pasos[2], /recorrido de la máquina/);
  assert.equal(fichas.d4e1.pasos.length, 4);
  assert.match(fichas.d4e1.ojo, /espalda pegada al respaldo/);
  assert.equal(fichas.d4e1.revision, undefined);
  // las máquinas dicen que los ajustes cambian entre modelos (salvo d1e5, que ya lo dice con su propio Ojo; d4e1 usa texto neutro)
  for (const ref of ['d1e1', 'd1e3', 'd1e6', 'd2e1', 'd2e2', 'd2e5', 'd2e8', 'd3e1', 'd3e2', 'd3e6', 'd3e7', 'd4e2', 'd4e5', 'd4e7', 'd1e7']) {
    assert.match(porRef.get(ref).ojo, /Los ajustes cambian entre modelos/, ref);
  }
  assert.match(fichas.d1e5.ojo, /indicaciones de la máquina/);
});

test('las fichas no llevan fotos (quitadas el 4-nov-2026 por decisión de Nando): ni campo «fotos» ni imágenes en img/gym', () => {
  assert.deepEqual(Object.entries(fichas).filter(([, f]) => 'fotos' in f).map(([ref]) => ref), []);
  const carpeta = path.join(RAIZ, 'src', 'img', 'gym');
  const imagenes = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter(n => /\.(webp|png|jpe?g|svg)$/i.test(n)) : [];
  assert.deepEqual(imagenes, []);
  assert.ok(!fs.existsSync(path.join(RAIZ, 'src', 'img', 'everkinetic')));
  const creditos = fs.readFileSync(path.join(RAIZ, 'CREDITS.md'), 'utf8');
  assert.match(creditos, /free-exercise-db/);
  assert.match(creditos, /no elimina el\s+derecho de autor/);
});

test('el repositorio declara la licencia del código (MIT)', () => {
  assert.match(fs.readFileSync(path.join(RAIZ, 'LICENSE'), 'utf8'), /^MIT License/);
});
