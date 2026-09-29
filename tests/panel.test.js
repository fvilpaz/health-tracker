// Tests del panel principal: colores (semáforo), metas y logros. Datos inventados (el repo es público).
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));   // lo creado dentro de la «página» es de otro mundo JS

test('colorSemaforo: verde, naranja y rojo en los cortes; sin dato, sin color', () => {
  const color = crearApp().get('colorSemaforo');
  // IMC: naranja desde 25, rojo desde 30
  assert.equal(color(24.9, 25, 30), 'var(--green)');
  assert.equal(color(25, 25, 30), 'var(--orange)');
  assert.equal(color(29.9, 25, 30), 'var(--orange)');
  assert.equal(color(30, 25, 30), 'var(--red)');
  assert.equal(color(null, 25, 30), '');
});

test('calcularMetas: corto (IMC 30), medio (objetivo) y largo (IMC 27), de mayor a menor', () => {
  const metas = crearApp().get('calcularMetas')(92, 170, 80);   // 1,70 m → IMC 30 = 86,7 kg · IMC 27 = 78,0 kg
  assert.deepEqual(plano(metas.map(m => [m.plazo, +m.peso.toFixed(1), +m.falta.toFixed(1), m.hecho])), [
    ['Corto', 86.7, 5.3, false],
    ['Medio', 80, 12, false],
    ['Largo', 78, 14, false],
  ]);
});

test('calcularMetas: sin objetivo no hay meta media; lo que ya se ha pasado sale conseguido', () => {
  const metas = crearApp().get('calcularMetas')(80, 170, null, 92);   // empezó en 92: la de IMC 30 sí la ha pasado
  assert.deepEqual(plano(metas.map(m => [m.plazo, m.hecho])), [['Corto', true], ['Largo', false]]);
  const justo = crearApp().get('calcularMetas')(80, 170, 80, 92);   // el objetivo cuenta al llegar justo
  assert.equal(justo.find(m => m.plazo === 'Medio').hecho, true);
});

test('logros: cada uno se desbloquea con su condición y no antes', () => {
  const casos = {
    first_train: [{ sessions: [] }, { sessions: [{ date: '2026-01-05', block: '1' }] }],
    week: [{ sessions: [{ date: '2026-01-05', block: '1' }] },
           { sessions: ['2026-01-05', '2026-01-07', '2026-01-09'].map(date => ({ date, block: '1' })) }],
    kg1: [{ weights: [{ date: '1/1/2026', weight: 90 }, { date: '8/1/2026', weight: 89.5 }] },
          { weights: [{ date: '1/1/2026', weight: 90 }, { date: '8/1/2026', weight: 89 }] }],
    kg5: [{ weights: [{ date: '1/1/2026', weight: 90 }, { date: '8/1/2026', weight: 85.5 }] },
          { weights: [{ date: '1/1/2026', weight: 90 }, { date: '8/1/2026', weight: 85 }] }],
    goal: [{ settings: { goalWeight: 80 }, weights: [{ date: '1/1/2026', weight: 80.5 }] },
           { settings: { goalWeight: 80 }, weights: [{ date: '1/1/2026', weight: 80 }] }],
    waist1: [{ waists: [{ date: '1/1/2026', waist: 100 }, { date: '8/1/2026', waist: 99.5 }] },
             { waists: [{ date: '1/1/2026', waist: 100 }, { date: '8/1/2026', waist: 99 }] }],
    whtr: [{ settings: { height: 170 }, waists: [{ date: '1/1/2026', waist: 85 }] },          // 0,50: todavía no
           { settings: { height: 170 }, waists: [{ date: '1/1/2026', waist: 84 }] }],         // 0,49
  };
  for (const [id, [noTodavia, si]] of Object.entries(casos)) {
    for (const [datos, esperado] of [[noTodavia, false], [si, true]]) {
      const app = crearApp(), S = app.get('Storage');
      Object.entries(datos).forEach(([k, v]) => S.set(k, v));
      const logro = app.get('LOGROS_DEF').find(l => l.id === id);
      assert.equal(!!logro.check(), esperado, `${id} con ${JSON.stringify(datos)}`);
    }
  }
  // «Primer mes» = 4 semanas cumplidas (antes decía 30 entrenos y se desbloqueaba con 12)
  const app = crearApp();
  const lunes = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'];
  app.get('Storage').set('sessions', lunes.flatMap(l => [0, 2, 4].map(n => { const d = new Date(l + 'T12:00'); d.setDate(d.getDate() + n); return { date: app.get('isoDate')(d), block: '1' }; })));
  assert.equal(!!app.get('LOGROS_DEF').find(l => l.id === 'month').check(), true);
});

