/* Constructor del plan del gimnasio: el plan (semanas → días → ejercicios) se edita desde la pantalla de Entreno y se guarda en
   'gymPlan' (mismo formato que data/plan.json). Sin plan guardado se sigue usando data/plan.json. Las operaciones no tocan el plan
   que reciben: devuelven { plan } nuevo o { error }. Las sesiones guardadas no cambian (guardan fecha y nombres, no el plan). */
const MAX_SEMANAS = 52, MAX_DIAS_SEMANA = 7, MAX_EJERCICIOS_DIA = 20, MAX_NOMBRE_EJERCICIO = 80, MAX_NOMBRE_PLAN = 60;

// El plan rehecho solo con sus campos y sus límites, o null si no vale. Se usa al leer el almacén y al importar una copia.
function limpiarPlan(p) {
  const entero = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  if (!esTexto(p.plan, MAX_NOMBRE_PLAN) || !p.plan.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(p.inicio) || isNaN(new Date(p.inicio + 'T00:00:00'))) return null;
  if (!entero(p.sets, 1, 10) || !entero(p.reps, 1, 100) || !entero(p.rest, 10, 600)) return null;
  if (!Array.isArray(p.weeks) || p.weeks.length < 1 || p.weeks.length > MAX_SEMANAS) return null;
  const weeks = [];
  for (const s of p.weeks) {
    if (!s || !Array.isArray(s.days) || s.days.length > MAX_DIAS_SEMANA) return null;
    const days = [];
    for (const [i, d] of s.days.entries()) {
      if (!d || d.id !== String(i + 1) || !Array.isArray(d.exercises) || d.exercises.length > MAX_EJERCICIOS_DIA) return null;
      const ids = new Set(), nombres = new Set(), exercises = [];
      for (const e of d.exercises) {
        if (!e || !esTexto(e.name, MAX_NOMBRE_EJERCICIO) || !e.name.trim() || typeof e.id !== 'string' || !/^[\w-]{1,30}$/.test(e.id)) return null;
        if (ids.has(e.id) || nombres.has(e.name.trim())) return null;
        if (e.ref !== undefined && !(typeof e.ref === 'string' && /^[a-z0-9]{1,12}$/.test(e.ref))) return null;
        if (e.sets !== undefined && !entero(e.sets, 1, 10)) return null;
        ids.add(e.id); nombres.add(e.name.trim());
        exercises.push({ id: e.id, ...(e.ref && { ref: e.ref }), name: e.name.trim(), ...(e.sets && { sets: e.sets }) });
      }
      days.push({ id: d.id, exercises });
    }
    weeks.push({ days });
  }
  return { plan: p.plan.trim(), inicio: p.inicio, sets: p.sets, reps: p.reps, rest: p.rest, weeks };
}

const copiaPlan = plan => JSON.parse(JSON.stringify(plan));   // lo de dentro de una «página» y de fuera no comparten objetos: se copia por JSON

// Plan vacío: N semanas sin días, que se llenan desde la pantalla (3 series × 12 repeticiones y 60 s, como la app del gimnasio)
function planNuevo(nombre, semanas, inicio) {
  const texto = String(nombre ?? '').trim(), n = Number(semanas);
  if (!texto) return { error: 'Ponle un nombre al plan' };
  if (texto.length > MAX_NOMBRE_PLAN) return { error: `El nombre, hasta ${MAX_NOMBRE_PLAN} letras` };
  if (!Number.isInteger(n) || n < 1 || n > MAX_SEMANAS) return { error: `Las semanas, de 1 a ${MAX_SEMANAS}` };
  return { plan: { plan: texto, inicio, sets: 3, reps: 12, rest: 60, weeks: Array.from({ length: n }, () => ({ days: [] })) } };
}

function planConDia(plan, semana) {
  const copia = copiaPlan(plan), dias = copia.weeks[semana - 1]?.days;
  if (!dias) return { error: 'Esa semana no existe' };
  if (dias.length >= MAX_DIAS_SEMANA) return { error: `Como mucho ${MAX_DIAS_SEMANA} días por semana` };
  dias.push({ id: String(dias.length + 1), exercises: [] });
  return { plan: copia };
}

