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
