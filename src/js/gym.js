/* eslint-disable security/detect-object-injection -- las claves son 'start' / 'end' y los campos de casillas, nombres del propio código (revisado 6-oct-2026) */
/* Sesión del gimnasio: la app solo APUNTA lo que hiciste (los vídeos y el plan están en la app del gimnasio).
   El plan (data/gym.json) son 5 días que rotan. Se guarda en 'sessions' como
   { date, block: null, day: '1'-'5', exercises: [nombres hechos], cardio?: { start?, end?: { minutes?, km?, note? } } }.
   Mientras marcas, lo hecho se guarda en 'gymDraft' (solo el de hoy) para no perderlo si cierras la app. */
let planGym = null;
async function cargarPlanGym() {
  if (!planGym) {
    const res = await fetch('data/gym.json');
    if (!res.ok) throw new Error('gym.json ' + res.status);
    planGym = await res.json();
  }
  return planGym;
}

// Sesiones por semana del plan completo (ideal; el mínimo es objetivoSemana()). Hasta cargar el plan, = el mínimo.
const idealSemana = () => Math.max(objetivoSemana(), planGym?.days.length || 0);

// Día que toca: el siguiente al último que hiciste (1 → 2 → … → 5 → 1); sin ninguno, el 1
function nextGymDay(sesiones = getSessions(), total = 5) {
  const ultimo = sesiones.filter(s => s.day).pop();
  return ultimo ? String(Number(ultimo.day) % total + 1) : '1';
}

const CARDIOS_GYM = [['start', 'Cardio al empezar', 'cardio_start'], ['end', 'Cardio al acabar', 'cardio_end']];

// Minutos como los da la máquina («10:38», min:seg) o a mano («10,6»); en el almacén siempre decimales (10.63)
const minutosDe = t => { const r = /^(\d{1,3}):([0-5]\d)$/.exec(t); return r ? Math.round((+r[1] + +r[2] / 60) * 100) / 100 : Number(t); };

// El cardio es opcional: sin nada escrito → null. «entrada» son los textos de las casillas (minutos, km, nota).
// Mal escrito → { error }. Los mismos límites que valida copia.js al importar.
function cardioDeCasillas(entrada) {
  const minutos = String(entrada.minutes ?? '').trim().replace(',', '.'), km = String(entrada.km ?? '').trim().replace(',', '.');
  const nota = String(entrada.note ?? '').trim();
  if (!minutos && !km && !nota) return null;
  const m = minutos ? minutosDe(minutos) : undefined, k = km ? Number(km) : undefined;
  if (m !== undefined && !(m > 0 && m <= 600)) return { error: 'minutos entre 1 y 600' };
  if (k !== undefined && !(k >= 0 && k <= 200)) return { error: 'km entre 0 y 200' };
  if (nota.length > 120) return { error: 'la nota, hasta 120 letras' };
  return { ...(m !== undefined && { minutes: m }), ...(k !== undefined && { km: k }), ...(nota && { note: nota }) };
}

// La sesión que se guarda a partir del borrador { day, done, cardio }, o { error }. Los ejercicios, en el orden del plan.
// «fecha» es el día que la hiciste (por defecto hoy; un día pasado sirve para apuntar lo de ayer, nunca uno futuro).
function sesionGym(plan, borrador, fecha = isoDate(new Date())) {
  if (!esFechaIso(fecha) || fecha > isoDate(new Date())) return { error: 'Pon el día en que lo hiciste (hoy o uno anterior)' };
  const dia = plan.days.find(d => d.id === borrador.day);
  const hechos = dia.exercises.map(e => e.name).filter(n => borrador.done.includes(n));
  if (!hechos.length) return { error: 'Marca al menos un ejercicio' };
  const cardio = {};
  for (const [k, titulo] of CARDIOS_GYM) {
    const c = cardioDeCasillas(borrador.cardio?.[k] || {});
    if (c?.error) return { error: `${titulo}: ${c.error}` };
    if (c) cardio[k] = c;
  }
  return { date: fecha, block: null, day: dia.id, exercises: hechos, ...(Object.keys(cardio).length && { cardio }) };
}

const borradorGym = () => { const b = Storage.get('gymDraft'); return b && b.date === isoDate(new Date()) && Array.isArray(b.done) ? b : null; };