// Quita un día y renumera los siguientes (los días son siempre 1, 2, 3…)
function planSinDia(plan, semana, dia) {
  const copia = copiaPlan(plan), s = copia.weeks[semana - 1];
  if (!s || !s.days.some(d => d.id === dia)) return { error: 'Ese día no existe' };
  s.days = s.days.filter(d => d.id !== dia).map((d, i) => ({ ...d, id: String(i + 1) }));
  return { plan: copia };
}

function planConEjercicio(plan, semana, dia, { name, ref }) {
  const nombre = String(name ?? '').trim();
  if (!nombre) return { error: 'Elige un ejercicio de la lista o escribe uno' };
  if (nombre.length > MAX_NOMBRE_EJERCICIO) return { error: `El nombre, hasta ${MAX_NOMBRE_EJERCICIO} letras` };
  const copia = copiaPlan(plan), d = copia.weeks[semana - 1]?.days.find(x => x.id === dia);
  if (!d) return { error: 'Ese día no existe' };
  if (d.exercises.length >= MAX_EJERCICIOS_DIA) return { error: `Como mucho ${MAX_EJERCICIOS_DIA} ejercicios por día` };
  if (d.exercises.some(e => e.name === nombre)) return { error: 'Ese ejercicio ya está en este día' };
  const usados = new Set(d.exercises.map(e => e.id));
  let n = d.exercises.length + 1;
  while (usados.has(`s${semana}d${dia}e${n}`)) n++;
  d.exercises.push({ id: `s${semana}d${dia}e${n}`, ...(ref && { ref }), name: nombre });
  return { plan: copia };
}

function planSinEjercicio(plan, semana, dia, id) {
  const copia = copiaPlan(plan), d = copia.weeks[semana - 1]?.days.find(x => x.id === dia);
  if (!d || !d.exercises.some(e => e.id === id)) return { error: 'Ese ejercicio no está' };
  d.exercises = d.exercises.filter(e => e.id !== id);
  return { plan: copia };
}