test('anotarMedida: una medida por día; el mismo día se sustituye y otro día se añade', () => {
  const anotar = crearApp().get('anotarMedida');
  const lista = [{ date: '1/1/2026', weight: 90 }];
  anotar(lista, 'weight', 89.6, '1/1/2026');
  anotar(lista, 'weight', 89.1, '2/1/2026');
  assert.deepEqual(plano(lista), [{ date: '1/1/2026', weight: 89.6 }, { date: '2/1/2026', weight: 89.1 }]);
});

test('medidaValida: acepta dentro del rango y, fuera, lo rechaza avisando', () => {
  const app = crearApp(), valida = app.get('medidaValida');
  assert.equal(valida('weight', 85.5), true);
  assert.equal(valida('weight', 25), false);
  assert.equal(valida('weight', NaN), false);   // campo vacío
  assert.equal(valida('waist', 40), true);
  assert.equal(valida('belly', 110), true);
  assert.equal(valida('belly', 999), false);
  assert.equal(valida('height', 231), false);
});

test('logro «Ratio saludable» y panel usan la misma cifra (redondeada): 84,9/170 se ve 0,50 y NO es logro', () => {
  const app = crearApp(), S = app.get('Storage');
  S.set('settings', { height: 170 }); S.set('waists', [{ date: '1/1/2026', waist: 84.9 }]);
  assert.equal(!!app.get('LOGROS_DEF').find(l => l.id === 'whtr').check(), false);
});

test('diferencia (tarjetas «Perdido»): menos si bajas, más si subes, y «--» sin datos', () => {
  const dif = crearApp().get('diferencia');
  assert.equal(dif(90, 88.5), '-1.5');
  assert.equal(dif(90, 90.5), '+0.5');   // antes salía «-0.5», que se lee como pérdida
  assert.equal(dif(90, 90), '0.0');
  assert.equal(dif(null, 90), '--');
});

test('metas: solo las que estaban por encima de tu peso al empezar; con peso sano, ninguna', () => {
  const metas = crearApp().get('calcularMetas');
  // 65 kg y 1,74 m (IMC 21,5): antes salía «sales de la obesidad: conseguido» y «te faltan 7 kg»
  assert.deepEqual(plano(metas(65, 174, null, 65)), []);
  // Empezó en 88 (IMC 29): la de obesidad no aplica; la larga sí
  assert.deepEqual(plano(metas(88, 174, null, 88).map(m => m.plazo)), ['Largo']);
});

test('metas: la larga es IMC 27 (hígado) si tiene hígado graso o no hay perfil; si no, IMC 25 (peso sano)', () => {
  const metas = crearApp().get('calcularMetas');
  assert.equal(+metas(100, 170, null, 100, true).find(m => m.plazo === 'Largo').peso.toFixed(1), 78);
  const sano = metas(100, 170, null, 100, false).find(m => m.plazo === 'Largo');
  assert.ok(Math.abs(sano.peso - 72.25) < 0.01);   // 25 × 1,7²
  assert.match(sano.texto, /IMC por debajo de 25/);
});

test('objetivo de peso: solo con sobrepeso al empezar y nunca para menores (vale también para datos ya guardados)', () => {
  const app = crearApp(), S = app.get('Storage'), obj = app.get('objetivoPeso');
  S.set('settings', { height: 174, goalWeight: 58 }); S.set('weights', [{ date: '1/9/2026', weight: 65 }]);
  assert.equal(obj(), null);                                   // IMC 21,5: no se propone bajar
  S.set('settings', { height: 177, goalWeight: 88.6 }); S.set('weights', [{ date: '1/9/2026', weight: 95.6 }]);
  assert.equal(obj(), 88.6);                                   // IMC 30,5: sí
  S.set('profile', { birthDate: '2012-01-01' });
  assert.equal(obj(), null);                                   // menor
});

