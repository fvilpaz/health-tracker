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
  const metas = crearApp().get('calcularMetas')(80, 170, null);
  assert.deepEqual(plano(metas.map(m => [m.plazo, m.hecho])), [['Corto', true], ['Largo', false]]);
  const justo = crearApp().get('calcularMetas')(80, 170, 80);   // el objetivo cuenta al llegar justo
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
