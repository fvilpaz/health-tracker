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

test('el service worker guarda para sin conexión todos los data/*.json que la app pide con fetch (si no, esa pantalla fallaría en el gimnasio sin cobertura)', () => {
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const guardados = new Set([...sw.matchAll(/'([^']+\.json)'/g)].map(m => m[1]));
  const pedidos = new Set();
  for (const f of fs.readdirSync(path.join(RAIZ, 'js')).filter(n => n.endsWith('.js'))) {
    const js = fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8');
    for (const m of js.matchAll(/fetch\('(data\/[^']+\.json)'\)/g)) pedidos.add(m[1]);
  }
  assert.ok(pedidos.size >= 5, 'no he encontrado los fetch de data/ (¿cambió la forma de pedirlos?)');
  assert.deepEqual([...pedidos].filter(u => !guardados.has(u)), [], 'faltan en ESENCIAL de sw.js');
});

test('el service worker solo borra SUS cachés (el dominio lo comparten otras apps)', () => {
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  assert.match(sw, /k\.startsWith\(PREFIJO\) && k !== CACHE/);
});