test('configurar: el objetivo nunca baja de IMC 25, y con peso sano o «mantenerme» no hay objetivo', () => {
  const conf = (datos) => { const app = crearApp(); app.get('guardarConfiguracion')({ date: '2026-09-29', weeks: 12, waist: 80, ...datos }); return app.get('Storage').get('settings').goalWeight; };
  assert.equal(conf({ weight: 95.6, height: 177 }), 88.6);                       // como hasta ahora
  assert.equal(+conf({ weight: 80, height: 175 }).toFixed(1), 76.6);             // 80-7=73 bajaría de IMC 25: se queda en 76,6
  assert.equal(conf({ weight: 65, height: 174 }), undefined);                    // IMC 21,5
  assert.equal(conf({ weight: 95.6, height: 177, objetivo: 'maintain' }), undefined);
});

test('plan terminado: pasadas sus semanas, sí; dentro, no; sin plan, no', () => {
  const app = crearApp(), S = app.get('Storage'), fin = app.get('planTerminado');
  assert.equal(fin(new Date(2026, 8, 29)), false);
  S.set('settings', { startDate: '2026-06-29', totalWeeks: 12, height: 177 }); S.set('startDate', '2026-06-29T00:00:00.000Z');
  assert.equal(fin(new Date(2026, 8, 20)), false);   // semana 12
  assert.equal(fin(new Date(2026, 8, 22)), true);    // semana 13: terminado
});

test('empezar otro plan: conserva el historial, empieza hoy y el objetivo sale del peso de ahora', () => {
  const app = crearApp(), S = app.get('Storage');
  S.set('settings', { startDate: '2026-06-29', totalWeeks: 12, goalWeight: 88.6, height: 177 }); S.set('startDate', '2026-06-29T00:00:00.000Z');
  S.set('weights', [{ date: '29/6/2026', weight: 95.6 }, { date: '20/9/2026', weight: 90 }]);
  app.get('nuevoCiclo')(new Date(2026, 8, 29));
  const s = S.get('settings');
  assert.equal(s.startDate, '2026-09-29');
  assert.equal(s.goalWeight, 83);                       // 90 − 7 (por encima de IMC 25 = 78,3)
  assert.equal(S.get('weights').length, 2);             // el historial no se toca
  assert.equal(app.get('objetivoPeso')(), 83);          // el objetivo mira el peso al empezar ESTE plan
  assert.equal(app.get('medidasDelPlan')(S.get('weights'))[0].weight, 90);
});

test('tracker semanal: sin objetivo sale «— cm» (la leyenda ya dice qué es)', () => {
  const barriga = crearApp().get('planValor')(null, 108.5, 'cm');
  assert.match(barriga, /<span>—<\/span> cm/);
  assert.doesNotMatch(barriga, /barriga|cumple|inicio/);
  assert.match(barriga, /108\.5/);
});

test('objetivo de cada semana: la 1 es el valor con el que empiezas (tal cual) y la última llega justo a la meta', () => {
  const obj = crearApp().get('objetivoDeLaSemana');
  assert.equal(obj(95.6, 88.6, 12, 1), 95.6);                 // semana 1: el mismo número con el que empiezas
  assert.equal(obj(110, null, 12, 1), 110);                   // también sin meta (la barriga): su punto de partida
  assert.equal(obj(110, null, 12, 2), null);                  // y luego, sin objetivos
  assert.equal(+obj(95.6, 88.6, 12, 2).toFixed(2), 94.96);    // 95,6 − 7/11
  assert.equal(+obj(95.6, 88.6, 12, 12).toFixed(2), 88.6);    // última semana = meta
  assert.equal(obj(95.6, null, 12, 5), null);                  // sin meta, sin objetivos
});
