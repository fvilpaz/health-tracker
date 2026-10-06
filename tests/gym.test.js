/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 6-oct-2026) */
// Tests del plan del gimnasio (src/data/gym.json): que esté bien formado antes de que la app lo use.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { crearApp } = require('./entorno.js');
const plano = x => JSON.parse(JSON.stringify(x));   // lo creado dentro de la «página» es de otro mundo JS

const gym = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'gym.json'), 'utf8'));

// Lista de fallos de un plan (vacía = bien formado)
function fallos(g) {
  const f = [];
  if (!Number.isInteger(g.sets) || !Number.isInteger(g.reps) || !Number.isInteger(g.rest)) f.push('sets, reps y rest tienen que ser enteros');
  g.days.forEach((d, i) => {
    if (d.id !== String(i + 1)) f.push(`día ${i + 1}: id «${d.id}»`);
    const nombres = d.exercises.map(e => e.name);
    if (new Set(nombres).size !== nombres.length) f.push(`día ${d.id}: ejercicio repetido`);
    d.exercises.forEach(e => { if (typeof e.name !== 'string' || !e.name.trim() || (e.sets !== undefined && !(Number.isInteger(e.sets) && e.sets >= 1 && e.sets <= 10))) f.push(`día ${d.id}: «${e.name}» mal`); });
  });
  return f;
}

test('el plan del gimnasio tiene 5 días bien formados', () => {
  assert.equal(gym.days.length, 5);
  assert.deepEqual(fallos(gym), []);
});

test('control: la comprobación sí caza un plan roto', () => {
  const roto = { sets: '3', reps: 15, rest: 90, days: [{ id: '2', exercises: [{ name: 'A' }, { name: 'A' }, { name: '', sets: 0 }] }] };
  assert.equal(fallos(roto).length, 4);   // sets, id, repetido y el ejercicio sin nombre ni series
});

test('día 5 = día 2 con el femoral y el hack cambiados de orden (capturas del plan, semanas 1 y 2)', () => {
  const [d2, d5] = [gym.days[1], gym.days[4]].map(d => d.exercises.map(e => e.name));
  assert.deepEqual([...d2].sort(), [...d5].sort());
  assert.notDeepEqual(d2, d5);
});

test('nextGymDay: el siguiente al último día hecho (5 → 1) y se salta las sesiones antiguas sin día', () => {
  const sig = ses => crearApp().get('nextGymDay')(ses);
  assert.equal(sig([]), '1');
  assert.equal(sig([{ date: '2026-10-05', day: '1' }]), '2');
  assert.equal(sig([{ date: '2026-10-05', day: '5' }]), '1');
  assert.equal(sig([{ date: '2026-10-05', day: '3' }, { date: '2026-10-06', block: '2' }]), '4');   // el bloque viejo no cuenta
});

test('cardioDeCasillas: opcional, acepta coma decimal y avisa de lo mal escrito', () => {
  const c = crearApp().get('cardioDeCasillas');
  assert.equal(c({}), null);
  assert.equal(c({ minutes: ' ', km: '', note: '  ' }), null);
  assert.deepEqual(plano(c({ minutes: '54', km: '5,06', note: ' caminata ' })), { minutes: 54, km: 5.06, note: 'caminata' });
  assert.deepEqual(plano(c({ km: '0.69' })), { km: 0.69 });
  assert.deepEqual(plano(c({ minutes: '10:38', km: '0,69' })), { minutes: 10.63, km: 0.69 });   // como lo da la cinta (min:seg)
  assert.deepEqual(plano(c({ minutes: '54:15' })), { minutes: 54.25 });
  for (const mal of ['10:75', '10:5', ':30', '0:00', '700:00']) assert.ok(c({ minutes: mal }).error, mal);
  for (const mal of [{ minutes: 'abc' }, { minutes: '0' }, { minutes: '601' }, { km: '-1' }, { km: '201' }, { note: 'x'.repeat(121) }]) assert.ok(c(mal).error, JSON.stringify(mal));
});

