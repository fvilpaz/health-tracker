// Tests de las copias automáticas (las 5 últimas, una por semana, dentro del navegador). Datos inventados.
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));
const dia = n => new Date(2026, 0, 1 + n, 10);   // 1-ene-2026 + n días

function conPeso(peso) {
  const app = crearApp();
  app.get('Storage').set('weights', [{ date: '1/1/2026', weight: peso }]);
  return app;
}

test('sin datos no se hace copia (nada que proteger)', () => {
  const app = crearApp();
  assert.equal(app.get('copiaAutomatica')(dia(0)), false);
  assert.deepEqual(plano(app.get('copiasAutomaticas')()), []);
});

test('una por semana: la primera al abrir, ninguna más hasta pasados 7 días', () => {
  const app = conPeso(90), copia = app.get('copiaAutomatica');
  assert.equal(copia(dia(0)), true);
  assert.equal(copia(dia(3)), false);
  assert.equal(copia(dia(6)), false);
  assert.equal(copia(dia(7)), true);
  assert.equal(app.get('copiasAutomaticas')().length, 2);
});

test('solo se guardan las 5 últimas: la sexta echa a la más vieja', () => {
  const app = conPeso(90), S = app.get('Storage');
  for (let semana = 0; semana < 6; semana++) {
    S.set('weights', [{ date: '1/1/2026', weight: 90 - semana }]);
    assert.equal(app.get('copiaAutomatica')(dia(semana * 7)), true);
  }
  const copias = app.get('copiasAutomaticas')();
  assert.equal(copias.length, 5);
  assert.deepEqual(plano(copias.map(c => c.data.weights[0].weight)), [89, 88, 87, 86, 85]);   // la de 90 ya no está
});

test('las copias automáticas no salen en la exportación ni se borran al importar', () => {
  const app = conPeso(90);
  app.get('copiaAutomatica')(dia(0));
  assert.equal(Object.keys(plano(app.get('datosActuales')())).includes('copias'), false);
  assert.equal(app.get('aplicarCopiaCompleta')({ weights: [] }).ok, true);
  assert.equal(app.get('copiasAutomaticas')().length, 1);
});

test('recuperar una copia vuelve a sus datos y antes guarda los de ahora', () => {
  const app = conPeso(90), S = app.get('Storage');
  app.get('copiaAutomatica')(dia(0));
  S.set('weights', [{ date: '1/1/2026', weight: 70 }]);           // un dato malo después de la copia
  assert.equal(app.get('recuperarCopiaAutomatica')(0, dia(1)), true);
  assert.deepEqual(plano(S.get('weights')), [{ date: '1/1/2026', weight: 90 }]);
  const copias = app.get('copiasAutomaticas')();
  assert.equal(copias.length, 2);
  assert.equal(copias[1].data.weights[0].weight, 70);                // lo de antes de recuperar, a salvo
});

test('si el almacén no tiene sitio, no se rompe nada: simplemente no hay copia', () => {
  const app = crearApp({ limite: 120 });
  app.get('Storage').set('weights', [{ date: '1/1/2026', weight: 90 }]);
  assert.equal(app.get('copiaAutomatica')(dia(0)), false);
  assert.deepEqual(plano(app.get('Storage').get('weights')), [{ date: '1/1/2026', weight: 90 }]);
});

test('borrar todo: quita lo de Health Tracker (datos y copias) y NO toca lo de otras apps del mismo dominio', async () => {
  const app = conPeso(90);
  app.get('copiaAutomatica')(dia(0));
  app.almacen.set('nplayer_lista', '["cancion"]');                      // otra app en fvilpaz.github.io
  await app.get('borrarTodosLosDatos')();
  assert.deepEqual([...app.almacen.keys()], ['nplayer_lista']);
});
