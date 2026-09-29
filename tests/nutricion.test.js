/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 29-sep-2026) */
/* eslint-disable security/detect-object-injection -- claves del propio catálogo (momentos, dietas, alergias) (revisado 29-sep-2026) */
// Tests de la comida según el perfil (js/nutricion.js + data/nutrition.json). Perfiles inventados.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { crearApp } = require('./entorno.js');

const leer = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', f), 'utf8'));
const cat = leer('nutrition.json'), salud = leer('health.json');
const hoy = new Date(2026, 8, 29);
const plano = x => JSON.parse(JSON.stringify(x));
const app = crearApp();
const menu = p => plano(app.get('menuDelPerfil')(p, cat, hoy));
const lleva = nombre => [...cat.meals, ...cat.good].find(m => m.name === nombre).contains;

test('vegano: nada de carne, pescado, marisco, huevo ni lácteos (comidas y «Alimentos OK»)', () => {
  const m = menu({ diet: 'vegan' });
  const nombres = [...Object.values(m.comidas).flat(), ...m.ok];
  for (const n of nombres) assert.deepEqual(lleva(n).filter(c => ['meat', 'fish', 'shellfish', 'egg', 'dairy'].includes(c)), [], n);
});

test('vegetariano sin carne ni pescado (huevo y lácteos sí); «sin carne» deja el pescado', () => {
  for (const n of Object.values(menu({ diet: 'vegetarian' }).comidas).flat()) assert.ok(!lleva(n).some(c => ['meat', 'fish', 'shellfish'].includes(c)), n);
  const sinCarne = Object.values(menu({ diet: 'no-meat' }).comidas).flat();
  assert.ok(sinCarne.every(n => !lleva(n).includes('meat')));
});

test('alergias: la comida con ese ingrediente no sale (lactosa → nada de lácteos)', () => {
  for (const [alergia, ingredientes] of Object.entries(cat.allergies)) {
    for (const n of Object.values(menu({ diet: 'all', allergies: [alergia] }).comidas).flat()) assert.ok(!lleva(n).some(c => ingredientes.includes(c)), `${alergia}: ${n}`);
  }
});

test('nadie se queda sin opciones: cada dieta con cada alergia tiene al menos 2 ideas por comida', () => {
  for (const dieta of Object.keys(cat.diets)) for (const alergia of [null, ...Object.keys(cat.allergies)]) {
    const comidas = menu({ diet: dieta, allergies: alergia ? [alergia] : [] }).comidas;
    for (const [momento, lista] of Object.entries(comidas)) assert.ok(lista.length >= 2, `${dieta} + ${alergia}: ${momento}`);
  }
});

test('consejos según el perfil, cada uno con su regla de docs/FUENTES.md', () => {
  const reglas = p => menu(p).consejos.map(c => c.rule);
  assert.deepEqual(reglas({ diet: 'all', conditions: [] }), ['A1']);
  assert.deepEqual(reglas({ diet: 'all', conditions: ['diabetes2', 'fatty-liver'] }), ['A1', 'A3', 'A4']);
  assert.deepEqual(reglas({ diet: 'vegan', conditions: ['hypertension', 'cholesterol'] }), ['A1', 'A5', 'A6', 'A7']);
  assert.ok(menu({ diet: 'vegan' }).consejos.find(c => c.rule === 'A7').lines.join(' ').includes('B12'));
  assert.ok(menu({ diet: 'all', conditions: ['hypertension'] }).limitar.some(l => /sal/i.test(l)));
});

test('los datos cuadran: ingredientes conocidos, dietas y alergias del cuestionario, reglas que existen', () => {
  const ingredientes = Object.keys(cat.contains);
  for (const m of [...cat.meals, ...cat.good]) assert.ok(m.contains.every(c => ingredientes.includes(c)), m.name);
  assert.deepEqual(Object.keys(cat.diets).sort(), salud.diets.map(d => d.id).sort());
  assert.deepEqual(Object.keys(cat.allergies).sort(), salud.allergies.map(a => a.id).sort());
  const fuentes = fs.readFileSync(path.join(__dirname, '..', 'docs', 'FUENTES.md'), 'utf8');
  for (const r of [...cat.advice.map(a => a.rule), ...cat.limit.map(l => l.rule)]) assert.ok(fuentes.includes(`**${r}**`), r);
});

test('sin perfil se ve todo (como antes): todas las ideas posibles y todos los consejos', () => {
  const m = menu(null);
  assert.ok(Object.values(m.comidas).every(l => l.length === 3));
  assert.equal(m.consejos.length, cat.advice.length);
});

test('«Lo que no te gusta» quita de TUS ideas lo que lleve esas palabras (sin tildes ni mayúsculas); a otro perfil, no', () => {
  const conQueso = n => /queso/i.test(n);
  const yo = menu({ diet: 'all', dislikes: 'Queso, chorizo y brócoli' });
  assert.ok(![...Object.values(yo.comidas).flat(), ...yo.ok].some(n => conQueso(n) || /br[oó]coli/i.test(n)));
  const todas = crearApp().get('menuDelPerfil')({ diet: 'all' }, { ...cat, meals: cat.meals.filter(m => m.slot !== 'breakfast' || conQueso(m.name) || m.contains.length === 0) }, hoy);
  assert.ok(Object.values(plano(todas).comidas).flat().some(conQueso), 'sin «no me gusta», el queso sigue saliendo');
  assert.ok(Object.values(yo.comidas).every(l => l.length >= 2));
});

test('«Ver todas»: por cada comida, todas las que valen (con las 3 de hoy dentro) y respetando el perfil', () => {
  const m = menu({ diet: 'vegan', allergies: ['nuts'] });
  for (const [momento, hoyLista] of Object.entries(m.comidas)) {
    const validas = cat.meals.filter(x => x.slot === momento && !x.contains.some(c => ['meat', 'fish', 'shellfish', 'egg', 'dairy', 'nuts'].includes(c))).map(x => x.name);
    assert.deepEqual(m.todas[momento], validas, momento);
    assert.ok(hoyLista.every(n => m.todas[momento].includes(n)), momento);
  }
});
