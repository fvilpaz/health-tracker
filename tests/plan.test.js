/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 4-nov-2026) */
// El plan de 8 semanas (src/data/plan.json): bien formado, y la app enseña los días de la semana en curso.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { crearApp } = require('./entorno.js');
const plano = x => JSON.parse(JSON.stringify(x));   // lo creado dentro de la «página» es de otro mundo JS
const leer = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', f), 'utf8'));

const plan = leer('plan.json');
const planViejo = leer('gym.json');
const fichas = leer('ejercicios-gym.json').ejercicios;
const todos = plan.weeks.flatMap(s => s.days.flatMap(d => d.exercises));

test('plan.json: 8 semanas empezando en lunes; la 1 con sus 4 días y el resto, huecos vacíos para rellenar', () => {
  assert.equal(plan.weeks.length, 8);
  assert.equal(new Date(plan.inicio + 'T00:00:00').getDay(), 1, 'el plan empieza en lunes');
  assert.deepEqual(plan.weeks[0].days.map(d => d.id), ['1', '2', '3', '4']);
  assert.ok(plan.weeks.slice(1).every(s => Array.isArray(s.days) && s.days.length === 0));
  assert.ok(Number.isInteger(plan.sets) && Number.isInteger(plan.reps) && Number.isInteger(plan.rest));
});

test('plan.json: ejercicios con id único, sin repetir dentro del día, y los que ya tenían ficha conservan su nombre de siempre', () => {
  const ids = todos.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
  const viejos = planViejo.days.flatMap(d => d.exercises);
  for (const e of todos) {
    assert.ok(typeof e.name === 'string' && e.name.trim(), e.id);
    if (e.sets !== undefined) assert.ok(Number.isInteger(e.sets) && e.sets >= 1 && e.sets <= 10, e.id);
    if (e.ref) {
      assert.ok(fichas[e.ref], `${e.id}: ref sin ficha`);
      assert.equal(viejos.find(v => v.ref === e.ref).name, e.name, `${e.id}: el historial guarda el nombre, no se cambia`);
    }
  }
  for (const d of plan.weeks.flatMap(s => s.days)) {
    const nombres = d.exercises.map(e => e.name);
    assert.equal(new Set(nombres).size, nombres.length, `día ${d.id}: ejercicio repetido`);
  }
});

test('semana en curso: por fecha; una semana aún vacía enseña la última rellena; nunca se sale del plan', () => {
  const app = crearApp(), dias = (p, f) => plano(app.get('diasDelPlan')(p, new Date(f + 'T12:00:00')));
  const con2 = plano(plan); con2.weeks[1].days = [{ id: '1', exercises: [{ id: 'x', name: 'X' }] }];
  assert.equal(dias(plan, '2026-11-04').semana, 1);
  assert.equal(dias(plan, '2026-11-04').days.length, 4);
  assert.equal(dias(plan, '2026-11-10').semana, 1, 'la semana 2 está vacía: se sigue viendo la 1');
  assert.equal(dias(plan, '2026-10-20').semana, 1, 'antes del inicio');
  assert.equal(dias(plan, '2027-03-01').semana, 1, 'pasadas las 8 semanas');
  assert.equal(dias(con2, '2026-11-10').semana, 2);
  assert.equal(dias(con2, '2026-11-10').days[0].exercises[0].name, 'X');
  assert.equal(dias(con2, '2026-11-04').semana, 1);
});

test('la app carga plan.json y deja en planGym.days los de la semana en curso; el formato antiguo (days) sigue valiendo', async () => {
  const app = crearApp();
  app.get('fetch = async () => ({ ok: true, json: async () => (' + JSON.stringify(plan) + ') })');
  await app.get('cargarPlanGym')();
  const cargado = plano(app.get('planGym'));
  assert.equal(cargado.days.length, 4);
  assert.equal(cargado.days[0].exercises[0].name, 'Press de banca placas');
  assert.equal(cargado.rest, 60);
  const vieja = crearApp();
  vieja.get('fetch = async () => ({ ok: true, json: async () => (' + JSON.stringify(planViejo) + ') })');
  await vieja.get('cargarPlanGym')();
  assert.equal(plano(vieja.get('planGym')).days.length, 5);
});

