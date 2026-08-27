const CACHE = 'character-sheet-v9-ux-12';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/v7s.css', './css/ux-v7s.css', './css/modular-v7s.css', './css/enhancements-v7s.css',
  './css/compact-ux-v7s.css', './css/gameplay-polish-v7s.css', './css/v9.css?v=9.6.0',
  './js/classes/treasure-hunter/data-v7s.js', './js/classes/treasure-hunter/relics-v7s.js',
  './js/classes/treasure-hunter/choices-v7s.js', './js/core/gear-rules-v9.js?v=9.6.0',
  './js/classes/treasure-hunter/content-v9.js?v=9.6.0', './js/core/state-v9.js?v=9.6.0',
  './js/core/rules-2024.js?v=9.6.0', './js/core/origin-v9.js?v=9.6.0',
  './js/core/derived-v9.js?v=9.6.0', './js/core/commands-v9.js?v=9.6.0', './js/core/roster-v9.js?v=9.6.0',
  './js/core/catalog-srd.js?v=9.6.0', './js/ui/portrait-cropper.js?v=9.6.0', './js/ui/app-v9.js?v=9.6.0',
  './assets/icon.svg', './assets/treasure-ornament.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      const update = fetch(event.request).then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || update;
    })
  );
});
