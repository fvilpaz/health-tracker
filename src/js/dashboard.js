/* Panel principal: tarjetas de peso, cintura, IMC, entrenos y racha (con su semáforo de colores) y las metas
   a corto, medio y largo plazo. Se movió tal cual desde app.js (28-sep-2026). */

/* ===== DASHBOARD ===== */
// Cambio desde la primera medida: «-1.5» si has bajado, «+0.5» si has subido (antes ponía «-» también al subir)
function diferencia(inicio, actual) {
  if (inicio == null || actual == null) return '--';
  const d = Math.round((actual - inicio) * 10) / 10;
  return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
}

function updateDashboard() {
  const settings = Storage.get('settings', {});
  const weights = Storage.get('weights', []);
  const streak = weekStreak();
  const startDate = Storage.get('startDate', null);

  const currentWeight = weights.length ? weights[weights.length - 1].weight : null;
  const startWeight = weights.length ? weights[0].weight : null;
  const totalWeeks = settings.totalWeeks || 12;

  // Peso actual
  const weightEl = document.getElementById('dashWeight');
  if (weightEl) weightEl.textContent = currentWeight ? currentWeight.toFixed(1) : '--';

  // Perdido
  const lostEl = document.getElementById('dashLost');
  if (lostEl) lostEl.textContent = diferencia(startWeight, currentWeight);   // sin datos, «--» (antes se quedaba el viejo)

  // Esta semana
  const weekEl = document.getElementById('dashWeek');
  if (weekEl) {
    weekEl.textContent = sessionsInWeek().length;   // bloques completos de esta semana
    const objEl = document.getElementById('dashWeekGoal');
    if (objEl) objEl.textContent = WEEK_GOAL;
  }

  // Racha
  const streakEl = document.getElementById('dashStreak');
  // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código y un número
  if (streakEl) streakEl.innerHTML = duo('llama', 'estado racha') + ' ' + (streak ? `${plural(streak, 'semana cumplida', 'semanas cumplidas')} seguidas` : 'Cumple 3 bloques esta semana para empezar la racha');

  // Progreso del plan
  if (startDate && currentWeight && startWeight) {
    const weeksEl = document.getElementById('weeksProgress');
    const fillEl = document.getElementById('weeksFill');
    // La misma semana que marca la tabla del plan; la barra enseña las semanas ya terminadas
    const semana = Math.min(totalWeeks, Math.max(1, semanaDelPlan(new Date(startDate))));
    const hechas = semana - 1;
    if (weeksEl) weeksEl.textContent = `Semana ${semana} / ${totalWeeks}`;
    if (fillEl) fillEl.style.width = `${(hechas / totalWeeks) * 100}%`;
    const pctEl = document.getElementById('weeksPct');
    if (pctEl) pctEl.textContent = `${Math.round((hechas / totalWeeks) * 100)}%`;
  }

  // IMC (con la altura que pone el usuario; sin altura, no se inventa ninguna)
  const heightCm = getHeightCm();
  const imc = currentWeight && heightCm ? (currentWeight / (heightCm / 100) ** 2).toFixed(1) : '--';
  const imcEl = document.getElementById('dashIMC');
  if (imcEl) imcEl.textContent = imc;
  const heightEl = document.getElementById('dashHeight');
  if (heightEl) heightEl.textContent = heightCm ? `altura: ${(heightCm / 100).toFixed(2)} m` : 'añade tu altura en Progreso';

  // Cintura
  const waists = Storage.get('waists', []);
  const currentWaist = waists.length ? waists[waists.length - 1].waist : null;
  const startWaist = waists.length ? waists[0].waist : null;

  const waistEl = document.getElementById('dashWaist');
  if (waistEl) waistEl.textContent = currentWaist ? currentWaist.toFixed(1) : '--';

  const waistLostEl = document.getElementById('dashWaistLost');
  if (waistLostEl) waistLostEl.textContent = diferencia(startWaist, currentWaist);

  // Barriga (por el ombligo): la actual y lo perdido desde la primera
  const bellies = Storage.get('bellies', []);
  const currentBelly = bellies.length ? bellies[bellies.length - 1].belly : null;
  const bellyEl = document.getElementById('dashBelly');
  if (bellyEl) bellyEl.textContent = currentBelly ? currentBelly.toFixed(1) : '--';
  const bellyLostEl = document.getElementById('dashBellyLost');
  if (bellyLostEl) bellyLostEl.textContent = diferencia(bellies.length ? bellies[0].belly : null, currentBelly);

  // Semáforo de peso (por IMC) y cintura (por cintura/altura); sin altura, sin color
  semaforo(weightEl, heightCm && currentWeight ? currentWeight / (heightCm / 100) ** 2 : null, 25, 30);
  // redondeado a 2 decimales, igual que el número que enseña la tarjeta Cintura / altura
  const whtrNum = heightCm && currentWaist ? +(currentWaist / heightCm).toFixed(2) : null;
  semaforo(waistEl, whtrNum, 0.5, 0.6);

  // Ratio cintura/altura (WHtR)
  const whtrEl = document.getElementById('dashWHtR');
  const whtrStatusEl = document.getElementById('dashWHtRStatus');
  if (whtrEl && !currentWaist) {             // sin cintura: nada que enseñar (antes se quedaba el valor viejo)
    whtrEl.textContent = '--';
    if (whtrStatusEl) whtrStatusEl.textContent = '';
  } else if (whtrEl && currentWaist && !heightCm) {
    whtrEl.textContent = '--';
    whtrEl.style.color = '';
    if (whtrStatusEl) whtrStatusEl.textContent = 'Añade tu altura en Progreso';
  } else if (whtrEl && currentWaist) {
    const whtr = (currentWaist / heightCm).toFixed(2);
    whtrEl.textContent = whtr;
    if (whtr < 0.5) {
      whtrEl.style.color = 'var(--green)';
      // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('ok') + ' Riesgo bajo';
    } else if (whtr < 0.6) {
      whtrEl.style.color = 'var(--orange)';
      // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('alerta') + ' Riesgo moderado';
    } else {
      whtrEl.style.color = 'var(--red)';
      // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('mal') + ' Riesgo alto';
    }
  }
  semaforo(whtrEl, whtrNum, 0.5, 0.6);   // la raya de la tarjeta, del mismo color que el número

  renderMetas();
  renderAnalisis();
  renderSemana();
  renderPlanTable();   // el plan saca peso, cintura y casillas de los datos: si cambian, se repinta
}