// ===== Constructor del plan (constructor-plan.js) =====
const F = (app, n) => (...a) => plano(app.get(n)(...a));

test('planNuevo: de 1 a 52 semanas (4 y 5 valen), con nombre; vacío, 0 o 53 no', () => {
  const nuevo = F(crearApp(), 'planNuevo');
  for (const s of ['4', '5', 4, 52, '8']) assert.equal(nuevo('Plan', s, '2026-11-02').plan.weeks.length, Number(s));
  assert.ok(nuevo('Plan', 4, '2026-11-02').plan.weeks.every(w => w.days.length === 0));
  for (const s of [0, '0', 53, 'a', 2.5, '']) assert.ok(nuevo('Plan', s, '2026-11-02').error, String(s));
  assert.ok(nuevo('  ', 4, '2026-11-02').error);
  assert.ok(nuevo('x'.repeat(61), 4, '2026-11-02').error);
});

test('añadir y quitar días: hasta 7 por semana, siempre 1, 2, 3… y sin tocar el plan que se pasa', () => {
  const app = crearApp(), nuevo = F(app, 'planNuevo'), mas = F(app, 'planConDia'), menos = F(app, 'planSinDia');
  let p = nuevo('Plan', 2, '2026-11-02').plan;
  const original = JSON.stringify(p);
  for (let i = 1; i <= 7; i++) p = mas(p, 1).plan;
  assert.equal(JSON.stringify(nuevo('Plan', 2, '2026-11-02').plan), original, 'no cambia lo que recibe');
  assert.deepEqual(p.weeks[0].days.map(d => d.id), ['1', '2', '3', '4', '5', '6', '7']);
  assert.ok(mas(p, 1).error, 'el día 8 no entra');
  assert.ok(mas(p, 9).error, 'semana que no existe');
  p.weeks[0].days[1].exercises.push({ id: 'a', name: 'A' });
  const sin3 = menos(p, 1, '1').plan;   // quitar el día 1: los demás suben y conservan sus ejercicios
  assert.deepEqual(sin3.weeks[0].days.map(d => d.id), ['1', '2', '3', '4', '5', '6']);
  assert.equal(sin3.weeks[0].days[0].exercises[0].name, 'A');
  assert.ok(menos(p, 1, '9').error);
  assert.equal(p.weeks[1].days.length, 0, 'la otra semana ni se toca');
});

test('añadir y quitar ejercicios: de uno en uno, sin repetir en el día, con tope y con ficha si viene de la lista', () => {
  const app = crearApp(), mas = F(app, 'planConEjercicio'), menos = F(app, 'planSinEjercicio');
  let p = F(app, 'planConDia')(F(app, 'planNuevo')('Plan', 1, '2026-11-02').plan, 1).plan;
  p = mas(p, 1, '1', { name: '  Press de banca placas ', ref: 'd1e1' }).plan;
  p = mas(p, 1, '1', { name: 'Ejercicio escrito a mano' }).plan;
  assert.deepEqual(p.weeks[0].days[0].exercises.map(e => [e.id, e.name, e.ref]), [['s1d1e1', 'Press de banca placas', 'd1e1'], ['s1d1e2', 'Ejercicio escrito a mano', undefined]]);
  assert.match(mas(p, 1, '1', { name: 'Press de banca placas' }).error, /ya está/);
  for (const malo of ['', '   ', undefined, 'x'.repeat(81)]) assert.ok(mas(p, 1, '1', { name: malo }).error, String(malo));
  assert.ok(mas(p, 1, '5', { name: 'X' }).error, 'día que no existe');
  const sinPrimero = menos(p, 1, '1', 's1d1e1').plan;
  assert.deepEqual(sinPrimero.weeks[0].days[0].exercises.map(e => e.id), ['s1d1e2']);
  assert.equal(mas(sinPrimero, 1, '1', { name: 'Otro' }).plan.weeks[0].days[0].exercises.at(-1).id, 's1d1e3', 'el id nuevo no choca con los que quedan');
  assert.ok(menos(p, 1, '1', 'nada').error);
  let lleno = p;
  for (let i = 0; i < 18; i++) lleno = mas(lleno, 1, '1', { name: 'E' + i }).plan;
  assert.equal(lleno.weeks[0].days[0].exercises.length, 20);
  assert.match(mas(lleno, 1, '1', { name: 'uno más' }).error, /20/);
});

