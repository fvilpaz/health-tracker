// Tests del temporizador con un reloj falso (no esperan segundos de verdad).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Carga timer.js con un reloj falso: el tiempo solo avanza con reloj.pasar(ms, disparos)
function conRelojFalso() {
  let ahora = 1_000_000, siguienteId = 1;
  const intervalos = new Map();
  const reloj = {
    // pasa «ms» de tiempo real, pero el móvil solo deja disparar el intervalo «disparos» veces
    // (lo normal: una vez por segundo; con la pantalla apagada, muchas menos)
    pasar(ms, disparos = Math.floor(ms / 1000)) {
      const paso = ms / Math.max(disparos, 1);
      for (let i = 0; i < Math.max(disparos, 1); i++) {
        ahora += paso;
        if (disparos > 0) [...intervalos.values()].forEach(f => f());
      }
    },
  };
  const FakeDate = class extends Date { static now() { return ahora; } };
  const ctx = vm.createContext({
    Math, Date: FakeDate,
    setInterval: f => { const id = siguienteId++; intervalos.set(id, f); return id; },
    clearInterval: id => intervalos.delete(id),
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/timer.js'), 'utf8'), ctx);
  return { Timer: vm.runInContext('Timer', ctx), reloj };
}

function arrancar(segundos) {
  const { Timer, reloj } = conRelojFalso();
  const vistos = [], fin = { veces: 0 };
  Timer.start(segundos, restante => vistos.push(restante), () => fin.veces++);
  return { Timer, reloj, vistos, fin };
}

test('cuenta atrás de un segundo en uno y avisa al llegar a cero (una sola vez)', () => {
  const { Timer, reloj, vistos, fin } = arrancar(3);
  assert.deepEqual(vistos, [3]);
  reloj.pasar(1000); assert.deepEqual(vistos, [3, 2]);
  reloj.pasar(2000); assert.deepEqual(vistos, [3, 2, 1, 0]);
  assert.equal(fin.veces, 1);
  assert.equal(Timer.isRunning(), false);
  reloj.pasar(3000); assert.equal(fin.veces, 1);
});

test('pausa y sigue donde estaba', () => {
  const { Timer, reloj, vistos } = arrancar(10);
  reloj.pasar(3000);                        // 10 → 7
  Timer.pause();
  assert.equal(Timer.isRunning(), false);
  reloj.pasar(20000);                       // en pausa no cuenta
  Timer.resume();
  reloj.pasar(2000);                        // 7 → 5
  assert.equal(vistos[vistos.length - 1], 5);
});

test('parar: deja de contar y no avisa de que ha terminado', () => {
  const { Timer, reloj, fin } = arrancar(5);
  reloj.pasar(2000);
  Timer.stop();
  reloj.pasar(10000);
  assert.equal(fin.veces, 0);
  assert.equal(Timer.isRunning(), false);
});

test('con el móvil ralentizando (pantalla apagada), el tiempo sigue siendo el del reloj', () => {
  const { reloj, vistos, fin } = arrancar(30);
  reloj.pasar(10000, 1);                    // pasan 10 s pero el intervalo solo salta una vez
  assert.equal(vistos[vistos.length - 1], 20);
  reloj.pasar(25000, 1);                    // pasan 25 s más: ya tenía que haber acabado
  assert.equal(fin.veces, 1);
});
