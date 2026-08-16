const CACHE_NAME = 'youtune-radio-v2-1';
const FRESH_FILES = new Set([
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/social/index.html',
  '/social/style.css',
  '/social/script.js',
  '/help/index.html',
  '/help/style.css',
  '/help/script.js',
  '/manifest.json'
]);

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force update immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined))
      ))
      .then(() => clients.claim()) // Take control immediately
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL FIX: Ignore cross-origin requests (API, Proxy, Images, Streams)
  // We only want to cache our own local files (index.html, style.css, etc.)
  if (url.origin !== location.origin) {
    return;
  }

  // Also ignore specific paths if necessary (e.g. if you host the proxy on the same domain later)
  if (url.pathname.includes('proxy') || url.pathname.endsWith('.mp3')) {
    return;
  }

  if (FRESH_FILES.has(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
