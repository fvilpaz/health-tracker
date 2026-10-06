/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (zonas, bloques) (revisado 29-sep-2026) */
/* Entreno según el perfil: el mínimo de sesiones por semana (los días del perfil), los avisos de salud y qué modos
   (Gimnasio / En casa) se ven en la pestaña Entreno. */

// Sesiones mínimas por semana: los días que la persona dijo en su perfil; sin perfil, 3 (lo de siempre)
function objetivoSemana() {
  return Storage.get('profile', {}).days || 3;
}

const ZONAS_BASE = ['legs', 'push', 'pull', 'core'];
const MATERIAL_EN_CASA = ['chair', 'wall', 'table', 'backpack'];   // la barra de dominadas no se da por hecha

// Los 3 bloques de fuerza para «perfil». Reglas (docs/PLAN.md, paso 4):
// - siempre piernas, empuje, espalda y abdomen, y uno más por cada zona que quiere trabajar más (máx. 6);
// - nunca por encima de su nivel; +50 años, embarazo o un «sí» de seguridad (PAR-Q) → nivel 1 y sin saltos;
// - fuera lo que choca con sus molestias y lo que pide material que no hay en casa;
// - vueltas según sus minutos (15 → 2, 20 → 3, más → 4); cada bloque con ejercicios distintos.
function armarBloques(perfil, catalogo, hoy = new Date()) {
  const anos = perfil.birthDate ? edad(perfil.birthDate, hoy) : null;
  const embarazo = (perfil.conditions || []).includes('pregnancy');
  const suave = anos >= 50 || riesgoEjercicio(perfil) || embarazo;   // E3, E12, E5 (docs/FUENTES.md)
  const nivel = suave ? 1 : (perfil.level || 1);
  const molestias = perfil.avoid || [];
  const validos = catalogo.exercises.filter(e => e.zone !== 'mobility' && e.level <= nivel && !(embarazo && e.lying) &&
    !(suave && e.impact === 'high') && !e.avoid.some(a => molestias.includes(a)) &&
    e.equipment.every(m => MATERIAL_EN_CASA.includes(m)));

  // Por zona: primero los del nivel más alto permitido; si hay menos de 3, se completa con el nivel de debajo
  const grupo = {};
  // E2: a partir de 65 años, un ejercicio de equilibrio en cada bloque (OMS)
  const huecos = [...ZONAS_BASE, ...(anos >= 65 ? ['balance'] : []), ...(perfil.focus || [])].slice(0, 6);
  for (const zona of new Set(huecos)) {
    // Dentro del mismo nivel, el orden del catálogo (va de lo más básico y útil a lo demás). Antes era alfabético y
    // «Elevación de talones» (calf-raise) salía como ejercicio principal de piernas.
    const deZona = validos.filter(e => e.zone === zona).sort((a, b) => b.level - a.level || catalogo.exercises.indexOf(a) - catalogo.exercises.indexOf(b));
    const elegidos = [];
    for (let n = nivel; n >= 1 && elegidos.length < 3; n--) elegidos.push(...deZona.filter(e => e.level === n));
    grupo[zona] = elegidos;
  }
  const rounds = perfil.minutes <= 15 ? 2 : perfil.minutes <= 20 ? 3 : 4;
  const restBetween = 60;

  const blocks = {};
  [1, 2, 3].forEach((num, b) => {
    const usados = new Set(), exercises = [];
    for (const zona of huecos) {
      const lista = grupo[zona];
      if (!lista.length) continue;
      // El bloque «b» empieza en su propio ejercicio (variedad) y salta los que ya lleva
      for (let k = 0; k < lista.length; k++) {
        const e = lista[(b + k) % lista.length];
        if (usados.has(e.id)) continue;
        usados.add(e.id);
        exercises.push({ name: e.name, seconds: e.seconds, rest: e.rest, tip: e.tip });
        break;
      }
    }
    blocks[num] = { name: `Bloque ${num}`, exercises };
  });
  return { rounds, rest_between_rounds: restBetween, blocks };   // la duración la calcula workout.js (duracionFase)
}

