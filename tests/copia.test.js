/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (catálogos, campos) o ya validadas; nunca texto de fuera sin comprobar (revisado 28-sep-2026) */
// Tests de la importación segura (limpiarCopia) y de esc(). Datos inventados (el repo es público).
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));
const ataque = '<img src=x onerror="alert(1)">';

const COPIA_BUENA = {
  settings: { startDate: '2026-01-05', totalWeeks: 12, goalWeight: 80, height: 170 },
  startDate: '2026-01-05T00:00:00.000Z', theme: 'light',
  weights: [{ date: '5/1/2026', weight: 88 }, { date: '12/1/2026', weight: 87.4 }],
  waists: [{ date: '5/1/2026', waist: 99 }],
  bellies: [{ date: '5/1/2026', belly: 108 }],
  sessions: [{ date: '2026-01-06', block: '1', minutes: 16, exercises: ['Sentadillas'] }, { date: '2026-01-03', block: null }],
  trainings: ['3/1/2026'], logros: ['first_train'],
  labs: [{ date: '2026-01-10', values: { hba1c: 6.1, glucosa: 99, hdl: 45 } }],
};

test('una copia correcta entra entera, sin descartar nada', () => {
  const r = crearApp().get('limpiarCopia')(COPIA_BUENA);
  assert.equal(r.descartados, 0);
  for (const k of Object.keys(COPIA_BUENA)) assert.deepEqual(plano(r.datos[k]), COPIA_BUENA[k], k);
});

test('una copia manipulada: fuera todo lo que no tiene la forma correcta, y se cuenta', () => {
  const r = crearApp().get('limpiarCopia')({
    weights: [{ date: ataque, weight: 90 }, { date: '1/1/2026', weight: ataque }, { date: '2/1/2026', weight: 91 }],
    sessions: [{ date: '2026-01-06', block: ataque }, { date: '2026-01-07', block: '9' }],
    labs: [{ date: '2026-01-10', values: { hba1c: ataque } }, { date: '2026-01-11', values: { inventada: 5 } }],
    plan: { 1: { weight: ataque }, semana: { weight: 90 } },
    bellies: [{ date: '3/1/2026', belly: ataque }, { date: '4/1/2026', belly: 107.5 }],
    theme: 'rosa', clave_rara: ataque,
  });
  assert.deepEqual(plano(r.datos.weights), [{ date: '2/1/2026', weight: 91 }]);
  assert.deepEqual(plano(r.datos.bellies), [{ date: '4/1/2026', belly: 107.5 }]);
  assert.deepEqual(plano(r.datos.sessions), []);
  assert.deepEqual(plano(r.datos.labs), []);
  assert.deepEqual(plano(r.datos.plan), {});
  assert.equal(r.datos.theme, undefined);
  assert.equal(r.descartados, 2 + 1 + 2 + 2 + 2 + 1 + 1);   // pesos, barriga, sesiones, análisis, plan, tema, clave rara
});

test('las claves viejas (racha por días, calendario) se ignoran sin contar como error', () => {
  const r = crearApp().get('limpiarCopia')({ streak: 4, 'calendar_2026-09-21': { 0: true }, weights: [] });
  assert.equal(r.descartados, 0);
  assert.equal(r.datos.streak, undefined);
});

test('un nombre de ejercicio con HTML entra (es texto libre) pero esc() lo deja inofensivo', () => {
  const app = crearApp();
  const r = app.get('limpiarCopia')({ sessions: [{ date: '2026-01-06', block: '1', exercises: [ataque] }] });
  assert.equal(r.datos.sessions.length, 1);
  assert.equal(app.get('esc')(ataque), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('sesiones del gimnasio (día 1-5 y cardio opcional) entran enteras; lo roto, fuera y contado', () => {
  const limpiar = crearApp().get('limpiarCopia');
  const buena = [
    { date: '2026-01-06', day: '4', exercises: ['Remo sentado con discos'], cardio: { start: { minutes: 10, km: 0.69, note: 'cinta' }, end: { minutes: 54, km: 5.06 } } },
    { date: '2026-01-07', day: '5', exercises: ['Hack de piernas'] },   // sin cardio: vale
  ];
  const r = limpiar({ sessions: buena });
  assert.equal(r.descartados, 0);
  assert.deepEqual(plano(r.datos.sessions).map(s => [s.day, s.cardio]), [['4', buena[0].cardio], ['5', undefined]]);
  const mala = limpiar({ sessions: [
    { date: '2026-01-06', day: '6' }, { date: '2026-01-06', day: ataque },
    { date: '2026-01-06', day: '1', cardio: { start: { minutes: ataque } } }, { date: '2026-01-06', day: '1', cardio: { end: { minutes: 30, km: -2 } } },
    { date: '2026-01-06', day: '1', cardio: { start: { note: ataque.repeat(10) } } },
  ] });
  assert.equal(mala.datos.sessions.length, 0);
  assert.equal(mala.descartados, 5);
});

test('esc: escapa los cinco caracteres peligrosos y convierte a texto lo que no lo es', () => {
  const esc = crearApp().get('esc');
  assert.equal(esc(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(esc(7.5), '7.5');
});
