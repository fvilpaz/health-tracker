let workoutData = null;
let currentPhase = 'warmup';
let currentExerciseIdx = 0;
let currentRound = 1;
let isResting = false;
let workoutActive = false;

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

  const list = document.getElementById('exerciseList');
  if (!list) return;
  list.innerHTML = '';

  phaseData.exercises.forEach((ex, i) => {
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
  currentExerciseIdx = 0;
  currentRound = 1;
  isResting = false;

  document.getElementById('workoutSetup').style.display = 'none';
  document.getElementById('timerView').style.display = 'block';

  runNextExercise();
}

function runNextExercise() {
  const phaseData = workoutData[currentPhase];
  const exercises = phaseData.exercises;

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
  const trainings = Storage.get('trainings', []);
  const today = new Date().toLocaleDateString('es-ES');
  if (!trainings.includes(today)) trainings.push(today);
  Storage.set('trainings', trainings);

  const streak = updateStreak();
  Storage.set('streak', streak);

  document.getElementById('timerExerciseName').textContent = '¡Entrenamiento completado! 🎉';
  document.getElementById('timerPhaseLabel').textContent = `Racha: ${streak} días`;
  document.getElementById('timerNumber').textContent = '✓';
  document.getElementById('timerStatus').textContent = 'Pulsa el cuadrado para volver';

  updateDashboard();
  checkLogros();
}

function updateStreak() {
  const trainings = Storage.get('trainings', []);
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 100; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('es-ES');
    if (trainings.includes(label)) streak++;
    else if (i > 0) break;
  }
  return streak;
}