// La sesión libre (plan cerrado por la puerta): solo fecha y una nota corta, sin ejercicios ni cardio
function sesionLibre(fecha, nota, hoy = isoDate(new Date())) {
  if (!esFechaIso(fecha) || fecha > hoy) return { error: 'Pon el día en que lo hiciste (hoy o uno anterior)' };
  const texto = String(nota ?? '').trim();
  if (texto.length > 120) return { error: 'la nota, hasta 120 letras' };
  return { date: fecha, block: null, ...(texto && { note: texto }) };
}

// Plan de 5 días o, si la puerta está cerrada (E14), el formulario de sesión libre. Devuelve si el plan se ve.
function renderPuertaGym() {
  const bloque = document.getElementById('gymPlanBloque'), puerta = document.getElementById('gymPuerta');
  if (!bloque || !puerta) return true;
  const p = puertaGym(Storage.get('profile'));
  bloque.hidden = p.cerrada;
  puerta.hidden = !p.cerrada;
  if (p.cerrada) {
    document.getElementById('gymPuertaTexto').textContent = textoPuerta(p.motivos);
    const f = document.getElementById('gymLibreFecha');
    f.max = isoDate(new Date());
    f.value = f.value || f.max;
  }
  return !p.cerrada;
}

function guardarLibre() {
  const r = sesionLibre(document.getElementById('gymLibreFecha').value, document.getElementById('gymLibreNota').value);
  if (r.error) return showToast(r.error);
  Storage.set('sessions', [...Storage.get('sessions', []), r]);
  document.getElementById('gymLibreNota').value = '';
  showToast('Sesión guardada ✓');
  updateDashboard();
  checkLogros();
}

// Explicaciones de los ejercicios (data/ejercicios-gym.json, por «ref»): aparte del plan para que el editor del plan no las toque.
// Se cargan solo al abrir la primera explicación.
let explicacionesGym = null;
async function cargarExplicaciones() {
  if (!explicacionesGym) {
    const res = await fetch('data/ejercicios-gym.json');
    if (!res.ok) throw new Error('ejercicios-gym.json ' + res.status);
    explicacionesGym = (await res.json()).ejercicios || {};
  }
  return explicacionesGym;
}

// Pinta una explicación dentro de «region»: Trabaja, pasos numerados, Ojo y las dos fotos (Inicio / Final). Todo con textContent.
// Las fotos solo se crean aquí (al abrir): nombres de archivo seguros, tamaño fijo y carga diferida. Sin foto, solo texto.
const FOTO_SEGURA = /^[a-z0-9-]{1,40}\.webp$/;
function construirExplicacion(exp, nombre, region) {
  const nuevo = (tag, clase, texto) => { const el = document.createElement(tag); if (clase) el.className = clase; if (texto !== undefined) el.textContent = texto; return el; };
  const partes = [];
  if (Array.isArray(exp.trabaja) && exp.trabaja.length) partes.push(nuevo('p', 'gym-tip-trabaja', 'Trabaja: ' + exp.trabaja.join(', ')));
  if (Array.isArray(exp.pasos) && exp.pasos.length) {
    const ol = nuevo('ol', 'gym-tip-pasos');
    ol.append(...exp.pasos.map(p => nuevo('li', '', p)));
    partes.push(ol);
  }
  if (exp.ojo) partes.push(nuevo('p', 'gym-tip-ojo', 'Ojo: ' + exp.ojo));
  const fotos = [['inicio', 'Inicio'], ['final', 'Final']].filter(([k]) => exp.fotos && FOTO_SEGURA.test(String(exp.fotos[k])));
  if (fotos.length) {
    const fig = nuevo('div', 'gym-tip-fotos');
    for (const [k, titulo] of fotos) {
      const figura = nuevo('figure', 'gym-tip-figura'), img = nuevo('img', 'gym-tip-foto');
      img.src = 'img/gym/' + exp.fotos[k];
      img.alt = `${nombre}: posición de ${titulo.toLowerCase()}`;
      img.width = 300; img.height = 200;
      img.loading = 'lazy';
      figura.append(img, nuevo('figcaption', '', titulo));
      fig.append(figura);
    }
    partes.push(fig);
    if (exp.fotos.aproximada) partes.push(nuevo('p', 'gym-tip-aviso', 'Foto orientativa: tu máquina puede ser distinta.'));
  }
  if (!partes.length) partes.push(nuevo('p', 'gym-tip-aviso', 'Todavía no hay explicación de este ejercicio.'));
  region.replaceChildren(...partes);
}