test('sesionGym: ejercicios en el orden del plan, cardio solo si hay algo, y sin ejercicios no se guarda', () => {
  const app = crearApp(), s = (b, f = '2026-10-06') => plano(app.get('sesionGym')(gym, b, f));
  const dia1 = gym.days[0].exercises.map(e => e.name);
  assert.deepEqual(s({ day: '1', done: [dia1[2], dia1[0]], cardio: {} }), { date: '2026-10-06', block: null, day: '1', exercises: [dia1[0], dia1[2]] });
  const con = s({ day: '1', done: [dia1[0]], cardio: { start: { minutes: '10,5' }, end: { minutes: '', km: '' } } });
  assert.deepEqual(con.cardio, { start: { minutes: 10.5 } });
  assert.equal(s({ day: '1', done: [dia1[0]] }, '2026-10-05').date, '2026-10-05');   // lo de ayer, apuntado hoy
  for (const mala of ['2999-01-01', '2026-02-31', '', '5/10/2026']) assert.ok(s({ day: '1', done: [dia1[0]] }, mala).error, mala);   // futura, que no existe, vacía o mal escrita
  assert.equal(s({ day: '1', done: [] }).error, 'Marca al menos un ejercicio');
  assert.equal(s({ day: '1', done: ['Otro que no es del día 1'] }).error, 'Marca al menos un ejercicio');
  assert.ok(s({ day: '1', done: [dia1[0]], cardio: { end: { km: 'mucho' } } }).error.startsWith('Cardio al acabar'));
});

test('lo que sale de sesionGym entra entero en limpiarCopia (guardar e importar dicen lo mismo)', () => {
  const app = crearApp(), dia = gym.days[3].exercises.map(e => e.name);
  const ses = plano(app.get('sesionGym')(gym, { day: '4', done: dia, cardio: { start: { minutes: '10.6', km: '0,69', note: 'cinta' }, end: { minutes: '54', km: '5,06' } } }, '2026-01-06'));
  const r = app.get('limpiarCopia')({ sessions: [ses] });
  assert.equal(r.descartados, 0);
  assert.deepEqual(plano(r.datos.sessions), [ses]);
});

test('idealSemana: sin plan cargado es el mínimo; con el plan de 5 días, 5 (y nunca menos que el mínimo)', () => {
  const app = crearApp();
  assert.equal(app.get('idealSemana')(), 3);
  app.get('planGym = { days: [1, 2, 3, 4, 5] }');
  assert.equal(app.get('idealSemana')(), 5);
  app.get('Storage').set('profile', { days: 6 });
  assert.equal(app.get('idealSemana')(), 6);
});

test('weekStatus con mínimo 3 e ideal 5: con 3 ya está cumplida (verde), con 5 el plan completo; con 2, como siempre', () => {
  const estado = (hechas) => {
    const app = crearApp();
    app.get('planGym = { days: [1, 2, 3, 4, 5] }');
    app.get('Storage').set('sessions', hechas.map((date, i) => ({ date, block: null, day: String(i + 1) })));
    return plano(app.get('weekStatus')(new Date('2026-10-02T18:00')));   // viernes
  };
  const dias = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
  assert.deepEqual([estado(dias.slice(0, 3)).color, estado(dias.slice(0, 3)).texto.includes('Semana cumplida (mínimo 3). El plan completo son 5.')], ['verde', true]);
  assert.ok(estado(dias).texto.includes('Plan completo: 5 de 5'));
  assert.ok(estado(dias.slice(0, 2)).texto.includes('te falta 1 sesión'));
});

test('textoCardio: una línea con lo que haya, vacío sin cardio, y todo escapado (viene del almacén)', () => {
  const t = crearApp().get('textoCardio');
  assert.equal(t({ start: { minutes: 10.6, km: 0.69, note: 'cinta' }, end: { minutes: 54, km: 5.06 } }), 'Al empezar: 10.6 min · 0.69 km · cinta — Al acabar: 54 min · 5.06 km');
  assert.equal(t({ end: { km: 0 } }), 'Al acabar: 0 km');
  assert.equal(t(undefined), '');
  assert.equal(t({ start: {} }), '');
  assert.ok(!t({ end: { note: '<img src=x onerror="alert(1)">' } }).includes('<'));
});

