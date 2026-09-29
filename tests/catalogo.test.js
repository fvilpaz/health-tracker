/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 29-sep-2026) */
// Tests del catálogo de ejercicios (src/data/exercises.json): que esté bien formado antes de que la app lo use.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const leer = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', f), 'utf8'));
const cat = leer('exercises.json');
const ids = new Set(cat.exercises.map(e => e.id));

test('cada ejercicio tiene todos sus campos y valores permitidos', () => {
  for (const e of cat.exercises) {
    const d = `ejercicio ${e.id}`;
    assert.match(e.id, /^[a-z0-9-]+$/, d);
    assert.ok(e.name && e.tip, d);
    assert.ok(e.zone in cat.zones, d);
    assert.ok(String(e.level) in cat.levels, d);
    assert.ok(['low', 'high'].includes(e.impact), d);
    assert.ok(e.avoid.every(a => a in cat.avoid), d);
    assert.ok(e.equipment.every(m => m in cat.equipment), d);
    assert.ok(e.seconds > 0 && e.rest >= 0 && typeof e.military === 'boolean', d);
  }
});

test('sin ids ni nombres repetidos, y las versiones fácil/difícil existen y no apuntan a sí mismas', () => {
  assert.equal(ids.size, cat.exercises.length);
  assert.equal(new Set(cat.exercises.map(e => e.name)).size, cat.exercises.length);
  for (const e of cat.exercises) for (const v of [e.easier, e.harder]) {
    if (v === null) continue;
    assert.ok(ids.has(v) && v !== e.id, `${e.id} → ${v}`);
  }
});

test('lo que tiene saltos nunca es de iniciación (perfiles de +50 o que empiezan)', () => {
  assert.deepEqual(cat.exercises.filter(e => e.impact === 'high' && e.level === 1).map(e => e.id), []);
});

test('hay de todo para empezar: cada zona tiene al menos un ejercicio de nivel 1 sin saltos ni material', () => {
  for (const zona of Object.keys(cat.zones)) {
    const faciles = cat.exercises.filter(e => e.zone === zona && e.level === 1 && e.impact === 'low' && !e.equipment.some(m => ['bar', 'backpack'].includes(m)));
    assert.ok(faciles.length > 0, zona);
  }
});

test('todos los ejercicios de los bloques actuales están en el catálogo', () => {
  const w = leer('workouts.json'), nombres = new Set(cat.exercises.map(e => e.name));
  const usados = [...w.warmup.exercises, ...Object.values(w.strength.blocks).flatMap(b => b.exercises), ...w.cooldown.exercises].map(e => e.name);
  assert.deepEqual(usados.filter(n => !nombres.has(n)), []);
});
