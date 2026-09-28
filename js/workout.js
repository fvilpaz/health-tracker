let workoutData = null;
let currentPhase = 'warmup';
let currentExerciseIdx = 0;
let currentRound = 1;
let workoutActive = false;
let currentBlock = '1';   // bloque de fuerza elegido (1, 2 o 3); al abrir la app, el que toca (nextBlock)
let workoutStartedAt = 0; // para apuntar los minutos del bloque

// Ejercicios de una fase. La fuerza va por bloques; el resto de fases tienen su lista fija.
function phaseExercises(phaseData) {
  return phaseData.blocks ? phaseData.blocks[currentBlock].exercises : phaseData.exercises;
}

async function loadWorkoutData() {
  if (workoutData) return workoutData;
  const res = await fetch('data/workouts.json');
  if (!res.ok) throw new Error('sin ejercicios');
  workoutData = await res.json();
  return workoutData;
}

async function renderWorkoutPhase(phase) {
  const data = await loadWorkoutData();
  currentPhase = phase;
  const phaseData = data[phase];

  document.querySelectorAll('.phase-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.phase === phase);
  });

  // Selector de bloque: solo en la pestaña de fuerza
  const picker = document.getElementById('blockPicker');
  if (picker) {
    picker.style.display = phaseData.blocks ? 'grid' : 'none';
    picker.querySelectorAll('.block-btn').forEach(b => b.classList.toggle('active', b.dataset.block === currentBlock));
  }

  const list = document.getElementById('exerciseList');
  if (!list) return;
  list.innerHTML = '';

  phaseExercises(phaseData).forEach((ex, i) => {
    const div = document.createElement('div');
    div.className = 'exercise-item';
    div.id = `ex-${i}`;
    const timeLabel = phase === 'cooldown'
      ? `${ex.seconds}s`
      : ex.rest ? `${ex.seconds}s / ${ex.rest}s desc` : `${ex.seconds}s`;
    const ytUrl = ex.video || `https://www.youtube.com/results?search_query=${encodeURIComponent(`cómo hacer ${ex.name} ejercicio`)}`;

    div.innerHTML = `
      <div class="exercise-num">${i + 1}</div>
      <div class="exercise-info">
        <div class="exercise-name">${ex.name}</div>
        ${ex.tip ? `<div class="exercise-tip">${ex.tip}</div>` : ''}
      </div>
      <div class="exercise-time">${timeLabel}</div>
      <a class="exercise-video" href="${ytUrl}" target="_blank" rel="noopener" title="Ver cómo se hace" aria-label="Vídeo: cómo se hace ${ex.name}">▶</a>
    `;
    list.appendChild(div);
  });

  const roundInfo = document.getElementById('roundInfo');
  if (roundInfo) {
    roundInfo.textContent = phaseData.rounds ? `${phaseData.rounds} vueltas · ${phaseData.duration} min` : `${phaseData.duration} min`;
  }
}

// Pantalla encendida mientras entrenas: el móvil no se apaga a mitad de un ejercicio.
// Si el navegador no lo permite, no pasa nada. El sistema lo suelta al cambiar de app: se pide otra vez al volver.
let pantallaEncendida = null;
async function mantenerPantalla(encender) {
  try {
    if (encender && !pantallaEncendida && 'wakeLock' in navigator) {
      pantallaEncendida = await navigator.wakeLock.request('screen');
      pantallaEncendida.addEventListener('release', () => { pantallaEncendida = null; });
    } else if (!encender && pantallaEncendida) {
      await pantallaEncendida.release();
    }
  } catch { pantallaEncendida = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && workoutActive) mantenerPantalla(true);
});

// Con un entreno en marcha no se puede cambiar de fase ni de bloque: antes se podía, se mezclaban los ejercicios
// y hasta se apuntaba como hecho un bloque de fuerza que no se había hecho (revisión del 28-sep).
function bloquearEleccion(si) {
  document.querySelectorAll('.phase-tab, .block-btn').forEach(b => { b.disabled = si; b.setAttribute('aria-disabled', si); });
}

// El botón de pausa dice lo que hará (también al lector de pantalla)
function actualizarPausa() {
  const b = document.getElementById('pauseBtn'), corre = Timer.isRunning();
  b.innerHTML = corre ? ICONO.pausa : ICONO.jugar;
  b.setAttribute('aria-label', corre ? 'Pausar' : 'Seguir');
}

function startWorkout() {
  if (!workoutData) return;
  workoutActive = true;
  bloquearEleccion(true);
  mantenerPantalla(true);
  workoutStartedAt = Date.now();
  currentExerciseIdx = 0;
  currentRound = 1;

  document.getElementById('workoutSetup').style.display = 'none';
  document.getElementById('timerView').style.display = 'block';

  runNextExercise();
}

