// Karamja service worker: gyorsabb újratöltés.
// - A játék oldala: hálózat először (hogy a frissítések azonnal jöjjenek), ha nincs net, a gyorsítótárból.
// - Three.js és az ikonok: gyorsítótárból először (ritkán változnak).
// - Az API (/karamja/api/) sosem kerül gyorsítótárba.
const CACHE = 'karamja-v1';
const STATIC = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  './icon-192.png', './icon-512.png', './icon-180.png', './manifest.webmanifest'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.includes('/karamja/api/') || url.port === '8787') return;
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isPage) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok && (url.hostname === 'cdnjs.cloudflare.com' || url.origin === location.origin)) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  })));
});