test('rellenoReloj: lleno al estar parado, se vacía al descansar y nunca sale de 0 a 1', () => {
  const r = crearApp().get('rellenoReloj');
  assert.equal(r(undefined, 90), 1);
  assert.equal(r(90, 90), 1);
  assert.equal(r(45, 90), 0.5);
  assert.equal(r(0, 90), 0);
  assert.equal(r(-3, 90), 0);
  assert.equal(r(120, 90), 1);
});

test('el borrador de la sesión (gymDraft) se ignora al importar, sin contarlo como error', () => {
  const r = crearApp().get('limpiarCopia')({ gymDraft: { date: '2026-10-06', day: '1', done: ['x'] }, sessions: [] });
  assert.equal(r.descartados, 0);
  assert.equal(r.datos.gymDraft, undefined);
});

test('gym.json: cada ejercicio tiene un id estable y único', () => {
  const plan = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'data', 'gym.json'), 'utf8'));
  const ids = plan.days.flatMap(d => d.exercises.map(e => e.id));
  assert.equal(ids.length, 38);
  assert.ok(ids.every(id => /^d[1-5]e\d{1,2}$/.test(id)));
  assert.equal(new Set(ids).size, ids.length);
});

test('sesionLibre: fecha (hoy o pasada) y nota opcional; sin ejercicios ni cardio', () => {
  const libre = crearApp().get('sesionLibre'), hoy = '2026-10-06';
  assert.deepEqual(JSON.parse(JSON.stringify(libre('2026-10-06', '  Caminata  ', hoy))), { date: '2026-10-06', block: null, note: 'Caminata' });
  assert.deepEqual(JSON.parse(JSON.stringify(libre('2026-10-05', '', hoy))), { date: '2026-10-05', block: null });   // sin nota
  assert.ok(libre('2026-10-07', 'x', hoy).error);                                    // futuro
  assert.ok(libre('', 'x', hoy).error);
  assert.ok(libre('2026-10-06', 'a'.repeat(121), hoy).error);
});

test('textoPuerta: sin «matrona» para menores', () => {
  const texto = crearApp().get('textoPuerta');
  assert.ok(!texto(['menor']).includes('matrona'));
  assert.ok(texto(['embarazo']).includes('matrona'));
  assert.ok(texto(['parq']).includes('plan de gimnasio ya hecho'));
});

test('decisionReloj: el Timer es uno; el reloj del gimnasio y el entreno en casa no se pisan ni se paran solos', () => {
  const decide = (q, corre, casaActivo) => JSON.parse(JSON.stringify(crearApp().get('decisionReloj')(q, { corre, casaActivo })));
  // Entreno en casa en marcha (corriendo o en pausa): el reloj del gimnasio no hace nada y avisa
  for (const corre of [true, false]) assert.deepEqual(decide('gym', corre, true), { accion: 'nada', aviso: 'Termina o para el entreno en casa para usar este reloj' });
  // Descanso del gimnasio corriendo: «Iniciar entrenamiento» no arranca y avisa
  assert.deepEqual(decide('casa', true, false), { accion: 'nada', aviso: 'Para el descanso del gimnasio antes de empezar' });
  // Sin choque, todo como siempre: el reloj arranca y, corriendo, se para; el entreno en casa arranca
  assert.deepEqual(decide('gym', false, false), { accion: 'arrancar' });
  assert.deepEqual(decide('gym', true, false), { accion: 'parar' });
  assert.deepEqual(decide('casa', false, false), { accion: 'arrancar' });
});