function runNextExercise() {
  const phaseData = workoutData[currentPhase];
  const exercises = phaseExercises(phaseData);

  if (currentExerciseIdx >= exercises.length) {
    const rounds = phaseData.rounds || 1;
    if (currentRound < rounds) {
      currentRound++;
      currentExerciseIdx = 0;
      const restBetween = phaseData.rest_between_rounds || 0;
      if (restBetween) {
        showTimerState(`Vuelta ${currentRound - 1} completada`, 'Descansa', restBetween, true, () => runNextExercise());
        return;
      }
      runNextExercise();
      return;
    }
    workoutDone();
    return;
  }

  const ex = exercises[currentExerciseIdx];
  highlightExercise(currentExerciseIdx);

  showTimerState(ex.name, phaseData.rounds ? `Vuelta ${currentRound}` : '', ex.seconds, false, () => {
    if (ex.rest) {
      showTimerState('Descansa', ex.name, ex.rest, true, () => {
        currentExerciseIdx++;
        runNextExercise();
      });
    } else {
      currentExerciseIdx++;
      runNextExercise();
    }
  });
}

function showTimerState(exerciseName, subLabel, duration, isRest, onDone) {
  const nameEl = document.getElementById('timerExerciseName');
  const phaseEl = document.getElementById('timerPhaseLabel');
  const statusEl = document.getElementById('timerStatus');
  if (nameEl) nameEl.textContent = exerciseName;
  if (phaseEl) phaseEl.innerHTML = isRest ? duo('viento', 'estado info') + ' DESCANSA' : (subLabel || '');
  if (statusEl) statusEl.textContent = '';

  const fg = document.getElementById('timerCircleFg');
  if (fg) fg.classList.toggle('rest', isRest);


  Timer.start(duration,
    (remaining, total, circ) => {
      const numEl = document.getElementById('timerNumber');
      if (numEl) numEl.textContent = remaining;
      const pct = remaining / total;
      if (fg) fg.style.strokeDashoffset = circ - circ * pct;
    },
    onDone
  );
}

function highlightExercise(idx) {
  document.querySelectorAll('.exercise-item').forEach((el, i) => {
    el.classList.toggle('active-exercise', i === idx);
    el.classList.toggle('done-exercise', i < idx);
  });
}

function workoutDone() {
  workoutActive = false;
  bloquearEleccion(false);
  mantenerPantalla(false);
  Timer.stop();
  const nameEl = document.getElementById('timerExerciseName'), labelEl = document.getElementById('timerPhaseLabel');
  if (currentPhase === 'strength') {
    // Llegar aquí = todas las vueltas hechas: es el único caso que cuenta como entreno
    const minutos = Math.max(1, Math.round((Date.now() - workoutStartedAt) / 60000));
    saveSession(currentBlock, minutos, phaseExercises(workoutData.strength).map(e => e.name));
    nameEl.innerHTML = `¡Bloque ${currentBlock} completado! ${duo('confeti', 'estado fiesta')}`;
    labelEl.textContent = `${sessionsInWeek().length} de ${WEEK_GOAL} esta semana`;
  } else {
    // Calentamiento o calma sueltos: no cuentan como entreno
    nameEl.textContent = currentPhase === 'warmup' ? 'Calentamiento hecho ✓' : 'Vuelta a la calma hecha ✓';
    labelEl.innerHTML = currentPhase === 'warmup' ? `Ahora, ${duo('pesa')} Fuerza` : '';
  }
  document.getElementById('timerNumber').textContent = '✓';
  document.getElementById('timerStatus').textContent = 'Pulsa el cuadrado para volver';

  updateDashboard();
  checkLogros();
}

/* ===== ENTRENAMIENTO ===== */
document.querySelectorAll('.phase-tab').forEach(tab => {
  tab.addEventListener('click', () => { if (!workoutActive) renderWorkoutPhase(tab.dataset.phase); });
});

document.querySelectorAll('.block-btn').forEach(btn => {
  btn.addEventListener('click', () => { if (workoutActive) return; currentBlock = btn.dataset.block; renderWorkoutPhase('strength'); });
});

document.getElementById('startWorkoutBtn').addEventListener('click', startWorkout);

document.getElementById('pauseBtn').addEventListener('click', () => {
  if (Timer.isRunning()) Timer.pause(); else Timer.resume();
  actualizarPausa();   // según cómo haya quedado: si el tiempo ya se había acabado, pasa al siguiente y sigue corriendo
});

document.getElementById('stopBtn').addEventListener('click', () => {
  // Parar a medias tira el bloque: se pregunta. Con el entreno ya terminado, este botón es «volver» y no pregunta.
  if (workoutActive && !confirm('¿Parar el entreno? Este bloque no contará.')) return;
  Timer.stop();
  workoutActive = false;
  bloquearEleccion(false);
  mantenerPantalla(false);
  document.getElementById('workoutSetup').style.display = 'block';
  document.getElementById('timerView').style.display = 'none';
  actualizarPausa();
  renderWorkoutPhase(currentPhase);
});
