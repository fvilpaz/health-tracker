// Tests de las medidas con fecha (medidas.js): apuntar un peso de otro día lo deja en su sitio. Datos inventados.
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));

test('anotarMedida: un peso de un día anterior entra en su sitio (por fecha) y uno del mismo día sustituye al anterior', () => {
  const anotar = crearApp().get('anotarMedida');
  let lista = [{ date: '29/9/2026', weight: 90 }];
  lista = anotar(lista, 'weight', 91.5, '5/9/2026');          // un mes antes: pasa a ser el primero
  lista = anotar(lista, 'weight', 89.7, '5/10/2026');         // después
  assert.deepEqual(plano(lista).map(m => m.date), ['5/9/2026', '29/9/2026', '5/10/2026']);
  lista = anotar(lista, 'weight', 90.2, '29/9/2026');         // mismo día: sustituye
  assert.deepEqual(plano(lista).map(m => m.weight), [91.5, 90.2, 89.7]);
});

test('fechaEs / esAIso: la fecha de una medida de otro día se escribe y se lee igual (sin saltos por la hora)', () => {
  const app = crearApp(), fechaEs = app.get('fechaEs'), esAIso = app.get('esAIso');
  assert.equal(fechaEs(new Date('2026-09-05T12:00')), '5/9/2026');
  assert.equal(esAIso('5/9/2026'), '2026-09-05');
});
