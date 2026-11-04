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
  // Lápiz ✎ solo en las sesiones guardadas (los entrenos antiguos, que solo tienen la fecha, no se tocan). Abre un panel con «Día» (cambiar
  // la fecha) y «Quitar sesión». Se localiza por su posición en 'sessions' y, al pulsar, se comprueba que sigue siendo la del mismo día
  // (data-fecha) antes de cambiar o quitar nada.
  const guardadas = Storage.get('sessions', []);
  const posicion = s => guardadas.findIndex(g => JSON.stringify(g) === JSON.stringify(s));
  const lapiz = s => {
    const i = posicion(s);
    return i < 0 ? '' : `<button type="button" class="semana-lapiz" data-editar="${i}" aria-expanded="${editandoSesion === i}" aria-label="Editar la sesión del ${esc(s.date)}">✎</button>`;
  };
  const panel = s => {
    const i = posicion(s);
    if (i < 0 || editandoSesion !== i) return '';
    const pideConfirmar = quitandoSesion.i === i && Date.now() - quitandoSesion.t < TIEMPO_CONFIRMAR;
    return '<div class="semana-editor">' +
      `<label>Día <input type="date" class="semana-fecha" max="${isoDate(hoy)}" value="${esc(s.date)}"></label>` +
      `<button type="button" class="btn btn-green cons-mas" data-guardar-dia="${i}" data-fecha="${esc(s.date)}">Guardar día</button>` +
      `<button type="button" class="semana-quitar" data-quitar="${i}" data-fecha="${esc(s.date)}">${pideConfirmar ? '¿Seguro? Pulsa otra vez' : 'Quitar sesión'}</button></div>`;
  };

  // eslint-disable-next-line no-unsanitized/property -- lo del almacén o del PDF va por esc()/labNum() o son números; probado con una copia manipulada
  actual.innerHTML =
    `<div class="semana-cab"><span>${corta(lunes)} – ${corta(dia(lunes, 6))}</span><strong class="semana-cuenta ${est.color}">${est.hechos} / ${objetivoSemana()}${ideal > objetivoSemana() ? ` · ideal ${ideal}` : ''}</strong></div>` +
    `<div class="semana-aviso ${est.color}">${est.texto}</div>` +
    '<div class="semana-dias">' + [0, 1, 2, 3, 4, 5, 6].map(n => {
      const f = isoDate(dia(lunes, n)), delDia = sesiones.filter(s => s.date === f), esHoy = f === isoDate(hoy);
      const abierto = verDia === f || delDia.some(s => editandoSesion >= 0 && posicion(s) === editandoSesion);   // con detalle o panel a la vista: ocupa toda la fila
      return `<div class="semana-dia${esHoy ? ' hoy' : ''}${delDia.length ? ' hecho' : ''}${abierto ? ' abierto' : ''}">` +
        `<span class="semana-letra">${'LMXJVSD'[n]}<small>${dia(lunes, n).getDate()}</small></span>` +
        // Tocar la sesión hecha abre sus ejercicios y su cardio (el lápiz ✎ aparte: cambiar el día o quitarla)
        `<span class="semana-sesiones">${delDia.length ? delDia.map(s => '<div class="semana-ses">' +
          `<button type="button" class="semana-ver" data-ver="${f}" aria-expanded="${verDia === f}">${estado('ok')} ${etiqueta(s)} <span class="semana-flecha" aria-hidden="true">▾</span></button>` +
          lapiz(s) + panel(s) + (verDia === f ? detalleSesion(s) : '') + '</div>').join('') : esHoy ? 'hoy' : ''}</span></div>`;
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
  // Agrupadas en año → mes (el del lunes de cada semana), todo desplegable: solo el año y el mes más recientes vienen abiertos
  const detalle = l => {
    const desde = isoDate(l), hasta = isoDate(dia(l, 6)), suyas = pasadas.filter(s => s.date >= desde && s.date <= hasta);
    return { l, suyas, ok: suyas.length >= objetivoSemana() };
  };
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const mesNombre = m => { const t = new Date(2000, m, 1).toLocaleDateString('es-ES', { month: 'long' }); return t[0].toUpperCase() + t.slice(1); };
  const grupo = (titulo, resumen, cuerpo, abierto) => `<details class="lab-sec"${abierto ? ' open' : ''}><summary><div class="lab-tit">${titulo}<small>${resumen}</small></div><span class="lab-flecha"></span></summary><div class="lab-cuerpo">${cuerpo}</div></details>`;
  const htmlSemana = ({ l, suyas, ok }) => {
    return `<details class="lab-sec"><summary><div class="lab-tit">${corta(l)} – ${corta(dia(l, 6))}` +
      `<small>${suyas.length} / ${objetivoSemana()} ${ok ? `${estado('ok')} cumplida` : '· no cumplida'}</small></div><span class="lab-flecha"></span></summary>` +
      '<div class="lab-cuerpo">' + (suyas.length ? suyas.map(s =>
        `<div class="lab-fila"><div class="lab-fila-top"><span>${new Date(s.date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</span><strong>${etiqueta(s)}</strong>${lapiz(s)}</div>${panel(s)}` +
        (s.exercises ? `<div class="lab-fila-que">${s.exercises.map(esc).join(' · ')}</div>` : '') +
        (textoCardio(s.cardio) ? `<div class="lab-fila-que">Cardio · ${textoCardio(s.cardio)}</div>` : '') + '</div>').join('')
        : '<div class="meta-aviso">Sin entrenos esta semana.</div>') + '</div></details>';
  };
  // eslint-disable-next-line no-unsanitized/property -- lo del almacén o del PDF va por esc()/labNum() o son números; probado con una copia manipulada
  historial.innerHTML = agruparSemanas(semanas.map(detalle)).map((a, i) => grupo(a.anio, plural(a.meses.reduce((n, m) => n + m.semanas.length, 0), 'semana', 'semanas'),
    a.meses.map((m, j) => grupo(mesNombre(m.mes), `${plural(m.semanas.length, 'semana', 'semanas')} · ${plural(m.semanas.filter(s => s.ok).length, 'cumplida', 'cumplidas')}`,
      m.semanas.map(htmlSemana).join(''), i === 0 && j === 0)).join(''), i === 0)).join('');
}

// Lo que hiciste en una sesión: ejercicios y cardio (todo escapado: viene del almacén o de una copia importada)
let verDia = '';   // día (aaaa-mm-dd) de «Mi semana» con sus ejercicios a la vista
const detalleSesion = s => '<div class="semana-detalle">' +
  (s.exercises && s.exercises.length ? `<div class="lab-fila-que">${s.exercises.map(esc).join(' · ')}</div>` : '<div class="meta-aviso">Sin ejercicios apuntados.</div>') +
  (textoCardio(s.cardio) ? `<div class="lab-fila-que">Cardio · ${textoCardio(s.cardio)}</div>` : '') + '</div>';

function pulsarVerDia(fecha) {
  verDia = verDia === fecha ? '' : fecha;   // el mismo toque lo abre y lo cierra
  renderSemana();
}

// Editar una sesión guardada con el lápiz ✎: cambiar el día o quitarla. Quitar pide confirmar (en el propio botón, 6 s) y la segunda pulsación la quita.
const TIEMPO_CONFIRMAR = 6000;
let quitandoSesion = { i: -1, t: 0 };
let editandoSesion = -1;   // posición (en 'sessions') de la sesión con el panel abierto

// La lista sin la sesión i, solo si sigue siendo la del día que se enseñó; si algo no cuadra, no se toca nada.
function sesionesSin(lista, i, fecha) {
  if (!Number.isInteger(i) || i < 0 || i >= lista.length || lista[i].date !== fecha) return { error: 'La lista ha cambiado: no se ha quitado nada' };
  return { lista: lista.filter((_, k) => k !== i) };
}

// La lista con la sesión i en otro día (hoy o anterior), de nuevo ordenada por fecha; si algo no cuadra, no se toca nada.
function sesionesConDia(lista, i, fecha, nueva, hoy = isoDate(new Date())) {
  if (!Number.isInteger(i) || i < 0 || i >= lista.length || lista[i].date !== fecha) return { error: 'La lista ha cambiado: no se ha cambiado nada' };
  if (!esFechaIso(nueva) || nueva > hoy) return { error: 'Pon el día en que lo hiciste (hoy o uno anterior)' };
  return { lista: lista.map((s, k) => k === i ? { ...s, date: nueva } : s).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0) };
}

