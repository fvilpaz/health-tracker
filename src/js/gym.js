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

// El cardio es opcional: sin nada escrito → null. «entrada» son los textos de las casillas (minutos, km, nota).
// Mal escrito → { error }. Los mismos límites que valida copia.js al importar.
function cardioDeCasillas(entrada) {
  const minutos = String(entrada.minutes ?? '').trim().replace(',', '.'), km = String(entrada.km ?? '').trim().replace(',', '.');
  const nota = String(entrada.note ?? '').trim();
  if (!minutos && !km && !nota) return null;
  const m = minutos ? Number(minutos) : undefined, k = km ? Number(km) : undefined;
  if (m !== undefined && !(m > 0 && m <= 600)) return { error: 'minutos entre 1 y 600' };
  if (k !== undefined && !(k >= 0 && k <= 200)) return { error: 'km entre 0 y 200' };
  if (nota.length > 120) return { error: 'la nota, hasta 120 letras' };
  return { ...(m !== undefined && { minutes: m }), ...(k !== undefined && { km: k }), ...(nota && { note: nota }) };
}

// La sesión que se guarda a partir del borrador { day, done, cardio }, o { error }. Los ejercicios, en el orden del plan.
function sesionGym(plan, borrador, fecha = isoDate(new Date())) {
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

async function renderGym() {
  const lista = document.getElementById('gymEjercicios');
  if (!lista) return;
  let plan;
  try { plan = await cargarPlanGym(); } catch { lista.textContent = 'No se ha podido cargar el plan. Revisa la conexión y vuelve a abrir la app.'; return; }
  renderSemana();   // ya se conoce el ideal (días del plan): «Mi semana» lo enseña
  const toca = nextGymDay(getSessions(), plan.days.length);
  const b = borradorGym() || { date: isoDate(new Date()), day: toca, done: [], cardio: {} };
  const guardar = () => Storage.set('gymDraft', b);
  const nuevo = (tag, clase, texto) => { const el = document.createElement(tag); if (clase) el.className = clase; if (texto !== undefined) el.textContent = texto; return el; };

  document.getElementById('gymDias').replaceChildren(...plan.days.map(d => {
    const btn = nuevo('button', 'block-btn' + (d.id === b.day ? ' active' : ''), `Día ${d.id}`);
    btn.addEventListener('click', () => { if (d.id !== b.day) { b.day = d.id; b.done = []; guardar(); renderGym(); } });
    return btn;
  }));
  document.getElementById('gymInfo').textContent = b.day === toca ? `Hoy toca el día ${toca}` : `Hoy tocaba el día ${toca}`;

  lista.replaceChildren(...plan.days.find(d => d.id === b.day).exercises.map(e => {
    const fila = nuevo('label', 'gym-fila'), casilla = nuevo('input');
    casilla.type = 'checkbox';
    casilla.checked = b.done.includes(e.name);
    casilla.addEventListener('change', () => { b.done = casilla.checked ? [...b.done, e.name] : b.done.filter(n => n !== e.name); guardar(); });
    fila.append(casilla, nuevo('span', 'gym-nombre', e.name), nuevo('span', 'gym-meta', `${e.sets || plan.sets}×${plan.reps}`));
    return fila;
  }));

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
    campos.append(campo('minutes', `minutos (plan: ${plan[clavePlan].minutes})`, 'decimal'), campo('km', 'km', 'decimal'), campo('note', 'nota (cinta, caminata…)', 'text'));
    caja.append(nuevo('div', 'gym-cardio-tit', `${titulo} (opcional)`), campos);
    return caja;
  }));
}

function guardarGym() {
  if (!planGym) return;
  const b = borradorGym();
  if (!b) return showToast('Marca al menos un ejercicio');
  const r = sesionGym(planGym, b);
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
document.addEventListener('DOMContentLoaded', renderGym);
