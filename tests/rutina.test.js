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

test('E2: con 65 años o más, un ejercicio de equilibrio en cada bloque; con menos, no', () => {
  for (const b of Object.values(armar({ birthDate: '1955-01-01' }).blocks)) assert.equal(b.exercises.filter(e => porNombre[e.name].zone === 'balance').length, 1);
  assert.equal(todos(armar({ birthDate: '1970-01-01' })).filter(e => e.zone === 'balance').length, 0);
});

test('E5: embarazo → nada tumbada boca arriba ni boca abajo, nivel 1 y sin saltos', () => {
  const t = todos(armar({ level: 3, conditions: ['pregnancy'] }));
  assert.deepEqual(t.filter(e => e.lying).map(e => e.id), []);
  assert.ok(t.every(e => e.level === 1 && e.impact === 'low'));
});

test('catálogo: «lying» solo vale back o front, y los de suelo boca arriba/abajo están marcados', () => {
  for (const e of cat.exercises) assert.ok([undefined, 'back', 'front'].includes(e.lying), e.id);
  for (const id of ['crunch', 'sit-up', 'glute-bridge', 'dead-bug', 'flutter-kicks', 'leg-raise', 'table-row']) assert.equal(cat.exercises.find(e => e.id === id).lying, 'back', id);
  for (const id of ['superman', 'reverse-snow-angel']) assert.equal(cat.exercises.find(e => e.id === id).lying, 'front', id);
});

test('avisos de Entreno según el perfil (E5, E6, E7, E8, E12)', () => {
  const avisos = p => JSON.parse(JSON.stringify(crearApp().get('avisosEntreno')(p))).map(a => a.regla);
  assert.deepEqual(avisos(null), []);
  assert.deepEqual(avisos({ conditions: [], medications: [] }), []);
  assert.deepEqual(avisos({ fainting: true }), ['E12']);
  assert.deepEqual(avisos({ conditions: ['pregnancy'] }), ['E5']);
  assert.deepEqual(avisos({ conditions: ['diabetes2'], medications: ['metformin'] }), []);   // sin insulina, no
  assert.deepEqual(avisos({ conditions: ['diabetes2'], medications: ['insulin'] }), ['E6']);
  assert.deepEqual(avisos({ conditions: ['hypertension', 'asthma'] }), ['E7', 'E8']);
});

test('el principal de cada zona sale por orden del catálogo, no alfabético (antes salía «Elevación de talones» como piernas)', () => {
  const f = armar({ level: 1 });
  assert.equal(f.blocks[1].exercises[0].name, 'Sentadilla a silla');
  assert.ok(!todos(f).some(e => e.id === 'partial-squat'), 'la sentadilla parcial es de calentamiento');
});

test('faltanDatosCasa: sin nivel o minutos no se arma «En casa»; con ellos, sí (molestias y zonas son opcionales)', () => {
  const falta = crearApp().get('faltanDatosCasa');
  const base = { birthDate: '1985-01-01' };
  assert.equal(falta(null), true);
  assert.equal(falta(base), true);                                                   // perfil de solo gimnasio
  assert.equal(falta({ ...base, level: 2 }), true);
  assert.equal(falta({ ...base, minutes: 20 }), true);
  assert.equal(falta({ ...base, level: 0, minutes: 20 }), true);
  assert.equal(falta({ ...base, level: 4, minutes: 20 }), true);
  assert.equal(falta({ ...base, level: 1, minutes: 20 }), false);
});

test('E3/E5/E12 en «En casa»: menor, embarazada o PAR-Q «sí» arman entreno suave y con sus reglas', () => {
  const sinSaltos = f => todos(f).every(e => e.impact === 'low' && e.level === 1);
  assert.ok(sinSaltos(armar({ level: 3, conditions: ['pregnancy'] })));
  assert.ok(sinSaltos(armar({ level: 3, chestPain: true })));
  assert.ok(todos(armar({ level: 3, conditions: ['pregnancy'] })).every(e => !e.lying));
  assert.ok(sinSaltos(armar({ level: 3, birthDate: '1970-01-01' })));               // +50
});

test('duración de cada fase: se calcula de los ejercicios tal como corre el temporizador (antes, a mano y mal)', () => {
  const app = crearApp(), dur = app.get('duracionFase'), texto = app.get('textoDuracion');
  const w = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'workouts.json'), 'utf8'));
  // Calentamiento de articulaciones (29-sep): marcha 40+20 y siete de movilidad 30+10 = 340 s. Antes ponía «4 min» a mano.
  assert.equal(dur(w.warmup, w.warmup.exercises), 340);
  // Nada de fuerza en el calentamiento (talones, rodillas y sentadillas van en los bloques) ni balanceo (Nando: no aporta)
  for (const fuera of ['Sentadilla parcial', 'Elevación de rodillas', 'Elevación de talones', 'Balanceo de piernas']) assert.ok(!w.warmup.exercises.some(e => e.name === fuera), fuera);
  // Fuerza: 3 vueltas × 4 × (40 + 20) + 2 descansos de 60 s = 840 s
  assert.equal(dur(w.strength, w.strength.blocks['1'].exercises), 840);
  // Vuelta a la calma: 25 × 4 + 30 = 130 s. Ponía «2 min».
  assert.equal(dur(w.cooldown, w.cooldown.exercises), 130);
  assert.equal(texto(360), '6 min');
  assert.equal(texto(130), '2 min 10 s');
});

test('«En casa»: sin nivel ni minutos no se arma nada y sale el aviso; con ellos se arma y trae los tip del catálogo', async () => {
  const app = crearApp(), doc = app.get('document'), S = app.get('Storage'), els = {};
  doc.getElementById = id => (els[id] ??= { hidden: false, textContent: '', dataset: {}, classList: { toggle() {} }, style: {}, addEventListener() {}, querySelectorAll: () => [], appendChild() {} });
  app.get('globalThis').fetch = async f => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')) });
  const renderCasa = app.get('renderCasa'), PERFIL = { name: 'Ana', birthDate: '1985-03-10', sex: 'female', goal: 'health', days: 3, diet: 'all', modes: ['gym', 'home'] };
  S.set('profile', PERFIL);                                                          // elegió «En casa» pero nunca le preguntaron nivel ni minutos
  await renderCasa();
  assert.equal(els.casaDatos.hidden, false);
  assert.equal(els.casaEntreno.hidden, true);
  assert.equal(app.get('workoutData'), null);                                        // no se ha cargado ni armado nada
  S.set('profile', { ...PERFIL, level: 2, minutes: 20 });
  await renderCasa();
  assert.equal(els.casaDatos.hidden, true);
  assert.equal(els.casaEntreno.hidden, false);
  const bloques = JSON.parse(JSON.stringify(app.get('workoutData').strength.blocks));
  assert.ok(bloques['1'].exercises.length >= 4 && bloques['1'].exercises.every(e => e.tip));
});

test('«En casa» sin el modo marcado no hace nada', async () => {
  const app = crearApp(), doc = app.get('document'), els = {};
  doc.getElementById = id => (els[id] ??= { hidden: false, dataset: {}, classList: { toggle() {} }, style: {}, addEventListener() {} });
  app.get('Storage').set('profile', { name: 'Ana', birthDate: '1985-03-10', level: 2, minutes: 20, modes: ['gym'] });
  await app.get('renderCasa')();
  assert.equal(els.casaDatos.hidden, false);                                         // intacto: ni lo ha tocado
  assert.equal(app.get('workoutData'), null);
});
