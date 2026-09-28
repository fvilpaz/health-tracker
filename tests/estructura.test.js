// Los scripts se cargan como <script> clásicos y comparten nombres globales. Si dos archivos definieran el mismo
// nombre, el segundo pisaría al primero sin avisar: esta prueba lo impide. (Usar algo antes de que se cargue su
// archivo ya lo caza tests/entorno.js, que ejecuta los scripts en el orden real de index.html.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('ningún nombre global está definido en dos archivos', () => {
  const dir = path.join(__dirname, '..', 'js');
  const donde = new Map(), repetidos = [];
  for (const archivo of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, archivo), 'utf8');
    for (const m of src.matchAll(/^(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+))/gm)) {
      const nombre = m[1] || m[2];
      if (donde.has(nombre) && donde.get(nombre) !== archivo) repetidos.push(`${nombre} (${donde.get(nombre)} y ${archivo})`);
      donde.set(nombre, archivo);
    }
  }
  assert.deepEqual(repetidos, []);
  assert.ok(donde.size > 50, `solo ha encontrado ${donde.size} nombres: el patrón no está leyendo bien`);   // control
});
