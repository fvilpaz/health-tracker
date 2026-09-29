/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 28-sep-2026) */
// La app instalada tiene que abrir sin conexión: el service worker guarda al instalarse la lista ESENCIAL.
// Si mañana se añade un js/ nuevo y no se mete en esa lista, sin conexión fallaría: esta prueba lo avisa.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', 'src');   // la app vive en src/

test('el service worker guarda para sin conexión todos los scripts que carga index.html', () => {
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const cargados = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const guardados = new Set([...sw.matchAll(/'([^']+\.(?:js|css|json|woff2|png|html|webmanifest))'/g)].map(m => m[1]));
  const faltan = cargados.filter(s => !guardados.has(s));
  assert.deepEqual(faltan, [], `faltan en ESENCIAL de sw.js: ${faltan.join(', ')}`);
});

test('el service worker solo borra SUS cachés (el dominio lo comparten otras apps)', () => {
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  assert.match(sw, /k\.startsWith\(PREFIJO\) && k !== CACHE/);
});
