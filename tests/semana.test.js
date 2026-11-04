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

test('sesionesConDia: cambia el día de la sesión i (hoy o anterior), deja la lista ordenada por fecha y, si algo no cuadra, no toca nada', () => {
  const cambia = (...a) => plano(crearApp().get('sesionesConDia')(...a));
  const lista = [{ date: '2026-10-30', day: '3' }, { date: '2026-11-04', day: '1' }];
  const copia = JSON.stringify(lista);
  const r = cambia(lista, 1, '2026-11-04', '2026-11-02', '2026-11-04');
  assert.deepEqual(r.lista.map(s => [s.date, s.day]), [['2026-10-30', '3'], ['2026-11-02', '1']]);
  const antes = cambia(lista, 1, '2026-11-04', '2026-10-01', '2026-11-04');
  assert.deepEqual(antes.lista.map(s => s.day), ['1', '3'], 'una fecha más antigua que las demás la deja primera (la lista sigue ordenada)');
  assert.equal(JSON.stringify(lista), copia, 'no cambia la lista que recibe');
  assert.match(cambia(lista, 1, '2026-11-04', '2026-11-05', '2026-11-04').error, /hoy o uno anterior/, 'ni un día futuro');
  for (const mala of ['', 'mañana', '2026-02-31', '04/11/2026', null]) assert.ok(cambia(lista, 1, '2026-11-04', mala, '2026-11-04').error, String(mala));
  for (const [i, f] of [[0, '2026-11-04'], [2, '2026-11-04'], [-1, '2026-10-30'], [0.5, '2026-10-30']]) assert.match(cambia(lista, i, f, '2026-11-01', '2026-11-04').error, /ha cambiado/, `${i} ${f}`);
});

test('lápiz ✎ por sesión (guardadas, no las antiguas): abre un panel con «Día» y «Quitar sesión»; cambiar el día y quitar piden lo suyo', () => {
  const app = crearApp(), S = app.get('Storage'), iso = app.get('isoDate');
  const els = { semanaActual: {}, semanaHistorial: {} }, original = app.get('document').getElementById;
  app.get('document').getElementById = id => els[id] || original(id);
  const hoy = new Date(), hace = n => { const d = new Date(hoy); d.setDate(d.getDate() - n); return d; };
  S.set('sessions', [{ date: iso(hace(30)), block: null, day: '1', exercises: ['A'] }, { date: iso(hoy), block: null, day: '2', exercises: ['B'] }]);
  S.set('trainings', [app.get('fechaEs')(hace(60))]);   // entreno antiguo: solo la fecha, sin lápiz
  const cuenta = (t, marca) => (String(t).match(new RegExp(marca, 'g')) || []).length;
  app.get('renderSemana')();
  assert.equal(cuenta(els.semanaActual.innerHTML, 'data-editar='), 1, 'lápiz en la de hoy');
  assert.equal(cuenta(els.semanaHistorial.innerHTML, 'data-editar='), 1, 'lápiz en la de hace 30 días; la antigua, sin lápiz');
  assert.equal(cuenta(els.semanaActual.innerHTML, 'data-quitar='), 0, 'Quitar ya no está a la vista: hay que abrir el lápiz');
  const editar = app.get('pulsarEditarSesion'), quitar = app.get('pulsarQuitarSesion'), guardarDia = app.get('pulsarGuardarDia');
  editar(1);   // abre el panel de la de hoy
  assert.equal(cuenta(els.semanaActual.innerHTML, 'data-quitar='), 1);
  assert.equal(cuenta(els.semanaActual.innerHTML, 'data-guardar-dia='), 1);
  assert.match(els.semanaActual.innerHTML, /type="date"/);
  assert.equal(cuenta(els.semanaActual.innerHTML, 'Quitar sesión'), 1);
  editar(1);   // el mismo lápiz lo cierra
  assert.equal(cuenta(els.semanaActual.innerHTML, 'data-quitar='), 0);
  // cambiar el día de la de hoy a hace 3 días: se guarda y sigue habiendo 2 sesiones
  editar(1);
  guardarDia(1, iso(hoy), iso(hace(3)));
  assert.deepEqual(plano(S.get('sessions')).map(s => [s.date, s.day]), [[iso(hace(30)), '1'], [iso(hace(3)), '2']]);
  assert.equal(cuenta(els.semanaActual.innerHTML, 'data-quitar='), 0, 'el panel se cierra al guardar');
  guardarDia(1, iso(hace(3)), iso(new Date(hoy.getTime() + 3 * 86400000)));   // un día futuro no vale
  assert.equal(plano(S.get('sessions'))[1].date, iso(hace(3)));
  guardarDia(1, '2000-01-01', iso(hace(1)));   // no es la fecha de esa sesión: no se toca nada
  assert.equal(plano(S.get('sessions'))[1].date, iso(hace(3)));
  // quitar desde el panel: dos pulsaciones
  editar(1);
  quitar(1, iso(hace(3)));
  assert.equal(S.get('sessions').length, 2);
  assert.match(els.semanaHistorial.innerHTML + els.semanaActual.innerHTML, /¿Seguro\? Pulsa otra vez/);
  quitar(1, iso(hace(3)));
  assert.deepEqual(plano(S.get('sessions')).map(s => s.day), ['1']);
  quitar(0, '2000-01-01'); quitar(0, '2000-01-01');   // fecha que no es la suya: no se toca nada
  assert.equal(S.get('sessions').length, 1);
});

