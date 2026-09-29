/* eslint-disable security/detect-object-injection -- las claves son nombres del propio código (catálogos, campos) o ya validadas; nunca texto de fuera sin comprobar (revisado 28-sep-2026) */
/* eslint-disable security/detect-non-literal-fs-filename -- las pruebas leen archivos del propio repositorio (revisado 28-sep-2026) */
// Carga los scripts REALES de la app en una "página falsa" para poder probarlos con Node, sin navegador
// ni dependencias. Los scripts no se tocan: se ejecutan tal cual, en un contexto con:
//   - localStorage en memoria (cada test empieza vacío)
//   - document y elementos que aceptan addEventListener, innerHTML… y no hacen nada
// Las funciones y constantes de los scripts quedan accesibles con app.get('nombre').
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..', 'src');   // la app vive en src/
// Mismo orden que index.html
const SCRIPTS = ['js/tema.js', 'js/iconos.js', 'js/storage.js', 'js/copia.js', 'js/timer.js', 'js/charts.js', 'js/workout.js', 'js/semana.js', 'js/analisis.js', 'js/dashboard.js', 'js/plan.js', 'js/medidas.js', 'js/logros.js', 'js/perfil.js', 'js/app.js'];

// Un objeto que acepta cualquier propiedad o llamada y devuelve otro igual: sirve de elemento, de lista, de estilo…
function comodin() {
  const f = function () {};
  return new Proxy(f, {
    get(obj, prop) {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'length') return 0;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === 'forEach' || prop === 'map' || prop === 'filter') return () => [];
      if (!(prop in obj)) obj[prop] = comodin();
      return obj[prop];
    },
    set(obj, prop, valor) { obj[prop] = valor; return true; },
    apply() { return comodin(); },
  });
}

// opciones.limite: tamaño máximo del almacén en caracteres (para simular que se llena, como el cupo real de ~5 MB)
function crearApp(opciones = {}) {
  const almacen = new Map();
  const localStorage = {
    getItem: k => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => {
      const total = [...almacen].reduce((n, [c, x]) => n + (c === k ? 0 : c.length + x.length), 0) + k.length + String(v).length;
      if (opciones.limite && total > opciones.limite) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      almacen.set(k, String(v));
    },
    removeItem: k => almacen.delete(k),
    key: i => [...almacen.keys()][i] ?? null,
    get length() { return almacen.size; },
  };
  const document = comodin();
  document.getElementById = () => comodin();
  document.querySelector = () => comodin();
  document.querySelectorAll = () => [];
  document.addEventListener = () => {};   // no se lanza DOMContentLoaded: no arranca la interfaz
  document.baseURI = 'http://localhost/';

  const contexto = vm.createContext({
    console, localStorage, document, navigator: {}, window: {},
    location: { reload() {}, origin: 'http://localhost' },
    setTimeout, clearTimeout, setInterval, clearInterval, URL, Blob: class {}, Intl, Date, Math, JSON,
  });
  // Object.keys(localStorage) lo usan export/import: que devuelva las claves del almacén
  contexto.Object = new Proxy(Object, { get: (o, p) => (p === 'keys' ? (x => (x === localStorage ? [...almacen.keys()] : Object.keys(x))) : o[p]) });

  for (const s of SCRIPTS) vm.runInContext(fs.readFileSync(path.join(RAIZ, s), 'utf8'), contexto, { filename: s });
  return {
    get: nombre => vm.runInContext(nombre, contexto),
    almacen,
  };
}

module.exports = { crearApp };
