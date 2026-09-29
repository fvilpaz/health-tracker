/* Logros: qué hay que conseguir y cuáles están desbloqueados. Se movió tal cual desde app.js (28-sep-2026). */

/* ===== LOGROS ===== */
const LOGROS_DEF = [
  { id: 'first_train', icon: duo('bandera'), name: 'Primer entreno', desc: 'Completa tu primer entrenamiento', check: () => getSessions().length >= 1 },
  { id: 'week', icon: duo('llama'), name: 'Semana cumplida', desc: '3 bloques en una semana', check: () => completedWeeks() >= 1 },
  { id: 'kg1', icon: duo('balanza'), name: '1 kg perdido', desc: 'Primer kilo perdido', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 1; } },
  { id: 'kg3', icon: duo('balanza'), name: '3 kg perdidos', desc: '3 kilos menos', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 3; } },
  { id: 'month', icon: duo('semana'), name: 'Primer mes', desc: '4 semanas cumplidas', check: () => completedWeeks() >= 4 },
  { id: 'kg5', icon: duo('trofeo'), name: '5 kg perdidos', desc: '5 kilos menos', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 5; } },
  { id: 'kg7', icon: duo('trofeo'), name: '7 kg perdidos', desc: '7 kilos menos', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 7; } },
  { id: 'kg10', icon: duo('confeti'), name: '10 kg perdidos', desc: '10 kilos menos', check: () => { const w = Storage.get('weights', []); return w.length >= 2 && (w[0].weight - w[w.length - 1].weight) >= 10; } },
  { id: 'goal', icon: duo('diana'), name: 'Peso objetivo', desc: 'Llegas a tu peso objetivo', check: () => { const w = Storage.get('weights', []); const g = Storage.get('settings', {}).goalWeight; return w.length && g && w[w.length - 1].weight <= g; } },
  { id: 'waist1', icon: duo('regla'), name: '1 cm menos', desc: 'Primer cm de cintura perdido', check: () => { const w = Storage.get('waists', []); return w.length >= 2 && (w[0].waist - w[w.length - 1].waist) >= 1; } },
  { id: 'waist5', icon: duo('regla'), name: '5 cm menos', desc: '5 cm menos de cintura', check: () => { const w = Storage.get('waists', []); return w.length >= 2 && (w[0].waist - w[w.length - 1].waist) >= 5; } },
  { id: 'waist10', icon: duo('trofeo'), name: '10 cm menos', desc: '10 cm menos de cintura', check: () => { const w = Storage.get('waists', []); return w.length >= 2 && (w[0].waist - w[w.length - 1].waist) >= 10; } },
  { id: 'whtr', icon: duo('corazon'), name: 'Ratio saludable', desc: 'Cintura/altura < 0.5', check: () => { const w = Storage.get('waists', []); const h = getHeightCm(); return w.length && h && Math.round(w[w.length - 1].waist / h * 100) / 100 < 0.5; } }   // redondeado como en el panel
];

function checkLogros() {
  const unlocked = Storage.get('logros', []);
  const grid = document.getElementById('logrosGrid');
  if (!grid) return;

  grid.innerHTML = '';
  LOGROS_DEF.forEach(l => {
    const isUnlocked = unlocked.includes(l.id) || l.check();
    if (isUnlocked && !unlocked.includes(l.id)) {
      unlocked.push(l.id);
      Storage.set('logros', unlocked);
    }
    const div = document.createElement('div');
    div.className = `logro ${isUnlocked ? 'unlocked' : ''}`;
    // eslint-disable-next-line no-unsanitized/property -- solo constantes e iconos del propio código
    div.innerHTML = `<div class="logro-icon">${l.icon}</div><div class="logro-name">${l.name}${isUnlocked ? '' : '<span class="solo-lector"> (bloqueado)</span>'}</div><div class="logro-desc">${l.desc}</div>`;
    grid.appendChild(div);
  });
}
