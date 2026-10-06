/* Entreno según el perfil: el mínimo de sesiones por semana (los días del perfil) y los avisos de salud. */

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
