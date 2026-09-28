/* ===== SESIONES: bloques de fuerza completados =====
   Storage 'sessions': [{ date: 'AAAA-MM-DD', block: '1' | '2' | '3', minutes, exercises: [nombres] }]
   Solo se guarda un bloque COMPLETO (todas las vueltas). Caminar no se registra (va en consejos). */
const WEEK_GOAL = 3;   // bloques por semana, de lunes a domingo

const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function saveSession(block, minutes, exercises) {
  const sessions = Storage.get('sessions', []);
  sessions.push({ date: isoDate(new Date()), block, minutes, exercises });
  Storage.set('sessions', sessions);
}

// Todas las sesiones, más los entrenos antiguos ('trainings', solo la fecha «d/m/aaaa») para no perder historia
function getSessions() {
  const sessions = Storage.get('sessions', []);
  const conSesion = new Set(sessions.map(s => s.date));
  const antiguos = [...new Set(Storage.get('trainings', []))]
    .map(t => { const [d, m, y] = t.split('/'); return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; })
    .filter(f => !conSesion.has(f))
    .map(date => ({ date, block: null }));
  return sessions.concat(antiguos).sort((a, b) => a.date.localeCompare(b.date));
}

// Sesiones de la semana (lunes a domingo) que contiene «ref»
function sessionsInWeek(ref = new Date()) {
  const lunes = getWeekStart(ref), domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const desde = isoDate(lunes), hasta = isoDate(domingo);
  return getSessions().filter(s => s.date >= desde && s.date <= hasta);
}

// Qué bloque toca: el siguiente al último hecho (1 → 2 → 3 → 1)
function nextBlock() {
  const ultimo = getSessions().filter(s => s.block).pop();
  return ultimo ? String(Number(ultimo.block) % 3 + 1) : '1';
}

/* ===== MI SEMANA: aviso, días y semanas anteriores ===== */
const plural = (n, una, varias) => `${n} ${n === 1 ? una : varias}`;

// 🟢 cumplida o vas bien · 🟠 vas justo · 🔴 ya no llegas, o es domingo con bloques pendientes
function weekStatus(ref = new Date()) {
  const hechos = sessionsInWeek(ref).length, faltan = Math.max(0, WEEK_GOAL - hechos);
  const hoyHecho = getSessions().some(s => s.date === isoDate(ref));
  const dias = 7 - (ref.getDay() + 6) % 7 - (hoyHecho ? 1 : 0);   // días que quedan para entrenar (hoy cuenta si aún no has entrenado)
  const b = n => plural(n, 'bloque', 'bloques'), d = n => plural(n, 'día', 'días');
  const falta = faltan === 1 ? 'falta' : 'faltan', queda = dias === 1 ? 'queda' : 'quedan';
  if (!faltan) return { hechos, color: 'verde', texto: `${estado('ok')} Semana cumplida. ¡Bien hecho!` };
  if (faltan > dias) return { hechos, color: 'rojo', texto: `${estado('mal')} Esta semana ya no llegas: te ${falta} ${b(faltan)} y ${dias ? `solo ${queda} ${d(dias)}` : 'no quedan días'}.` };
  if (ref.getDay() === 0) return { hechos, color: 'rojo', texto: `${estado('mal')} Es domingo y te ${falta} ${b(faltan)}: hoy es el último día.` };
  if (faltan === dias) return { hechos, color: 'naranja', texto: `${estado('alerta')} Vas justo: te ${falta} ${b(faltan)} y ${queda} ${d(dias)}.` };
  return { hechos, color: 'verde', texto: `${estado('ok')} Vas bien: te ${falta} ${b(faltan)} y ${queda} ${d(dias)}.` };
}

