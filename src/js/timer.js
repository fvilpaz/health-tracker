// Temporizador de cuenta atrás. Cuenta contra la HORA (Date.now), no sumando un segundo en cada salto:
// si el móvil ralentiza los intervalos (pantalla apagada, otra app delante), el tiempo sigue siendo el real.
// (Antes: con la pantalla apagada 10 s, al volver quedaban 29 s de 30 en vez de 20. tests/timer.test.js)
const Timer = (() => {
  let intervalId = null;
  let fin = 0;             // hora (ms) a la que llega a cero
  let total = 0;
  let ultimo = null;       // último segundo pintado (para no repetirlo)
  let onTick = null;
  let onDone = null;
  let running = false;

  const restante = () => Math.max(0, Math.ceil((fin - Date.now()) / 1000));

  function start(duration, tickCb, doneCb) {
    stop();
    total = duration;
    onTick = tickCb;
    onDone = doneCb;
    fin = Date.now() + duration * 1000;
    ultimo = null;
    running = true;
    tick();
    if (running) intervalId = setInterval(tick, 1000);
  }

  function tick() {
    const r = restante();
    if (r !== ultimo) {
      ultimo = r;
      if (onTick) onTick(r, total);
    }
    if (r <= 0) {
      stop();
      if (onDone) onDone();
    }
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
    running = false;
  }

  function isRunning() { return running; }

  return { start, stop, isRunning };
})();
