// Tests de las medidas (medidas.js): apuntar un día anterior y guardar varias a la vez. Datos inventados.
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

test('medidasEscritas: solo lo que tiene algo, con coma decimal; y una sola casilla mal impide guardar todas', () => {
  const m = crearApp().get('medidasEscritas');
  assert.deepEqual(plano(m({ weight: '95,8', waist: '', belly: ' ', height: '' })), { weight: 95.8 });
  assert.deepEqual(plano(m({ weight: '95.8', waist: '100', belly: '110,5', height: '177' })), { weight: 95.8, waist: 100, belly: 110.5, height: 177 });
  assert.equal(m({}).error, 'Escribe al menos una medida');
  assert.equal(m({ weight: '', waist: '' }).error, 'Escribe al menos una medida');
  // un peso imposible con el resto bien: ninguna se da por buena (el aviso dice cuál)
  assert.equal(m({ weight: '9.58', waist: '100' }).error, 'Pon un peso entre 30 y 300 kg');
  assert.equal(m({ weight: '95', waist: '10' }).error, 'Pon una cintura entre 40 y 200 cm');
  assert.equal(m({ weight: 'abc' }).error, 'Pon un peso entre 30 y 300 kg');
  assert.equal(m({ height: '17' }).error, 'Pon una altura entre 120 y 230 cm');
});
