const CACHE_NAME = 'rt38-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo-rt38.png',
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (Supabase, Google Fonts, dll)
  if (url.origin !== self.location.origin) return;

  // Skip API routes Next.js
  if (url.pathname.startsWith('/api/')) return;

  // Network-first: coba ambil dari network, fallback ke cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache asset statis yang berhasil di-fetch
        const isStatic =
          url.pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/) ||
          url.pathname === '/';

        if (response.ok && isStatic) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});