// La lista del «select»: cada nombre una vez (con su ficha, si la tiene), por orden alfabético
function listaParaSelect(...listas) {
  const porNombre = new Map();
  for (const e of listas.flat()) if (e && typeof e.name === 'string' && e.name.trim() && !porNombre.has(e.name.trim())) porNombre.set(e.name.trim(), { name: e.name.trim(), ...(e.ref && { ref: e.ref }) });
  return [...porNombre.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/* ===== PANTALLA ===== */
let consSemana = 0, consDia = '1', consAviso = '', consConfirmaNuevo = false, catalogoViejo = null, consNombreNuevo = '', consSemanasNuevo = '8';

// El plan que se edita: el guardado o, si aún no hay, data/plan.json (la primera edición lo guarda)
async function planEditable() {
  const guardado = limpiarPlan(Storage.get('gymPlan'));
  if (guardado) return guardado;
  const res = await fetch('data/plan.json');
  if (!res.ok) throw new Error('plan.json ' + res.status);
  const plan = limpiarPlan(await res.json());
  if (!plan) throw new Error('plan.json mal formado');
  return plan;
}

// Los ejercicios del plan anterior (data/gym.json) alimentan la lista, junto con los del plan actual
async function ejerciciosDelPlanViejo() {
  if (!catalogoViejo) {
    try {
      const res = await fetch('data/gym.json');
      catalogoViejo = res.ok ? (await res.json()).days.flatMap(d => d.exercises) : [];
    } catch { catalogoViejo = []; }
  }
  return catalogoViejo;
}

function guardarPlanGym(plan) {
  Storage.set('gymPlan', plan);
  planGym = null;   // que el próximo renderGym vuelva a leer el plan
  renderGym();
  pintarConstructor(true);
}

async function pintarConstructor(enfocar = false) {
  const zona = document.getElementById('gymConstructor');
  if (!zona || zona.hidden) return;
  let plan, viejos;
  try { [plan, viejos] = await Promise.all([planEditable(), ejerciciosDelPlanViejo()]); } catch { zona.textContent = 'No se ha podido cargar el plan. Revisa la conexión.'; return; }
  const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto !== undefined) x.textContent = texto; return x; };
  const semana = Math.min(Math.max(consSemana || diasDelPlan(plan).semana, 1), plan.weeks.length);
  consSemana = semana;
  const dias = plan.weeks[semana - 1].days;
  if (!dias.some(d => d.id === consDia)) consDia = dias[0]?.id || '';
  const dia = dias.find(d => d.id === consDia);
  const aplicar = r => { if (r.error) { consAviso = r.error; pintarConstructor(); } else { consAviso = ''; guardarPlanGym(r.plan); } };
  const boton = (texto, clase, alPulsar) => { const b = el('button', clase, texto); b.type = 'button'; b.addEventListener('click', alPulsar); return b; };

  const cab = el('div', 'cons-cab');
  cab.append(el('strong', '', plan.plan), el('span', 'cons-sub', `${plan.weeks.length} semanas`));
  const selSemana = el('select', 'cons-select'), etSemana = el('label', 'cons-campo', 'Semana ');
  selSemana.setAttribute('aria-label', 'Semana del plan');
  plan.weeks.forEach((s, i) => { const o = el('option', '', `Semana ${i + 1}${s.days.length ? '' : ' (vacía)'}`); o.value = String(i + 1); o.selected = i + 1 === semana; selSemana.append(o); });
  selSemana.addEventListener('change', () => { consSemana = Number(selSemana.value); consDia = '1'; consAviso = ''; pintarConstructor(); });
  etSemana.append(selSemana);

  const barraDias = el('div', 'cons-dias');
  for (const d of dias) barraDias.append(boton(`Día ${d.id}`, 'gym-dia' + (d.id === consDia ? ' active' : ''), () => { consDia = d.id; pintarConstructor(); }));
  barraDias.append(boton('+ Día', 'gym-dia', () => { const r = planConDia(plan, semana); if (!r.error) consDia = String(dias.length + 1); aplicar(r); }));

  const cuerpo = el('div', 'cons-dia');
  if (!dia) cuerpo.append(el('p', 'meta-aviso', 'Esta semana no tiene días. Pulsa «+ Día» para empezar.'));
  else {
    const lista = el('ol', 'cons-lista');
    if (!dia.exercises.length) lista.append(el('li', 'meta-aviso', 'Este día aún no tiene ejercicios: elige uno de la lista y pulsa «+ Añadir».'));
    for (const e of dia.exercises) {
      const fila = el('li', 'cons-fila');
      fila.append(el('span', 'cons-nombre', e.name), boton('Quitar', 'cons-quitar', () => aplicar(planSinEjercicio(plan, semana, dia.id, e.id))));
      fila.lastChild.setAttribute('aria-label', `Quitar ${e.name}`);
      lista.append(fila);
    }
    const catalogo = listaParaSelect(viejos, plan.weeks.flatMap(s => s.days.flatMap(d => d.exercises)));
    const sel = el('select', 'cons-select'), vacio = el('option', '', 'Elige un ejercicio…');
    sel.id = 'consCatalogo'; sel.setAttribute('aria-label', 'Ejercicio a añadir'); vacio.value = '';
    sel.append(vacio, ...catalogo.map(c => { const o = el('option', '', c.name); o.value = c.name; return o; }));
    const fila1 = el('div', 'cons-anadir');
    fila1.append(sel, boton('+ Añadir', 'btn btn-green cons-mas', () => aplicar(planConEjercicio(plan, semana, dia.id, { name: sel.value, ref: catalogo.find(c => c.name === sel.value)?.ref }))));
    const texto = el('input', 'cons-texto'), fila2 = el('div', 'cons-anadir');
    texto.type = 'text'; texto.maxLength = MAX_NOMBRE_EJERCICIO; texto.placeholder = 'O escribe uno nuevo'; texto.setAttribute('aria-label', 'Escribe un ejercicio nuevo');
    fila2.append(texto, boton('+ Añadir', 'btn cons-mas', () => aplicar(planConEjercicio(plan, semana, dia.id, { name: texto.value }))));
    cuerpo.append(lista, fila1, fila2, boton('Quitar este día', 'cons-quitar-dia', () => { const r = planSinDia(plan, semana, dia.id); if (!r.error) consDia = '1'; aplicar(r); }));
  }
  const aviso = el('p', 'meta-aviso', consAviso);
  aviso.setAttribute('role', 'status');

  const nuevo = el('div', 'cons-nuevo'), nombre = el('input', 'cons-texto'), semanasN = el('input', 'cons-num');
  // Lo escrito se guarda al teclear: al pedir confirmación la pantalla se repinta y, sin esto, los campos volvían a «8» y vacío
  nombre.type = 'text'; nombre.maxLength = MAX_NOMBRE_PLAN; nombre.placeholder = 'Nombre del plan nuevo'; nombre.setAttribute('aria-label', 'Nombre del plan nuevo');
  nombre.value = consNombreNuevo; nombre.addEventListener('input', () => { consNombreNuevo = nombre.value; });
  semanasN.type = 'number'; semanasN.min = '1'; semanasN.max = String(MAX_SEMANAS); semanasN.setAttribute('aria-label', 'Semanas del plan nuevo');
  semanasN.value = consSemanasNuevo; semanasN.addEventListener('input', () => { consSemanasNuevo = semanasN.value; });
  const crear = boton(consConfirmaNuevo ? 'Seguro: sustituye el plan que ves. Pulsa otra vez' : 'Crear plan nuevo', 'cons-quitar-dia', () => {
    const r = planNuevo(consNombreNuevo, consSemanasNuevo, isoDate(getWeekStart(new Date())));
    if (r.error) { consConfirmaNuevo = false; return aplicar(r); }
    if (!consConfirmaNuevo) { consConfirmaNuevo = true; consAviso = 'Tus sesiones ya apuntadas no se tocan; solo cambia el plan.'; return pintarConstructor(); }
    consConfirmaNuevo = false; consSemana = 1; consDia = '1'; consNombreNuevo = ''; consSemanasNuevo = '8';
    aplicar(r);
  });
  nuevo.append(nombre, semanasN, crear);

  zona.replaceChildren(cab, etSemana, barraDias, cuerpo, aviso, nuevo);
  if (enfocar) zona.querySelector('#consCatalogo')?.focus();
}

