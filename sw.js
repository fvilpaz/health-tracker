// Service worker de Health Tracker (mismo sistema que nplayer y MasterMind).
// __VERSION__ lo rellena el despliegue (.github/workflows/pages.yml) con el commit: cada push cambia este archivo,
// el navegador instala el service worker nuevo, borra la caché vieja y avisa a la página (SW_UPDATED) para recargar.
const CACHE = 'health-tracker-__VERSION__';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  // Si había cachés de otra versión, esto es una ACTUALIZACIÓN (no la primera instalación): se avisa a la página.
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const viejas = keys.filter(k => k !== CACHE);
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

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  // Red primero; la caché solo sin conexión. cache:'no-cache' obliga a preguntar al servidor:
  // sin él, GitHub Pages sirve el JS/CSS viejo hasta 10 min.
  const deAqui = new URL(req.url).origin === location.origin;
  e.respondWith(
    fetch(req, deAqui ? { cache: 'no-cache' } : undefined)
      .then(res => {
        if (res.ok || res.type === 'opaque') {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(r => r || (req.mode === 'navigate' ? caches.match('./', { ignoreSearch: true }) : undefined)))
  );
});
