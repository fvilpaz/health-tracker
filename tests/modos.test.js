// Tests de los modos de entreno del perfil (profile.modes: 'home' y/o 'gym'): lectura, migración y validación. Datos inventados.
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const plano = x => JSON.parse(JSON.stringify(x));
const PERFIL = { name: 'Ana', birthDate: '1985-03-10', sex: 'female', goal: 'health', days: 3, minutes: 20, level: 1, diet: 'all' };

test('modosActivos: sin perfil, ninguno; perfil de antes (sin modes), gimnasio; el resto, lo que tenga en su orden', () => {
  const app = crearApp(), modos = app.get('modosActivos');
  assert.deepEqual(plano(modos()), []);                                              // sin perfil
  app.get('Storage').set('profile', PERFIL);
  assert.deepEqual(plano(modos()), ['gym']);                                         // perfil existente sin modes
  assert.deepEqual(plano(modos({ ...PERFIL, modes: ['home'] })), ['home']);
  assert.deepEqual(plano(modos({ ...PERFIL, modes: ['gym', 'home'] })), ['home', 'gym']);   // siempre en el mismo orden
  assert.deepEqual(plano(modos({ ...PERFIL, modes: [] })), []);                      // eligió y todavía no hay ninguno
  assert.deepEqual(plano(modos({ ...PERFIL, modes: ['x', 5, 'gym'] })), ['gym']);    // lo que no es modo, fuera
});

test('migrarModos: un perfil que ya existía pasa a [gym]; uno nuevo (modes vacío) y el que no existe, no se tocan', () => {
  const app = crearApp(), S = app.get('Storage'), migrar = app.get('migrarModos');
  migrar();
  assert.equal(S.get('profile'), null);                                              // sin perfil no se inventa uno
  S.set('profile', PERFIL);
  migrar();
  assert.deepEqual(plano(S.get('profile').modes), ['gym']);
  assert.equal(S.get('profile').name, 'Ana');                                        // el resto del perfil intacto
  migrar();
  assert.deepEqual(plano(S.get('profile').modes), ['gym']);                          // repetirla no cambia nada
  S.set('profile', { ...PERFIL, modes: [] });
  migrar();
  assert.deepEqual(plano(S.get('profile').modes), []);                               // el que eligió «ninguno» sigue en ninguno
  S.set('profile', { ...PERFIL, modes: ['home'] });
  migrar();
  assert.deepEqual(plano(S.get('profile').modes), ['home']);
});

test('perfil nuevo: nace con modes = [] y la migración no lo convierte en gimnasio', () => {
  const app = crearApp(), S = app.get('Storage');
  const nuevo = app.get('conModos')(PERFIL, true);
  assert.deepEqual(plano(nuevo.modes), []);
  assert.deepEqual(plano(app.get('conModos')({ ...PERFIL, modes: ['home'] }, true).modes), ['home']);   // si ya trae modos, se respetan
  assert.equal(app.get('conModos')(PERFIL, false).modes, undefined);                 // editar «Mi perfil» no añade nada
  S.set('profile', plano(app.get('limpiarPerfil')(nuevo).perfil));
  app.get('migrarModos')();
  assert.deepEqual(plano(S.get('profile').modes), []);
});

test('avisoEjercicio: hay que marcar un modo y los días; nivel y minutos solo con «En casa»', () => {
  const aviso = crearApp().get('avisoEjercicio');
  assert.equal(aviso({ modes: [], days: 3 }), 'Elige dónde vas a entrenar');                  // sin modo no se avanza
  assert.equal(aviso({ modes: ['gym'], days: 0 }), 'Elige cuántos días a la semana puedes');    // los días se piden siempre
  assert.equal(aviso({ modes: ['gym'], days: NaN }), 'Elige cuántos días a la semana puedes');  // sin marcar, Number(undefined) es NaN
  assert.equal(aviso({ modes: ['gym'], days: 3 }), null);                                      // gimnasio: sin nivel ni minutos
  assert.equal(aviso({ modes: ['home'], days: 3, level: 0, minutes: 20 }), 'Elige cuánto ejercicio haces ahora');
  assert.equal(aviso({ modes: ['home'], days: 3, level: 1, minutes: 0 }), 'Elige cuántos minutos cada día');
  assert.equal(aviso({ modes: ['home'], days: 3, level: 1, minutes: 20 }), null);
  assert.equal(aviso({ modes: ['gym', 'home'], days: 3, level: 2 }), 'Elige cuántos minutos cada día');   // con los dos, se pide lo de casa
});

test('pideDatosDeCasa: las preguntas del entreno guiado solo con «En casa» marcado', () => {
  const pide = crearApp().get('pideDatosDeCasa');
  assert.equal(pide(['gym']), false);
  assert.equal(pide([]), false);
  assert.equal(pide(['home']), true);
  assert.equal(pide(['gym', 'home']), true);
});