document.getElementById('gymEditarBtn')?.addEventListener('click', () => {
  const zona = document.getElementById('gymConstructor'), btn = document.getElementById('gymEditarBtn');
  zona.hidden = !zona.hidden;
  btn.setAttribute('aria-expanded', String(!zona.hidden));
  btn.textContent = zona.hidden ? 'Editar plan' : 'Cerrar editor';
  consAviso = ''; consConfirmaNuevo = false;
  pintarConstructor();
});

/* ===== PAUSA DEL RELOJ ===== */
// El tiempo del reloj universal de «Descanso entre series» (plan.rest, de 10 a 600 s): se cambia con el lápiz y vale para todos los ejercicios
function planConPausa(plan, segundos) {
  if (!Number.isInteger(segundos) || segundos < 10 || segundos > 600) return { error: 'La pausa, de 10 a 600 segundos' };
  const copia = copiaPlan(plan);
  copia.rest = segundos;
  return { plan: copia };
}

document.getElementById('gymPausaEditar')?.addEventListener('click', () => {
  const editor = document.getElementById('gymPausaEditor'), boton = document.getElementById('gymPausaEditar'), num = document.getElementById('gymPausaNum');
  editor.hidden = !editor.hidden;
  boton.setAttribute('aria-expanded', String(!editor.hidden));
  if (!editor.hidden) { num.value = planGym?.rest ?? 60; num.focus(); }
});

document.getElementById('gymPausaGuardar')?.addEventListener('click', async () => {
  let plan;
  try { plan = await planEditable(); } catch { return avisarReloj('gymRelojAviso', 'No se ha podido cargar el plan'); }
  const r = planConPausa(plan, Number(document.getElementById('gymPausaNum').value));
  if (r.error) return avisarReloj('gymRelojAviso', r.error);
  document.getElementById('gymPausaEditor').hidden = true;
  document.getElementById('gymPausaEditar').setAttribute('aria-expanded', 'false');
  guardarPlanGym(r.plan);
  showToast(`Descanso: ${r.plan.rest} s`);
});
