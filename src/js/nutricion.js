/* eslint-disable security/detect-object-injection -- las claves son nombres del propio catálogo (dietas, alergias, momentos) (revisado 29-sep-2026) */
/* Nutrición según el perfil: ideas de comidas, «Alimentos OK», «Limitar» y consejos, desde data/nutrition.json.
   Las reglas y sus fuentes están en docs/FUENTES.md (A1…A7). Sin perfil se ve todo, como antes. */

// Texto sin tildes ni mayúsculas, para comparar «Brócoli» con «brocoli»
const sinTildes = t => t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Menú para «perfil»: quita lo que choca con su dieta, sus alergias y lo que escribió en «Lo que no te gusta»
// (palabras separadas por comas o «y»: «queso, chorizo y brócoli»), y elige 3 ideas por comida, que rotan cada día
function menuDelPerfil(perfil, cat, hoy = new Date()) {
  const fuera = new Set([...(cat.diets[perfil?.diet] || []), ...(perfil?.allergies || []).flatMap(a => cat.allergies[a] || [])]);
  const noGusta = sinTildes(perfil?.dislikes || '').split(/,|\sy\s/).map(p => p.trim()).filter(p => p.length >= 3);
  const vale = m => !m.contains.some(c => fuera.has(c)) && !noGusta.some(p => sinTildes(m.name).includes(p));
  const dia = Math.floor(hoy.getTime() / 864e5);
  const comidas = {}, todas = {};
  for (const momento of Object.keys(cat.slots)) {
    const lista = cat.meals.filter(m => m.slot === momento && vale(m));
    todas[momento] = lista.map(m => m.name);   // «Ver todas»
    comidas[momento] = [...new Set([0, 1, 2].map(k => lista[(dia + k) % lista.length]?.name).filter(Boolean))];
  }
  const aplica = a => (!a.when && !a.diets) || (a.when && seVe(a.when, perfil)) || (a.diets && (!perfil || a.diets.includes(perfil.diet)));
  return {
    comidas, todas,
    ok: cat.good.filter(vale).map(g => g.name),
    limitar: cat.limit.filter(l => !l.when || seVe(l.when, perfil)).map(l => l.name),
    consejos: cat.advice.filter(aplica),
  };
}

let catalogoComida = null;
async function renderNutricion() {
  const caja = document.getElementById('comidasIdeas');
  if (!caja) return;
  try {
    if (!catalogoComida) {
      const res = await fetch('data/nutrition.json');
      if (!res.ok) throw new Error('nutrition.json ' + res.status);
      catalogoComida = await res.json();
    }
  } catch { caja.textContent = 'No se han podido cargar las comidas. Revisa la conexión y vuelve a abrir la app.'; return; }
  const menu = menuDelPerfil(Storage.get('profile'), catalogoComida);
  const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto) e.textContent = texto; return e; };

  caja.replaceChildren(...Object.entries(menu.comidas).map(([momento, lista]) => {
    const tarjeta = el('div', 'meal-card');
    const ul = el('ul', 'meal-items');
    ul.append(...lista.map(n => el('li', '', n)));
    tarjeta.append(el('div', 'meal-title', catalogoComida.slots[momento]), ul);
    // «Ver todas»: todas las que valen para este perfil, no solo las 3 de hoy
    const todas = menu.todas[momento];
    if (todas.length > lista.length) {
      const mas = el('details', 'meal-todas');
      const lista2 = el('ul', 'meal-items');
      lista2.append(...todas.map(n => el('li', '', n)));
      mas.append(el('summary', '', `Ver todas (${todas.length})`), lista2);
      tarjeta.append(mas);
    }
    return tarjeta;
  }));
  document.getElementById('comidasOk')?.replaceChildren(...menu.ok.map(n => el('div', 'food-tag good', n)));
  document.getElementById('comidasLimitar')?.replaceChildren(...menu.limitar.map(n => el('div', 'food-tag limit', n)));
  document.getElementById('comidasConsejos')?.replaceChildren(...menu.consejos.map(c => {
    const bloque = el('div', 'meal-card');
    const ul = el('ul', 'meal-items');
    ul.append(...c.lines.map(l => el('li', '', l)));
    if (c.title) bloque.append(el('div', 'meal-title', c.title));   // las generales (A1) van sin título
    bloque.append(ul);
    return bloque;
  }));
}
