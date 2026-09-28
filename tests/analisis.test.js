// Tests de caracterización de análisis y plan: rangos, comparativas y medidas por semana.
// Datos inventados (el repo es público).
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const prueba = (app, k) => app.get('LAB_TESTS').find(t => t.k === k);

test('labFuera: por debajo del mínimo o por encima del máximo', () => {
  const app = crearApp(), fuera = app.get('labFuera');
  const glucosa = prueba(app, 'glucosa');   // 70 – 110
  assert.equal(fuera(glucosa, 69), true);
  assert.equal(fuera(glucosa, 70), false);
  assert.equal(fuera(glucosa, 110), false);
  assert.equal(fuera(glucosa, 111), true);
  assert.equal(fuera(prueba(app, 'hdl'), 39), true);   // solo mínimo (> 40)
});

test('labComparar: mejora o empeora según el lado bueno de cada prueba', () => {
  const app = crearApp(), cmp = (k, a, b) => app.get('labComparar')(prueba(app, k), a, b).clase;
  assert.equal(cmp('hba1c', 7.5, 6.8), 'mejora');     // cuanto más bajo, mejor
  assert.equal(cmp('hba1c', 6.8, 7.5), 'peora');
  assert.equal(cmp('hdl', 35, 42), 'mejora');         // cuanto más alto, mejor
  assert.equal(cmp('hdl', 42, 42), 'igual');
  assert.equal(cmp('creatinina', 1.5, 1.0), 'mejora');   // rango: entra en el rango
  assert.equal(cmp('creatinina', 1.0, 1.1), 'igual');    // rango: sigue dentro → igual
  assert.equal(cmp('creatinina', 1.0, 1.5), 'peora');    // rango: sale del rango
  assert.equal(cmp('bilirrubina', 0.8, 1.4), 'info');    // informativa: no se juzga
});

test('labDebe y labNum: cómo se escriben rangos y números', () => {
  const app = crearApp(), debe = k => app.get('labDebe')(prueba(app, k)), num = app.get('labNum');
  assert.equal(debe('glucosa'), '70 – 110');
  assert.equal(debe('hba1c'), '≤ 6,5');
  assert.equal(debe('hdl'), '≥ 40');
  assert.equal(debe('glucosa_orina'), 'sin rango');
  assert.equal(num(7.25), '7,25');
  assert.equal(num(100), '100');
});

test('ultimaDeSemana: la última medida de esa semana, o nada si no hay', () => {
  const app = crearApp(), ultima = app.get('ultimaDeSemana');
  const pesos = [{ date: '14/9/2026', weight: 90 }, { date: '18/9/2026', weight: 89.2 }, { date: '24/9/2026', weight: 88.5 }];
  const lunes = iso => new Date(iso + 'T00:00');
  assert.equal(ultima(pesos, 'weight', lunes('2026-09-14')), 89.2);
  assert.equal(ultima(pesos, 'weight', lunes('2026-09-21')), 88.5);
  assert.equal(ultima(pesos, 'weight', lunes('2026-09-28')), null);
});
