// Tests de caracterización de «Mi semana»: fijan lo que la app hace HOY, antes de refactorizar.
// Datos inventados (el repo es público).
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));   // lo creado dentro de la «página» es de otro mundo JS
const dia = iso => new Date(iso + 'T12:00');
const sesiones = (...fechas) => fechas.map((date, i) => ({ date, block: String(i % 3 + 1), minutes: 15, exercises: ['A'] }));

test('getWeekStart: cualquier día de la semana da su lunes, también el domingo', () => {
  const app = crearApp(), lunes = d => app.get('isoDate')(app.get('getWeekStart')(dia(d)));
  assert.equal(lunes('2026-09-28'), '2026-09-28');   // lunes
  assert.equal(lunes('2026-10-01'), '2026-09-28');   // jueves
  assert.equal(lunes('2026-10-04'), '2026-09-28');   // domingo: antes saltaba al lunes 5 (fallo arreglado el 28-sep)
});

test('getSessions: une las sesiones con los entrenos antiguos (solo fecha), sin repetir días', () => {
  const app = crearApp(), S = app.get('Storage');
  S.set('sessions', sesiones('2026-09-28'));
  S.set('trainings', ['26/9/2026', '26/9/2026', '28/9/2026']);   // el 26 repetido; el 28 ya tiene sesión
  assert.deepEqual(plano(app.get('getSessions')()).map(s => [s.date, s.block]), [['2026-09-26', null], ['2026-09-28', '1']]);
});

test('sessionsInWeek: solo cuenta los bloques de lunes a domingo de esa semana', () => {
  const app = crearApp();
  app.get('Storage').set('sessions', sesiones('2026-09-27', '2026-09-28', '2026-10-04', '2026-10-05'));
  assert.equal(app.get('sessionsInWeek')(dia('2026-10-01')).length, 2);   // 28-sep y 4-oct
});

test('nextBlock: rota 1 → 2 → 3 → 1 y se salta los entrenos antiguos sin bloque', () => {
  const app = crearApp(), S = app.get('Storage'), next = app.get('nextBlock');
  assert.equal(next(), '1');
  S.set('sessions', [{ date: '2026-09-28', block: '3' }]);
  assert.equal(next(), '1');
  S.set('sessions', [{ date: '2026-09-28', block: '1' }]);
  S.set('trainings', ['30/9/2026']);                                 // posterior, pero sin bloque
  assert.equal(next(), '2');
});

test('weekStatus: el aviso de color en cada situación', () => {
  const casos = [
    // [nombre, hoy, fechas hechas, color esperado, trozo del texto]
    ['lunes sin nada', '2026-09-28', [], 'verde', 'quedan 7 días'],
    ['viernes con 1', '2026-10-02', ['2026-09-29'], 'verde', 'faltan 2 bloques y quedan 3 días'],
    ['sábado con 1', '2026-10-03', ['2026-09-29'], 'naranja', 'Vas justo'],
    ['sábado sin nada', '2026-10-03', [], 'rojo', 'solo quedan 2 días'],
    ['sábado con 2, uno hoy', '2026-10-03', ['2026-09-30', '2026-10-03'], 'naranja', 'falta 1 bloque y queda 1 día'],
    ['domingo con 2', '2026-10-04', ['2026-09-29', '2026-10-01'], 'rojo', 'Es domingo'],
    ['domingo con 3', '2026-10-04', ['2026-09-29', '2026-10-01', '2026-10-03'], 'verde', 'Semana cumplida'],
    ['domingo con 2, uno hoy', '2026-10-04', ['2026-09-29', '2026-10-04'], 'rojo', 'no quedan días'],
    ['lunes siguiente: la semana pasada no cuenta', '2026-10-05', ['2026-09-29', '2026-10-01', '2026-10-03'], 'verde', 'quedan 7 días'],
  ];
  for (const [nombre, hoy, hechas, color, texto] of casos) {
    const app = crearApp();
    app.get('Storage').set('sessions', sesiones(...hechas));
    const e = app.get('weekStatus')(new Date(hoy + 'T18:00'));
    assert.equal(e.color, color, nombre);
    assert.ok(e.texto.includes(texto), `${nombre}: «${e.texto}» no dice «${texto}»`);
  }
});

test('weekStreak y completedWeeks: semanas cumplidas (3 bloques), seguidas hacia atrás', () => {
  const app = crearApp(), S = app.get('Storage');
  const cumplida = lunes => { const d = new Date(lunes + 'T12:00'); return [0, 2, 4].map(n => { const x = new Date(d); x.setDate(d.getDate() + n); return app.get('isoDate')(x); }); };
  S.set('sessions', sesiones(...cumplida('2026-09-14'), ...cumplida('2026-09-21'), '2026-09-28'));
  assert.equal(app.get('completedWeeks')(), 2);
  assert.equal(app.get('weekStreak')(dia('2026-09-30')), 2);   // la actual (1 de 3) no rompe la racha
  S.set('sessions', sesiones(...cumplida('2026-09-07'), ...cumplida('2026-09-21')));   // hueco la del 14
  assert.equal(app.get('weekStreak')(dia('2026-09-30')), 1);
});
