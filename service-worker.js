const CACHE = 'character-sheet-v10-safe-profiles-1';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/v7s.css', './css/ux-v7s.css', './css/modular-v7s.css', './css/enhancements-v7s.css',
  './css/compact-ux-v7s.css', './css/gameplay-polish-v7s.css', './css/v9.css?v=10.1.1',
  './js/classes/treasure-hunter/data-v7s.js', './js/classes/treasure-hunter/relics-v7s.js',
  './js/classes/treasure-hunter/choices-v7s.js', './js/core/gear-rules-v9.js?v=10.1.1', './js/core/homebrew-library-v10.js?v=10.1.1',
  './js/classes/treasure-hunter/content-v9.js?v=10.1.1', './js/classes/class-registry-v10.js?v=10.1.1',
  './js/classes/treasure-hunter/register-v10.js?v=10.1.1', './js/classes/occultist/data-v10.js?v=10.1.1', './js/classes/occultist/full-rules-v10.js?v=10.1.1',
  './js/core/spell-catalog-v10.js?v=10.1.1', './js/core/state-v9.js?v=10.1.3', './js/core/rules-2024.js?v=10.1.1', './js/core/origin-v9.js?v=10.1.1',
  './js/core/derived-v9.js?v=10.1.1', './js/core/commands-v9.js?v=10.1.1', './js/core/roster-v9.js?v=10.1.3',
  './js/classes/occultist/import-v10.js?v=10.1.1', './js/core/catalog-srd.js?v=10.1.1', './js/ui/portrait-cropper.js?v=10.1.1',
  './js/ui/app-v9.js?v=10.1.3', './js/ui/occultist-v10.js?v=10.1.3',
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
