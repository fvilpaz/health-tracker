/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (campos del perfil, catálogo) (revisado 29-sep-2026) */
/* Perfil: el cuestionario al empezar («Soy nuevo») y «Mi perfil» para cambiarlo. Lo que se elige sale del
   catálogo data/health.json (el código no dice qué enfermedad o medicación tiene nadie); las respuestas se
   guardan SOLO en este navegador ('profile'). De momento se guarda y se enseña; Meds, Nutrición y Entreno lo
   usarán en los pasos siguientes (docs/PLAN.md). */

// Número escrito a la española o a la inglesa («95,6» o «95.6»); vacío → NaN
function numero(texto) {
  const t = String(texto ?? '').trim().replace(',', '.');
  return t === '' ? NaN : Number(t);
}

// Años cumplidos en «hoy» (el día del cumpleaños ya cuenta)
function edad(nacimiento, hoy = new Date()) {
  const [a, m, d] = nacimiento.split('-').map(Number);
  return hoy.getFullYear() - a - ((hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) ? 1 : 0);
}

// Menor de 18: sin metas de peso (eso lo lleva el pediatra)
function esMenor(hoy = new Date()) {
  const p = Storage.get('profile');
  return !!(p && p.birthDate && edad(p.birthDate, hoy) < 18);
}

// Solo entra lo que tiene la forma correcta (el perfil también llega en copias, que pueden venir manipuladas).
// Los ids se comprueban por su forma, no contra el catálogo (que se carga aparte); al pintarlos van con esc().
function limpiarPerfil(p) {
  const perfil = {};
  let descartados = 0;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { perfil, descartados: 1 };
  const texto = max => v => typeof v === 'string' && v.trim().length <= max;
  const entero = (min, max) => v => Number.isInteger(v) && v >= min && v <= max;
  // Fecha que existe de verdad (sin 31 de febrero), comprobada en UTC: en hora local, la medianoche española
  // pasada a UTC era el día anterior y rechazaba todas las fechas
  const fechaNac = v => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v < '1900-01-01' || v > isoDate(new Date())) return false;
    const [a, m, d] = v.split('-').map(Number), f = new Date(Date.UTC(a, m - 1, d));
    return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
  };
  const REGLAS = {
    name: v => texto(40)(v) && v.trim().length > 0, birthDate: fechaNac,
    sex: v => ['male', 'female'].includes(v), goal: v => ['lose', 'maintain', 'strength', 'health'].includes(v),
    conditionsOther: texto(200), medicationsOther: texto(200), dislikes: texto(200),
    level: entero(1, 3), days: entero(1, 7), minutes: entero(5, 120),
    diet: v => ['all', 'no-meat', 'vegetarian', 'vegan'].includes(v),
  };
  const LISTAS = ['conditions', 'medications', 'avoid', 'allergies'];
  for (const [k, v] of Object.entries(p)) {
    if (LISTAS.includes(k)) {
      if (!Array.isArray(v)) { descartados++; continue; }
      const buenas = [...new Set(v.filter(id => typeof id === 'string' && /^[a-z0-9-]{1,30}$/.test(id)))].slice(0, 30);
      descartados += v.length - buenas.length - (v.length - new Set(v).size);   // repetidos no cuentan como error
      perfil[k] = buenas;
    } else if (REGLAS[k] && REGLAS[k](v)) perfil[k] = typeof v === 'string' ? v.trim() : v;
    else descartados++;
  }
  return { perfil, descartados };
}

/* ===== CUESTIONARIO ===== */
let catalogoSalud = null;
async function cargarCatalogoSalud() {
  if (!catalogoSalud) {
    const res = await fetch('data/health.json');
    if (!res.ok) throw new Error('health.json ' + res.status);
    catalogoSalud = await res.json();
  }
  return catalogoSalud;
}