/* ===== Avisos de Entreno según el perfil (docs/FUENTES.md) ===== */
const AVISOS_ENTRENO = [
  { regla: 'E12', si: p => riesgoEjercicio(p), texto: 'Consulta con tu médico antes de empezar: has contestado «sí» a alguna pregunta de seguridad (dolor en el pecho, mareos o ejercicio supervisado). Cuando te dé el visto bueno, cámbialo en «Mi perfil».' },
  { regla: 'E5', si: p => (p.conditions || []).includes('pregnancy'), texto: 'Embarazo: bebe agua y para y llama a tu matrona o médico si notas sangrado, mareo, dolor en el pecho, contracciones, falta de aire antes de empezar, pérdida de líquido, dolor o hinchazón de un gemelo, dolor de cabeza o menos movimientos del bebé.' },
  { regla: 'E6', si: p => (p.medications || []).includes('insulin'), texto: 'Con insulina: mide tu glucosa antes, durante y después, y lleva algo con azúcar por si baja.' },
  { regla: 'E7', si: p => (p.conditions || []).includes('hypertension'), texto: 'Tensión alta: no aguantes la respiración al hacer fuerza (sube mucho la tensión). Suelta el aire al empujar, también en planchas.' },
  { regla: 'E8', si: p => (p.conditions || []).includes('asthma'), texto: 'Asma: no te saltes el calentamiento. Si tu médico te ha pautado el inhalador de rescate antes del ejercicio, úsalo unos 15 minutos antes.' },
];
function avisosEntreno(perfil) {
  return perfil ? AVISOS_ENTRENO.filter(a => a.si(perfil)) : [];
}
function renderAvisosEntreno() {
  const caja = document.getElementById('avisosEntreno');
  if (!caja) return;
  const avisos = avisosEntreno(Storage.get('profile'));
  caja.replaceChildren(...avisos.map(a => { const d = document.createElement('div'); d.className = 'meta-aviso'; d.textContent = a.texto; return d; }));
  caja.hidden = !avisos.length;
}

/* ===== Catálogo de ejercicios de «En casa» (data/exercises.json) ===== */
let catalogoEjercicios = null;
async function cargarCatalogoEjercicios() {
  if (!catalogoEjercicios) {
    const res = await fetch('data/exercises.json');
    if (!res.ok) throw new Error('exercises.json ' + res.status);
    catalogoEjercicios = await res.json();
  }
  return catalogoEjercicios;
}

/* ===== Bloques del perfil en «En casa» ===== */
// Pone en workoutData.strength los bloques que tocan. Los de siempre se guardan aparte (strengthClassic).
// Durante un entreno no cambia nada: se aplica al terminar o al volver a abrir.
async function aplicarRutina() {
  if (!workoutData || workoutActive) return;
  if (!workoutData.strengthClassic) workoutData.strengthClassic = workoutData.strength;
  const perfil = Storage.get('profile');
  try {
    workoutData.strength = perfil ? armarBloques(perfil, await cargarCatalogoEjercicios()) : workoutData.strengthClassic;
  } catch {
    workoutData.strength = workoutData.strengthClassic;   // sin catálogo (sin conexión la primera vez): los de siempre
  }
}

// «En casa» necesita nivel y minutos, que el cuestionario solo pregunta con «En casa» marcado. Sin ellos no se arma
// ningún entreno (no se inventa un nivel: aquí decide la carga). Molestias y zonas son opcionales.
function faltanDatosCasa(perfil) {
  return !perfil || ![1, 2, 3].includes(perfil.level) || !(perfil.minutes > 0);
}

/* ===== Puerta del plan de gimnasio (docs/FUENTES.md, E14: criterio de la app; se apoya en E4, E5 y E12) =====
   Menor de 18, embarazo o algún «sí» del PAR-Q: no se ofrece el plan de 5 días (sí apuntar sesiones a mano).
   Sin perfil o con perfil sin esos factores, el plan se ve como siempre. */
function puertaGym(perfil, hoy = new Date()) {
  if (!perfil) return { cerrada: false, motivos: [] };
  const motivos = [];
  if (perfil.birthDate && edad(perfil.birthDate, hoy) < 18) motivos.push('menor');
  if ((perfil.conditions || []).includes('pregnancy')) motivos.push('embarazo');
  if (riesgoEjercicio(perfil)) motivos.push('parq');
  return { cerrada: motivos.length > 0, motivos };
}

// Texto de la puerta: sin «matrona» para menores; el aviso de embarazo (E5) sigue aparte, en los avisos de Entreno
function textoPuerta(motivos) {
  const quien = motivos.includes('menor') ? 'médico o entrenador' : 'médico, matrona o entrenador';
  return `Por lo que has contestado, no te propongo un plan de gimnasio ya hecho. Antes de elegir ejercicios, coméntalo con tu ${quien}. Puedes apuntar aquí las sesiones que hagas tú.`;
}

/* ===== Modos de entreno (profile.modes): píldoras «Mis modos», estados vacíos y acordeones ===== */
const PILDORAS = [['gym', 'Gimnasio'], ['home', 'En casa']];

