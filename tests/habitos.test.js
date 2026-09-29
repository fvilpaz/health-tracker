// Tests de los hábitos diarios (agua, pasos, verdura, sueño) y de su paso por la copia. Datos inventados (el repo es público).
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));

test('hábitos: marcar y desmarcar un día no toca los demás días', () => {
  const app = crearApp(), marcar = app.get('marcarHabito'), de = app.get('habitosDe');
  assert.deepEqual(plano(app.get('HABITOS').map(h => h.id)), ['agua', 'pasos', 'verdura', 'sueno']);
  marcar('agua', '2026-01-05');
  marcar('verdura', '2026-01-05');
  marcar('sueno', '2026-01-06');
  assert.deepEqual(plano(de('2026-01-05')), ['agua', 'verdura']);
  marcar('agua', '2026-01-05');                       // otra vez: se desmarca
  assert.deepEqual(plano(de('2026-01-05')), ['verdura']);
  assert.deepEqual(plano(de('2026-01-06')), ['sueno']);
  assert.deepEqual(plano(de('2026-01-07')), []);
  marcar('inventado', '2026-01-05');                  // un hábito que no existe no se guarda
  assert.deepEqual(plano(de('2026-01-05')), ['verdura']);
});

test('hábitos en la copia: entran los buenos; fechas falsas, hábitos desconocidos o HTML se descartan y se cuentan', () => {
  const limpiar = crearApp().get('limpiarCopia');
  const bueno = { '2026-01-05': ['agua', 'verdura'], '2026-01-06': [] };
  const r = limpiar({ habits: bueno });
  assert.equal(r.descartados, 0);                     // «habits» es una clave conocida
  assert.deepEqual(plano(r.datos.habits), bueno);

  const malo = limpiar({ habits: {
    '2026-01-05': ['agua', '<img src=x onerror="alert(1)">', 'agua'],   // HTML fuera; repetido, una vez
    '2026-02-31': ['agua'],                           // fecha que no existe
    '<b>': ['pasos'],
    '2026-01-07': 'agua',                              // no es una lista
  } });
  assert.deepEqual(plano(malo.datos.habits), { '2026-01-05': ['agua'] });
  assert.equal(malo.descartados, 5);
  assert.equal(limpiar({ habits: ['agua'] }).descartados, 1);   // ni siquiera es un objeto de días
});