// La fila de un ejercicio: <div> con el <label> que marca (número, nombre, meta y casilla) y, solo si el ejercicio tiene
// explicación (e.ref), un botón APARTE, hermano del label (tocarlo no marca), que despliega la explicación hacia abajo.
// «cargarExplicacion» devuelve la explicación (o null) y solo se llama la primera vez que se abre.
function filaEjercicio({ e, i, hecha, meta, alCambiar, cargarExplicacion }) {
  const nuevo = (tag, clase, texto) => { const el = document.createElement(tag); if (clase) el.className = clase; if (texto !== undefined) el.textContent = texto; return el; };
  const fila = nuevo('div', 'gym-fila-ej'), label = nuevo('label', 'gym-ej' + (hecha ? ' hecho' : ''));
  const cuerpo = nuevo('span', 'gym-ej-cuerpo'), casilla = nuevo('input', 'gym-check');
  casilla.type = 'checkbox';
  casilla.checked = hecha;
  casilla.addEventListener('change', () => { label.classList.toggle('hecho', casilla.checked); alCambiar(casilla.checked); });
  cuerpo.append(nuevo('span', 'gym-ej-nombre', e.name), nuevo('span', 'gym-ej-meta', meta));
  label.append(nuevo('span', 'gym-ej-num', String(i + 1)), cuerpo, casilla);
  fila.append(label);
  if (e.ref && cargarExplicacion) {
    const boton = nuevo('button', 'gym-info-btn', 'i'), region = nuevo('div', 'gym-tip');
    let pintada = false;
    boton.type = 'button';
    region.id = `gym-tip-${e.id}`;
    region.hidden = true;
    boton.setAttribute('aria-label', `Cómo se hace: ${e.name}`);
    boton.setAttribute('aria-controls', region.id);
    boton.setAttribute('aria-expanded', 'false');
    boton.addEventListener('click', async () => {
      region.hidden = !region.hidden;
      boton.setAttribute('aria-expanded', String(!region.hidden));
      if (region.hidden || pintada) return;
      pintada = true;
      let exp = null;
      try { exp = await cargarExplicacion(); } catch { pintada = false; }   // sin conexión: se reintenta al abrir otra vez
      construirExplicacion(exp || {}, e.name, region);
    });
    fila.append(boton, region);
  }
  return fila;
}

