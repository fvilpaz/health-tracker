/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (zonas, bloques) (revisado 29-sep-2026) */
/* Rutina según el perfil: arma los 3 bloques de fuerza con el catálogo data/exercises.json y el objetivo de
   bloques por semana. Sin perfil, o con «Los de siempre», se usan los bloques de data/workouts.json. */

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
  const mayor = perfil.birthDate && edad(perfil.birthDate, hoy) >= 50;
  const suave = mayor || riesgoEjercicio(perfil) || (perfil.conditions || []).includes('pregnancy');
  const nivel = suave ? 1 : (perfil.level || 1);
  const molestias = perfil.avoid || [];
  const validos = catalogo.exercises.filter(e => e.zone !== 'mobility' && e.level <= nivel &&
    !(suave && e.impact === 'high') && !e.avoid.some(a => molestias.includes(a)) &&
    e.equipment.every(m => MATERIAL_EN_CASA.includes(m)));

  // Por zona: primero los del nivel más alto permitido; si hay menos de 3, se completa con el nivel de debajo
  const grupo = {};
  for (const zona of new Set([...ZONAS_BASE, ...(perfil.focus || [])])) {
    const deZona = validos.filter(e => e.zone === zona).sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
    const elegidos = [];
    for (let n = nivel; n >= 1 && elegidos.length < 3; n--) elegidos.push(...deZona.filter(e => e.level === n));
    grupo[zona] = elegidos;
  }
  const huecos = [...ZONAS_BASE, ...(perfil.focus || [])].slice(0, 6);
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
  const seg = blocks[1].exercises.reduce((n, e) => n + e.seconds + e.rest, 0) * rounds + restBetween * (rounds - 1);
  return { duration: Math.round(seg / 60), rounds, rest_between_rounds: restBetween, blocks };
}

/* ===== «Recomendados» o «Los de siempre» ===== */
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
  const recomendados = perfil && Storage.get('trainingMode', 'recommended') !== 'classic';
  try {
    workoutData.strength = recomendados ? armarBloques(perfil, await cargarCatalogoEjercicios()) : workoutData.strengthClassic;
  } catch {
    workoutData.strength = workoutData.strengthClassic;   // sin catálogo (sin conexión la primera vez): los de siempre
  }
  const selector = document.getElementById('rutinaModo');
  if (selector) {
    selector.hidden = !perfil;
    selector.querySelectorAll('button').forEach(b => b.classList.toggle('active', (b.dataset.modo === 'classic') !== !!recomendados));
  }
}

document.querySelectorAll('#rutinaModo button').forEach(b => b.addEventListener('click', async () => {
  if (workoutActive) return showToast('Termina o para el entreno antes de cambiar los bloques');
  Storage.set('trainingMode', b.dataset.modo);
  await aplicarRutina();
  renderWorkoutPhase(currentPhase);
}));