test('solo gimnasio (sin entreno en casa) el reloj se comporta como antes; marcarRelojes los pone inertes solo cuando toca', () => {
  const app = crearApp(), decide = app.get('decisionReloj'), els = new Map();
  for (const casaActivo of [false, undefined]) {
    assert.equal(decide('gym', { corre: false, casaActivo }).accion, 'arrancar');
    assert.equal(decide('gym', { corre: true, casaActivo }).accion, 'parar');
    assert.equal(decide('gym', { corre: true, casaActivo }).aviso, undefined);
  }
  app.get('document').getElementById = id => (els.has(id) ? els.get(id) : els.set(id, { attrs: new Map(), setAttribute(k, v) { this.attrs.set(k, v); } }).get(id));
  const marcar = app.get('marcarRelojes'), T = app.get('Timer');
  marcar();
  assert.equal(els.get('gymDescanso').attrs.get('aria-disabled'), 'false');
  assert.equal(els.get('startWorkoutBtn').attrs.get('aria-disabled'), 'false');
  T.start(30, () => {}, () => {});                                                   // corre el reloj del gym (workoutActive false)
  marcar();
  assert.equal(els.get('gymDescanso').attrs.get('aria-disabled'), 'false');
  assert.equal(els.get('startWorkoutBtn').attrs.get('aria-disabled'), 'true');                 // «Iniciar» inerte mientras corre el del gym
  T.stop();
  app.get('(function(){ workoutActive = true; })')();                                  // entreno en casa en marcha
  marcar();
  assert.equal(els.get('gymDescanso').attrs.get('aria-disabled'), 'true');                     // el reloj del gym, inerte
  assert.equal(els.get('startWorkoutBtn').attrs.get('aria-disabled'), 'false');
});

// Un DOM mínimo para mirar la estructura de la fila: elementos con hijos, atributos y eventos
function elementoFalso(tag) {
  const oyentes = new Map(), attrs = new Map();
  const el = {
    tag, children: [], className: '', textContent: '', hidden: false, checked: false,
    classList: { toggle(c, on) { const l = new Set(el.className.split(' ').filter(Boolean)); if (on) l.add(c); else l.delete(c); el.className = [...l].join(' '); } },
    append(...h) { el.children.push(...h); },
    replaceChildren(...h) { el.children = h; },
    setAttribute(k, v) { attrs.set(k, v); },
    attr: k => attrs.get(k),
    addEventListener(t, f) { oyentes.set(t, f); },
    dispara(t) { oyentes.get(t)?.(); },
    oyentes,
  };
  return el;
}

test('fila del ejercicio: el <label> marca; el botón de explicación es su hermano y no marca; sin ref no hay botón', () => {
  const app = crearApp();
  app.get('document').createElement = elementoFalso;
  const fila = app.get('filaEjercicio'), llamadas = [];
  const hacer = e => fila({ e, i: 0, hecha: false, meta: '3 series × 15 reps', alCambiar: m => llamadas.push(m), cargarExplicacion: async () => ({ trabaja: ['espalda'] }) });

  const sin = hacer({ id: 'd1e1', name: 'Press' });
  assert.equal(sin.children.length, 1);                                              // solo el <label>: idéntico a antes
  const label = sin.children[0], casilla = label.children[2];
  assert.equal(label.tag, 'label');
  assert.equal(casilla.tag, 'input');
  casilla.checked = true; casilla.dispara('change');                                 // tocar la casilla (o el cuerpo del label) marca
  assert.deepEqual(llamadas, [true]);
  assert.ok(label.className.includes('hecho'));
  casilla.checked = false; casilla.dispara('change');
  assert.deepEqual(llamadas, [true, false]);

  llamadas.length = 0;
  const con = hacer({ id: 'd1e2', name: 'Remo', ref: 'remo' });
  const [lab, boton, region] = con.children;
  assert.equal(con.children.length, 3);
  assert.ok(!lab.children.includes(boton) && !lab.children.includes(region));        // el botón NO va dentro del label
  assert.equal(boton.tag, 'button');
  assert.equal(boton.attr('aria-label'), 'Cómo se hace: Remo');
  assert.equal(boton.attr('aria-controls'), region.id);
  assert.equal(boton.attr('aria-expanded'), 'false');
  assert.equal(region.hidden, true);
  boton.dispara('click');
  assert.equal(region.hidden, false);
  assert.equal(boton.attr('aria-expanded'), 'true');
  assert.deepEqual(llamadas, []);                                                    // el botón nuevo no marca
});

