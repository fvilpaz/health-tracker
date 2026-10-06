/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 6-oct-2026) */
// Los scripts de src/js son clásicos y comparten ámbito: dos «function nombre» o «const nombre» iguales se pisan en silencio.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'src', 'js');
// Nombres definidos a nivel superior (columna 0) por archivo → los que aparecen más de una vez
function duplicados(archivos) {
  const vistos = new Map(), repetidos = [];
  for (const [archivo, texto] of Object.entries(archivos)) {
    for (const m of texto.matchAll(/^(?:async\s+)?(?:function\s*\*?|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (vistos.has(m[1])) repetidos.push(`${m[1]} (${vistos.get(m[1])} y ${archivo})`);
      else vistos.set(m[1], archivo);
    }
  }
  return repetidos;
}

test('ninguna función ni const/let de nivel superior está definida dos veces en src/js', () => {
  const archivos = Object.fromEntries(fs.readdirSync(DIR).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(path.join(DIR, f), 'utf8')]));
  assert.ok(Object.keys(archivos).length > 10);
  assert.deepEqual(duplicados(archivos), []);
});

test('control: el detector ve una función y una const repetidas entre archivos', () => {
  assert.deepEqual(duplicados({ 'a.js': 'function uno() {}\nconst dos = 1;\n', 'b.js': 'async function uno() {}\nlet tres;\n' }), ['uno (a.js y b.js)']);
  assert.equal(duplicados({ 'a.js': 'const x = 1;', 'b.js': 'const x = 2;' }).length, 1);
  assert.deepEqual(duplicados({ 'a.js': 'function f() {\n  const x = 1;\n}', 'b.js': 'function g() {\n  const x = 2;\n}' }), []);   // las locales no cuentan
});