function renderSemana() {
  const actual = document.getElementById('semanaActual'), historial = document.getElementById('semanaHistorial');
  if (!actual || !historial) return;
  const hoy = new Date(), lunes = getWeekStart(hoy), est = weekStatus(hoy), sesiones = getSessions();
  const dia = (base, n) => { const d = new Date(base); d.setDate(base.getDate() + n); return d; };
  const corta = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const etiqueta = s => `${s.block ? `Bloque ${esc(s.block)}` : 'Entreno'}${s.minutes ? ` · ${esc(s.minutes)} min` : ''}`;

  actual.innerHTML =
    `<div class="semana-cab"><span>${corta(lunes)} – ${corta(dia(lunes, 6))}</span><strong class="semana-cuenta ${est.color}">${est.hechos} / ${WEEK_GOAL}</strong></div>` +
    `<div class="semana-aviso ${est.color}">${est.texto}</div>` +
    '<div class="semana-dias">' + [0, 1, 2, 3, 4, 5, 6].map(n => {
      const f = isoDate(dia(lunes, n)), delDia = sesiones.filter(s => s.date === f), esHoy = f === isoDate(hoy);
      return `<div class="semana-dia${esHoy ? ' hoy' : ''}${delDia.length ? ' hecho' : ''}">` +
        `<span class="semana-letra">${'LMXJVSD'[n]}<small>${dia(lunes, n).getDate()}</small></span>` +
        `<span>${delDia.length ? delDia.map(s => estado('ok') + ' ' + etiqueta(s)).join('<br>') : esHoy ? 'hoy' : ''}</span></div>`;
    }).join('') + '</div>' +
    (est.hechos < WEEK_GOAL ? `<button class="btn btn-green btn-full" id="semanaEntrenar">${ICONO.jugar}Entrenar · toca el Bloque ${nextBlock()}</button>` : '') +
    '<div class="meta-aviso">Consejo: deja un día de descanso entre bloques. Caminar no se apunta aquí (va en los consejos).</div>';

  // Semanas anteriores: desde la del primer entreno hasta la pasada, también las que quedaron a cero
  const pasadas = sesiones.filter(s => s.date < isoDate(lunes));
  if (!pasadas.length) { historial.innerHTML = '<div class="meta-aviso">Aquí irán tus semanas anteriores.</div>'; return; }
  const semanas = [];
  for (let l = getWeekStart(new Date(pasadas[0].date + 'T12:00')); l < lunes; l = dia(l, 7)) semanas.unshift(l);
  historial.innerHTML = semanas.map(l => {
    const desde = isoDate(l), hasta = isoDate(dia(l, 6)), suyas = pasadas.filter(s => s.date >= desde && s.date <= hasta);
    const ok = suyas.length >= WEEK_GOAL;
    return `<details class="lab-sec"><summary><div class="lab-tit">${corta(l)} – ${corta(dia(l, 6))}` +
      `<small>${suyas.length} / ${WEEK_GOAL} ${ok ? `${estado('ok')} cumplida` : '· no cumplida'}</small></div><span class="lab-flecha"></span></summary>` +
      '<div class="lab-cuerpo">' + (suyas.length ? suyas.map(s =>
        `<div class="lab-fila"><div class="lab-fila-top"><span>${new Date(s.date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</span><strong>${etiqueta(s)}</strong></div>` +
        (s.exercises ? `<div class="lab-fila-que">${s.exercises.map(esc).join(' · ')}</div>` : '') + '</div>').join('')
        : '<div class="meta-aviso">Sin entrenos esta semana.</div>') + '</div></details>';
  }).join('');
}

// «Entrenar»: al Entreno, con el bloque que toca y empezando por el calentamiento
document.getElementById('semanaActual')?.addEventListener('click', e => {
  if (e.target.id !== 'semanaEntrenar') return;
  currentBlock = nextBlock();
  document.querySelector('[data-section="entrenamiento"]').click();
  renderWorkoutPhase('warmup');
});

/* ===== RACHA: semanas cumplidas (3 bloques o más) ===== */
function completedWeeks() {
  const porSemana = {};
  getSessions().forEach(s => { const k = isoDate(getWeekStart(new Date(s.date + 'T12:00'))); porSemana[k] = (porSemana[k] || 0) + 1; });
  return Object.values(porSemana).filter(n => n >= WEEK_GOAL).length;
}

// Semanas seguidas cumplidas. La actual suma si ya está cumplida; si no, no rompe la racha (aún puedes cumplirla).
function weekStreak(ref = new Date()) {
  const lunes = getWeekStart(ref);
  let racha = sessionsInWeek(lunes).length >= WEEK_GOAL ? 1 : 0;
  for (let l = new Date(lunes); ; ) {
    l.setDate(l.getDate() - 7);
    if (sessionsInWeek(l).length < WEEK_GOAL) return racha;
    racha++;
  }
}
