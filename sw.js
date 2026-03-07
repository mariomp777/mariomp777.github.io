const CACHE_NAME = 'meteo-pro-v1';
const ASSETS = [
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@300;400;600;700;800&family=JetBrains+Mono:wght@300;400&display=swap'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets...');
      return cache.addAll(ASSETS).catch(err => console.log('[SW] Cache partial:', err));
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Weather API — always network
  if (url.hostname.includes('openweathermap') || url.hostname.includes('nominatim')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Everything else — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Background sync placeholder
self.addEventListener('sync', e => {
  if (e.tag === 'weather-sync') {
    console.log('[SW] Background weather sync');
  }
});
