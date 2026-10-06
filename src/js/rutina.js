/* Entreno según el perfil: el mínimo de sesiones por semana (los días del perfil), los avisos de salud y qué modos
   (Gimnasio / En casa) se ven en la pestaña Entreno. */

// Sesiones mínimas por semana: los días que la persona dijo en su perfil; sin perfil, 3 (lo de siempre)
function objetivoSemana() {
  return Storage.get('profile', {}).days || 3;
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
}
document.getElementById('entrenoCrearPerfil')?.addEventListener('click', () => abrirCuestionario({ nuevo: true }));
