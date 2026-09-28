let workoutData = null;
let currentPhase = 'warmup';
let currentExerciseIdx = 0;
let currentRound = 1;
let isResting = false;
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
      <a class="exercise-video" href="${ytUrl}" target="_blank" rel="noopener" title="Ver cómo se hace">▶</a>
    `;
    list.appendChild(div);
  });

  const roundInfo = document.getElementById('roundInfo');
  if (roundInfo) {
    roundInfo.textContent = phaseData.rounds ? `${phaseData.rounds} vueltas · ${phaseData.duration} min` : `${phaseData.duration} min`;
  }
}

function startWorkout() {
  if (!workoutData) return;
  workoutActive = true;
  workoutStartedAt = Date.now();
  currentExerciseIdx = 0;
  currentRound = 1;
  isResting = false;

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

  if (isResting) {
    isResting = false;
    currentExerciseIdx++;
    runNextExercise();
    return;
  }

  showTimerState(ex.name, phaseData.rounds ? `Vuelta ${currentRound}` : '', ex.seconds, false, () => {
    if (ex.rest) {
      isResting = true;
      showTimerState('Descansa', ex.name, ex.rest, true, () => {
        isResting = false;
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
  if (phaseEl) phaseEl.textContent = isRest ? '😮‍💨 DESCANSA' : (subLabel || '');
  if (statusEl) statusEl.textContent = '';

  const fg = document.getElementById('timerCircleFg');
  if (fg) fg.classList.toggle('rest', isRest);

  const circumference = 2 * Math.PI * 80;

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
  Timer.stop();
  const nameEl = document.getElementById('timerExerciseName'), labelEl = document.getElementById('timerPhaseLabel');
  if (currentPhase === 'strength') {
    // Llegar aquí = todas las vueltas hechas: es el único caso que cuenta como entreno
    const minutos = Math.max(1, Math.round((Date.now() - workoutStartedAt) / 60000));
    saveSession(currentBlock, minutos, phaseExercises(workoutData.strength).map(e => e.name));
    nameEl.textContent = `¡Bloque ${currentBlock} completado! 🎉`;
    labelEl.textContent = `${sessionsInWeek().length} de ${WEEK_GOAL} esta semana`;
  } else {
    // Calentamiento o calma sueltos: no cuentan como entreno
    nameEl.textContent = currentPhase === 'warmup' ? 'Calentamiento hecho ✓' : 'Vuelta a la calma hecha ✓';
    labelEl.textContent = currentPhase === 'warmup' ? 'Ahora, 💪 Fuerza' : '';
  }
  document.getElementById('timerNumber').textContent = '✓';
  document.getElementById('timerStatus').textContent = 'Pulsa el cuadrado para volver';

  updateDashboard();
  checkLogros();
}