test('limpiarPlan: el plan de la app entra entero; lo mal formado, o con HTML en un campo que no es texto normal, no', () => {
  const limpio = F(crearApp(), 'limpiarPlan');
  assert.deepEqual(limpio(plan), plan, 'plan.json pasa la limpieza sin perder nada');
  const roto = f => { const c = plano(plan); f(c); return limpio(c); };
  assert.equal(limpio(null), null);
  assert.equal(roto(c => { c.weeks = []; }), null);
  assert.equal(roto(c => { c.weeks[0].days[0].id = '2'; }), null);
  assert.equal(roto(c => { c.weeks[0].days[0].exercises[0].id = '<img onerror=x>'; }), null);
  assert.equal(roto(c => { c.weeks[0].days[0].exercises[0].ref = 'D1 E1'; }), null);
  assert.equal(roto(c => { c.weeks[0].days[0].exercises[1].name = c.weeks[0].days[0].exercises[0].name; }), null, 'repetido en el día');
  assert.equal(roto(c => { c.weeks[0].days[2].exercises[6].sets = 11; }), null);
  assert.equal(roto(c => { c.rest = 5; }), null);
  assert.equal(roto(c => { c.inicio = 'mañana'; }), null);
  assert.equal(roto(c => { c.weeks.length = 0; for (let i = 0; i < 53; i++) c.weeks.push({ days: [] }); }), null);
  const conExtra = plano(plan); conExtra.weeks[0].days[0].exercises[0].extra = '<b>x</b>'; conExtra.hack = 1;
  assert.deepEqual(limpio(conExtra), plan, 'solo se quedan los campos conocidos');
});

test('la lista del select: cada ejercicio una vez, con su ficha si la tiene, por orden alfabético', () => {
  const lista = F(crearApp(), 'listaParaSelect');
  const r = lista([{ name: 'Zancadas', ref: 'z1' }, { name: 'Aductor' }], [{ name: 'Zancadas' }, { name: ' Aductor ', ref: 'a1' }, { name: '' }, null]);
  assert.deepEqual(r, [{ name: 'Aductor' }, { name: 'Zancadas', ref: 'z1' }]);
});

test('el plan armado se guarda en gymPlan: la app lo lee antes que plan.json, viaja en la copia y un plan roto se ignora', async () => {
  const app = crearApp(), mas = F(app, 'planConEjercicio');
  let p = F(app, 'planConDia')(F(app, 'planNuevo')('Mío', 3, '2026-11-02').plan, 1).plan;
  p = mas(p, 1, '1', { name: 'Press de banca placas', ref: 'd1e1' }).plan;
  app.get('Storage').set('gymPlan', p);
  app.get('fetch = async () => { throw new Error("no debería pedir plan.json"); }');
  await app.get('cargarPlanGym')();
  assert.equal(plano(app.get('planGym')).days[0].exercises[0].name, 'Press de banca placas');
  assert.equal(plano(app.get('planGym')).plan, 'Mío');
  const { datos, descartados } = plano(app.get('limpiarCopia')({ gymPlan: p }));
  assert.deepEqual(datos.gymPlan, p);
  assert.equal(descartados, 0);
  const mala = plano(app.get('limpiarCopia')({ gymPlan: { plan: 'x', weeks: 'no' } }));
  assert.equal(mala.datos.gymPlan, undefined);
  assert.equal(mala.descartados, 1);
  const otra = crearApp();
  otra.get('Storage').set('gymPlan', { basura: true });
  otra.get('fetch = async () => ({ ok: true, json: async () => (' + JSON.stringify(plan) + ') })');
  await otra.get('cargarPlanGym')();
  assert.equal(plano(otra.get('planGym')).days.length, 4, 'con un plan guardado roto vuelve a plan.json');
});

test('un plan sin días no rompe: sesionGym de un día que ya no existe devuelve error, no una excepción', () => {
  const app = crearApp();
  const r = plano(app.get('sesionGym')({ days: [{ id: '1', exercises: [{ name: 'A' }] }] }, { day: '4', done: ['A'], cardio: [] }, '2026-11-04'));
  assert.match(r.error, /ya no está/);
});