function pulsarEditarSesion(i) {
  editandoSesion = editandoSesion === i ? -1 : i;   // el mismo lápiz abre y cierra el panel
  quitandoSesion = { i: -1, t: 0 };
  renderSemana();
}

function pulsarGuardarDia(i, fecha, nueva) {
  const r = sesionesConDia(Storage.get('sessions', []), i, fecha, nueva);
  if (r.error) { showToast(r.error); return renderSemana(); }
  Storage.set('sessions', r.lista);
  editandoSesion = -1;
  showToast('Día cambiado ✓');
  updateDashboard();   // la semana, la racha y las casillas del plan
  renderSemana();
}

function pulsarQuitarSesion(i, fecha) {
  if (!(quitandoSesion.i === i && Date.now() - quitandoSesion.t < TIEMPO_CONFIRMAR)) { quitandoSesion = { i, t: Date.now() }; return renderSemana(); }
  quitandoSesion = { i: -1, t: 0 };
  const r = sesionesSin(Storage.get('sessions', []), i, fecha);
  if (r.error) { showToast(r.error); return renderSemana(); }
  Storage.set('sessions', r.lista);
  editandoSesion = -1;
  showToast('Sesión quitada');
  updateDashboard();   // la semana, la racha y las casillas del plan
  renderSemana();
}

for (const id of ['semanaActual', 'semanaHistorial']) {
  document.getElementById(id)?.addEventListener('click', e => {
    const b = e.target.closest('[data-ver], [data-editar], [data-quitar], [data-guardar-dia]');
    if (!b) return;
    if (b.dataset.ver !== undefined) pulsarVerDia(b.dataset.ver);
    else if (b.dataset.editar !== undefined) pulsarEditarSesion(Number(b.dataset.editar));
    else if (b.dataset.quitar !== undefined) pulsarQuitarSesion(Number(b.dataset.quitar), b.dataset.fecha);
    else pulsarGuardarDia(Number(b.dataset.guardarDia), b.dataset.fecha, b.closest('.semana-editor').querySelector('.semana-fecha').value);
  });
}

// Agrupa las semanas (de la más reciente a la más antigua, cada una con su lunes en «l») en año → mes, por el lunes de cada una
function agruparSemanas(lista) {
  const anios = [];
  for (const s of lista) {
    const a = s.l.getFullYear(), m = s.l.getMonth();
    const anio = anios.find(x => x.anio === a) || anios[anios.push({ anio: a, meses: [] }) - 1];
    const mes = anio.meses.find(x => x.mes === m) || anio.meses[anio.meses.push({ mes: m, semanas: [] }) - 1];
    mes.semanas.push(s);
  }
  return anios;
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