// Qué se ve en Entreno: 'sin-perfil' (no hay dónde guardar el modo), 'sin-modos' (perfil que aún no ha elegido) o 'con-modos';
// los modos activos, cuál va abierto (el gimnasio si está) y si hay acordeón (solo con los dos modos)
function vistaEntreno(perfil) {
  if (!perfil) return { estado: 'sin-perfil', modos: [], abierto: null, acordeon: false };
  const modos = modosActivos(perfil);
  return { estado: modos.length ? 'con-modos' : 'sin-modos', modos, abierto: modos.includes('gym') ? 'gym' : (modos[0] ?? null), acordeon: modos.length > 1 };
}

// Al pulsar una píldora: los modos que quedan, o el aviso si no quedaría ninguno (la última activa no se desmarca)
function modosAlPulsar(modos, modo) {
  const quedan = modos.includes(modo) ? modos.filter(m => m !== modo) : MODOS.filter(m => m === modo || modos.includes(m));
  return quedan.length ? { modes: quedan } : { error: 'Tiene que quedar al menos un modo activo' };
}

// «En casa»: sin nivel y minutos no se arma nada (aviso + botón al perfil); con ellos, los bloques del perfil.
// Durante un entreno no se toca nada (aplicarRutina ya lo respeta).
async function renderCasa() {
  const datos = document.getElementById('casaDatos'), entreno = document.getElementById('casaEntreno');
  if (!datos || !entreno || !modosActivos().includes('home')) return;
  const falta = faltanDatosCasa(Storage.get('profile'));
  datos.hidden = !falta;
  entreno.hidden = falta;
  if (falta || workoutActive) return;
  try {
    await loadWorkoutData();
    await aplicarRutina();
    currentBlock = nextBlock();
    await renderWorkoutPhase(currentPhase);
  } catch {
    document.getElementById('exerciseList').textContent = 'No se han podido cargar los ejercicios. Revisa la conexión y vuelve a abrir la app.';
  }
}
document.getElementById('casaCompletar')?.addEventListener('click', () => abrirCuestionario({ nuevo: false, paso: 'Ejercicio' }));

function renderModos(foco) {
  const fila = document.getElementById('modosFila');
  if (!fila) return;
  const $ = id => document.getElementById(id);
  const perfil = Storage.get('profile'), v = vistaEntreno(perfil), estado = $('modosEstado');
  estado.textContent = '';
  // Píldoras (botones con aria-pressed y ✓ en la activa); sin perfil no se ofrecen. La última activa lleva aria-disabled.
  fila.replaceChildren(...(perfil ? PILDORAS : []).map(([m, nombre]) => {
    const activo = v.modos.includes(m), b = document.createElement('button');
    b.type = 'button';
    b.className = 'pildora';
    b.textContent = (activo ? '✓ ' : '') + nombre;
    b.dataset.modo = m;
    b.setAttribute('aria-pressed', String(activo));
    if (activo && v.modos.length === 1) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', () => {
      const r = modosAlPulsar(v.modos, m);
      if (r.error) { estado.textContent = r.error; return; }
      guardarModos(r.modes);
      renderModos(m);
    });
    return b;
  }));
  // Repintar destruye los botones: el foco vuelve a la píldora pulsada (teclado y lector de pantalla)
  if (foco) fila.querySelector(`[data-modo="${foco}"]`)?.focus();
  // Estados vacíos
  $('entrenoVacio').hidden = v.estado === 'con-modos';
  $('entrenoVacioTitulo').textContent = v.estado === 'sin-perfil' ? 'Crea tu perfil para elegir dónde entrenas' : 'Elige dónde entrenas';
  $('entrenoVacioTexto').textContent = v.estado === 'sin-perfil'
    ? 'Tu perfil guarda dónde vas a entrenar: en el gimnasio, en casa o en los dos sitios.'
    : 'Pulsa «Gimnasio» o «En casa» arriba. Puedes activar los dos.';
  $('entrenoCrearPerfil').hidden = v.estado !== 'sin-perfil';
  // Cada modo, a la vista solo si está activo; con los dos, acordeón con el primero abierto; con uno, sin acordeón
  for (const [id, m] of [['modoGym', 'gym'], ['modoCasa', 'home']]) {
    const el = $(id), igual = !el.hidden && el.dataset.acordeon === String(v.acordeon);
    el.hidden = !v.modos.includes(m);
    el.classList.toggle('modo--solo', !v.acordeon);
    // Solo se decide abierto/cerrado al aparecer el modo o cambiar entre acordeón y no: lo que la persona abrió o cerró se respeta
    if (!igual) el.open = !v.acordeon || v.abierto === m;
    el.dataset.acordeon = String(v.acordeon);
  }
  renderCasa();
}
document.getElementById('entrenoCrearPerfil')?.addEventListener('click', () => abrirCuestionario({ nuevo: true }));