test('tocar una sesión hecha en «Mi semana» la abre con la vista de Entreno (filas verdes con ✓) y su cardio; el mismo toque la cierra; todo escapado', () => {
  const app = crearApp(), S = app.get('Storage'), iso = app.get('isoDate');
  const els = { semanaActual: {}, semanaHistorial: {} }, original = app.get('document').getElementById;
  app.get('document').getElementById = id => els[id] || original(id);
  const hoy = iso(new Date());
  S.set('sessions', [{ date: hoy, block: null, day: '1', exercises: ['Press de banca placas', '<img src=x onerror=alert(1)>'], cardio: [{ minutes: 10, km: 1.06, note: 'Cinta' }, { minutes: 20, km: 3.04, note: '<b>x</b>' }] }]);
  const render = () => { app.get('renderSemana')(); return els.semanaActual.innerHTML; };
  let html = render();
  assert.match(html, new RegExp(`data-ver="${hoy}"`), 'el día hecho se puede tocar');
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /Press de banca placas/, 'cerrado: no se ven los ejercicios');
  app.get('pulsarVerDia')(hoy);
  html = els.semanaActual.innerHTML;
  assert.equal((html.match(/class="gym-ej hecho"/g) || []).length, 2, 'una fila verde por ejercicio, como en Entreno');
  assert.equal((html.match(/class="gym-check" checked disabled/g) || []).length, 2, 'con su ✓ (solo lectura)');
  assert.match(html, /<span class="gym-ej-nombre">Press de banca placas<\/span>/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/, 'escapado');
  assert.doesNotMatch(html, /<img src=x/, 'nada de HTML suelto');
  // el cardio, en filas como las de los ejercicios (no en una línea de texto): una por cardio, en el orden hecho, con su título y sus datos
  assert.equal((html.match(/class="gym-ej cardio-fila"/g) || []).length, 2);
  assert.match(html, /<span class="gym-ej-nombre">Cardio 1<\/span><span class="gym-ej-meta">10 min · 1\.06 km · Cinta<\/span>/);
  assert.match(html, /<span class="gym-ej-nombre">Cardio 2<\/span><span class="gym-ej-meta">20 min · 3\.04 km · &lt;b&gt;x&lt;\/b&gt;<\/span>/, 'escapado');
  assert.doesNotMatch(html, /Cardio · /, 'ya no es una línea de texto');
  app.get('pulsarVerDia')(hoy);   // el mismo toque lo cierra
  assert.doesNotMatch(els.semanaActual.innerHTML, /Press de banca placas/);
});

test('Dashboard · «Tu plan»: las casillas ✓ de las sesiones hechas se pueden tocar y abren esa sesión con la vista de Entreno; las vacías, no', () => {
  const app = crearApp(), S = app.get('Storage'), iso = app.get('isoDate');
  const els = { planTable: {} }, original = app.get('document').getElementById;
  app.get('document').getElementById = id => els[id] || original(id);
  const hoy = new Date();
  S.set('startDate', hoy.toISOString());
  S.set('settings', { startDate: hoy.toISOString(), totalWeeks: 8 });
  S.set('sessions', [{ date: iso(hoy), block: null, day: '1', exercises: ['Press de banca placas', 'Hack de piernas'], cardio: [{ minutes: 10 }] }]);
  const cuenta = (t, r) => (String(t).match(r) || []).length;
  app.get('renderPlanTable')();
  assert.equal(cuenta(els.planTable.innerHTML, /data-plan-sesion=/g), 1, 'solo la casilla hecha se puede tocar');
  assert.match(els.planTable.innerHTML, /data-plan-sesion="1:0"/);
  assert.doesNotMatch(els.planTable.innerHTML, /Press de banca placas/);
  app.get('pulsarSesionDelPlan')('1:0');
  let html = els.planTable.innerHTML;
  assert.equal(cuenta(html, /class="gym-ej hecho"/g), 2);
  assert.match(html, /Press de banca placas/);
  assert.equal(cuenta(html, /class="gym-ej cardio-fila"/g), 1);
  assert.match(html, /<span class="gym-ej-nombre">Cardio 1<\/span><span class="gym-ej-meta">10 min<\/span>/);
  assert.match(html, /aria-expanded="true"/);
  app.get('pulsarSesionDelPlan')('1:0');   // el mismo toque la cierra
  assert.doesNotMatch(els.planTable.innerHTML, /Press de banca placas/);
});

test('el cardio de una sesión abierta: las filas vacías o raras no cuentan ni rompen, y el formato viejo {start, end} se lee igual', () => {
  const vista = crearApp().get('vistaSesionHecha');
  const filas = s => (String(vista(s)).match(/class="gym-ej cardio-fila"/g) || []).length;
  const base = { date: '2026-11-02', day: '1', exercises: ['A'] };
  assert.equal(filas({ ...base, cardio: [{}, null, 5, { minutes: 12 }] }), 1, 'solo la que tiene datos');
  assert.equal(filas({ ...base, cardio: { start: { minutes: 10 }, end: { minutes: 20, km: 3 } } }), 2, 'formato viejo');
  assert.equal(filas({ ...base }), 0, 'sin cardio, sin filas');
  assert.equal(filas({ ...base, cardio: [] }), 0);
});

