/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (zonas, bloques) (revisado 29-sep-2026) */
/* Rutina según el perfil: arma los 3 bloques de fuerza con el catálogo data/exercises.json y el objetivo de
   bloques por semana. Sin perfil se usan los bloques de data/workouts.json. */

// Bloques por semana: los días que la persona dijo en su perfil; sin perfil, 3 (lo de siempre)
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

/* ===== Bloques del perfil (o los de siempre si no hay perfil) ===== */
let catalogoEjercicios = null;
async function cargarCatalogoEjercicios() {
  if (!catalogoEjercicios) {
    const res = await fetch('data/exercises.json');
    if (!res.ok) throw new Error('exercises.json ' + res.status);
    catalogoEjercicios = await res.json();
  }
  return catalogoEjercicios;
}

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
