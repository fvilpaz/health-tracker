/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (catálogos, campos) o ya validadas; nunca texto de fuera sin comprobar (revisado 28-sep-2026) */
/* ===== SESIONES: las del gimnasio y los bloques de fuerza (antiguos, ya solo se leen) =====
   Storage 'sessions': [{ date: 'AAAA-MM-DD', block: '1' | '2' | '3' | null, day?: '1'-'5', minutes?, exercises: [nombres], cardio? }]
   Las sesiones nuevas las guarda gym.js con lo que marcaste; los bloques con «block» son entrenos de antes.
   Caminar suelto no se registra (va en consejos); el cardio va dentro de la sesión: lista [{minutes?, km?, note?}] (hasta 4) o, en lo antiguo, {start?, end?}. */
// Mínimo por semana (lunes a domingo): objetivoSemana() en rutina.js (los días del perfil; sin perfil, 3).
// Ideal: los días del plan del gimnasio, idealSemana() en gym.js.

// Fechas de medidas: «d/m/aaaa» escrito a mano (toLocaleDateString depende del idioma del navegador)
const fechaEs = d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
const esAIso = s => { const [d, m, y] = String(s).split('/'); return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; };

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
// «sesiones» se puede pasar ya leída para no releer el almacén en cada semana (racha, plan)
function sessionsInWeek(ref = new Date(), sesiones = getSessions()) {
  const lunes = getWeekStart(ref), domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const desde = isoDate(lunes), hasta = isoDate(domingo);
  return sesiones.filter(s => s.date >= desde && s.date <= hasta);
}

// Qué bloque toca: el siguiente al último hecho (1 → 2 → 3 → 1)
function nextBlock() {
  const ultimo = getSessions().filter(s => s.block).pop();
  return ultimo ? String(Number(ultimo.block) % 3 + 1) : '1';
}

/* ===== MI SEMANA: aviso, días y semanas anteriores ===== */
const plural = (n, una, varias) => `${n} ${n === 1 ? una : varias}`;

// 🟢 cumplida o vas bien · 🟠 vas justo · 🔴 ya no llegas, o es domingo con sesiones pendientes (el mínimo, no el ideal)
function weekStatus(ref = new Date()) {
  const hechos = sessionsInWeek(ref).length, faltan = Math.max(0, objetivoSemana() - hechos), ideal = idealSemana();
  const hoyHecho = getSessions().some(s => s.date === isoDate(ref));
  const dias = 7 - (ref.getDay() + 6) % 7 - (hoyHecho ? 1 : 0);   // días que quedan para entrenar (hoy cuenta si aún no has entrenado)
  const b = n => plural(n, 'sesión', 'sesiones'), d = n => plural(n, 'día', 'días');
  const falta = faltan === 1 ? 'falta' : 'faltan', queda = dias === 1 ? 'queda' : 'quedan';
  if (!faltan && ideal > objetivoSemana()) {
    return { hechos, color: 'verde', texto: hechos >= ideal ? `${estado('ok')} Plan completo: ${hechos} de ${ideal}. ¡Muy bien!` : `${estado('ok')} Semana cumplida (mínimo ${objetivoSemana()}). El plan completo son ${ideal}.` };
  }
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
  const etiqueta = s => `${s.day ? `Día ${esc(s.day)}` : s.block ? `Bloque ${esc(s.block)}` : 'Entreno'}${s.minutes ? ` · ${esc(s.minutes)} min` : ''}${s.note ? ` · ${esc(s.note)}` : ''}`;
  const ideal = idealSemana();

  // eslint-disable-next-line no-unsanitized/property -- lo del almacén o del PDF va por esc()/labNum() o son números; probado con una copia manipulada
  actual.innerHTML =
    `<div class="semana-cab"><span>${corta(lunes)} – ${corta(dia(lunes, 6))}</span><strong class="semana-cuenta ${est.color}">${est.hechos} / ${objetivoSemana()}${ideal > objetivoSemana() ? ` · ideal ${ideal}` : ''}</strong></div>` +
    `<div class="semana-aviso ${est.color}">${est.texto}</div>` +
    '<div class="semana-dias">' + [0, 1, 2, 3, 4, 5, 6].map(n => {
      const f = isoDate(dia(lunes, n)), delDia = sesiones.filter(s => s.date === f), esHoy = f === isoDate(hoy);
      return `<div class="semana-dia${esHoy ? ' hoy' : ''}${delDia.length ? ' hecho' : ''}">` +
        `<span class="semana-letra">${'LMXJVSD'[n]}<small>${dia(lunes, n).getDate()}</small></span>` +
        `<span>${delDia.length ? delDia.map(s => estado('ok') + ' ' + etiqueta(s)).join('<br>') : esHoy ? 'hoy' : ''}</span></div>`;
    }).join('') + '</div>' +
    (est.hechos < ideal ? `<button class="btn btn-green btn-full" id="semanaEntrenar">${ICONO.jugar}Apuntar sesión · toca el día ${nextGymDay()}</button>` : '') +
    '<div class="meta-aviso">El cardio se apunta dentro de cada sesión. Caminar suelto no cuenta aquí (va en los consejos).</div>';

  // Semanas anteriores: desde la del primer entreno hasta la pasada, también las que quedaron a cero
  const pasadas = sesiones.filter(s => s.date < isoDate(lunes));
  if (!pasadas.length) { historial.innerHTML = '<div class="meta-aviso">Aquí irán tus semanas anteriores.</div>'; return; }
  const semanas = [];
  // Como mucho los dos últimos años (104 semanas): con datos muy antiguos, pintar cientos de semanas congelaba la app
  const primera = getWeekStart(new Date(pasadas[0].date + 'T12:00')), tope = dia(lunes, -7 * 104);
  for (let l = primera > tope ? primera : tope; l < lunes; l = dia(l, 7)) semanas.unshift(l);
  // eslint-disable-next-line no-unsanitized/property -- lo del almacén o del PDF va por esc()/labNum() o son números; probado con una copia manipulada
  historial.innerHTML = semanas.map(l => {
    const desde = isoDate(l), hasta = isoDate(dia(l, 6)), suyas = pasadas.filter(s => s.date >= desde && s.date <= hasta);
    const ok = suyas.length >= objetivoSemana();
    return `<details class="lab-sec"><summary><div class="lab-tit">${corta(l)} – ${corta(dia(l, 6))}` +
      `<small>${suyas.length} / ${objetivoSemana()} ${ok ? `${estado('ok')} cumplida` : '· no cumplida'}</small></div><span class="lab-flecha"></span></summary>` +
      '<div class="lab-cuerpo">' + (suyas.length ? suyas.map(s =>
        `<div class="lab-fila"><div class="lab-fila-top"><span>${new Date(s.date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</span><strong>${etiqueta(s)}</strong></div>` +
        (s.exercises ? `<div class="lab-fila-que">${s.exercises.map(esc).join(' · ')}</div>` : '') +
        (textoCardio(s.cardio) ? `<div class="lab-fila-que">Cardio · ${textoCardio(s.cardio)}</div>` : '') + '</div>').join('')
        : '<div class="meta-aviso">Sin entrenos esta semana.</div>') + '</div></details>';
  }).join('');
}

