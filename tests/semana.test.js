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
    ['viernes con 1', '2026-10-02', ['2026-09-29'], 'verde', 'faltan 2 sesiones y quedan 3 días'],
    ['sábado con 1', '2026-10-03', ['2026-09-29'], 'naranja', 'Vas justo'],
    ['sábado sin nada', '2026-10-03', [], 'rojo', 'solo quedan 2 días'],
    ['sábado con 2, uno hoy', '2026-10-03', ['2026-09-30', '2026-10-03'], 'naranja', 'falta 1 sesión y queda 1 día'],
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

test('agruparSemanas: año → mes según el LUNES de cada semana (26 oct–1 nov va en octubre), de la más reciente a la más antigua', () => {
  const app = crearApp(), agrupar = app.get('agruparSemanas');
  const semana = iso => ({ l: new Date(iso + 'T12:00:00'), id: iso });
  const lista = ['2027-01-04', '2026-12-28', '2026-11-02', '2026-10-26', '2026-10-19'].map(semana);
  const r = JSON.parse(JSON.stringify(agrupar(lista).map(a => [a.anio, a.meses.map(m => [m.mes, m.semanas.map(s => s.id)])])));
  assert.deepEqual(r, [
    [2027, [[0, ['2027-01-04']]]],
    [2026, [[11, ['2026-12-28']], [10, ['2026-11-02']], [9, ['2026-10-26', '2026-10-19']]]],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(agrupar([]))), []);
});

test('sesionesSin: quita solo la sesión i si sigue siendo la del día que se enseñó; si algo no cuadra, no toca nada', () => {
  const sin = (...a) => plano(crearApp().get('sesionesSin')(...a));
  const lista = [{ date: '2026-11-02', day: '1' }, { date: '2026-11-04', day: '2' }, { date: '2026-11-04', day: '3' }];
  const copia = JSON.stringify(lista);
  assert.deepEqual(sin(lista, 1, '2026-11-04').lista.map(s => s.day), ['1', '3']);
  assert.equal(JSON.stringify(lista), copia, 'no cambia la lista que recibe');
  for (const [i, f] of [[0, '2026-11-04'], [3, '2026-11-04'], [-1, '2026-11-02'], [1.5, '2026-11-04'], [NaN, '2026-11-04'], ['1', '2026-11-04']]) {
    assert.ok(sin(lista, i, f).error, `${i} ${f}`);
  }
});

test('«Quitar»: sale en las sesiones guardadas (semana actual y anteriores), no en los entrenos antiguos que solo tienen fecha; pide confirmar y a la segunda quita', () => {
  const app = crearApp(), S = app.get('Storage'), iso = app.get('isoDate');
  const els = { semanaActual: {}, semanaHistorial: {} }, original = app.get('document').getElementById;
  app.get('document').getElementById = id => els[id] || original(id);
  const hoy = new Date(), hace = n => { const d = new Date(hoy); d.setDate(d.getDate() - n); return d; };
  S.set('sessions', [{ date: iso(hace(30)), block: null, day: '1', exercises: ['A'] }, { date: iso(hoy), block: null, day: '2', exercises: ['B'] }]);
  S.set('trainings', [app.get('fechaEs')(hace(60))]);   // entreno antiguo: solo la fecha, no se puede quitar
  const botones = t => (String(t).match(/data-quitar=/g) || []).length;
  app.get('renderSemana')();
  assert.equal(botones(els.semanaActual.innerHTML), 1, 'la de hoy');
  assert.equal(botones(els.semanaHistorial.innerHTML), 1, 'la de hace 30 días; la antigua sin botón');
  assert.doesNotMatch(els.semanaActual.innerHTML, /Seguro/);
  const quitar = app.get('pulsarQuitarSesion');
  quitar(1, iso(hoy));   // primera pulsación: solo pide confirmar
  assert.equal(S.get('sessions').length, 2);
  assert.match(els.semanaActual.innerHTML, /¿Seguro\? Pulsa otra vez/);
  quitar(1, iso(hoy));   // segunda: la quita
  assert.deepEqual(plano(S.get('sessions')).map(s => s.day), ['1']);
  assert.equal(botones(els.semanaActual.innerHTML), 0);
  quitar(0, '2000-01-01'); quitar(0, '2000-01-01');   // la fecha no es la de esa sesión: no se toca nada
  assert.equal(S.get('sessions').length, 1);
  quitar(0, iso(hace(30))); quitar(5, iso(hace(30)));   // pulsar otra distinta entre medias reinicia la confirmación
  assert.equal(S.get('sessions').length, 1);
});

