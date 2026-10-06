// Service worker de Health Tracker (mismo sistema que nplayer y MasterMind).
// __VERSION__ lo rellena el despliegue (.github/workflows/pages.yml) con el commit: cada push cambia este archivo,
// el navegador instala el service worker nuevo, borra la caché vieja y avisa a la página (SW_UPDATED) para recargar.
const PREFIJO = 'health-tracker-';
const CACHE = PREFIJO + '__VERSION__';

// Lo que hace falta para abrir la app sin conexión desde la primera visita (pdf.js no: pesa 1,7 MB y solo se usa
// al subir un PDF; se guarda la primera vez que se usa).
const ESENCIAL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'data/workouts.json', 'data/gym.json',
  'js/iconos.js', 'js/storage.js', 'js/copia.js', 'js/timer.js', 'js/charts.js', 'js/workout.js', 'js/semana.js',
  'js/analisis.js', 'js/dashboard.js', 'js/plan.js', 'js/medidas.js', 'js/logros.js', 'js/perfil.js', 'js/rutina.js', 'js/nutricion.js', 'js/gym.js', 'js/app.js', 'data/health.json', 'data/exercises.json', 'data/nutrition.json',
  'js/tema.js', 'vendor/chart.umd.js', 'vendor/inter/inter-latin-wght-normal.woff2', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  // Uno a uno: si falta alguno, se guardan los demás (addAll fallaría entero)
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ESENCIAL.map(u => c.add(new Request(u, { cache: 'reload' }))))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Si había cachés de otra versión, esto es una ACTUALIZACIÓN (no la primera instalación): se avisa a la página.
  // Solo se tocan las cachés de ESTA app: el dominio fvilpaz.github.io lo comparten nplayer, MasterMind…
  // y antes se borraban las suyas (se quedaban sin funcionar sin conexión) y viceversa.
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const viejas = keys.filter(k => k.startsWith(PREFIJO) && k !== CACHE);
        return Promise.all(viejas.map(k => caches.delete(k))).then(() => viejas.length > 0);
      })
      .then(actualizado => self.clients.claim().then(() => actualizado))
      .then(actualizado => {
        if (!actualizado) return;
        return self.clients.matchAll({ type: 'window' })
          .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' })));
      })
  );
});

// Espera a la red como mucho «ms»; si tarda más (cobertura mala en el gimnasio), se usa la copia guardada
const conTope = (promesa, ms) => new Promise((ok, ko) => {
  const t = setTimeout(() => ko(new Error('red lenta')), ms);
  promesa.then(r => { clearTimeout(t); ok(r); }, err => { clearTimeout(t); ko(err); });
});
const desdeCache = req => caches.match(req, { ignoreSearch: true })
  .then(r => r || (req.mode === 'navigate' ? caches.match('./', { ignoreSearch: true }) : undefined));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  // Red primero (así las actualizaciones llegan solas); cache:'no-cache' obliga a preguntar al servidor:
  // sin él, GitHub Pages sirve el JS/CSS viejo hasta 10 min.
  const deAqui = new URL(req.url).origin === location.origin;
  const red = fetch(req, deAqui ? { cache: 'no-cache' } : undefined).then(res => {
    if (res.ok || res.type === 'opaque') {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(req, copia));
    }
    return res;
  });
  // Sin red o con la red lenta: la copia guardada; si no hay copia, se sigue esperando a la red
  e.respondWith(conTope(red, 3000).catch(() => desdeCache(req).then(r => r || red)));
});
