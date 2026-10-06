// Tests de lo que queda de rutina.js: el mínimo semanal y los avisos de Entreno según el perfil. Perfiles inventados.
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

test('objetivo semanal: los días del perfil; sin perfil, 3 como siempre', () => {
  const app = crearApp(), S = app.get('Storage'), obj = app.get('objetivoSemana');
  assert.equal(obj(), 3);
  S.set('profile', { days: 5 });
  assert.equal(obj(), 5);
});

test('el perfil guarda lo que quiere trabajar (zonas del cuestionario)', () => {
  const r = crearApp().get('limpiarPerfil')({ focus: ['core', 'cardio'] });
  assert.deepEqual(JSON.parse(JSON.stringify(r.perfil.focus)), ['core', 'cardio']);
});

test('avisos de Entreno según el perfil (E5, E6, E7, E8, E12)', () => {
  const avisos = p => JSON.parse(JSON.stringify(crearApp().get('avisosEntreno')(p))).map(a => a.regla);
  assert.deepEqual(avisos(null), []);
  assert.deepEqual(avisos({ conditions: [], medications: [] }), []);
  assert.deepEqual(avisos({ fainting: true }), ['E12']);
  assert.deepEqual(avisos({ conditions: ['pregnancy'] }), ['E5']);
  assert.deepEqual(avisos({ conditions: ['diabetes2'], medications: ['metformin'] }), []);   // sin insulina, no
  assert.deepEqual(avisos({ conditions: ['diabetes2'], medications: ['insulin'] }), ['E6']);
  assert.deepEqual(avisos({ conditions: ['hypertension', 'asthma'] }), ['E7', 'E8']);
});