async function renderGym() {
  const lista = document.getElementById('gymEjercicios');
  if (!lista) return;
  if (!renderPuertaGym()) return;   // puerta cerrada: no se carga ni se pinta el plan
  let plan;
  const primera = !planGym;
  try { plan = await cargarPlanGym(); } catch { lista.textContent = 'No se ha podido cargar el plan. Revisa la conexión y vuelve a abrir la app.'; return; }
  if (primera) updateDashboard();   // ya se conoce el ideal (días del plan): «Mi semana» y las casillas del plan lo enseñan
  const toca = nextGymDay(getSessions(), plan.days.length);
  const b = borradorGym() || { date: isoDate(new Date()), day: toca, done: [], cardio: {} };
  const guardar = () => Storage.set('gymDraft', b);
  const nuevo = (tag, clase, texto) => { const el = document.createElement(tag); if (clase) el.className = clase; if (texto !== undefined) el.textContent = texto; return el; };

  document.getElementById('gymDias').replaceChildren(...plan.days.map(d => {
    const btn = nuevo('button', 'gym-dia' + (d.id === b.day ? ' active' : ''), `Día ${d.id}`);
    btn.addEventListener('click', () => { if (d.id !== b.day) { b.day = d.id; b.done = []; guardar(); renderGym(); } });
    return btn;
  }));
  document.getElementById('gymInfo').textContent = b.day === toca ? `Hoy toca el día ${toca}` : `Hoy tocaba el día ${toca}`;
  const fecha = document.getElementById('gymFecha');   // el día en que lo hiciste: hoy, o uno anterior para apuntar lo de ayer
  fecha.max = isoDate(new Date());
  fecha.value = b.when || fecha.max;
  fecha.onchange = () => { if (fecha.value && fecha.value !== fecha.max) b.when = fecha.value; else delete b.when; guardar(); };

  // Una fila por ejercicio: el <label> (número, nombre, series × reps y casilla) sigue marcando al tocar cualquier parte
  lista.replaceChildren(...plan.days.find(d => d.id === b.day).exercises.map((e, i) => filaEjercicio({
    e, i, hecha: b.done.includes(e.name), meta: `${e.sets || plan.sets} series × ${plan.reps} reps`,
    alCambiar: marcado => { b.done = marcado ? [...b.done, e.name] : b.done.filter(n => n !== e.name); guardar(); },
    cargarExplicacion: () => cargarExplicaciones().then(c => c[e.ref] ?? null),
  })));

  // Cardio opcional: los minutos del plan salen solo como pista en gris, nunca como obligación
  document.getElementById('gymCardio').replaceChildren(...CARDIOS_GYM.map(([k, titulo, clavePlan]) => {
    const caja = nuevo('div', 'gym-cardio'), campos = nuevo('div', 'gym-cardio-campos');
    const campo = (nombre, pista, modo) => {
      const el = nuevo('input', nombre === 'note' ? 'gym-cardio-nota' : '');
      el.type = 'text'; el.inputMode = modo; el.placeholder = pista; el.maxLength = 120;
      el.setAttribute('aria-label', `${titulo}: ${pista}`);
      el.value = b.cardio[k]?.[nombre] ?? '';
      el.addEventListener('input', () => { b.cardio[k] = { ...b.cardio[k], [nombre]: el.value }; guardar(); });
      return el;
    };
    campos.append(campo('minutes', 'min o min:seg', 'text'), campo('km', 'km', 'decimal'), campo('note', 'nota (cinta, caminata…)', 'text'));
    const tit = nuevo('div', 'gym-cardio-tit', titulo);
    tit.append(nuevo('span', 'gym-cardio-plan', `plan: ${plan[clavePlan].minutes} min`));
    caja.append(tit, campos);
    return caja;
  }));
  pintarDescanso();
}

/* ===== DESCANSO ENTRE SERIES: «Serie hecha» → cuenta atrás (data/gym.json, rest) con aviso al empezar y al acabar ===== */
// Tonos: frecuencia (Hz), cuándo empieza y cuánto dura (s). Vibración: ms encendida/apagada (solo móvil; iPhone no la permite).
function patronAviso(tipo) {
  const t = (f, inicio, dura = 0.15) => ({ f, inicio, dura });
  return {
    descanso: { tonos: [t(440, 0), t(440, 0.25)], vibracion: [100, 80, 100] },   // 2 graves: descansa
    ejercicio: { tonos: [t(880, 0)], vibracion: [200] },                          // 1 agudo: ¡a por la siguiente serie!
    vuelta: { tonos: [t(523, 0), t(659, 0.2), t(784, 0.4)], vibracion: [100, 60, 100, 60, 100] },   // 3 subiendo: vuelta hecha (En casa)
    fin: { tonos: [t(523, 0, 0.6), t(659, 0, 0.6), t(784, 0, 0.6)], vibracion: [400] },    // acorde largo: terminado (En casa)
  }[tipo];
}

let audio = null;   // se crea con el primer toque (al pulsar «Serie hecha»): los navegadores no dejan sonar antes
function avisoCambio(tipo) {
  const p = patronAviso(tipo);
  if (!p) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      audio = audio || new Ctx();
      if (audio.state === 'suspended') audio.resume();
      const ahora = audio.currentTime;
      for (const { f, inicio, dura } of p.tonos) {
        const osc = audio.createOscillator(), vol = audio.createGain();
        osc.frequency.value = f;
        vol.gain.setValueAtTime(0.0001, ahora + inicio);
        vol.gain.exponentialRampToValueAtTime(0.25, ahora + inicio + 0.02);   // sube y baja suave: sin chasquidos
        vol.gain.exponentialRampToValueAtTime(0.0001, ahora + inicio + dura);
        osc.connect(vol).connect(audio.destination);
        osc.start(ahora + inicio);
        osc.stop(ahora + inicio + dura + 0.05);
      }
    }
    if (navigator.vibrate) navigator.vibrate(p.vibracion);
  } catch { /* sin sonido ni vibración en este aparato: el descanso sigue igual */ }
}

