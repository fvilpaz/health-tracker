/* eslint-disable security/detect-object-injection -- las claves son fechas hechas por isoDate() o ya validadas en limpiarCopia (revisado 29-sep-2026) */
/* Hábitos diarios: cuatro casillas por día. Se guardan en 'habits' como { 'AAAA-MM-DD': ['agua', …] }.
   Cada meta tiene su fuente en docs/FUENTES.md (H1–H4). */
const HABITOS = [
  { id: 'agua', nombre: 'Agua', meta: 'agua como bebida, a lo largo del día' },    // H1
  { id: 'pasos', nombre: 'Pasos', meta: '30 min andando' },                        // H2
  { id: 'verdura', nombre: 'Verdura', meta: '3 raciones o más' },                  // H3
  { id: 'sueno', nombre: 'Sueño', meta: '7 h o más (de 13 a 17 años: 8–10 h)' },  // H4
];

const habitosDe = fecha => { const d = Storage.get('habits', {})[fecha]; return Array.isArray(d) ? d : []; };

// Marca o desmarca un hábito ese día (por defecto, hoy). Siempre en el orden de HABITOS y sin repetir.
function marcarHabito(id, fecha = isoDate(new Date())) {
  if (!HABITOS.some(h => h.id === id)) return;
  const todos = Storage.get('habits', {});
  const dia = habitosDe(fecha);
  todos[fecha] = dia.includes(id) ? dia.filter(x => x !== id) : HABITOS.map(h => h.id).filter(x => x === id || dia.includes(x));
  Storage.set('habits', todos);
}

function renderHabitos() {
  const caja = document.getElementById('habitosHoy');
  if (!caja) return;
  const hoy = habitosDe(isoDate(new Date()));
  caja.replaceChildren(...HABITOS.map(h => {
    const fila = document.createElement('label');
    fila.className = 'habito';
    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    casilla.checked = hoy.includes(h.id);
    casilla.addEventListener('change', () => { marcarHabito(h.id); renderHabitos(); });
    const nombre = document.createElement('span');
    nombre.className = 'habito-nombre';
    nombre.textContent = h.nombre;
    const meta = document.createElement('span');
    meta.className = 'habito-meta';
    meta.textContent = h.meta;
    fila.append(casilla, nombre, meta);
    return fila;
  }));
  const cuenta = document.getElementById('habitosCuenta');
  if (cuenta) cuenta.textContent = `${hoy.length}/${HABITOS.length}`;
}
