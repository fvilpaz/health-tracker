const Timer = (() => {
  let intervalId = null;
  let seconds = 0;
  let total = 0;
  let onTick = null;
  let onDone = null;
  let running = false;

  const circumference = 2 * Math.PI * 80;

  function start(duration, tickCb, doneCb) {
    stop();
    seconds = duration;
    total = duration;
    onTick = tickCb;
    onDone = doneCb;
    running = true;
    tick();
    intervalId = setInterval(tick, 1000);
  }

  function tick() {
    if (onTick) onTick(seconds, total, circumference);
    if (seconds <= 0) {
      stop();
      if (onDone) onDone();
      return;
    }
    seconds--;
  }

  function pause() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; running = false; }
  }

  function resume() {
    if (!running && seconds >= 0) {
      running = true;
      intervalId = setInterval(tick, 1000);
    }
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
    running = false;
  }

  function isRunning() { return running; }

  return { start, pause, resume, stop, isRunning };
})();
