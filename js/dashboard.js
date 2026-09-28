/* Panel principal: tarjetas de peso, cintura, IMC, entrenos y racha (con su semáforo de colores) y las metas
   a corto, medio y largo plazo. Se movió tal cual desde app.js (28-sep-2026). */

/* ===== DASHBOARD ===== */
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
  if (lostEl && startWeight && currentWeight) {
    const diff = (startWeight - currentWeight).toFixed(1);
    lostEl.textContent = diff > 0 ? `-${diff}` : diff;
  }

  // Esta semana
  const weekEl = document.getElementById('dashWeek');
  if (weekEl) {
    weekEl.textContent = sessionsInWeek().length;   // bloques completos de esta semana
  }

  // Racha
  const streakEl = document.getElementById('dashStreak');
  if (streakEl) streakEl.innerHTML = duo('llama', 'estado racha') + ' ' + (streak ? `${plural(streak, 'semana cumplida', 'semanas cumplidas')} seguidas` : 'Cumple 3 bloques esta semana para empezar la racha');

  // Progreso del plan
  if (startDate && currentWeight && startWeight) {
    const weeksEl = document.getElementById('weeksProgress');
    const fillEl = document.getElementById('weeksFill');
    const start = new Date(startDate);
    const now = new Date();
    const weeks = Math.min(totalWeeks, Math.max(0, Math.floor((now - start) / (7 * 24 * 3600 * 1000))));
    if (weeksEl) weeksEl.textContent = `Semana ${weeks} / ${totalWeeks}`;
    if (fillEl) fillEl.style.width = `${(weeks / totalWeeks) * 100}%`;
    const pctEl = document.getElementById('weeksPct');
    if (pctEl) pctEl.textContent = `${Math.round((weeks / totalWeeks) * 100)}%`;
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
  if (waistLostEl && startWaist && currentWaist) {
    const diff = (startWaist - currentWaist).toFixed(1);
    waistLostEl.textContent = diff > 0 ? `-${diff}` : diff;
  }

  // Semáforo de peso (por IMC) y cintura (por cintura/altura); sin altura, sin color
  semaforo(weightEl, heightCm && currentWeight ? currentWeight / (heightCm / 100) ** 2 : null, 25, 30);
  // redondeado a 2 decimales, igual que el número que enseña la tarjeta Cintura / altura
  const whtrNum = heightCm && currentWaist ? +(currentWaist / heightCm).toFixed(2) : null;
  semaforo(waistEl, whtrNum, 0.5, 0.6);

  // Ratio cintura/altura (WHtR)
  const whtrEl = document.getElementById('dashWHtR');
  const whtrStatusEl = document.getElementById('dashWHtRStatus');
  if (whtrEl && currentWaist && !heightCm) {
    whtrEl.textContent = '--';
    whtrEl.style.color = '';
    if (whtrStatusEl) whtrStatusEl.textContent = 'Añade tu altura en Progreso';
  } else if (whtrEl && currentWaist) {
    const whtr = (currentWaist / heightCm).toFixed(2);
    whtrEl.textContent = whtr;
    if (whtr < 0.5) {
      whtrEl.style.color = 'var(--green)';
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('ok') + ' Riesgo bajo';
    } else if (whtr < 0.6) {
      whtrEl.style.color = 'var(--orange)';
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('alerta') + ' Riesgo moderado';
    } else {
      whtrEl.style.color = 'var(--red)';
      if (whtrStatusEl) whtrStatusEl.innerHTML = estado('mal') + ' Riesgo alto';
    }
  }
  semaforo(whtrEl, whtrNum, 0.5, 0.6);   // la raya de la tarjeta, del mismo color que el número

  renderMetas();
  renderAnalisis();
  renderSemana();
}

function semaforo(el, valor, naranjaDesde, rojoDesde) {
  if (!el) return;
  const color = valor == null ? '' : valor >= rojoDesde ? 'var(--red)' : valor >= naranjaDesde ? 'var(--orange)' : 'var(--green)';
  el.style.color = color;
  el.closest('.stat-card').style.borderLeftColor = color;
}

/* ===== METAS (corto, medio y largo plazo) ===== */
// Se calculan con el último peso, la altura y el objetivo que pone el usuario: ningún dato escrito en el código.
function renderMetas() {
  const box = document.getElementById('metasList');
  if (!box) return;
  const heightCm = getHeightCm();
  const weights = Storage.get('weights', []);
  const current = weights.length ? weights[weights.length - 1].weight : null;
  if (!heightCm || !current) {
    box.innerHTML = '<div class="meta-aviso">Añade tu <strong>altura</strong> y tu <strong>peso</strong> en Progreso para calcular tus metas.</div>';
    return;
  }
  const m2 = (heightCm / 100) ** 2;
  const goal = Storage.get('settings', {}).goalWeight;
  const metas = [
    { plazo: 'Corto', peso: 30 * m2, texto: 'Sales de la franja de obesidad (IMC por debajo de 30)' },
    goal ? { plazo: 'Medio', peso: goal, texto: 'Tu peso objetivo' } : null,
    { plazo: 'Largo', peso: 27 * m2, texto: 'IMC 27: mucha menos grasa en el hígado y menos riesgo' },
  ].filter(Boolean).sort((a, b) => b.peso - a.peso);

  box.innerHTML = metas.map(mt => {
    const falta = current - mt.peso;
    const hecho = falta < 0 || (mt.plazo === 'Medio' && falta <= 0);
    return `<div class="meta-row ${hecho ? 'hecha' : ''}">
      <span class="meta-plazo">${mt.plazo}</span>
      <div class="meta-info"><strong>${mt.peso.toFixed(1)} kg</strong><span>${mt.texto}</span></div>
      <span class="meta-falta">${hecho ? `${estado('ok')} Conseguido` : `te faltan <strong>${falta.toFixed(1)} kg</strong>`}</span>
    </div>`;
  }).join('') + `<div class="meta-aviso">Ahora: <strong>${current.toFixed(1)} kg</strong> · IMC ${(current / m2).toFixed(1)}</div>`;
}