// Grupo de casillas (varias) o de opciones (una), con lo ya elegido marcado
function opciones(nombre, lista, elegidos, tipo = 'checkbox') {
  const marcado = id => (Array.isArray(elegidos) ? elegidos.includes(id) : elegidos === id) ? ' checked' : '';
  return `<div class="chips">${lista.map(o => {
    const id = typeof o === 'object' ? o.id : o, texto = typeof o === 'object' ? o.name : o;
    return `<label class="chip"><input type="${tipo}" name="${nombre}" value="${esc(id)}"${marcado(id)}><span>${esc(texto)}</span></label>`;
  }).join('')}</div>`;
}
const campoTexto = (id, etiqueta, valor, ejemplo, modo = 'text') =>
  `<div class="setup-field"><label for="${id}">${etiqueta}</label><input type="text" id="${id}" inputmode="${modo}" autocomplete="off" placeholder="${esc(ejemplo)}" value="${esc(valor ?? '')}"></div>`;
const grupo = (titulo, html) => `<fieldset class="setup-field setup-grupo"><legend>${titulo}</legend>${html}</fieldset>`;

// nuevo = true: primera vez (con medidas y plan). false: «Mi perfil» (sin medidas: esas van en Progreso).
async function abrirCuestionario({ nuevo }) {
  let cat;
  try { cat = await cargarCatalogoSalud(); } catch { return showToast('No se ha podido cargar el cuestionario. Revisa la conexión.'); }
  const p = { ...Storage.get('profile', {}) };
  const settings = Storage.get('settings', {});
  const overlay = document.createElement('div');
  overlay.id = 'setupOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'perfilTitulo');

  const PASOS = [
    { titulo: 'Tú', html: () =>
      campoTexto('pfNombre', 'Nombre', p.name, 'Ej: Ana') +
      `<div class="setup-field"><label for="pfNacimiento">Fecha de nacimiento</label><input type="date" id="pfNacimiento" value="${esc(p.birthDate ?? '')}"></div>` +
      grupo('Sexo (cambia los límites de riesgo de la cintura y de algunos análisis)', opciones('pfSexo', [{ id: 'male', name: 'Hombre' }, { id: 'female', name: 'Mujer' }], p.sex, 'radio')) +
      campoTexto('pfAltura', 'Altura (cm)', settings.height, 'Ej: 175', 'numeric') },
    { titulo: 'Medidas de hoy', soloNuevo: true, html: () =>
      `<div class="setup-field"><label for="pfInicio">¿Cuándo empiezas? (vacío = hoy)</label><input type="date" id="pfInicio"></div>` +
      campoTexto('pfSemanas', 'Duración del plan (semanas)', '', '12 si lo dejas vacío', 'numeric') +
      campoTexto('pfPeso', 'Peso (kg)', '', 'Ej: 80,5', 'decimal') +
      campoTexto('pfCintura', 'Cintura (cm) — donde va el cinturón', '', 'Ej: 95', 'decimal') +
      campoTexto('pfBarriga', 'Barriga (cm) — por el ombligo (opcional)', '', 'Ej: 105', 'decimal') },
    { titulo: 'Tu objetivo', html: () => {
      const nac = document.getElementById('pfNacimiento')?.value || p.birthDate;
      const menor = nac && edad(nac) < 18;
      return grupo('¿Qué quieres conseguir?', opciones('pfObjetivo', cat.goals.filter(g => !(menor && g.adultsOnly)), p.goal, 'radio')) +
        (menor ? '<p class="setup-note">Con menos de 18 años la app no pone metas de peso: eso lo lleva el pediatra. Sí ejercicio y hábitos.</p>' : '');
    } },
    { titulo: 'Salud', html: () =>
      grupo('¿Tienes alguna de estas? (ninguna es obligatoria)', opciones('pfEnfermedades', cat.conditions, p.conditions ?? [])) +
      campoTexto('pfEnfermedadOtra', 'Otra', p.conditionsOther, 'Escríbela si no está en la lista') +
      grupo('¿Tomas algo de esto?', opciones('pfMedicacion', cat.medications, p.medications ?? [])) +
      campoTexto('pfMedicacionOtra', 'Otra medicación', p.medicationsOther, 'Escríbela si no está en la lista') +
      '<p class="setup-note">Esto se queda en tu móvil: no se envía a ningún sitio.</p>' },
    { titulo: 'Ejercicio', html: () =>
      grupo('¿Cuánto ejercicio haces ahora?', opciones('pfNivel', cat.levels, p.level, 'radio')) +
      grupo('¿Te molesta algo? (si no, déjalo vacío)', opciones('pfMolestias', cat.pains, p.avoid ?? [])) +
      grupo('¿Cuántos días a la semana puedes?', opciones('pfDias', cat.days, p.days, 'radio')) +
      grupo('¿Cuántos minutos cada día?', opciones('pfMinutos', cat.minutes, p.minutes, 'radio')) },
    { titulo: 'Comida', html: () =>
      grupo('¿Cómo comes?', opciones('pfDieta', cat.diets, p.diet, 'radio')) +
      grupo('Alergias o intolerancias', opciones('pfAlergias', cat.allergies, p.allergies ?? [])) +
      campoTexto('pfNoMeGusta', 'Lo que no te gusta', p.dislikes, 'Ej: brócoli, hígado') },
  ].filter(paso => nuevo || !paso.soloNuevo);

  // eslint-disable-next-line no-unsanitized/property -- constantes del código y del catálogo propio; lo del usuario va con esc()
  overlay.innerHTML = `
    <div class="setup-card">
      <button class="setup-close" id="pfCerrar" aria-label="Cerrar">${ICONO.cerrar}</button>
      <h2 class="setup-title" id="perfilTitulo">${nuevo ? 'Empecemos' : 'Mi perfil'}</h2>
      <p class="setup-subtitle" id="pfPasoTitulo"></p>
      <div class="pf-barra" aria-hidden="true"><div id="pfBarra"></div></div>
      ${PASOS.map((paso, i) => `<div class="pf-paso" data-paso="${i}" hidden>${paso.html()}</div>`).join('')}
      <div class="pf-botones">
        <button class="btn btn-full setup-cancel" id="pfAtras">Atrás</button>
        <button class="btn btn-green btn-full" id="pfSiguiente">Siguiente</button>
      </div>
      ${nuevo ? '<button class="btn btn-full setup-cancel" id="pfLuego">Cancelar, ya lo configuro luego</button>' : ''}
    </div>`;
  document.body.appendChild(overlay);

  const $ = id => document.getElementById(id);
  const elegido = nombre => overlay.querySelector(`input[name="${nombre}"]:checked`)?.value;
  const elegidos = nombre => [...overlay.querySelectorAll(`input[name="${nombre}"]:checked`)].map(i => i.value);

  // Lee y comprueba el paso «i»: devuelve el aviso si falta algo (y no se avanza)
  function leerPaso(i) {
    const t = PASOS[i].titulo;
    if (t === 'Tú') {
      p.name = $('pfNombre').value.trim();
      p.birthDate = $('pfNacimiento').value;
      p.sex = elegido('pfSexo');
      if (!p.name || p.name.length > 40) return 'Pon tu nombre (hasta 40 letras)';
      if (!p.birthDate || limpiarPerfil({ birthDate: p.birthDate }).descartados) return 'Pon tu fecha de nacimiento';
      if (!p.sex) return 'Elige hombre o mujer';
      if (!medidaValida('height', numero($('pfAltura').value))) return '';
    }
    if (t === 'Medidas de hoy') {
      const semanas = $('pfSemanas').value.trim() === '' ? 12 : numero($('pfSemanas').value);
      if (!Number.isInteger(semanas) || semanas < 4 || semanas > 24) return 'El plan tiene que durar entre 4 y 24 semanas';
      if (!medidaValida('weight', numero($('pfPeso').value)) || !medidaValida('waist', numero($('pfCintura').value))) return '';
      if ($('pfBarriga').value.trim() && !medidaValida('belly', numero($('pfBarriga').value))) return '';
    }
    if (t === 'Tu objetivo') { p.goal = elegido('pfObjetivo'); if (!p.goal) return 'Elige un objetivo'; }
    if (t === 'Salud') {
      p.conditions = elegidos('pfEnfermedades'); p.conditionsOther = $('pfEnfermedadOtra').value.trim().slice(0, 200);
      p.medications = elegidos('pfMedicacion'); p.medicationsOther = $('pfMedicacionOtra').value.trim().slice(0, 200);
    }
    if (t === 'Ejercicio') {
      p.level = Number(elegido('pfNivel')); p.avoid = elegidos('pfMolestias');
      p.days = Number(elegido('pfDias')); p.minutes = Number(elegido('pfMinutos'));
      if (!p.level) return 'Elige cuánto ejercicio haces ahora';
      if (!p.days || !p.minutes) return 'Elige días y minutos';
    }
    if (t === 'Comida') {
      p.diet = elegido('pfDieta'); p.allergies = elegidos('pfAlergias'); p.dislikes = $('pfNoMeGusta').value.trim().slice(0, 200);
      if (!p.diet) return 'Elige cómo comes';
    }
    return null;
  }

  let actual = 0;
  function mostrar(i) {
    actual = i;
    // eslint-disable-next-line no-unsanitized/property -- catálogo propio; lo del usuario va con esc()
    if (PASOS[i].titulo === 'Tu objetivo') overlay.querySelector(`[data-paso="${i}"]`).innerHTML = PASOS[i].html();   // según la edad recién puesta
    overlay.querySelectorAll('.pf-paso').forEach(d => { d.hidden = Number(d.dataset.paso) !== i; });
    $('pfPasoTitulo').textContent = `${i + 1} de ${PASOS.length} · ${PASOS[i].titulo}`;
    $('pfBarra').style.width = `${((i + 1) / PASOS.length) * 100}%`;
    $('pfAtras').hidden = i === 0;
    $('pfSiguiente').textContent = i < PASOS.length - 1 ? 'Siguiente' : (nuevo ? 'Empezar' : 'Guardar');
    overlay.scrollTop = 0;
  }

  function guardar() {
    const { perfil } = limpiarPerfil(p);
    Storage.set('profile', perfil);
    const altura = numero($('pfAltura').value), menor = edad(perfil.birthDate) < 18;
    if (nuevo) {
      const hoy = isoDate(new Date());
      guardarConfiguracion({
        date: $('pfInicio').value || hoy, weeks: $('pfSemanas').value.trim() === '' ? 12 : numero($('pfSemanas').value),
        weight: numero($('pfPeso').value), waist: numero($('pfCintura').value), height: altura, menor, objetivo: perfil.goal,
        belly: $('pfBarriga').value.trim() ? numero($('pfBarriga').value) : undefined,
      });
    } else {
      const s = { ...Storage.get('settings', {}), height: altura };
      if (menor) delete s.goalWeight;   // si la fecha dice que es menor, fuera la meta de peso
      Storage.set('settings', s);
    }
    overlay.remove();
    if (nuevo) initApp(); else { updateDashboard(); showToast('Perfil guardado ✓'); }
  }

  $('pfSiguiente').addEventListener('click', () => {
    const aviso = leerPaso(actual);
    if (aviso !== null) { if (aviso) showToast(aviso); return; }
    if (actual < PASOS.length - 1) mostrar(actual + 1); else guardar();
  });
  $('pfAtras').addEventListener('click', () => { leerPaso(actual); mostrar(actual - 1); });
  const cerrar = () => { overlay.remove(); if (nuevo) initApp(); };
  $('pfCerrar').addEventListener('click', cerrar);
  $('pfLuego')?.addEventListener('click', cerrar);
  mostrar(0);
  $('pfNombre').focus({ preventScroll: true });
}

document.getElementById('perfilBtn')?.addEventListener('click', () => abrirCuestionario({ nuevo: false }));