test('explicación: Trabaja, pasos, Ojo y fotos (solo nombres seguros, tamaño fijo, carga diferida); sin foto, solo texto; todo con textContent', () => {
  const app = crearApp();
  app.get('document').createElement = elementoFalso;
  const construir = app.get('construirExplicacion');
  const region = elementoFalso('div');
  region.replaceChildren = (...h) => { region.children = h; };
  const hijos = exp => { construir(exp, 'Remo', region); return region.children; };

  const completa = hijos({ trabaja: ['espalda', 'bíceps'], pasos: ['Siéntate', 'Tira'], ojo: 'no balancees', fotos: { inicio: 'd1e1-inicio.webp', final: 'd1e1-final.webp', aproximada: true } });
  assert.deepEqual(completa.map(h => h.className), ['gym-tip-trabaja', 'gym-tip-pasos', 'gym-tip-ojo', 'gym-tip-fotos', 'gym-tip-aviso']);
  assert.equal(completa[0].textContent, 'Trabaja: espalda, bíceps');
  assert.deepEqual(completa[1].children.map(l => l.textContent), ['Siéntate', 'Tira']);
  assert.equal(completa[2].textContent, 'Ojo: no balancees');
  const imgs = completa[3].children.map(f => f.children[0]);
  assert.deepEqual(imgs.map(i => i.src), ['img/gym/d1e1-inicio.webp', 'img/gym/d1e1-final.webp']);
  assert.ok(imgs.every(i => i.loading === 'lazy' && i.width > 0 && i.height > 0 && i.alt.includes('Remo')));
  assert.ok(completa[4].textContent.includes('orientativa'));                         // aviso solo si la foto es aproximada

  const propias = hijos({ fotos: { inicio: 'a-inicio.webp', final: 'a-final.webp' } });
  assert.ok(!propias.some(h => h.className === 'gym-tip-aviso'));                      // fotos propias: sin aviso
  const soloTexto = hijos({ trabaja: ['espalda'] });
  assert.deepEqual(soloTexto.map(h => h.className), ['gym-tip-trabaja']);              // sin foto: solo texto
  // Nombres de archivo peligrosos: no se crea ninguna imagen
  for (const malo of ['../x.webp', 'a b.webp', 'x.jpg', 'http://malo/x.webp', '<img>.webp', 5]) {
    assert.ok(!hijos({ trabaja: ['a'], fotos: { inicio: malo, final: malo } }).some(h => h.className === 'gym-tip-fotos'), String(malo));
  }
  assert.equal(hijos({}).length, 1);                                                   // vacío: «Todavía no hay explicación»
});

test('abrir la explicación: carga una sola vez, no marca, y sin conexión se reintenta', async () => {
  const app = crearApp();
  app.get('document').createElement = elementoFalso;
  const fila = app.get('filaEjercicio'), cambios = [];
  let cargas = 0, falla = true;
  const f = fila({ e: { id: 'd1e2', name: 'Remo', ref: 'remo' }, i: 0, hecha: false, meta: 'm', alCambiar: m => cambios.push(m),
    cargarExplicacion: async () => { cargas++; if (falla) throw new Error('sin red'); return { trabaja: ['espalda'] }; } });
  const [, boton, region] = f.children;
  region.replaceChildren = (...h) => { region.children = h; };
  await boton.oyentes.get('click')();                                                  // abre: falla la carga
  assert.equal(region.children[0].textContent, 'Todavía no hay explicación de este ejercicio.');
  await boton.oyentes.get('click')();                                                  // cierra
  falla = false;
  await boton.oyentes.get('click')();                                                  // abre otra vez: reintenta y pinta
  assert.equal(region.children[0].textContent, 'Trabaja: espalda');
  await boton.oyentes.get('click')(); await boton.oyentes.get('click')();              // cierra y abre: no vuelve a cargar
  assert.equal(cargas, 2);
  assert.deepEqual(cambios, []);                                                       // nada de esto marca el ejercicio
});
