// Offline cache: the shell is cached on install and used only when the network fails.
const V = 'viper-v22', SHELL = ['./', 'index.html', 'css/style.css', 'js/physics.js', 'js/game.min.js', 'vendor/three.min.js', 'icon.svg', 'fonts/barlow-condensed-latin-500-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2', 'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-600-normal.woff2', 'manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;   // fonts and multiplayer stay on the network
  // network first so updates show up immediately; the cache is only the offline fallback
  e.respondWith(fetch(e.request).then(r => { if (r.ok) caches.open(V).then(c => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request)));
});