// Pantalla encendida mientras descansas: el móvil no se apaga a mitad de la cuenta atrás.
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
  if (document.visibilityState === 'visible' && (Timer.isRunning() || workoutActive)) mantenerPantalla(true);
});

// Cuánto del reloj queda lleno: entero parado; al descansar se va vaciando hasta el cero
const rellenoReloj = (restante, total) => restante === undefined ? 1 : Math.max(0, Math.min(1, restante / total));
const CIRCUNFERENCIA_RELOJ = 2 * Math.PI * 75;   // el radio del círculo de index.html
function pintarDescanso(restante) {
  const boton = document.getElementById('gymDescanso');
  if (!boton || !planGym) return;
  boton.classList.toggle('descansando', restante !== undefined);
  document.getElementById('gymRelojNum').textContent = restante ?? planGym.rest;
  document.getElementById('gymRelojTxt').textContent = restante === undefined ? 'Serie hecha: toca para descansar' : 'Descansando: toca para parar';
  document.getElementById('gymRelojArco').style.strokeDashoffset = CIRCUNFERENCIA_RELOJ * (1 - rellenoReloj(restante, planGym.rest));
  marcarRelojes();
}

// Timer es UNO: lo usan el reloj del gimnasio y el entreno en casa. Quién puede usarlo ahora (nunca se para uno al arrancar el otro):
// «gym» = tocar el reloj del gimnasio; «casa» = «Iniciar entrenamiento». «corre» = Timer.isRunning(); «casaActivo» = workoutActive.
function decisionReloj(quien, { corre, casaActivo }) {
  if (quien === 'gym') {
    if (casaActivo) return { accion: 'nada', aviso: 'Termina o para el entreno en casa para usar este reloj' };
    return { accion: corre ? 'parar' : 'arrancar' };
  }
  if (!casaActivo && corre) return { accion: 'nada', aviso: 'Para el descanso del gimnasio antes de empezar' };
  return { accion: 'arrancar' };
}

// Los dos botones del Timer único se ven inertes (aria-disabled, no disabled: así reciben foco y explican por qué) mientras el otro lo usa
function marcarRelojes() {
  const gym = document.getElementById('gymDescanso'), casa = document.getElementById('startWorkoutBtn');
  if (gym) gym.setAttribute('aria-disabled', String(!!workoutActive));
  if (casa) casa.setAttribute('aria-disabled', String(Timer.isRunning() && !workoutActive));
}

// Texto visible (role=status) junto al botón que no ha hecho nada; se borra solo
function avisarReloj(id, texto) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  setTimeout(() => { if (el.textContent === texto) el.textContent = ''; }, 6000);
}

document.getElementById('gymDescanso')?.addEventListener('click', () => {
  if (!planGym) return;
  const d = decisionReloj('gym', { corre: Timer.isRunning(), casaActivo: workoutActive });
  if (d.aviso) { avisarReloj('gymRelojAviso', d.aviso); return; }
  if (Timer.isRunning()) { Timer.stop(); mantenerPantalla(false); pintarDescanso(); return; }   // tocar durante el descanso lo para
  mantenerPantalla(true);
  avisoCambio('descanso');
  Timer.start(planGym.rest, restante => pintarDescanso(restante), () => {
    avisoCambio('ejercicio');
    mantenerPantalla(false);
    pintarDescanso();
    showToast('¡Siguiente serie!');
  });
});

function guardarGym() {
  if (!planGym) return;
  const b = borradorGym();
  if (!b) return showToast('Marca al menos un ejercicio');
  const r = sesionGym(planGym, b, b.when);   // sin fecha elegida, hoy
  if (r.error) return showToast(r.error);
  const sesiones = Storage.get('sessions', []);
  sesiones.push(r);
  Storage.set('sessions', sesiones);
  Storage.remove('gymDraft');
  showToast('Sesión guardada ✓');
  updateDashboard();   // la semana, la racha y las casillas del plan
  checkLogros();
  renderGym();
}

document.getElementById('gymGuardar')?.addEventListener('click', guardarGym);
document.getElementById('gymLibreGuardar')?.addEventListener('click', guardarLibre);
document.addEventListener('DOMContentLoaded', renderGym);