// Color de una medida: verde por debajo de «naranjaDesde», naranja hasta «rojoDesde», rojo desde ahí; sin dato, sin color
const colorSemaforo = (valor, naranjaDesde, rojoDesde) =>
  valor == null ? '' : valor >= rojoDesde ? 'var(--red)' : valor >= naranjaDesde ? 'var(--orange)' : 'var(--green)';

function semaforo(el, valor, naranjaDesde, rojoDesde) {
  if (!el) return;
  const color = colorSemaforo(valor, naranjaDesde, rojoDesde);
  el.style.color = color;
  el.closest('.stat-card').style.borderLeftColor = color;
}

/* ===== METAS (corto, medio y largo plazo) ===== */
// El objetivo de peso guardado, solo si tiene sentido: nunca para menores ni si al empezar el peso ya era sano
// (IMC < 25). Esto último también corrige objetivos ya guardados con la regla vieja («tu peso − 7» para todos).
function objetivoPeso() {
  if (esMenor()) return null;
  const g = Storage.get('settings', {}).goalWeight;
  if (!g) return null;
  const w = Storage.get('weights', []), h = getHeightCm();
  if (w.length && h && w[0].weight / (h / 100) ** 2 < 25) return null;
  return g;
}

// Se calculan con el último peso, la altura y el objetivo que pone el usuario: ningún dato escrito en el código.
// Metas de peso a partir del peso actual, la altura y el objetivo (si lo hay), de la más alta a la más baja.
// Corto: salir de la obesidad (IMC < 30) · Medio: tu objetivo · Largo: IMC 27 si hay hígado graso (o no hay perfil,
// como hasta ahora), IMC 25 si no. Solo las que estaban POR ENCIMA de tu peso al empezar: antes, a alguien con
// peso sano le salía «sales de la obesidad: conseguido». «falta» en kg; «hecho» si ya llegaste.
function calcularMetas(pesoActual, alturaCm, objetivo, pesoInicio = pesoActual, higado = true) {
  const m2 = (alturaCm / 100) ** 2;
  return [
    { plazo: 'Corto', peso: 30 * m2, texto: 'Sales de la franja de obesidad (IMC por debajo de 30)' },
    objetivo ? { plazo: 'Medio', peso: objetivo, texto: 'Tu peso objetivo' } : null,
    higado ? { plazo: 'Largo', peso: 27 * m2, texto: 'IMC 27: mucha menos grasa en el hígado y menos riesgo' }
           : { plazo: 'Largo', peso: 25 * m2, texto: 'Peso sano (IMC por debajo de 25)' },
  ].filter(mt => mt && mt.peso < pesoInicio).sort((a, b) => b.peso - a.peso).map(mt => {
    const falta = pesoActual - mt.peso;
    return { ...mt, falta, hecho: falta < 0 || (mt.plazo === 'Medio' && falta <= 0) };
  });
}

function renderMetas() {
  const box = document.getElementById('metasList');
  if (!box) return;
  if (esMenor()) {   // las metas salen del IMC de adulto: con menos de 18 no sirven
    box.innerHTML = '<div class="meta-aviso">Con menos de 18 años la app no pone metas de peso: eso lo lleva el pediatra.</div>';
    return;
  }
  const heightCm = getHeightCm();
  const weights = Storage.get('weights', []);
  const current = weights.length ? weights[weights.length - 1].weight : null;
  if (!heightCm || !current) {
    box.innerHTML = '<div class="meta-aviso">Añade tu <strong>altura</strong> y tu <strong>peso</strong> en Progreso para calcular tus metas.</div>';
    return;
  }
  const m2 = (heightCm / 100) ** 2;
  const perfil = Storage.get('profile');
  const higado = !perfil || (perfil.conditions || []).includes('fatty-liver');
  const metas = calcularMetas(current, heightCm, objetivoPeso(), weights[0].weight, higado);
  if (!metas.length) {
    box.innerHTML = `<div class="meta-aviso">Tu peso está en rango sano (IMC ${(current / m2).toFixed(1)}): el objetivo es <strong>mantenerlo</strong>.</div>`;
    return;
  }

  // eslint-disable-next-line no-unsanitized/property -- textos de las metas del código y números
  box.innerHTML = metas.map(({ falta, hecho, ...mt }) => {
    return `<div class="meta-row ${hecho ? 'hecha' : ''}">
      <span class="meta-plazo">${mt.plazo}</span>
      <div class="meta-info"><strong>${mt.peso.toFixed(1)} kg</strong><span>${mt.texto}</span></div>
      <span class="meta-falta">${hecho ? `${estado('ok')} Conseguido` : falta < 0.05 ? 'te falta <strong>muy poco</strong>' : `te faltan <strong>${falta.toFixed(1)} kg</strong>`}</span>
    </div>`;
  }).join('') + `<div class="meta-aviso">Ahora: <strong>${current.toFixed(1)} kg</strong> · IMC ${(current / m2).toFixed(1)}</div>`;
}