// El cardio de una sesión del gimnasio en una línea («Al empezar: 10.6 min · 0.69 km · cinta — Al acabar: 54 min · 5.06 km»); sin cardio, ''
// Todo con esc(): viene del almacén (o de una copia importada).
// El cardio puede venir en dos formatos y los dos se leen SIEMPRE: la LISTA nueva [{minutes?, km?, note?}] (en el orden en que lo hiciste)
// y el formato viejo {start?, end?} («Al empezar» / «Al acabar»), que sigue en las sesiones ya guardadas y en las copias antiguas.
const cardioComoLista = c => Array.isArray(c) ? c : (c && typeof c === 'object' ? ['start', 'end'].map(k => c[k]).filter(x => x && typeof x === 'object' && Object.keys(x).length) : []);
const resumenCardio = x => [x.minutes !== undefined && `${esc(x.minutes)} min`, x.km !== undefined && `${esc(x.km)} km`, x.note && esc(x.note)].filter(Boolean).join(' · ');
const textoCardio = c => !c ? '' : Array.isArray(c)
  ? c.filter(x => x && typeof x === 'object' && Object.keys(x).length).map(resumenCardio).filter(Boolean).join(' — ')
  : [['start', 'Al empezar'], ['end', 'Al acabar']].filter(([k]) => c[k] && Object.keys(c[k]).length).map(([k, t]) => `${t}: ${resumenCardio(c[k])}`).join(' — ');

// «Apuntar sesión»: te lleva a la pantalla de la sesión del gimnasio (arriba en Entreno)
document.getElementById('semanaActual')?.addEventListener('click', e => {
  if (!e.target.closest('#semanaEntrenar')) return;   // también si tocas el icono (antes solo el texto)
  document.querySelector('[data-section="entrenamiento"]').click();
  document.getElementById('gymCard')?.scrollIntoView();
});

/* ===== RACHA: semanas cumplidas (el mínimo de sesiones o más) ===== */
function completedWeeks() {
  const porSemana = {};
  getSessions().forEach(s => { const k = isoDate(getWeekStart(new Date(s.date + 'T12:00'))); porSemana[k] = (porSemana[k] || 0) + 1; });
  return Object.values(porSemana).filter(n => n >= objetivoSemana()).length;
}

// Semanas seguidas cumplidas. La actual suma si ya está cumplida; si no, no rompe la racha (aún puedes cumplirla).
function weekStreak(ref = new Date()) {
  const lunes = getWeekStart(ref), sesiones = getSessions();   // se leen una vez (antes, una por semana: 4 s con 2.000)
  let racha = sessionsInWeek(lunes, sesiones).length >= objetivoSemana() ? 1 : 0;
  for (let l = new Date(lunes); ; ) {
    l.setDate(l.getDate() - 7);
    if (sessionsInWeek(l, sesiones).length < objetivoSemana()) return racha;
    racha++;
  }
}

// Lunes de la semana de «ref». getDay() da 0 en domingo: (getDay() + 6) % 7 son los días desde el lunes
// (antes el domingo saltaba al lunes SIGUIENTE y la semana salía a 0).
function getWeekStart(ref = new Date()) {
  const d = new Date(ref);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d;
}
