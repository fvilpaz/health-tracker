/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 29-sep-2026) */
// Tests de los bloques generados según el perfil (js/rutina.js). Perfiles inventados.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { crearApp } = require('./entorno.js');

const cat = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'exercises.json'), 'utf8'));
const porNombre = Object.fromEntries(cat.exercises.map(e => [e.name, e]));
const hoy = new Date(2026, 8, 29);
const BASE = { birthDate: '1985-01-01', level: 2, avoid: [], minutes: 20, focus: [] };
const armar = (perfil) => JSON.parse(JSON.stringify(crearApp().get('armarBloques')({ ...BASE, ...perfil }, cat, hoy)));
const todos = f => Object.values(f.blocks).flatMap(b => b.exercises).map(e => porNombre[e.name]);

test('tres bloques con piernas, empuje, espalda y abdomen; cada uno distinto', () => {
  const f = armar({});
  assert.deepEqual(Object.keys(f.blocks), ['1', '2', '3']);
  for (const b of Object.values(f.blocks)) assert.deepEqual(b.exercises.map(e => porNombre[e.name].zone), ['legs', 'push', 'pull', 'core']);
  const firmas = Object.values(f.blocks).map(b => b.exercises.map(e => e.name).join());
  assert.equal(new Set(firmas).size, 3);
});

test('molestias: con rodillas no sale nada que las cargue; nunca material que no hay en casa (barra)', () => {
  const f = armar({ avoid: ['knees'], level: 3 });
  assert.deepEqual(todos(f).filter(e => e.avoid.includes('knees')).map(e => e.id), []);
  assert.deepEqual(todos(f).filter(e => e.equipment.includes('bar')).map(e => e.id), []);
});

test('nivel: nunca por encima del suyo; +50 años o un «sí» de seguridad → nivel 1 y sin saltos', () => {
  assert.ok(todos(armar({ level: 2 })).every(e => e.level <= 2));
  for (const p of [{ level: 3, birthDate: '1970-01-01' }, { level: 3, fainting: true }, { level: 3, conditions: ['pregnancy'] }]) {
    const t = todos(armar(p));
    assert.ok(t.every(e => e.level === 1 && e.impact === 'low'), JSON.stringify(p));
  }
});

test('lo que quiere trabajar más: un ejercicio extra por zona, sin repetir en el bloque', () => {
  const f = armar({ focus: ['core', 'cardio'] });
  for (const b of Object.values(f.blocks)) {
    const zonas = b.exercises.map(e => porNombre[e.name].zone);
    assert.equal(zonas.length, 6);
    assert.equal(zonas.filter(z => z === 'core').length, 2);
    assert.equal(zonas.filter(z => z === 'cardio').length, 1);
    assert.equal(new Set(b.exercises.map(e => e.name)).size, 6);
  }
});

test('vueltas según los minutos: 15 → 2, 20 → 3, 30 o más → 4; y la duración cuadra', () => {
  assert.equal(armar({ minutes: 15 }).rounds, 2);
  assert.equal(armar({ minutes: 20 }).rounds, 3);
  assert.equal(armar({ minutes: 45 }).rounds, 4);
});

test('duración de cada fase: se calcula de los ejercicios tal como corre el temporizador (antes, a mano y mal)', () => {
  const app = crearApp(), dur = app.get('duracionFase'), texto = app.get('textoDuracion');
  const w = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'workouts.json'), 'utf8'));
  // Calentamiento: 6 × (40 + 20) = 360 s. Ponía «4 min».
  assert.equal(dur(w.warmup, w.warmup.exercises), 360);
  // Fuerza: 3 vueltas × 4 × (40 + 20) + 2 descansos de 60 s = 840 s
  assert.equal(dur(w.strength, w.strength.blocks['1'].exercises), 840);
  // Vuelta a la calma: 25 × 4 + 30 = 130 s. Ponía «2 min».
  assert.equal(dur(w.cooldown, w.cooldown.exercises), 130);
  assert.equal(texto(360), '6 min');
  assert.equal(texto(130), '2 min 10 s');
});

test('objetivo semanal: los días del perfil; sin perfil, 3 como siempre', () => {
  const app = crearApp(), S = app.get('Storage'), obj = app.get('objetivoSemana');
  assert.equal(obj(), 3);
  S.set('profile', { days: 5 });
  assert.equal(obj(), 5);
});

test('el perfil guarda lo que quiere trabajar (zonas del catálogo de ejercicios)', () => {
  const r = crearApp().get('limpiarPerfil')({ focus: ['core', 'cardio'] });
  assert.deepEqual(JSON.parse(JSON.stringify(r.perfil.focus)), ['core', 'cardio']);
});

test('las zonas del cuestionario existen en el catálogo de ejercicios', () => {
  const h = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'health.json'), 'utf8'));
  assert.deepEqual(h.focus.map(f => f.id).filter(z => !(z in cat.zones)), []);
});
