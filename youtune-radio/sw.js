const CACHE_NAME = 'youtune-radio-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force update immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/script.js',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Take control immediately
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

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});