test('limpiarPerfil y modes: solo home y gym; la basura se descarta y se cuenta; vacío es válido', () => {
  const limpiar = crearApp().get('limpiarPerfil');
  const modos = m => { const r = plano(limpiar({ ...PERFIL, modes: m })); return [r.perfil.modes, r.descartados]; };
  assert.deepEqual(modos(['home', 'gym']), [['home', 'gym'], 0]);
  assert.deepEqual(modos(['gym', 'home']), [['home', 'gym'], 0]);                    // en su orden de siempre
  assert.deepEqual(modos([]), [[], 0]);
  assert.deepEqual(modos(['gym', 'x']), [['gym'], 1]);
  assert.deepEqual(modos(['gym', 'gym']), [['gym'], 0]);                             // repetido: no es error
  assert.deepEqual(modos(['x', 5]), [undefined, 2]);                                 // todo basura: sin modes (y se migra como un perfil antiguo)
  assert.deepEqual(modos('gym'), [undefined, 1]);                                    // no es una lista
  assert.deepEqual(modos(['<img src=x onerror=alert(1)>']), [undefined, 1]);
});

test('copia vieja (sin modes) importada: el perfil queda sin modes y, al cargar, pasa a [gym]; una copia con modes los conserva', () => {
  const app = crearApp(), S = app.get('Storage');
  const vieja = plano(app.get('limpiarCopia')({ profile: PERFIL }));
  assert.equal(vieja.descartados, 0);
  assert.equal(vieja.datos.profile.modes, undefined);
  S.set('profile', vieja.datos.profile);
  app.get('migrarModos')();
  assert.deepEqual(plano(app.get('modosActivos')()), ['gym']);
  const nueva = plano(app.get('limpiarCopia')({ profile: { ...PERFIL, modes: ['home'] } }));
  assert.deepEqual(nueva.datos.profile.modes, ['home']);
  const mala = plano(app.get('limpiarCopia')({ profile: { ...PERFIL, modes: ['x', 5] } }));
  assert.equal(mala.datos.profile.modes, undefined);
  assert.equal(mala.descartados, 2);
});

test('guardarModos: único escritor; filtra, ordena y no guarda vacío ni sin perfil', () => {
  const app = crearApp(), S = app.get('Storage'), guardar = app.get('guardarModos');
  assert.equal(guardar(['gym']), false);                                             // sin perfil no inventa uno
  assert.equal(S.get('profile'), null);
  S.set('profile', { ...PERFIL, modes: ['gym'] });
  assert.equal(guardar(['gym', 'home']), true);
  assert.deepEqual(plano(S.get('profile').modes), ['home', 'gym']);
  assert.equal(guardar([]), false);
  assert.equal(guardar(['x']), false);
  assert.deepEqual(plano(S.get('profile').modes), ['home', 'gym']);
  assert.equal(S.get('profile').name, 'Ana');                                        // el resto del perfil intacto
});

test('modosAlPulsar: activa, desactiva y no deja ninguno', () => {
  const pulsar = crearApp().get('modosAlPulsar');
  assert.deepEqual(plano(pulsar(['gym'], 'home')), { modes: ['home', 'gym'] });
  assert.deepEqual(plano(pulsar(['home', 'gym'], 'gym')), { modes: ['home'] });
  assert.ok(pulsar(['gym'], 'gym').error);
  assert.ok(pulsar([], 'x').error);
});

test('vistaEntreno: sin perfil, sin modos, uno o los dos (acordeón solo con dos; abre el gimnasio)', () => {
  const vista = crearApp().get('vistaEntreno');
  assert.equal(vista(null).estado, 'sin-perfil');
  assert.equal(vista({ ...PERFIL, modes: [] }).estado, 'sin-modos');
  assert.deepEqual(plano(vista(PERFIL)), { estado: 'con-modos', modos: ['gym'], abierto: 'gym', acordeon: false });
  assert.deepEqual(plano(vista({ ...PERFIL, modes: ['home'] })), { estado: 'con-modos', modos: ['home'], abierto: 'home', acordeon: false });
  const dos = plano(vista({ ...PERFIL, modes: ['home', 'gym'] }));
  assert.equal(dos.acordeon, true);
  assert.equal(dos.abierto, 'gym');
});

test('avisosEntreno no depende de los modos', () => {
  const avisos = crearApp().get('avisosEntreno');
  const p = { ...PERFIL, conditions: ['pregnancy'] };
  for (const modes of [[], ['gym'], ['home'], ['home', 'gym'], undefined])
    assert.deepEqual(plano(avisos({ ...p, modes }).map(a => a.regla)), ['E5']);
});
